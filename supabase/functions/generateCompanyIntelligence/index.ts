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

// Parse tech stack into categories - handles Explorium nested format
function parseTechStack(techData: any): any {
  if (!techData) return null;

  // Explorium returns data nested in .data property
  const source = techData.data || techData;

  // Check for full_nested_tech_stack array (Explorium format: [{category, techs}])
  const nestedStack = source.full_nested_tech_stack;
  if (Array.isArray(nestedStack) && nestedStack.length > 0) {
    const categories: any[] = [];
    let totalTech = 0;

    for (const cat of nestedStack) {
      const techs = cat.techs || cat.technologies || [];
      if (techs.length > 0) {
        categories.push({
          category: (cat.category || 'Other').replace(/_/g, ' '),
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

  // Fallback: check for flat category objects
  const techStack = source.tech_stack || source.technologies;
  if (techStack && typeof techStack === 'object' && !Array.isArray(techStack)) {
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

  // If we have any data, return it as raw
  if (source.full_tech_stack || Object.keys(source).length > 1) {
    return { raw: source };
  }

  return null;
}

// Parse workforce trends - handles Explorium nested format
function parseWorkforce(data: any): any {
  if (!data) return null;

  // Explorium returns data nested in .data property
  const source = data.data || data;

  // Extract department percentages
  const departments: any[] = [];
  const deptFields = [
    { key: 'perc_finance_roles', name: 'Finance' },
    { key: 'perc_engineering_roles', name: 'Engineering' },
    { key: 'perc_sales_roles', name: 'Sales' },
    { key: 'perc_marketing_roles', name: 'Marketing' },
    { key: 'perc_hr_roles', name: 'HR' },
    { key: 'perc_operations_roles', name: 'Operations' },
    { key: 'perc_legal_roles', name: 'Legal' },
    { key: 'perc_design_roles', name: 'Design' },
    { key: 'perc_customer_service_roles', name: 'Customer Service' },
    { key: 'perc_education_roles', name: 'Education' },
  ];

  for (const dept of deptFields) {
    if (source[dept.key] && source[dept.key] > 0) {
      departments.push({ name: dept.name, percentage: source[dept.key] });
    }
  }

  // Sort by percentage descending
  departments.sort((a, b) => b.percentage - a.percentage);

  return {
    total_employees: source.profiles_found_per_quarter || source.total_employees || source.employee_count,
    departments: departments.length > 0 ? departments : null,
    growth_rate: source.growth_rate || source.employee_growth_rate || source.change_in_roles_divisor,
    hiring_trend: source.hiring_trend,
    attrition_rate: source.attrition_rate,
  };
}

// Parse employee ratings - handles Explorium nested format
function parseRatings(data: any): any {
  if (!data) return null;

  // Explorium returns data nested in .data property
  const source = data.data || data;

  return {
    overall_rating: source.overall_rating || source.rating,
    culture_rating: source.culture_rating || source.culture_and_values,
    work_life_balance: source.work_life_balance || source.work_life_balance_rating,
    compensation_rating: source.compensation_rating || source.compensation_and_benefits,
    career_opportunities: source.career_opportunities || source.career_opportunities_rating,
    management_rating: source.management_rating || source.senior_management,
    recommend_percent: source.recommend_to_friend || source.recommend_percent,
    ceo_approval: source.ceo_approval || source.approve_of_ceo,
    review_count: source.review_count || source.number_of_reviews,
  };
}

// Parse social media - handles Explorium nested format
function parseSocialMedia(data: any): any {
  if (!data) return null;

  // Explorium returns data nested in .data property
  const source = data.data || data;

  return {
    linkedin_followers: source.linkedin_followers || source.linkedin?.followers,
    twitter_followers: source.twitter_followers || source.twitter?.followers,
    facebook_followers: source.facebook_followers || source.facebook?.followers,
    linkedin_url: source.linkedin_url || source.linkedin?.url,
    twitter_url: source.twitter_url || source.twitter?.url,
    facebook_url: source.facebook_url || source.facebook?.url,
    posting_frequency: source.posting_frequency,
    engagement_rate: source.engagement_rate,
  };
}

// Parse competitors - handles Explorium nested format
function parseCompetitors(data: any): any {
  if (!data) return null;

  // Explorium returns data nested in .data property
  const source = data.data || data;

  const competitors = source.competitors || source.competitive_landscape || (Array.isArray(source) ? source : null);

  if (Array.isArray(competitors) && competitors.length > 0) {
    return {
      competitors: competitors.map((c: any) => ({
        name: c.name || c.company_name,
        domain: c.domain || c.website,
        similarity_score: c.similarity_score || c.score,
      })),
    };
  }

  return null;
}

// Parse website traffic - handles Explorium nested format
function parseTraffic(data: any): any {
  if (!data) return null;

  // Explorium returns data nested in .data property
  const source = data.data || data;

  // Traffic sources breakdown
  const trafficSources: any = {};
  if (source.direct) trafficSources.direct = source.direct;
  if (source.search) trafficSources.search = source.search;
  if (source.search_organic) trafficSources.organic = source.search_organic;
  if (source.paid) trafficSources.paid = source.paid;
  if (source.referral) trafficSources.referral = source.referral;
  if (source.mail) trafficSources.email = source.mail;
  if (source.social_paid) trafficSources.social = source.social_paid;

  // Format time on site to readable format
  let avgDuration = null;
  if (source.time_on_site) {
    const seconds = Math.round(source.time_on_site);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    avgDuration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  return {
    monthly_visits: source.visits || source.monthly_visits || source.total_visits,
    unique_visitors: source.users || source.unique_visitors,
    page_views: source.page_views || (source.pages_per_visit && source.visits ? Math.round(source.pages_per_visit * source.visits) : null),
    pages_per_visit: source.pages_per_visit,
    bounce_rate: source.bounce_rate ? Math.round(source.bounce_rate * 100) : null,
    avg_visit_duration: avgDuration || source.avg_visit_duration || source.average_visit_duration,
    traffic_sources: Object.keys(trafficSources).length > 0 ? trafficSources : null,
    rank: source.rank,
    period: source.month_period,
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
