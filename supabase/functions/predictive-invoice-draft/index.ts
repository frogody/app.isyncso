import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LineItem {
  description: string;
  hours: number;
  category: string;
  thread_name: string;
  activity_count: number;
}

interface ConsolidatedLineItem {
  description: string;
  hours: number;
  category: string;
}

const TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { prospect_id, company_id, user_id, date_from, date_to } = await req.json();

    if (!prospect_id || !company_id) {
      return new Response(
        JSON.stringify({ success: false, error: "prospect_id and company_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default date range: last 30 days
    const endDate = date_to || new Date().toISOString().slice(0, 10);
    const startDate =
      date_from ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 1. Find semantic entities linked to this prospect
    const { data: entityLinks, error: linksError } = await supabase
      .from("entity_business_links")
      .select("semantic_entity_id, link_type, match_confidence")
      .eq("business_record_id", prospect_id)
      .eq("business_type", "prospect");

    if (linksError) {
      console.error("Error fetching entity links:", linksError);
    }

    const linkedEntityIds = (entityLinks || []).map((l: any) => l.semantic_entity_id);

    // 2. Get entity names for matching against threads/activities
    let entityNames: string[] = [];
    if (linkedEntityIds.length > 0) {
      const { data: entities } = await supabase
        .from("semantic_entities")
        .select("entity_id, name, type")
        .in("entity_id", linkedEntityIds);

      entityNames = (entities || []).map((e: any) => e.name?.toLowerCase()).filter(Boolean);
    }

    // Also use the prospect's company name as a fallback entity name
    const { data: prospect } = await supabase
      .from("prospects")
      .select("first_name, last_name, company, email")
      .eq("id", prospect_id)
      .single();

    if (prospect) {
      if (prospect.company) entityNames.push(prospect.company.toLowerCase());
      const fullName = [prospect.first_name, prospect.last_name].filter(Boolean).join(" ");
      if (fullName) entityNames.push(fullName.toLowerCase());
    }

    // Deduplicate
    entityNames = [...new Set(entityNames)];

    if (entityNames.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          line_items: [],
          total_hours: 0,
          date_range: { from: startDate, to: endDate },
          message: "No semantic entities linked to this prospect. Link entities first or ensure the prospect has a company name.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve user_id: from body, or from auth token
    const resolvedUserId = user_id || await getUserId(req, supabase);

    // 3. Query semantic_threads that overlap the date range and involve related entities
    // Threads have primary_entities (uuid[]) — we'll match entity names against thread titles and entity names
    const { data: threads, error: threadsError } = await supabase
      .from("semantic_threads")
      .select("thread_id, title, primary_entities, event_count, started_at, last_activity_at")
      .gte("last_activity_at", startDate)
      .lte("started_at", endDate + "T23:59:59Z")
      .eq("user_id", resolvedUserId);

    if (threadsError) {
      console.error("Error fetching threads:", threadsError);
    }

    // primary_entities stores UUIDs — resolve them to names for matching
    const allPrimaryEntityIds = new Set<string>();
    for (const t of threads || []) {
      for (const eid of t.primary_entities || []) {
        allPrimaryEntityIds.add(eid);
      }
    }

    // Batch-fetch entity names for all primary entities
    const entityNameMap = new Map<string, string>();
    if (allPrimaryEntityIds.size > 0) {
      const batchIds = [...allPrimaryEntityIds].slice(0, 200);
      const { data: batchEntities } = await supabase
        .from("semantic_entities")
        .select("entity_id, name")
        .in("entity_id", batchIds);
      for (const e of batchEntities || []) {
        entityNameMap.set(e.entity_id, (e.name || "").toLowerCase());
      }
    }

    // Filter threads that match entity names (via primary_entities names or thread title)
    const matchingThreads = (threads || []).filter((t: any) => {
      // Check if thread title contains any entity name
      const titleLower = (t.title || "").toLowerCase();
      const titleMatch = entityNames.some((name) => titleLower.includes(name));
      if (titleMatch) return true;

      // Check if any primary entity resolves to a matching name
      const pe = (t.primary_entities || []).map((eid: string) => entityNameMap.get(eid) || "");
      return entityNames.some((name) =>
        pe.some((p: string) => p.includes(name) || name.includes(p))
      );
    });

    // 4. Query activities within time ranges of matched threads
    // semantic_activities has NO thread_id column — we match by time overlap
    let activities: any[] = [];

    if (matchingThreads.length > 0) {
      // Build time windows from matched threads
      for (const thread of matchingThreads) {
        const threadStart = thread.started_at;
        const threadEnd = thread.last_activity_at;
        if (!threadStart || !threadEnd) continue;

        const { data: threadActivities, error: actError } = await supabase
          .from("semantic_activities")
          .select("id, activity_type, duration_ms, metadata, created_at")
          .eq("user_id", resolvedUserId)
          .gte("created_at", threadStart)
          .lte("created_at", threadEnd)
          .limit(100);

        if (actError) {
          console.error("Error fetching activities for thread:", actError);
          continue;
        }
        // Tag activities with the thread info
        for (const act of threadActivities || []) {
          activities.push({ ...act, _thread_id: thread.thread_id, _thread_title: thread.title });
        }
      }
    }

    // Also check activities that mention entity names in metadata
    const { data: looseActivities } = await supabase
      .from("semantic_activities")
      .select("id, activity_type, duration_ms, metadata, created_at")
      .eq("user_id", resolvedUserId)
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59Z")
      .limit(500);

    // Filter activities that mention entity names in metadata
    const matchingLoose = (looseActivities || []).filter((a: any) => {
      const metaStr = JSON.stringify(a.metadata || {}).toLowerCase();
      return entityNames.some((name) => metaStr.includes(name));
    }).map((a: any) => ({ ...a, _thread_id: "__unthreaded__", _thread_title: null }));

    // Deduplicate by activity id
    const seenIds = new Set(activities.map((a: any) => a.id));
    for (const a of matchingLoose) {
      if (!seenIds.has(a.id)) {
        activities.push(a);
        seenIds.add(a.id);
      }
    }

    // 5. Group activities by thread, compute total hours
    const threadMap = new Map<string, { activities: any[]; thread: any }>();

    // Add a "general" bucket for activities without thread
    for (const act of activities) {
      const key = act._thread_id || "__unthreaded__";
      if (!threadMap.has(key)) {
        const thread = matchingThreads.find((t: any) => t.thread_id === key);
        threadMap.set(key, { activities: [], thread: thread || { title: act._thread_title } });
      }
      threadMap.get(key)!.activities.push(act);
    }

    // Build line items
    const lineItems: LineItem[] = [];

    for (const [key, { activities: acts, thread }] of threadMap) {
      const totalMs = acts.reduce((sum: number, a: any) => sum + (a.duration_ms || 0), 0);
      const hours = Math.round((totalMs / 3600000) * 100) / 100; // round to 2 decimals

      if (hours <= 0 && acts.length === 0) continue;

      // Determine dominant category
      const categories: Record<string, number> = {};
      for (const a of acts) {
        const cat = a.activity_type || "general";
        categories[cat] = (categories[cat] || 0) + 1;
      }
      const dominantCategory = Object.entries(categories).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || "general";

      // Build description
      const threadName = thread?.title || "General work";
      const categoryLabel = dominantCategory.replace(/_/g, " ");
      const description = `${categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1)} — ${threadName}`;

      lineItems.push({
        description,
        hours: hours || Math.round((acts.length * 5) / 60 * 100) / 100, // fallback: 5 min per activity
        category: dominantCategory,
        thread_name: threadName,
        activity_count: acts.length,
      });
    }

    // Sort by hours descending
    lineItems.sort((a, b) => b.hours - a.hours);

    const totalHours = Math.round(lineItems.reduce((s, l) => s + l.hours, 0) * 100) / 100;

    // 6. Consolidate raw items into professional descriptions via LLM
    const clientName = prospect
      ? [prospect.first_name, prospect.last_name].filter(Boolean).join(" ") || prospect.company || "Client"
      : "Client";
    const consolidated = await consolidateWithLLM(lineItems, clientName, { from: startDate, to: endDate });

    // 7. Look up default hourly rate
    const defaultRate = await getDefaultHourlyRate(supabase, company_id);

    const consolidatedTotal = Math.round(consolidated.reduce((s, l) => s + l.hours, 0) * 100) / 100;

    return new Response(
      JSON.stringify({
        success: true,
        line_items: consolidated,
        raw_activities: lineItems,
        total_hours: consolidatedTotal || totalHours,
        default_rate: defaultRate,
        date_range: { from: startDate, to: endDate },
        entity_names_used: entityNames,
        threads_matched: matchingThreads.length,
        activities_found: activities.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Predictive invoice draft error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function consolidateWithLLM(
  rawItems: LineItem[],
  clientName: string,
  dateRange: { from: string; to: string }
): Promise<ConsolidatedLineItem[]> {
  const togetherKey = Deno.env.get("TOGETHER_API_KEY");
  if (!togetherKey || rawItems.length <= 3) {
    // No API key or few enough items — just clean up descriptions
    return rawItems.map((item) => ({
      description: cleanDescription(item.description, item.thread_name),
      hours: item.hours,
      category: item.category,
    }));
  }

  const rawSummary = rawItems
    .map((item) => `- ${item.description} (${item.hours}h, ${item.activity_count} activities)`)
    .join("\n");

  try {
    const response = await fetch(TOGETHER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${togetherKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "moonshotai/Kimi-K2-Instruct",
        messages: [
          {
            role: "system",
            content: `You consolidate raw desktop activity logs into professional invoice line items. Return ONLY a JSON array of objects with {description, hours, category}. Group related activities together. Write clear, client-facing descriptions (e.g. "Project management & coordination", "Software development & testing", "Research & analysis"). Never mention specific app names like Terminal, Chrome, VS Code. Round hours to 2 decimal places. Aim for 3-8 consolidated line items.`,
          },
          {
            role: "user",
            content: `Consolidate these ${rawItems.length} tracked work activities for client "${clientName}" (${dateRange.from} to ${dateRange.to}) into professional invoice line items:\n\n${rawSummary}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("LLM consolidation failed:", response.status);
      return rawItems.map((item) => ({
        description: cleanDescription(item.description, item.thread_name),
        hours: item.hours,
        category: item.category,
      }));
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("LLM returned no JSON array");
      return rawItems.map((item) => ({
        description: cleanDescription(item.description, item.thread_name),
        hours: item.hours,
        category: item.category,
      }));
    }

    const consolidated: ConsolidatedLineItem[] = JSON.parse(jsonMatch[0]);

    // Validate and sanitize
    return consolidated
      .filter((item) => item.description && item.hours > 0)
      .map((item) => ({
        description: String(item.description).slice(0, 200),
        hours: Math.round((Number(item.hours) || 0) * 100) / 100,
        category: String(item.category || "general"),
      }));
  } catch (err) {
    console.error("LLM consolidation error:", err);
    return rawItems.map((item) => ({
      description: cleanDescription(item.description, item.thread_name),
      hours: item.hours,
      category: item.category,
    }));
  }
}

function cleanDescription(description: string, threadName: string): string {
  // Remove app names from descriptions like "Building — Terminal — Terminal"
  const appNames = [
    "terminal", "google chrome", "chrome", "safari", "firefox", "vs code",
    "visual studio code", "finder", "slack", "discord", "notion", "figma",
    "arc", "brave", "edge", "iterm", "warp", "cursor",
  ];
  let clean = description;
  for (const app of appNames) {
    clean = clean.replace(new RegExp(`\\s*[—–-]\\s*${app}`, "gi"), "");
    clean = clean.replace(new RegExp(`${app}\\s*[—–-]\\s*`, "gi"), "");
  }
  // Capitalize first letter
  clean = clean.trim();
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean || threadName || "General work";
}

async function getDefaultHourlyRate(supabase: any, companyId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .single();
    return data?.settings?.default_hourly_rate || 0;
  } catch {
    return 0;
  }
}

async function getUserId(req: Request, supabase: any): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return "";

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id || "";
  } catch {
    return "";
  }
}
