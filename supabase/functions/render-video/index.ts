import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RENDER_SERVER_URL = Deno.env.get("RENDER_SERVER_URL"); // e.g. http://localhost:3100

async function updateJob(jobId: string, updates: Record<string, unknown>) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/render_jobs?id=eq.${jobId}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
    }
  );
  if (!response.ok) {
    console.error("Failed to update job:", await response.text());
  }
}

async function getJob(jobId: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/render_jobs?id=eq.${jobId}&select=*`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const data = await response.json();
  return data?.[0] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ success: false, error: "jobId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const job = await getJob(jobId);
    if (!job) {
      return new Response(
        JSON.stringify({ success: false, error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to dispatch to the rendering server if configured
    if (RENDER_SERVER_URL) {
      try {
        const renderResponse = await fetch(`${RENDER_SERVER_URL}/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });

        if (renderResponse.ok) {
          return new Response(
            JSON.stringify({ success: true, message: "Dispatched to rendering server", jobId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.warn("Rendering server returned error, falling back to simulation:", renderResponse.status);
      } catch (e) {
        console.warn("Rendering server unreachable, falling back to simulation:", (e as Error).message);
      }
    }

    // Fallback: simulate rendering when no rendering server is available
    const responsePromise = new Response(
      JSON.stringify({ success: true, message: "Render started (simulated)", jobId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    (async () => {
      try {
        await updateJob(jobId, { status: "rendering", progress: 0 });

        const stages = [
          { progress: 10, delay: 1000 },
          { progress: 25, delay: 2000 },
          { progress: 50, delay: 3000 },
          { progress: 75, delay: 2000 },
          { progress: 100, delay: 1000 },
        ];

        for (const stage of stages) {
          await new Promise(resolve => setTimeout(resolve, stage.delay));
          await updateJob(jobId, { progress: stage.progress });
        }

        await updateJob(jobId, {
          status: "completed",
          progress: 100,
          output_url: null,
          error_message: "Simulated render complete. Start the rendering server for real MP4 export.",
          completed_at: new Date().toISOString(),
        });

      } catch (error) {
        console.error("Render error:", error);
        await updateJob(jobId, {
          status: "failed",
          error_message: (error as Error).message || "Unknown render error",
        });
      }
    })();

    return responsePromise;

  } catch (error) {
    console.error("render-video error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
