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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { prospect_id, company_id, date_from, date_to } = await req.json();

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
      .select("entity_id, link_type, confidence")
      .eq("prospect_id", prospect_id);

    if (linksError) {
      console.error("Error fetching entity links:", linksError);
    }

    const linkedEntityIds = (entityLinks || []).map((l: any) => l.entity_id);

    // 2. Get entity names for matching against threads/activities
    let entityNames: string[] = [];
    if (linkedEntityIds.length > 0) {
      const { data: entities } = await supabase
        .from("semantic_entities")
        .select("id, name, entity_type")
        .in("id", linkedEntityIds);

      entityNames = (entities || []).map((e: any) => e.name?.toLowerCase()).filter(Boolean);
    }

    // Also use the prospect's company name as a fallback entity name
    const { data: prospect } = await supabase
      .from("prospects")
      .select("full_name, company_name, email")
      .eq("id", prospect_id)
      .single();

    if (prospect) {
      if (prospect.company_name) entityNames.push(prospect.company_name.toLowerCase());
      if (prospect.full_name) entityNames.push(prospect.full_name.toLowerCase());
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

    // 3. Query semantic_threads that overlap the date range and involve related entities
    // Threads have primary_entities (text[]) — check if any entity name appears
    const { data: threads, error: threadsError } = await supabase
      .from("semantic_threads")
      .select("id, title, primary_entities, event_count, first_seen, last_seen")
      .gte("last_seen", startDate)
      .lte("first_seen", endDate + "T23:59:59Z")
      .eq("user_id", (await getUserId(req, supabase)));

    if (threadsError) {
      console.error("Error fetching threads:", threadsError);
    }

    // Filter threads that match entity names
    const matchingThreads = (threads || []).filter((t: any) => {
      const pe = (t.primary_entities || []).map((e: string) => e.toLowerCase());
      return entityNames.some((name) =>
        pe.some((p: string) => p.includes(name) || name.includes(p))
      );
    });

    const threadIds = matchingThreads.map((t: any) => t.id);

    // 4. Query semantic_activities in the date range related to those threads
    let activities: any[] = [];
    const userId = await getUserId(req, supabase);

    if (threadIds.length > 0) {
      const { data: threadActivities, error: actError } = await supabase
        .from("semantic_activities")
        .select("id, activity_type, duration_ms, thread_id, metadata, created_at")
        .in("thread_id", threadIds)
        .eq("user_id", userId)
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59Z");

      if (actError) {
        console.error("Error fetching activities:", actError);
      }
      activities = threadActivities || [];
    }

    // Also look for activities without thread_id but with entity names in metadata
    const { data: looseActivities } = await supabase
      .from("semantic_activities")
      .select("id, activity_type, duration_ms, thread_id, metadata, created_at")
      .eq("user_id", userId)
      .is("thread_id", null)
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59Z")
      .limit(500);

    // Filter loose activities that mention entity names in metadata
    const matchingLoose = (looseActivities || []).filter((a: any) => {
      const metaStr = JSON.stringify(a.metadata || {}).toLowerCase();
      return entityNames.some((name) => metaStr.includes(name));
    });

    activities = [...activities, ...matchingLoose];

    // 5. Group activities by thread, compute total hours
    const threadMap = new Map<string, { activities: any[]; thread: any }>();

    // Add a "general" bucket for activities without thread
    for (const act of activities) {
      const key = act.thread_id || "__unthreaded__";
      if (!threadMap.has(key)) {
        const thread = matchingThreads.find((t: any) => t.id === key);
        threadMap.set(key, { activities: [], thread: thread || null });
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

    return new Response(
      JSON.stringify({
        success: true,
        line_items: lineItems,
        total_hours: totalHours,
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
