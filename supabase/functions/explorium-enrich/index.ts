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

    // Match prospect by LinkedIn, email, or name+company
    // Updated to use new Explorium API endpoints (/v1/prospects/ instead of /v1/contacts/)
    // Field names per docs: linkedin (not linkedin_url), email, full_name, company_name
    async function matchProspect(params: { linkedin?: string; email?: string; full_name?: string; company_name?: string; company_domain?: string }) {
      // Only include fields with actual values (API doesn't like null values)
      const prospectToMatch: Record<string, string> = {};
      if (params.linkedin) prospectToMatch.linkedin = params.linkedin;
      if (params.email) prospectToMatch.email = params.email;
      if (params.full_name) prospectToMatch.full_name = params.full_name;
      if (params.company_name) prospectToMatch.company_name = params.company_name;

      console.log("Matching prospect with params:", JSON.stringify(prospectToMatch));

      const requestBody = {
        prospects_to_match: [prospectToMatch],
        request_context: {},
      };
      console.log("Explorium request body:", JSON.stringify(requestBody));

      const response = await fetch(`${EXPLORIUM_API_BASE}/prospects/match`, {
        method: "POST",
        headers: {
          "API_KEY": EXPLORIUM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Prospect match error:", response.status, errorText);
        throw new Error(`Prospect match failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Match response:", JSON.stringify(data));
      return data.matched_prospects?.[0]?.prospect_id || null;
    }

    // Enrich prospect profile (skills, experience, education)
    async function enrichProspectProfile(prospectId: string) {
      console.log("Enriching prospect profile:", prospectId);

      const response = await fetch(`${EXPLORIUM_API_BASE}/prospects/profiles/enrich`, {
        method: "POST",
        headers: {
          "API_KEY": EXPLORIUM_API_KEY,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prospect_id: prospectId,
        }),
      });

      const responseText = await response.text();
      console.log("Profile enrich response status:", response.status);
      console.log("Profile enrich response body:", responseText);

      if (!response.ok) {
        console.error("Profile enrich error:", response.status, responseText);
        throw new Error(`Profile enrichment failed: ${response.status} - ${responseText}`);
      }

      try {
        return JSON.parse(responseText);
      } catch {
        console.error("Failed to parse profile response as JSON:", responseText);
        return {};
      }
    }

    // Enrich prospect contact info (emails, phones)
    async function enrichProspectContacts(prospectId: string) {
      console.log("Enriching prospect contacts:", prospectId);

      const response = await fetch(`${EXPLORIUM_API_BASE}/prospects/contacts_information/enrich`, {
        method: "POST",
        headers: {
          "API_KEY": EXPLORIUM_API_KEY,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prospect_id: prospectId,
        }),
      });

      const responseText = await response.text();
      console.log("Contacts enrich response status:", response.status);
      console.log("Contacts enrich response body:", responseText);

      if (!response.ok) {
        console.error("Contact info enrich error:", response.status, responseText);
        throw new Error(`Contact info enrichment failed: ${response.status} - ${responseText}`);
      }

      try {
        return JSON.parse(responseText);
      } catch {
        console.error("Failed to parse contacts response as JSON:", responseText);
        return {};
      }
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

    // Enrich business firmographics by business_id
    async function enrichBusiness(businessId: string) {
      console.log("Enriching business:", businessId);

      const response = await fetch(`${EXPLORIUM_API_BASE}/businesses/firmographics/enrich`, {
        method: "POST",
        headers: {
          "API_KEY": EXPLORIUM_API_KEY,
          "Accept": "application/json",
          "Content-Type": "application/json",
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
      // Step 1: Match prospect
      const prospectId = await matchProspect(params);
      if (!prospectId) {
        throw new Error("Could not find prospect in Explorium database. Try a different LinkedIn URL or email.");
      }

      // Step 2: Enrich prospect profile (skills, experience, education)
      let profileData: Record<string, any> = {};
      try {
        const profileEnrich = await enrichProspectProfile(prospectId);
        // API returns { data: {...}, entity_id: "..." } - data is an object, not an array
        profileData = profileEnrich.data || {};
      } catch (e: any) {
        console.warn("Profile enrichment failed:", e.message);
      }

      // Step 3: Enrich prospect contacts (emails, phones)
      let contactData: Record<string, any> = {};
      try {
        const contactEnrich = await enrichProspectContacts(prospectId);
        // API returns { data: {...}, entity_id: "..." } - data is an object, not an array
        // Extract email from emails array if present
        const rawData = contactEnrich.data || {};
        contactData = {
          ...rawData,
          email: rawData.professions_email || rawData.emails?.[0]?.address,
          phone: rawData.phone_numbers?.[0] || rawData.mobile_phone,
        };
      } catch (e: any) {
        console.warn("Contact enrichment failed:", e.message);
      }

      // Merge profile and contact data
      const profile = { ...profileData, ...contactData };

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
        email: profile.email || profile.professions_email || profile.professional_email || profile.work_email,
        personal_email: profile.personal_email,
        phone: profile.phone || profile.work_phone || profile.office_phone,
        mobile_phone: profile.mobile_phone || profile.cell_phone,
        linkedin_url: params.linkedin || profile.linkedin_url || profile.linkedin,

        // Professional
        job_title: profile.job_title || profile.title || profile.current_title,
        job_department: profile.department || profile.job_department || profile.job_department_main,
        job_seniority_level: profile.seniority || profile.job_seniority_level || profile.job_level_main,
        skills: profile.skills || [],
        interests: profile.interests || [],
        education: profile.education || [],
        work_history: profile.experience || profile.work_history || [],
        age_group: profile.age_group,
        gender: profile.gender,

        // Location
        location_city: profile.city || profile.location_city,
        location_region: profile.region_name || profile.region || profile.state || profile.location_region,
        location_country: profile.country_name || profile.country || profile.location_country,

        // Company (from profile data first, then fallback to business enrichment)
        company: profile.company_name || companyName,
        company_domain: profile.company_website || companyData.domain || companyDomain,
        company_linkedin: profile.company_linkedin || companyData.linkedin,
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
        explorium_prospect_id: prospectId,
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

      case "match_prospect":
      case "match_contact": // Legacy support
        result = { prospect_id: await matchProspect(body) };
        break;

      case "enrich_profile":
      case "enrich_contact": // Legacy support
        if (!body.prospect_id && !body.contact_id) throw new Error("prospect_id required");
        result = await enrichProspectProfile(body.prospect_id || body.contact_id);
        break;

      case "enrich_contacts":
        if (!body.prospect_id) throw new Error("prospect_id required");
        result = await enrichProspectContacts(body.prospect_id);
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
