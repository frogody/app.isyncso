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
    const { product_context, ad_copy, dimensions, style } = body;

    const NANOBANANA_API_KEY = Deno.env.get("NANOBANANA_API_KEY");

    if (!NANOBANANA_API_KEY) {
      return new Response(
        JSON.stringify({
          image_url: null,
          message:
            "Image generation requires NANOBANANA_API_KEY configuration. Set it in your Supabase Edge Function secrets.",
          requested: {
            dimensions: dimensions || null,
            style: style || null,
            product: product_context?.name || null,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Future implementation: call NANOBANANA API for image generation
    // const result = await generateImage(NANOBANANA_API_KEY, { ... });

    return new Response(
      JSON.stringify({
        image_url: null,
        message:
          "Image generation API integration is pending implementation.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
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
