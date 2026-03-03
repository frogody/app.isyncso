import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { company_id, prospect_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get organization_id
    const { data: company } = await supabase
      .from("companies")
      .select("organization_id")
      .eq("id", company_id)
      .single();

    if (!company?.organization_id) {
      return new Response(JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let prospects;
    if (prospect_id) {
      // Single prospect
      const { data } = await supabase
        .from("prospects")
        .select("id")
        .eq("id", prospect_id)
        .single();
      prospects = data ? [data] : [];
    } else {
      // All active prospects in this org
      const { data } = await supabase
        .from("prospects")
        .select("id")
        .eq("organization_id", company.organization_id)
        .not("stage", "in", '("lost","archived")')
        .limit(200);
      prospects = data || [];
    }

    const results = [];
    let computed = 0;

    for (const p of prospects) {
      const { data, error } = await supabase.rpc("compute_client_health", {
        p_prospect_id: p.id,
        p_company_id: company_id,
      });

      if (error) {
        console.error(`Health score error for ${p.id}:`, error);
        continue;
      }

      results.push(data);
      computed++;
    }

    return new Response(
      JSON.stringify({ success: true, computed, total_prospects: prospects.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Client health error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
