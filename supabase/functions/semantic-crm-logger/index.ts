/**
 * Semantic CRM Auto-Logger (Phase 2.3)
 *
 * Automatically creates CRM activity log entries when the desktop semantic
 * pipeline detects COMMUNICATING activities that involve known CRM contacts.
 *
 * Flow:
 *   1. Called with user_id (+ optional time window)
 *   2. Fetches recent COMMUNICATING activities from semantic_activities
 *   3. Loads all entity_business_links -> prospect mappings for the company
 *   4. Matches entity names against activity window titles (fallback since
 *      semantic_event_entities table doesn't exist)
 *   5. Creates crm_activity_log entries for matched prospect interactions
 *   6. Updates prospect.updated_date for touched prospects
 *
 * Can be called on schedule (pg_cron), after desktop sync, or on demand.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Map app names to activity types
function inferActivityType(appName: string, windowTitle: string): string {
  const app = (appName || "").toLowerCase();
  const title = (windowTitle || "").toLowerCase();

  if (
    app.includes("mail") ||
    app.includes("outlook") ||
    app.includes("gmail") ||
    title.includes("compose") ||
    title.includes("inbox")
  )
    return "email";
  if (
    app.includes("zoom") ||
    app.includes("teams") ||
    app.includes("meet") ||
    title.includes("call") ||
    title.includes("meeting")
  )
    return "meeting";
  if (
    app.includes("slack") ||
    app.includes("discord") ||
    app.includes("messages") ||
    app.includes("whatsapp")
  )
    return "message";
  if (app.includes("phone") || title.includes("call")) return "call";
  return "auto_detected";
}

// Generate readable subject from window title + app
function generateSubject(
  appName: string,
  windowTitle: string,
  activityType: string
): string {
  const cleanTitle = (windowTitle || "")
    .replace(/[—–\-|]/g, " ")
    .split(/\s+/)
    .filter((w: string) => w.length > 2 && w.length < 30)
    .slice(0, 5)
    .join(" ");

  const typeLabel =
    activityType === "email"
      ? "Email"
      : activityType === "meeting"
        ? "Meeting"
        : activityType === "call"
          ? "Call"
          : activityType === "message"
            ? "Message"
            : "Interaction";

  return cleanTitle
    ? `${typeLabel}: ${cleanTitle}`
    : `${typeLabel} via ${appName || "Unknown"}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, since_minutes = 60 } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's company_id
    const { data: userData } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user_id)
      .single();

    if (!userData?.company_id) {
      return new Response(
        JSON.stringify({ error: "User has no company" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const companyId = userData.company_id;
    const sinceTime = new Date(
      Date.now() - since_minutes * 60000
    ).toISOString();

    // 1. Get recent COMMUNICATING activities
    // Note: app_name and window_title live inside metadata as
    // metadata.application and metadata.windowTitle
    const { data: activities, error: actError } = await supabase
      .from("semantic_activities")
      .select(
        "id, event_id, user_id, activity_type, activity_subtype, duration_ms, metadata, created_at"
      )
      .eq("user_id", user_id)
      .eq("activity_type", "COMMUNICATING")
      .gte("created_at", sinceTime)
      .order("created_at", { ascending: false })
      .limit(50);

    if (actError) throw actError;
    if (!activities?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          activities_found: 0,
          logs_created: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Pre-load all entity_business_links -> prospect for this company
    const { data: linkedEntities } = await supabase
      .from("entity_business_links")
      .select("semantic_entity_id, business_record_id, match_confidence")
      .eq("business_type", "prospect")
      .eq("company_id", companyId)
      .gte("match_confidence", 0.5);

    if (!linkedEntities?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          activities_found: activities.length,
          logs_created: 0,
          message: "No entity-prospect links found for this company",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get entity names for window-title matching
    const entityIds = linkedEntities.map((l: any) => l.semantic_entity_id);
    const { data: entities } = await supabase
      .from("semantic_entities")
      .select("entity_id, name, type")
      .in("entity_id", entityIds);

    if (!entities?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          activities_found: activities.length,
          logs_created: 0,
          message: "No matching semantic entities found",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build lookup: entity_id -> { name, links[] }
    const entityMap = new Map<
      string,
      {
        name: string;
        type: string;
        links: { business_record_id: string; match_confidence: number }[];
      }
    >();
    for (const entity of entities) {
      const links = linkedEntities.filter(
        (l: any) => l.semantic_entity_id === entity.entity_id
      );
      if (links.length) {
        entityMap.set(entity.entity_id, {
          name: entity.name,
          type: entity.type,
          links: links.map((l: any) => ({
            business_record_id: l.business_record_id,
            match_confidence: l.match_confidence,
          })),
        });
      }
    }

    let logsCreated = 0;
    const results: any[] = [];

    for (const activity of activities) {
      // Check if already logged (by semantic_activity_id)
      const { data: existingLog } = await supabase
        .from("crm_activity_log")
        .select("id")
        .eq("semantic_activity_id", activity.event_id)
        .limit(1);

      if (existingLog?.length) continue;

      // Extract app_name and window_title from metadata
      const appName =
        activity.metadata?.application ||
        activity.metadata?.app_name ||
        "";
      const windowTitle =
        activity.metadata?.windowTitle ||
        activity.metadata?.window_title ||
        "";
      const titleLower = windowTitle.toLowerCase();
      const metadataStr = JSON.stringify(activity.metadata || {}).toLowerCase();

      // Match entity names against window title and metadata
      const matchedLinks: {
        entityId: string;
        entityName: string;
        prospectId: string;
        confidence: number;
      }[] = [];

      for (const [entityId, entityData] of entityMap) {
        const entityNameLower = entityData.name.toLowerCase();

        // Skip very short names to avoid false positives
        if (entityNameLower.length < 3) continue;

        let matched = false;

        // Check window title
        if (titleLower.includes(entityNameLower)) {
          matched = true;
        }

        // Check metadata entities array (if desktop sends structured entities)
        if (
          !matched &&
          Array.isArray(activity.metadata?.entities)
        ) {
          matched = activity.metadata.entities.some(
            (e: any) =>
              (e.name || "").toLowerCase() === entityNameLower ||
              (e.id || "") === entityId
          );
        }

        // Check full metadata string as last resort
        if (!matched && metadataStr.includes(entityNameLower)) {
          matched = true;
        }

        if (matched) {
          for (const link of entityData.links) {
            matchedLinks.push({
              entityId,
              entityName: entityData.name,
              prospectId: link.business_record_id,
              confidence: link.match_confidence,
            });
          }
        }
      }

      if (!matchedLinks.length) continue;

      // Deduplicate by prospect_id (take highest confidence)
      const prospectMap = new Map<
        string,
        { entityId: string; entityName: string; confidence: number }
      >();
      for (const ml of matchedLinks) {
        const existing = prospectMap.get(ml.prospectId);
        if (!existing || ml.confidence > existing.confidence) {
          prospectMap.set(ml.prospectId, {
            entityId: ml.entityId,
            entityName: ml.entityName,
            confidence: ml.confidence,
          });
        }
      }

      // Create CRM activity log for each linked prospect
      for (const [prospectId, match] of prospectMap) {
        const activityType = inferActivityType(appName, windowTitle);
        const subject = generateSubject(appName, windowTitle, activityType);

        const { error: insertError } = await supabase
          .from("crm_activity_log")
          .insert({
            prospect_id: prospectId,
            user_id,
            company_id: companyId,
            activity_type: activityType,
            subject,
            description: `Auto-detected ${activityType} via ${appName || "unknown app"}`,
            source: "auto",
            semantic_activity_id: activity.event_id,
            semantic_entity_id: match.entityId,
            duration_minutes: activity.duration_ms
              ? Math.round(activity.duration_ms / 60000)
              : null,
            app_name: appName,
            metadata: {
              window_title: windowTitle,
              entity_name: match.entityName,
              match_confidence: match.confidence,
              match_method: "window_title_entity_name",
              original_activity: activity.metadata,
            },
            logged_at: activity.created_at,
          });

        if (!insertError) {
          logsCreated++;
          results.push({
            prospect_id: prospectId,
            activity_type: activityType,
            subject,
            entity_name: match.entityName,
          });
        }
      }
    }

    // Update prospect updated_date for touched prospects
    const touchedProspectIds = [
      ...new Set(results.map((r: any) => r.prospect_id)),
    ];
    for (const pid of touchedProspectIds) {
      await supabase
        .from("prospects")
        .update({ updated_date: new Date().toISOString() })
        .eq("id", pid);
    }

    return new Response(
      JSON.stringify({
        success: true,
        activities_found: activities.length,
        logs_created: logsCreated,
        prospects_touched: touchedProspectIds.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("CRM Logger error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
