import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXPLORIUM_API_BASE = "https://api.explorium.ai/v1";

interface EnrichRequest {
  linkedin?: string;
  email?: string;
  full_name?: string;
  company_name?: string;
  company_domain?: string;
  action: "full_enrich" | "match_contact" | "enrich_contact" | "match_business" | "enrich_business";
  contact_id?: string;
  business_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const EXPLORIUM_API_KEY = Deno.env.get("EXPLORIUM_API_KEY");

    if (!EXPLORIUM_API_KEY) {
      return new Response(
        JSON.stringify({ error: "EXPLORIUM_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EnrichRequest = await req.json();
    console.log("Explorium enrich request:", body.action);

    // Match contact by LinkedIn, email, or name+company
    async function matchContact(params: { linkedin?: string; email?: string; full_name?: string; company_name?: string; company_domain?: string }) {
      const contactToMatch: Record<string, string | null> = {
        email: params.email || null,
        linkedin_url: params.linkedin || null,
        full_name: params.full_name || null,
        company_name: params.company_name || null,
        company_domain: params.company_domain || null,
      };

      console.log("Matching contact:", contactToMatch);

      const response = await fetch(`${EXPLORIUM_API_BASE}/contacts/match`, {
        method: "POST",
        headers: {
          "API_KEY": EXPLORIUM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts_to_match: [contactToMatch],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Contact match error:", response.status, errorText);
        throw new Error(`Contact match failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Match response:", JSON.stringify(data));
      return data.matched_contacts?.[0]?.contact_id || null;
    }

    // Enrich contact by contact_id
    async function enrichContact(contactId: string) {
      console.log("Enriching contact:", contactId);

      const response = await fetch(`${EXPLORIUM_API_BASE}/contacts/enrich`, {
        method: "POST",
        headers: {
          "api_key": EXPLORIUM_API_KEY,
          "accept": "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contact_ids: [contactId],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Contact enrich error:", response.status, errorText);
        throw new Error(`Contact enrichment failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Enrich response received");
      return data;
    }

    // Match business by name or domain
    async function matchBusiness(params: { company_name?: string; domain?: string }) {
      console.log("Matching business:", params);

      const response = await fetch(`${EXPLORIUM_API_BASE}/businesses/match`, {
        method: "POST",
        headers: {
          "API_KEY": EXPLORIUM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businesses_to_match: [{
            ...(params.company_name && { company_name: params.company_name }),
            ...(params.domain && { domain: params.domain }),
          }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Business match error:", response.status, errorText);
        throw new Error(`Business match failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.matched_businesses?.[0]?.business_id || null;
    }

    // Enrich business by business_id
    async function enrichBusiness(businessId: string) {
      console.log("Enriching business:", businessId);

      const response = await fetch(`${EXPLORIUM_API_BASE}/businesses/enrich`, {
        method: "POST",
        headers: {
          "api_key": EXPLORIUM_API_KEY,
          "accept": "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          business_id: businessId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Business enrich error:", response.status, errorText);
        throw new Error(`Business enrichment failed: ${response.status} - ${errorText}`);
      }

      return response.json();
    }

    // Full enrich flow
    async function fullEnrich(params: { linkedin?: string; email?: string; full_name?: string; company_name?: string }) {
      // Step 1: Match contact
      const contactId = await matchContact(params);
      if (!contactId) {
        throw new Error("Could not find contact in Explorium database");
      }

      // Step 2: Enrich contact
      const enrichData = await enrichContact(contactId);
      const contactData = enrichData.data?.[0] || enrichData[0] || {};

      // Extract fields from enriched data
      const profile = contactData;

      // Step 3: Try to enrich company if we have company info
      let companyData: Record<string, any> = {};
      const companyName = profile.company_name || profile.current_company || params.company_name;
      const companyDomain = profile.company_domain || profile.company_website;

      if (companyName || companyDomain) {
        try {
          const businessId = await matchBusiness({
            company_name: companyName,
            domain: companyDomain,
          });
          if (businessId) {
            const bizEnrich = await enrichBusiness(businessId);
            companyData = bizEnrich.data?.[0]?.data || bizEnrich.data?.[0] || bizEnrich || {};
            companyData.business_id = businessId;
          }
        } catch (e) {
          console.warn("Business enrichment failed:", e);
        }
      }

      // Parse full name
      const fullName = profile.full_name || profile.name || "";
      const nameParts = fullName.split(" ");

      // Return normalized data
      return {
        // Contact
        first_name: profile.first_name || nameParts[0] || "",
        last_name: profile.last_name || nameParts.slice(1).join(" ") || "",
        email: profile.email || profile.professional_email || profile.work_email,
        personal_email: profile.personal_email,
        phone: profile.phone || profile.work_phone || profile.office_phone,
        mobile_phone: profile.mobile_phone || profile.cell_phone,
        linkedin_url: params.linkedin || profile.linkedin_url || profile.linkedin,

        // Professional
        job_title: profile.job_title || profile.title || profile.current_title,
        job_department: profile.department || profile.job_department,
        job_seniority_level: profile.seniority || profile.job_seniority_level,
        skills: profile.skills || [],
        interests: profile.interests || [],
        education: profile.education || [],
        work_history: profile.experience || profile.work_history || [],
        age_group: profile.age_group,

        // Location
        location_city: profile.city || profile.location_city,
        location_region: profile.region || profile.state || profile.location_region,
        location_country: profile.country || profile.location_country,

        // Company
        company: companyName,
        company_domain: companyData.domain || companyDomain,
        company_linkedin: companyData.linkedin || profile.company_linkedin,
        company_industry: companyData.industry || profile.industry,
        company_size: companyData.size_range || companyData.company_size || profile.company_size,
        company_employee_count: companyData.employee_count || profile.company_employee_count,
        company_revenue: companyData.revenue_range || companyData.revenue,
        company_founded_year: companyData.founded_year || companyData.year_founded,
        company_hq_location: companyData.hq_location || companyData.headquarters,
        company_description: companyData.description || companyData.company_description,
        company_tech_stack: companyData.technologies || companyData.tech_stack || [],
        company_funding_total: companyData.total_funding || companyData.funding_total,
        company_latest_funding: companyData.latest_funding_round || companyData.latest_funding,

        // Metadata
        enriched_at: new Date().toISOString(),
        enrichment_source: "explorium",
        explorium_contact_id: contactId,
        explorium_business_id: companyData.business_id,
      };
    }

    let result: any;

    switch (body.action) {
      case "full_enrich":
        if (!body.linkedin && !body.email) {
          throw new Error("Must provide linkedin or email for full_enrich");
        }
        result = await fullEnrich(body);
        break;

      case "match_contact":
        result = { contact_id: await matchContact(body) };
        break;

      case "enrich_contact":
        if (!body.contact_id) throw new Error("contact_id required");
        result = await enrichContact(body.contact_id);
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
