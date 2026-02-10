import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPLORIUM_API_BASE = "https://api.explorium.ai/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  try {
    const { domain, user_id } = await req.json();

    if (!domain || !user_id) {
      return new Response(
        JSON.stringify({ error: "domain and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[auto-enrich-company] Processing domain: ${domain}, user: ${user_id}`);

    // Double-check: company might have been created between trigger fire and this call
    const { data: existingCompany } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("domain", domain.toLowerCase())
      .maybeSingle();

    if (existingCompany) {
      // Company already exists — just link the user
      await supabaseAdmin
        .from("users")
        .update({ company_id: existingCompany.id })
        .eq("id", user_id)
        .is("company_id", null);

      console.log(`[auto-enrich-company] Linked user to existing company ${existingCompany.id}`);
      return new Response(
        JSON.stringify({ success: true, company_id: existingCompany.id, source: "existing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Match business via Explorium
    const EXPLORIUM_API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
    if (!EXPLORIUM_API_KEY) {
      // No API key — create a basic company from domain only
      return await createBasicCompany(supabaseAdmin, domain, user_id);
    }

    let businessId: string | null = null;
    try {
      const matchRes = await fetch(`${EXPLORIUM_API_BASE}/businesses/match`, {
        method: "POST",
        headers: { "API_KEY": EXPLORIUM_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          businesses_to_match: [{ domain }],
        }),
      });

      if (matchRes.ok) {
        const matchData = await matchRes.json();
        businessId = matchData.matched_businesses?.[0]?.business_id || null;
        console.log(`[auto-enrich-company] Matched business_id: ${businessId}`);
      }
    } catch (err) {
      console.error("[auto-enrich-company] Match failed:", err);
    }

    if (!businessId) {
      // Explorium couldn't match — create basic company
      return await createBasicCompany(supabaseAdmin, domain, user_id);
    }

    // Step 2: Enrich firmographics
    let firmographics: Record<string, unknown> = {};
    try {
      const enrichRes = await fetch(`${EXPLORIUM_API_BASE}/businesses/firmographics/enrich`, {
        method: "POST",
        headers: {
          "API_KEY": EXPLORIUM_API_KEY,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ business_id: businessId }),
      });

      if (enrichRes.ok) {
        firmographics = await enrichRes.json();
        console.log(`[auto-enrich-company] Got firmographics for: ${firmographics.name || domain}`);
      }
    } catch (err) {
      console.error("[auto-enrich-company] Firmographics failed:", err);
    }

    // Step 3: Optionally get technographics (non-blocking)
    let techStack: string[] = [];
    try {
      const techRes = await fetch(`${EXPLORIUM_API_BASE}/businesses/technographics/enrich`, {
        method: "POST",
        headers: {
          "API_KEY": EXPLORIUM_API_KEY,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ business_id: businessId }),
      });

      if (techRes.ok) {
        const techData = await techRes.json();
        // Extract flat tech list from categories
        if (techData.data?.technology_stack) {
          for (const cat of Object.values(techData.data.technology_stack) as string[][]) {
            if (Array.isArray(cat)) techStack.push(...cat);
          }
        }
      }
    } catch (_) {
      // Optional — ignore failures
    }

    // Build company record — Explorium wraps data inside .data property
    const f = (firmographics as any).data || firmographics;
    const companyName = f.name || domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
    const hqParts = [
      f.city_name,
      f.region_name,
      f.country_name,
    ].filter(Boolean);

    const companyRecord = {
      name: companyName,
      domain: domain.toLowerCase(),
      industry: f.linkedin_industry_category || f.naics_description || null,
      size: f.number_of_employees_range || null,
      revenue: f.yearly_revenue_range || null,
      description: f.business_description || null,
      logo_url: f.business_logo || null,
      website: f.website || `https://${domain}`,
      linkedin_url: f.linkedin_profile || null,
      location: hqParts.length > 0 ? hqParts.join(", ") : null,
      enrichment_data: {
        explorium_business_id: businessId,
        firmographics: f,
        tech_stack: techStack,
        enriched_at: new Date().toISOString(),
        source: "auto_signup_enrichment",
      },
      enriched_at: new Date().toISOString(),
    };

    // Step 4: Insert company
    const { data: newCompany, error: insertError } = await supabaseAdmin
      .from("companies")
      .insert(companyRecord)
      .select("id")
      .single();

    if (insertError) {
      // Might be a race condition (duplicate domain) — try to find it
      console.error("[auto-enrich-company] Insert failed:", insertError.message);
      const { data: raceCompany } = await supabaseAdmin
        .from("companies")
        .select("id")
        .eq("domain", domain.toLowerCase())
        .maybeSingle();

      if (raceCompany) {
        await supabaseAdmin
          .from("users")
          .update({ company_id: raceCompany.id })
          .eq("id", user_id)
          .is("company_id", null);

        return new Response(
          JSON.stringify({ success: true, company_id: raceCompany.id, source: "race_condition" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw insertError;
    }

    // Step 5: Link user to new company
    await supabaseAdmin
      .from("users")
      .update({ company_id: newCompany.id })
      .eq("id", user_id)
      .is("company_id", null);

    console.log(`[auto-enrich-company] Created company ${newCompany.id} (${companyName}) and linked user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        company_id: newCompany.id,
        company_name: companyName,
        source: "explorium",
        enriched: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[auto-enrich-company] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to auto-enrich company" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback: create a minimal company from domain when Explorium is unavailable
async function createBasicCompany(
  supabaseAdmin: ReturnType<typeof createClient>,
  domain: string,
  userId: string
) {
  const name = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);

  const { data: newCompany, error } = await supabaseAdmin
    .from("companies")
    .insert({
      name,
      domain: domain.toLowerCase(),
      website: `https://${domain}`,
      enrichment_data: { source: "auto_signup_basic", created_at: new Date().toISOString() },
    })
    .select("id")
    .single();

  if (error) {
    // Race condition — find existing
    const { data: existing } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("domain", domain.toLowerCase())
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("users")
        .update({ company_id: existing.id })
        .eq("id", userId)
        .is("company_id", null);

      return new Response(
        JSON.stringify({ success: true, company_id: existing.id, source: "basic_race" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    throw error;
  }

  await supabaseAdmin
    .from("users")
    .update({ company_id: newCompany.id })
    .eq("id", userId)
    .is("company_id", null);

  return new Response(
    JSON.stringify({ success: true, company_id: newCompany.id, company_name: name, source: "basic", enriched: false }),
    { headers: { "Content-Type": "application/json" } }
  );
}
