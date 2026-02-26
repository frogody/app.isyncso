import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCredits, refundCredits } from '../_shared/credit-check.ts';

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
  user_id?: string;
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

    // Supabase admin client for cache operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // ── Credit check (5 credits for enrichment) ────────────────────
    if (body.user_id) {
      const credit = await requireCredits(supabaseAdmin, body.user_id, 'explorium-enrich', {
        edgeFunction: 'explorium-enrich',
        metadata: { action: body.action, linkedin: body.linkedin, email: body.email },
      });
      if (!credit.success) return credit.errorResponse!;
    }

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
      console.log("Enriching business firmographics:", businessId);

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

    // Enrich business technographics (tech stack by category)
    async function enrichBusinessTechnographics(businessId: string) {
      console.log("Enriching business technographics:", businessId);

      const response = await fetch(`${EXPLORIUM_API_BASE}/businesses/technographics/enrich`, {
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
        console.error("Business technographics error:", response.status, errorText);
        // Don't throw - return empty, this is optional enrichment
        return { data: {} };
      }

      return response.json();
    }

    // Enrich business funding & acquisitions
    async function enrichBusinessFunding(businessId: string) {
      console.log("Enriching business funding:", businessId);

      const response = await fetch(`${EXPLORIUM_API_BASE}/businesses/funding_and_acquisitions/enrich`, {
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
        console.error("Business funding error:", response.status, errorText);
        // Don't throw - return empty, this is optional enrichment
        return { data: {} };
      }

      return response.json();
    }

    // Enrich prospect social media presence
    async function enrichProspectSocial(prospectId: string) {
      console.log("Enriching prospect social:", prospectId);

      const response = await fetch(`${EXPLORIUM_API_BASE}/prospects/social_presence/enrich`, {
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Social presence error:", response.status, errorText);
        // Don't throw - return empty, this is optional enrichment
        return { data: {} };
      }

      return response.json();
    }

    // Full enrich flow - fetches ALL available data from Explorium
    async function fullEnrich(params: { linkedin?: string; email?: string; full_name?: string; company_name?: string }) {
      // Store raw data for comprehensive enrichment_data blob
      const rawEnrichment: Record<string, any> = {
        timestamp: new Date().toISOString(),
        source: "explorium",
        params,
      };

      // Step 1: Match prospect
      const prospectId = await matchProspect(params);
      if (!prospectId) {
        throw new Error("Could not find prospect in Explorium database. Try a different LinkedIn URL or email.");
      }
      rawEnrichment.prospect_id = prospectId;

      // Step 2: Enrich prospect profile (skills, experience, education)
      let profileData: Record<string, any> = {};
      try {
        const profileEnrich = await enrichProspectProfile(prospectId);
        profileData = profileEnrich.data || {};
        rawEnrichment.profile = profileEnrich;
      } catch (e: any) {
        console.warn("Profile enrichment failed:", e.message);
        rawEnrichment.profile_error = e.message;
      }

      // Step 3: Enrich prospect contacts (emails, phones)
      let contactData: Record<string, any> = {};
      try {
        const contactEnrich = await enrichProspectContacts(prospectId);
        const rawData = contactEnrich.data || {};
        contactData = {
          ...rawData,
          email: rawData.professions_email || rawData.emails?.[0]?.address,
          phone: rawData.phone_numbers?.[0] || rawData.mobile_phone,
        };
        rawEnrichment.contacts = contactEnrich;
      } catch (e: any) {
        console.warn("Contact enrichment failed:", e.message);
        rawEnrichment.contacts_error = e.message;
      }

      // Step 4: Enrich prospect social presence
      let socialData: Record<string, any> = {};
      try {
        const socialEnrich = await enrichProspectSocial(prospectId);
        socialData = socialEnrich.data || {};
        rawEnrichment.social = socialEnrich;
      } catch (e: any) {
        console.warn("Social enrichment failed:", e.message);
        rawEnrichment.social_error = e.message;
      }

      // Merge profile, contact, and social data
      const profile = { ...profileData, ...contactData, ...socialData };

      // Step 5: Try to enrich company if we have company info
      let companyData: Record<string, any> = {};
      let techData: Record<string, any> = {};
      let fundingData: Record<string, any> = {};
      const companyName = profile.company_name || profile.current_company || params.company_name;
      const companyDomain = profile.company_domain || profile.company_website;

      if (companyName || companyDomain) {
        try {
          const businessId = await matchBusiness({
            company_name: companyName,
            domain: companyDomain,
          });
          if (businessId) {
            rawEnrichment.business_id = businessId;

            // 5a: Firmographics (basic company info)
            try {
              const bizEnrich = await enrichBusiness(businessId);
              // Firmographics response is { data: {...}, entity_id: ..., response_context: {...} }
              // NOT an array like other endpoints
              const rawFirmographics = bizEnrich.data || bizEnrich || {};
              companyData = {
                business_id: businessId,
                // Map API fields to our normalized field names
                name: rawFirmographics.name,
                domain: rawFirmographics.website?.replace(/^https?:\/\//, '').replace(/\/$/, ''),
                linkedin: rawFirmographics.linkedin_profile,
                industry: rawFirmographics.linkedin_industry_category,
                size_range: rawFirmographics.number_of_employees_range,
                employee_count: null, // API returns range, not exact count
                revenue_range: rawFirmographics.yearly_revenue_range,
                hq_location: [rawFirmographics.city_name, rawFirmographics.region_name, rawFirmographics.country_name].filter(Boolean).join(', ') || rawFirmographics.country_name,
                description: rawFirmographics.business_description,
                logo_url: rawFirmographics.business_logo,
                naics: rawFirmographics.naics,
                naics_description: rawFirmographics.naics_description,
                sic_code: rawFirmographics.sic_code,
                sic_code_description: rawFirmographics.sic_code_description,
                ticker: rawFirmographics.ticker,
                locations_distribution: rawFirmographics.locations_distribution,
              };
              rawEnrichment.firmographics = bizEnrich;
            } catch (e: any) {
              console.warn("Firmographics enrichment failed:", e.message);
              rawEnrichment.firmographics_error = e.message;
            }

            // 5b: Technographics (tech stack by category)
            try {
              const techEnrich = await enrichBusinessTechnographics(businessId);
              techData = techEnrich.data || {};
              rawEnrichment.technographics = techEnrich;
            } catch (e: any) {
              console.warn("Technographics enrichment failed:", e.message);
              rawEnrichment.technographics_error = e.message;
            }

            // 5c: Funding & Acquisitions
            try {
              const fundEnrich = await enrichBusinessFunding(businessId);
              fundingData = fundEnrich.data || {};
              rawEnrichment.funding = fundEnrich;
            } catch (e: any) {
              console.warn("Funding enrichment failed:", e.message);
              rawEnrichment.funding_error = e.message;
            }
          }
        } catch (e: any) {
          console.warn("Business match failed:", e.message);
          rawEnrichment.business_match_error = e.message;
        }
      }

      // Parse full name
      const fullName = profile.full_name || profile.name || "";
      const nameParts = fullName.split(" ");

      // Build tech stack array and categories object
      const techStack: string[] = [];
      const techCategories: Record<string, string[]> = {};
      if (techData.technologies) {
        // API might return technologies as array or categorized object
        if (Array.isArray(techData.technologies)) {
          techStack.push(...techData.technologies);
        } else if (typeof techData.technologies === "object") {
          for (const [category, techs] of Object.entries(techData.technologies)) {
            if (Array.isArray(techs)) {
              techCategories[category] = techs as string[];
              techStack.push(...(techs as string[]));
            }
          }
        }
      }
      // Also check for category-specific fields like crm_technologies, analytics_technologies, etc.
      const techCategoryFields = [
        "crm_technologies", "marketing_automation_technologies", "analytics_technologies",
        "ecommerce_technologies", "cms_technologies", "email_technologies",
        "hosting_technologies", "cdn_technologies", "payment_technologies",
        "advertising_technologies", "customer_support_technologies", "hr_technologies",
        "accounting_technologies", "project_management_technologies", "security_technologies",
        "cloud_technologies", "database_technologies", "programming_languages",
        "frameworks_technologies", "devops_technologies", "collaboration_technologies",
        "video_conferencing_technologies", "social_media_technologies",
      ];
      for (const field of techCategoryFields) {
        if (techData[field] && Array.isArray(techData[field])) {
          const categoryName = field.replace("_technologies", "").replace(/_/g, " ");
          techCategories[categoryName] = techData[field];
          techStack.push(...techData[field]);
        }
      }

      // Build funding information
      const fundingRounds = fundingData.funding_rounds || fundingData.rounds || [];
      const investors = fundingData.investors || [];
      const lastFunding = fundingRounds.length > 0 ? fundingRounds[fundingRounds.length - 1] : null;

      // Build social profiles object
      const socialProfiles: Record<string, string> = {};
      if (socialData.twitter || profile.twitter) socialProfiles.twitter = socialData.twitter || profile.twitter;
      if (socialData.facebook || profile.facebook) socialProfiles.facebook = socialData.facebook || profile.facebook;
      if (socialData.github || profile.github) socialProfiles.github = socialData.github || profile.github;
      if (socialData.instagram || profile.instagram) socialProfiles.instagram = socialData.instagram || profile.instagram;

      // Return normalized data with ALL fields
      return {
        // Contact
        first_name: profile.first_name || nameParts[0] || "",
        last_name: profile.last_name || nameParts.slice(1).join(" ") || "",
        email: profile.email || profile.professions_email || profile.professional_email || profile.work_email,
        email_status: profile.email_status || profile.email_validity,
        personal_email: profile.personal_email,
        phone: profile.phone || profile.work_phone || profile.office_phone,
        mobile_phone: profile.mobile_phone || profile.cell_phone,
        work_phone: profile.work_phone || profile.direct_phone,
        linkedin_url: params.linkedin || profile.linkedin_url || profile.linkedin,

        // Professional
        job_title: profile.job_title || profile.title || profile.current_title,
        job_department: profile.department || profile.job_department || profile.job_department_main,
        job_seniority_level: profile.seniority || profile.job_seniority_level || profile.job_level_main,
        skills: profile.skills || [],
        interests: profile.interests || [],
        education: profile.education || [],
        work_history: profile.experience || profile.work_history || [],
        certifications: profile.certifications || [],
        age_group: profile.age_group,
        gender: profile.gender,

        // Location
        location_city: profile.city || profile.location_city,
        location_region: profile.region_name || profile.region || profile.state || profile.location_region,
        location_country: profile.country_name || profile.country || profile.location_country,

        // Company basic info (from firmographics enrichment)
        company: companyData.name || profile.company_name || companyName,
        company_domain: companyData.domain || profile.company_website?.replace(/^https?:\/\//, '').replace(/\/$/, '') || companyDomain,
        company_linkedin: companyData.linkedin || profile.company_linkedin,
        company_industry: companyData.industry || profile.industry,
        company_size: companyData.size_range || profile.company_size,
        company_employee_count: companyData.employee_count || profile.company_employee_count,
        company_revenue: companyData.revenue_range,
        company_founded_year: companyData.founded_year,
        company_hq_location: companyData.hq_location,
        company_description: companyData.description,
        company_logo_url: companyData.logo_url,
        company_naics: companyData.naics,
        company_naics_description: companyData.naics_description,
        company_sic_code: companyData.sic_code,
        company_sic_code_description: companyData.sic_code_description,
        company_locations_distribution: companyData.locations_distribution,

        // Technology stack (from technographics enrichment)
        company_tech_stack: [...new Set(techStack)], // Deduplicated array
        company_tech_categories: techCategories,

        // Funding & growth (from funding enrichment)
        company_funding_total: fundingData.total_funding || fundingData.funding_total || companyData.total_funding,
        company_funding_rounds: fundingRounds,
        company_investors: investors,
        company_last_funding: lastFunding,
        company_is_ipo: fundingData.is_ipo || fundingData.is_public || false,
        company_ticker: fundingData.ticker || fundingData.stock_symbol,

        // Social media presence
        social_profiles: socialProfiles,
        social_activity: socialData.activity || {},

        // Intent signals (if available)
        intent_topics: profile.intent_topics || companyData.intent_topics || [],

        // Full raw enrichment data for flexible display
        enrichment_data: rawEnrichment,

        // Metadata
        enriched_at: new Date().toISOString(),
        enrichment_source: "explorium",
        explorium_prospect_id: prospectId,
        explorium_business_id: companyData.business_id,
      };
    }

    let result: any;

    switch (body.action) {
      case "full_enrich": {
        if (!body.linkedin && !body.email) {
          throw new Error("Must provide linkedin or email for full_enrich");
        }

        // Check prospect cache first
        const cacheKey = (body.linkedin || body.email)!.toLowerCase().trim();
        const cacheField = body.linkedin ? "linkedin_url" : "email";

        const { data: cached } = await supabaseAdmin
          .from("enrichment_cache_prospects")
          .select("*")
          .eq(cacheField, cacheKey)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (cached) {
          console.log(`Cache HIT for ${cacheField}=${cacheKey} (hits: ${cached.hit_count})`);
          await supabaseAdmin
            .from("enrichment_cache_prospects")
            .update({ hit_count: cached.hit_count + 1, last_hit_at: new Date().toISOString() })
            .eq("id", cached.id);
          result = cached.enrichment_data;
          break;
        }

        console.log(`Cache MISS for ${cacheField}=${cacheKey}, calling Explorium`);
        result = await fullEnrich(body);

        // Save to cache (fire-and-forget)
        const upsertData: Record<string, any> = {
          enrichment_data: result,
          explorium_prospect_id: result.explorium_prospect_id || null,
          explorium_business_id: result.explorium_business_id || null,
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          hit_count: 1,
          last_hit_at: new Date().toISOString(),
        };
        if (body.linkedin) upsertData.linkedin_url = body.linkedin.toLowerCase().trim();
        if (body.email) upsertData.email = body.email.toLowerCase().trim();
        if (result.linkedin_url && !upsertData.linkedin_url) upsertData.linkedin_url = result.linkedin_url.toLowerCase().trim();
        if (result.email && !upsertData.email) upsertData.email = result.email.toLowerCase().trim();

        supabaseAdmin
          .from("enrichment_cache_prospects")
          .upsert(upsertData, { onConflict: cacheField })
          .then(({ error }) => { if (error) console.error("Cache save error:", error); });

        break;
      }

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
