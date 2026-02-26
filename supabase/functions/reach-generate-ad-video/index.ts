import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate input
    const { product_context, ad_copy, duration, aspect_ratio } = body;

    const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");

    if (!RUNWAY_API_KEY) {
      return new Response(
        JSON.stringify({
          status: "not_implemented",
          video_url: null,
          message:
            "Video generation requires RUNWAY_API_KEY configuration. Set it in your Supabase Edge Function secrets.",
          requested: {
            duration: duration || null,
            aspect_ratio: aspect_ratio || null,
            product: product_context?.name || null,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 501,
        }
      );
    }

    // Future implementation: call Runway API for video generation
    // const result = await generateVideo(RUNWAY_API_KEY, { ... });

    return new Response(
      JSON.stringify({
        status: "not_implemented",
        video_url: null,
        message:
          "Video generation API integration is pending implementation.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 501,
      }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
