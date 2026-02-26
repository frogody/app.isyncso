import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * reach-fetch-metrics
 *
 * Fetches performance metrics from connected social platforms and stores them
 * in the reach_performance_metrics table.
 *
 * Currently a stub -- requires platform API credentials to be configured
 * in Supabase secrets before real data can be fetched.
 *
 * Expected body:
 *   { company_id: string, date_range?: string }
 *
 * Returns:
 *   { message: string, platforms_status: Record<string, string> }
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { company_id, date_range } = body as {
      company_id?: string;
      date_range?: string;
    };

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ---------------------------------------------------------------------------
    // TODO: Implement actual platform metric fetching
    //
    // For each connected platform, this function should:
    // 1. Read access tokens from reach_social_connections
    // 2. Call the platform's analytics API (Instagram Graph API, Facebook Insights,
    //    LinkedIn Marketing API, Twitter Analytics, TikTok Business API, etc.)
    // 3. Normalize the response into reach_performance_metrics rows
    // 4. Upsert into the database
    //
    // Required Supabase secrets per platform:
    //   INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET
    //   FACEBOOK_APP_ID, FACEBOOK_APP_SECRET
    //   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
    //   TWITTER_API_KEY, TWITTER_API_SECRET
    //   TIKTOK_APP_ID, TIKTOK_APP_SECRET
    //   GOOGLE_ANALYTICS_CREDENTIALS
    // ---------------------------------------------------------------------------

    const platforms_status: Record<string, string> = {
      instagram: "not_configured",
      facebook: "not_configured",
      linkedin: "not_configured",
      twitter: "not_configured",
      tiktok: "not_configured",
      google_analytics: "not_configured",
    };

    return new Response(
      JSON.stringify({
        message:
          "Metrics fetching requires platform API credentials to be configured. " +
          "Add OAuth credentials for each platform in your Supabase project secrets, " +
          "then redeploy this function. See REACH_SETUP_NOTES.md for instructions.",
        company_id,
        date_range: date_range || "30",
        platforms_status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("reach-fetch-metrics error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
