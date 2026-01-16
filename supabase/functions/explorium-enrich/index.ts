import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPLORIUM_API_BASE = "https://api.explorium.ai/v1";
const EXPLORIUM_API_KEY = Deno.env.get("EXPLORIUM_API_KEY");

interface EnrichRequest {
  linkedin?: string;
  email?: string;
  full_name?: string;
  company_name?: string;
  action: "full_enrich" | "match_prospect" | "enrich_contact" | "enrich_profile" | "match_business" | "enrich_business";
  prospect_id?: string;
  business_id?: string;
}

async function exploriumFetch(endpoint: string, body: object) {
  const response = await fetch(`${EXPLORIUM_API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "API_KEY": EXPLORIUM_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Explorium API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function matchProspect(params: { linkedin?: string; email?: string; full_name?: string; company_name?: string }) {
  const data = await exploriumFetch("/prospects/match", {
    prospects_to_match: [{
      ...(params.linkedin && { linkedin: params.linkedin }),
      ...(params.email && { email: params.email }),
      ...(params.full_name && { full_name: params.full_name }),
      ...(params.company_name && { company_name: params.company_name }),
    }],
  });
  return data.matched_prospects?.[0]?.prospect_id || null;
}

async function enrichProspectContact(prospectId: string) {
  return exploriumFetch("/prospects/contacts_information/enrich", {
    prospect_id: prospectId,
  });
}

async function enrichProspectProfile(prospectId: string) {
  return exploriumFetch("/prospects/enrich", {
    prospect_id: prospectId,
  });
}

async function matchBusiness(params: { company_name?: string; domain?: string }) {
  const data = await exploriumFetch("/businesses/match", {
    businesses_to_match: [{
      ...(params.company_name && { company_name: params.company_name }),
      ...(params.domain && { domain: params.domain }),
    }],
  });
  return data.matched_businesses?.[0]?.business_id || null;
}

async function enrichBusiness(businessId: string) {
  return exploriumFetch("/businesses/enrich", {
    business_id: businessId,
  });
}

async function fullEnrichFromLinkedIn(linkedinUrl: string) {
  // Step 1: Match prospect by LinkedIn
  const prospectId = await matchProspect({ linkedin: linkedinUrl });
  if (!prospectId) {
    throw new Error("Could not find prospect in Explorium database");
  }

  // Step 2 & 3: Get contact and profile info in parallel
  const [contactData, profileData] = await Promise.all([
    enrichProspectContact(prospectId),
    enrichProspectProfile(prospectId),
  ]);

  const contact = contactData.data?.[0]?.data || {};
  const profile = profileData.data?.[0]?.data || {};

  // Step 4: Match and enrich company
  let companyData: Record<string, any> = {};
  if (profile.company_name || profile.company_website) {
    try {
      const businessId = await matchBusiness({
        company_name: profile.company_name,
        domain: profile.company_website,
      });
      if (businessId) {
        const bizEnrich = await enrichBusiness(businessId);
        companyData = bizEnrich.data?.[0]?.data || {};
        companyData.business_id = businessId;
      }
    } catch (e) {
      console.warn("Business enrichment failed:", e);
    }
  }

  // Step 5: Return combined data
  const nameParts = (profile.full_name || "").split(" ");

  return {
    // Contact
    first_name: nameParts[0] || "",
    last_name: nameParts.slice(1).join(" ") || "",
    email: contact.professional_email || contact.work_email,
    personal_email: contact.personal_email,
    phone: contact.work_phone || contact.office_phone,
    mobile_phone: contact.mobile_phone,
    linkedin_url: linkedinUrl,

    // Professional
    job_title: profile.job_title || profile.current_title,
    job_department: profile.job_department,
    job_seniority_level: profile.job_seniority_level,
    skills: profile.skills || [],
    interests: profile.interests || [],
    education: profile.education || [],
    work_history: profile.experience || [],
    age_group: profile.age_group,

    // Location
    location_city: profile.city,
    location_region: profile.region_name,
    location_country: profile.country_name,

    // Company
    company: profile.company_name,
    company_domain: companyData.domain || profile.company_website,
    company_linkedin: companyData.linkedin || profile.company_linkedin,
    company_industry: companyData.industry,
    company_size: companyData.size_range,
    company_employee_count: companyData.employee_count,
    company_revenue: companyData.revenue_range,
    company_founded_year: companyData.founded_year,
    company_hq_location: companyData.hq_location,
    company_description: companyData.description,
    company_tech_stack: companyData.technologies || [],
    company_funding_total: companyData.total_funding,
    company_latest_funding: companyData.latest_funding_round,

    // Metadata
    enriched_at: new Date().toISOString(),
    enrichment_source: "explorium",
    explorium_prospect_id: prospectId,
    explorium_business_id: companyData.business_id,
  };
}

async function fullEnrichFromEmail(email: string, companyName?: string) {
  // Step 1: Match prospect by email
  const prospectId = await matchProspect({ email, company_name: companyName });
  if (!prospectId) {
    throw new Error("Could not find prospect with this email");
  }

  // Reuse the enrichment flow
  const [contactData, profileData] = await Promise.all([
    enrichProspectContact(prospectId),
    enrichProspectProfile(prospectId),
  ]);

  const contact = contactData.data?.[0]?.data || {};
  const profile = profileData.data?.[0]?.data || {};

  // Enrich company
  let companyData: Record<string, any> = {};
  if (profile.company_name || profile.company_website) {
    try {
      const businessId = await matchBusiness({
        company_name: profile.company_name,
        domain: profile.company_website,
      });
      if (businessId) {
        const bizEnrich = await enrichBusiness(businessId);
        companyData = bizEnrich.data?.[0]?.data || {};
        companyData.business_id = businessId;
      }
    } catch (e) {
      console.warn("Business enrichment failed:", e);
    }
  }

  const nameParts = (profile.full_name || "").split(" ");

  return {
    first_name: nameParts[0] || "",
    last_name: nameParts.slice(1).join(" ") || "",
    email: email,
    personal_email: contact.personal_email,
    phone: contact.work_phone || contact.office_phone,
    mobile_phone: contact.mobile_phone,
    linkedin_url: profile.linkedin,
    job_title: profile.job_title || profile.current_title,
    job_department: profile.job_department,
    job_seniority_level: profile.job_seniority_level,
    skills: profile.skills || [],
    interests: profile.interests || [],
    education: profile.education || [],
    work_history: profile.experience || [],
    age_group: profile.age_group,
    location_city: profile.city,
    location_region: profile.region_name,
    location_country: profile.country_name,
    company: profile.company_name,
    company_domain: companyData.domain || profile.company_website,
    company_linkedin: companyData.linkedin || profile.company_linkedin,
    company_industry: companyData.industry,
    company_size: companyData.size_range,
    company_employee_count: companyData.employee_count,
    company_revenue: companyData.revenue_range,
    company_founded_year: companyData.founded_year,
    company_hq_location: companyData.hq_location,
    company_description: companyData.description,
    company_tech_stack: companyData.technologies || [],
    company_funding_total: companyData.total_funding,
    company_latest_funding: companyData.latest_funding_round,
    enriched_at: new Date().toISOString(),
    enrichment_source: "explorium",
    explorium_prospect_id: prospectId,
    explorium_business_id: companyData.business_id,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!EXPLORIUM_API_KEY) {
      throw new Error("EXPLORIUM_API_KEY not configured");
    }

    const body: EnrichRequest = await req.json();
    let result: any;

    switch (body.action) {
      case "full_enrich":
        if (body.linkedin) {
          result = await fullEnrichFromLinkedIn(body.linkedin);
        } else if (body.email) {
          result = await fullEnrichFromEmail(body.email, body.company_name);
        } else {
          throw new Error("Must provide linkedin or email for full_enrich");
        }
        break;

      case "match_prospect":
        result = { prospect_id: await matchProspect(body) };
        break;

      case "enrich_contact":
        if (!body.prospect_id) throw new Error("prospect_id required");
        result = await enrichProspectContact(body.prospect_id);
        break;

      case "enrich_profile":
        if (!body.prospect_id) throw new Error("prospect_id required");
        result = await enrichProspectProfile(body.prospect_id);
        break;

      case "match_business":
        result = { business_id: await matchBusiness(body) };
        break;

      case "enrich_business":
        if (!body.business_id) throw new Error("business_id required");
        result = await enrichBusiness(body.business_id);
        break;

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Explorium enrichment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
