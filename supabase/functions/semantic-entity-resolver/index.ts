import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, entity_ids, limit = 50 } = await req.json();

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

    // Get unresolved semantic entities for this user
    let query = supabase
      .from("semantic_entities")
      .select("entity_id, name, type")
      .eq("user_id", user_id)
      .in("type", ["person", "organization", "project"])
      .order("last_seen", { ascending: false })
      .limit(limit);

    if (entity_ids?.length) {
      query = query.in("entity_id", entity_ids);
    }

    const { data: entities, error: entitiesError } = await query;
    if (entitiesError) throw entitiesError;

    let linksCreated = 0;
    const results: Array<{ entity_name: string; matches: any[] }> = [];

    for (const entity of entities || []) {
      // Check if already resolved
      const { data: existing } = await supabase
        .from("entity_business_links")
        .select("id")
        .eq("semantic_entity_id", entity.entity_id)
        .limit(1);

      if (existing?.length) continue;

      // Call resolve RPC
      const { data: matches, error: rpcError } = await supabase.rpc(
        "resolve_semantic_entity",
        {
          p_entity_name: entity.name,
          p_entity_type: entity.type,
          p_company_id: companyId,
        }
      );

      if (rpcError) {
        console.error("RPC error for", entity.name, rpcError);
        continue;
      }

      const goodMatches = (matches || []).filter(
        (m: any) => m.match_confidence >= 0.5
      );

      for (const match of goodMatches) {
        const { error: insertError } = await supabase
          .from("entity_business_links")
          .upsert(
            {
              semantic_entity_id: entity.entity_id,
              business_type: match.business_type,
              business_record_id: match.business_record_id,
              match_confidence: match.match_confidence,
              match_method: match.match_method,
              user_id,
              company_id: companyId,
            },
            {
              onConflict:
                "semantic_entity_id,business_type,business_record_id",
            }
          );

        if (!insertError) linksCreated++;
      }

      if (goodMatches.length > 0) {
        results.push({ entity_name: entity.name, matches: goodMatches });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        entities_processed: entities?.length || 0,
        links_created: linksCreated,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Entity resolver error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
