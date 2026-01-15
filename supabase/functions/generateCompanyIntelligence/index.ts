import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyInput {
  name: string;
  domain?: string;
}

interface FirmographicData {
  company_name?: string;
  industry?: string;
  employee_count?: number;
  employee_count_range?: string;
  revenue?: string;
  estimated_revenue?: string;
  founded_year?: number;
  company_type?: string;
  description?: string;
  website?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  headquarters?: string;
}

interface FundingRound {
  round_type?: string;
  amount?: number;
  date?: string;
  investors?: string[];
}

interface AcquisitionData {
  acquired_by?: string;
  acquisition_date?: string;
  acquisition_price?: number;
}

interface TechCategory {
  category: string;
  technologies: string[];
}

interface CompanyIntelligence {
  firmographics: FirmographicData | null;
  funding: {
    total_funding?: number;
    funding_stage?: string;
    last_funding_date?: string;
    funding_rounds?: FundingRound[];
    acquisitions?: AcquisitionData[];
  } | null;
  technographics: {
    tech_stack?: TechCategory[];
    tech_count?: number;
  } | null;
  enriched_at: string;
  source: string;
}

const EXPLORIUM_API_KEY = Deno.env.get("EXPLORIUM_API_KEY");

async function matchBusiness(company: CompanyInput): Promise<string | null> {
  if (!EXPLORIUM_API_KEY) {
    console.error("EXPLORIUM_API_KEY not configured");
    return null;
  }

  try {
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
      console.error("Business match failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.matched_businesses?.[0]?.business_id || null;
  } catch (error) {
    console.error("Business match error:", error);
    return null;
  }
}

async function getFirmographics(businessId: string): Promise<FirmographicData | null> {
  if (!EXPLORIUM_API_KEY) return null;

  try {
    const response = await fetch("https://api.explorium.ai/v1/businesses/firmographics/bulk_enrich", {
      method: "POST",
      headers: {
        "api_key": EXPLORIUM_API_KEY,
        "accept": "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ business_ids: [businessId] }),
    });

    if (!response.ok) {
      console.error("Firmographics fetch failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error("Firmographics error:", error);
    return null;
  }
}

async function getFunding(businessId: string): Promise<any | null> {
  if (!EXPLORIUM_API_KEY) return null;

  try {
    const response = await fetch("https://api.explorium.ai/v1/businesses/funding_and_acquisition/bulk_enrich", {
      method: "POST",
      headers: {
        "api_key": EXPLORIUM_API_KEY,
        "accept": "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ business_ids: [businessId] }),
    });

    if (!response.ok) {
      console.error("Funding fetch failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error("Funding error:", error);
    return null;
  }
}

async function getTechnographics(businessId: string): Promise<any | null> {
  if (!EXPLORIUM_API_KEY) return null;

  try {
    const response = await fetch("https://api.explorium.ai/v1/businesses/technographics/bulk_enrich", {
      method: "POST",
      headers: {
        "api_key": EXPLORIUM_API_KEY,
        "accept": "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ business_ids: [businessId] }),
    });

    if (!response.ok) {
      console.error("Technographics fetch failed:", await response.text());
      return null;
    }

    const data = await response.json();
    const techData = data.data?.[0];

    // Parse tech stack into categories
    if (techData?.full_nested_tech_stack) {
      const techStack: TechCategory[] = [];
      for (const [category, techs] of Object.entries(techData.full_nested_tech_stack)) {
        if (Array.isArray(techs) && techs.length > 0) {
          techStack.push({
            category,
            technologies: techs as string[],
          });
        }
      }
      return {
        tech_stack: techStack,
        tech_count: techStack.reduce((sum, cat) => sum + cat.technologies.length, 0),
      };
    }

    return null;
  } catch (error) {
    console.error("Technographics error:", error);
    return null;
  }
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
        JSON.stringify({ error: "Explorium API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating company intelligence for: ${companyName}`);

    // Step 1: Match the business
    const businessId = await matchBusiness({ name: companyName, domain: companyDomain });

    if (!businessId) {
      return new Response(
        JSON.stringify({
          error: "Company not found in Explorium database",
          intelligence: null
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Matched business ID: ${businessId}`);

    // Step 2: Fetch all data in parallel
    const [firmographics, funding, technographics] = await Promise.all([
      getFirmographics(businessId),
      getFunding(businessId),
      getTechnographics(businessId),
    ]);

    const intelligence: CompanyIntelligence = {
      firmographics: firmographics ? {
        company_name: firmographics.company_name,
        industry: firmographics.industry,
        employee_count: firmographics.employee_count,
        employee_count_range: firmographics.employee_count_range,
        revenue: firmographics.revenue || firmographics.estimated_revenue,
        founded_year: firmographics.founded_year,
        company_type: firmographics.company_type,
        description: firmographics.description,
        website: firmographics.website,
        linkedin_url: firmographics.linkedin_url,
        city: firmographics.city,
        state: firmographics.state,
        country: firmographics.country,
        headquarters: [firmographics.city, firmographics.state, firmographics.country].filter(Boolean).join(", "),
      } : null,
      funding: funding ? {
        total_funding: funding.total_funding_amount,
        funding_stage: funding.funding_stage || funding.last_funding_type,
        last_funding_date: funding.last_funding_date,
        funding_rounds: funding.funding_rounds?.map((r: any) => ({
          round_type: r.funding_type,
          amount: r.amount,
          date: r.date,
          investors: r.investors,
        })),
        acquisitions: funding.acquisitions?.map((a: any) => ({
          acquired_by: a.acquired_by || a.acquirer,
          acquisition_date: a.date,
          acquisition_price: a.price,
        })),
      } : null,
      technographics: technographics,
      enriched_at: new Date().toISOString(),
      source: "explorium",
    };

    // Step 3: Optionally store in database if entityType and entityId provided
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
