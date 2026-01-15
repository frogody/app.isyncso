import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPLORIUM_API_KEY = Deno.env.get("EXPLORIUM_API_KEY");

interface CompanyInput {
  name: string;
  domain?: string;
}

// Match business to get Explorium business_id
async function matchBusiness(company: CompanyInput): Promise<string | null> {
  if (!EXPLORIUM_API_KEY) {
    console.error("EXPLORIUM_API_KEY not configured");
    return null;
  }

  try {
    console.log(`Matching business: ${company.name} (${company.domain || 'no domain'})`);

    const response = await fetch("https://api.explorium.ai/v1/businesses/match", {
      method: "POST",
      headers: {
        "API_KEY": EXPLORIUM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businesses_to_match: [{
          name: company.name,
          domain: company.domain || null,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Business match failed:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("Match response:", JSON.stringify(data, null, 2));

    const businessId = data.matched_businesses?.[0]?.business_id;
    if (businessId) {
      console.log(`Matched business_id: ${businessId}`);
    } else {
      console.log("No business_id found in match response");
    }

    return businessId || null;
  } catch (error) {
    console.error("Business match error:", error);
    return null;
  }
}

// Generic enrichment fetcher
async function fetchEnrichment(endpoint: string, businessId: string, enrichmentName: string): Promise<any> {
  if (!EXPLORIUM_API_KEY) return null;

  try {
    console.log(`Fetching ${enrichmentName} for ${businessId}...`);

    const response = await fetch(`https://api.explorium.ai/v1${endpoint}`, {
      method: "POST",
      headers: {
        "api_key": EXPLORIUM_API_KEY,
        "accept": "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ business_ids: [businessId] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${enrichmentName} fetch failed:`, response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log(`${enrichmentName} response:`, JSON.stringify(data, null, 2).substring(0, 500));

    return data.data?.[0] || data;
  } catch (error) {
    console.error(`${enrichmentName} error:`, error);
    return null;
  }
}

// Fetch firmographics
async function getFirmographics(businessId: string) {
  return fetchEnrichment("/businesses/firmographics/bulk_enrich", businessId, "Firmographics");
}

// Fetch technographics
async function getTechnographics(businessId: string) {
  return fetchEnrichment("/businesses/technographics/bulk_enrich", businessId, "Technographics");
}

// Fetch funding and acquisitions
async function getFunding(businessId: string) {
  return fetchEnrichment("/businesses/funding_and_acquisition/bulk_enrich", businessId, "Funding");
}

// Fetch company social media presence
async function getSocialMedia(businessId: string) {
  return fetchEnrichment("/businesses/social_media_presence/bulk_enrich", businessId, "Social Media");
}

// Fetch employee ratings (Glassdoor-style)
async function getEmployeeRatings(businessId: string) {
  return fetchEnrichment("/businesses/company_ratings/bulk_enrich", businessId, "Employee Ratings");
}

// Fetch workforce trends
async function getWorkforceTrends(businessId: string) {
  return fetchEnrichment("/businesses/workforce_trends/bulk_enrich", businessId, "Workforce Trends");
}

// Fetch competitive landscape
async function getCompetitors(businessId: string) {
  return fetchEnrichment("/businesses/competitive_landscape/bulk_enrich", businessId, "Competitors");
}

// Fetch website traffic
async function getWebsiteTraffic(businessId: string) {
  return fetchEnrichment("/businesses/website_traffic/bulk_enrich", businessId, "Website Traffic");
}

// Parse tech stack into categories
function parseTechStack(techData: any): any {
  if (!techData) return null;

  // Check different possible field names
  const techStack = techData.full_nested_tech_stack || techData.tech_stack || techData.technologies;

  if (!techStack) {
    console.log("No tech stack found in:", JSON.stringify(techData).substring(0, 200));
    return { raw: techData };
  }

  if (typeof techStack === 'object' && !Array.isArray(techStack)) {
    const categories: any[] = [];
    let totalTech = 0;

    for (const [category, techs] of Object.entries(techStack)) {
      if (Array.isArray(techs) && techs.length > 0) {
        categories.push({
          category: category.replace(/_/g, ' '),
          technologies: techs,
        });
        totalTech += techs.length;
      }
    }

    return {
      tech_stack: categories,
      tech_count: totalTech,
    };
  }

  return { raw: techData };
}

// Parse workforce trends
function parseWorkforce(data: any): any {
  if (!data) return null;

  return {
    total_employees: data.total_employees || data.employee_count,
    departments: data.departments || data.department_distribution,
    growth_rate: data.growth_rate || data.employee_growth_rate,
    hiring_trend: data.hiring_trend,
    attrition_rate: data.attrition_rate,
    raw: data,
  };
}

// Parse employee ratings
function parseRatings(data: any): any {
  if (!data) return null;

  return {
    overall_rating: data.overall_rating || data.rating,
    culture_rating: data.culture_rating || data.culture_and_values,
    work_life_balance: data.work_life_balance || data.work_life_balance_rating,
    compensation_rating: data.compensation_rating || data.compensation_and_benefits,
    career_opportunities: data.career_opportunities || data.career_opportunities_rating,
    management_rating: data.management_rating || data.senior_management,
    recommend_percent: data.recommend_to_friend || data.recommend_percent,
    ceo_approval: data.ceo_approval || data.approve_of_ceo,
    review_count: data.review_count || data.number_of_reviews,
    raw: data,
  };
}

// Parse social media
function parseSocialMedia(data: any): any {
  if (!data) return null;

  return {
    linkedin_followers: data.linkedin_followers || data.linkedin?.followers,
    twitter_followers: data.twitter_followers || data.twitter?.followers,
    facebook_followers: data.facebook_followers || data.facebook?.followers,
    linkedin_url: data.linkedin_url || data.linkedin?.url,
    twitter_url: data.twitter_url || data.twitter?.url,
    facebook_url: data.facebook_url || data.facebook?.url,
    posting_frequency: data.posting_frequency,
    engagement_rate: data.engagement_rate,
    raw: data,
  };
}

// Parse competitors
function parseCompetitors(data: any): any {
  if (!data) return null;

  const competitors = data.competitors || data.competitive_landscape || data;

  if (Array.isArray(competitors)) {
    return {
      competitors: competitors.map((c: any) => ({
        name: c.name || c.company_name,
        domain: c.domain || c.website,
        similarity_score: c.similarity_score || c.score,
      })),
    };
  }

  return { raw: data };
}

// Parse website traffic
function parseTraffic(data: any): any {
  if (!data) return null;

  return {
    monthly_visits: data.monthly_visits || data.total_visits,
    unique_visitors: data.unique_visitors,
    page_views: data.page_views,
    bounce_rate: data.bounce_rate,
    avg_visit_duration: data.avg_visit_duration || data.average_visit_duration,
    traffic_sources: data.traffic_sources,
    top_countries: data.top_countries || data.geography,
    raw: data,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, companyDomain, entityType, entityId } = await req.json();

    if (!companyName) {
      return new Response(
        JSON.stringify({ error: "Company name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!EXPLORIUM_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Explorium API not configured. Set EXPLORIUM_API_KEY in edge function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`=== Generating company intelligence for: ${companyName} ===`);

    // Step 1: Match the business
    const businessId = await matchBusiness({ name: companyName, domain: companyDomain });

    if (!businessId) {
      return new Response(
        JSON.stringify({
          error: `Company "${companyName}" not found in Explorium database`,
          intelligence: null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Fetch ALL available enrichments in parallel
    const [
      firmographicsRaw,
      technographicsRaw,
      fundingRaw,
      socialMediaRaw,
      employeeRatingsRaw,
      workforceTrendsRaw,
      competitorsRaw,
      websiteTrafficRaw,
    ] = await Promise.all([
      getFirmographics(businessId),
      getTechnographics(businessId),
      getFunding(businessId),
      getSocialMedia(businessId),
      getEmployeeRatings(businessId),
      getWorkforceTrends(businessId),
      getCompetitors(businessId),
      getWebsiteTraffic(businessId),
    ]);

    // Step 3: Parse and structure all data
    const intelligence = {
      business_id: businessId,

      // Firmographics (company basics)
      firmographics: firmographicsRaw ? {
        company_name: firmographicsRaw.name || firmographicsRaw.company_name,
        description: firmographicsRaw.business_description || firmographicsRaw.description,
        logo_url: firmographicsRaw.business_logo || firmographicsRaw.logo,
        website: firmographicsRaw.website || firmographicsRaw.domain,
        linkedin_url: firmographicsRaw.linkedin_profile || firmographicsRaw.linkedin_url,

        // Industry
        industry: firmographicsRaw.linkedin_industry_category || firmographicsRaw.industry,
        naics_code: firmographicsRaw.naics,
        naics_description: firmographicsRaw.naics_description,
        sic_code: firmographicsRaw.sic_code,
        sic_description: firmographicsRaw.sic_code_description,

        // Size & Revenue
        employee_count_range: firmographicsRaw.number_of_employees_range || firmographicsRaw.employee_count_range,
        employee_count: firmographicsRaw.employee_count || firmographicsRaw.number_of_employees,
        revenue_range: firmographicsRaw.yearly_revenue_range || firmographicsRaw.revenue_range,

        // Location
        country: firmographicsRaw.country_name || firmographicsRaw.country,
        state: firmographicsRaw.region_name || firmographicsRaw.state,
        city: firmographicsRaw.city_name || firmographicsRaw.city,
        street: firmographicsRaw.street,
        zip_code: firmographicsRaw.zip_code,
        headquarters: [
          firmographicsRaw.city_name || firmographicsRaw.city,
          firmographicsRaw.region_name || firmographicsRaw.state,
          firmographicsRaw.country_name || firmographicsRaw.country
        ].filter(Boolean).join(", "),

        // Additional
        founded_year: firmographicsRaw.founded_year || firmographicsRaw.year_founded,
        company_type: firmographicsRaw.company_type || firmographicsRaw.type,
        ticker: firmographicsRaw.ticker || firmographicsRaw.stock_ticker,
        locations_count: firmographicsRaw.locations_distribution?.length,
      } : null,

      // Funding & Acquisitions
      funding: fundingRaw ? {
        total_funding: fundingRaw.total_funding_amount || fundingRaw.total_funding,
        funding_stage: fundingRaw.funding_stage || fundingRaw.last_funding_type,
        last_funding_date: fundingRaw.last_funding_date,
        last_funding_amount: fundingRaw.last_funding_amount,
        funding_rounds: fundingRaw.funding_rounds?.map((r: any) => ({
          round_type: r.funding_type || r.round_type || r.type,
          amount: r.amount || r.funding_amount,
          date: r.date || r.funding_date,
          investors: r.investors || r.lead_investors,
        })) || [],
        acquisitions: fundingRaw.acquisitions?.map((a: any) => ({
          company_name: a.acquired_company || a.company_name || a.name,
          acquired_by: a.acquired_by || a.acquirer,
          acquisition_date: a.date || a.acquisition_date,
          acquisition_price: a.price || a.acquisition_price,
        })) || [],
        ipo_date: fundingRaw.ipo_date,
        is_public: fundingRaw.is_public || !!fundingRaw.ticker,
      } : null,

      // Tech Stack
      technographics: parseTechStack(technographicsRaw),

      // Employee Ratings (Glassdoor-style)
      employee_ratings: parseRatings(employeeRatingsRaw),

      // Social Media Presence
      social_media: parseSocialMedia(socialMediaRaw),

      // Workforce Trends
      workforce: parseWorkforce(workforceTrendsRaw),

      // Competitors
      competitive_landscape: parseCompetitors(competitorsRaw),

      // Website Traffic
      website_traffic: parseTraffic(websiteTrafficRaw),

      // Metadata
      enriched_at: new Date().toISOString(),
      source: "explorium",
      data_quality: {
        has_firmographics: !!firmographicsRaw,
        has_funding: !!fundingRaw,
        has_tech_stack: !!technographicsRaw,
        has_ratings: !!employeeRatingsRaw,
        has_social: !!socialMediaRaw,
        has_workforce: !!workforceTrendsRaw,
        has_competitors: !!competitorsRaw,
        has_traffic: !!websiteTrafficRaw,
        completeness: [
          firmographicsRaw, fundingRaw, technographicsRaw, employeeRatingsRaw,
          socialMediaRaw, workforceTrendsRaw, competitorsRaw, websiteTrafficRaw
        ].filter(Boolean).length,
      },
    };

    console.log("=== Intelligence summary ===");
    console.log("Data quality:", JSON.stringify(intelligence.data_quality));

    // Step 4: Optionally store in database if entityType and entityId provided
    if (entityType && entityId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const updateData = {
        company_intelligence: intelligence,
        company_intelligence_updated_at: new Date().toISOString(),
      };

      let updateResult;
      if (entityType === "candidate") {
        updateResult = await supabase
          .from("candidates")
          .update(updateData)
          .eq("id", entityId);
      } else if (entityType === "prospect") {
        updateResult = await supabase
          .from("prospects")
          .update(updateData)
          .eq("id", entityId);
      } else if (entityType === "contact") {
        updateResult = await supabase
          .from("contacts")
          .update(updateData)
          .eq("id", entityId);
      }

      if (updateResult?.error) {
        console.error("Failed to save intelligence:", updateResult.error);
      } else {
        console.log(`Saved company intelligence for ${entityType} ${entityId}`);
      }
    }

    return new Response(
      JSON.stringify({ intelligence, success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Company intelligence error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
