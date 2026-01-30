import "dotenv/config";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = parseInt(process.env.PORT || "3100", 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);
const OUTPUT_DIR = path.join(__dirname, "output");
const REMOTION_ENTRY = path.resolve(__dirname, "../src/remotion/index.ts");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---- Remotion Bundle Cache ----
let bundleLocation = null;

async function ensureBundle() {
  if (bundleLocation) return bundleLocation;
  console.log("Bundling Remotion project...");
  bundleLocation = await bundle({
    entryPoint: REMOTION_ENTRY,
    // Use the project's webpack override if it exists
    webpackOverride: (config) => config,
  });
  console.log("Bundle ready at:", bundleLocation);
  return bundleLocation;
}

// ---- Job Processing ----

async function updateJob(jobId, updates) {
  const { error } = await supabase
    .from("render_jobs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) console.error(`Failed to update job ${jobId}:`, error.message);
}

async function processJob(job) {
  const { id, template_id, template_props, width, height, fps, duration_frames } = job;
  const outputPath = path.join(OUTPUT_DIR, `${id}.mp4`);

  console.log(`Processing job ${id}: ${template_id} (${width}x${height}, ${duration_frames} frames)`);

  try {
    await updateJob(id, { status: "rendering", progress: 5 });

    const bundlePath = await ensureBundle();
    await updateJob(id, { progress: 15 });

    // Select the composition by ID
    const composition = await selectComposition({
      serveUrl: bundlePath,
      id: template_id,
      inputProps: template_props || {},
    });

    await updateJob(id, { progress: 25 });

    // Render to MP4
    await renderMedia({
      composition: {
        ...composition,
        width: width || composition.width,
        height: height || composition.height,
        fps: fps || composition.fps,
        durationInFrames: duration_frames || composition.durationInFrames,
      },
      serveUrl: bundlePath,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: template_props || {},
      onProgress: ({ progress }) => {
        // Map rendering progress to 25-90% range
        const mappedProgress = Math.round(25 + progress * 65);
        // Throttle updates to avoid flooding the database
        if (mappedProgress % 10 === 0 || progress === 1) {
          updateJob(id, { progress: mappedProgress });
        }
      },
    });

    await updateJob(id, { progress: 92 });

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(outputPath);
    const storagePath = `renders/${id}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("generated-content")
      .upload(storagePath, fileBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("generated-content")
      .getPublicUrl(storagePath);

    await updateJob(id, {
      status: "completed",
      progress: 100,
      output_url: urlData.publicUrl,
      error_message: null,
      completed_at: new Date().toISOString(),
    });

    console.log(`Job ${id} completed: ${urlData.publicUrl}`);

    // Clean up local file
    fs.unlinkSync(outputPath);
  } catch (error) {
    console.error(`Job ${id} failed:`, error.message);
    await updateJob(id, {
      status: "failed",
      error_message: error.message,
    });
    // Clean up on failure
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
}

// ---- Job Polling ----

let isProcessing = false;

async function pollForJobs() {
  if (isProcessing) return;

  try {
    const { data: jobs, error } = await supabase
      .from("render_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      console.error("Poll error:", error.message);
      return;
    }

    if (!jobs?.length) return;

    isProcessing = true;
    await processJob(jobs[0]);
  } catch (error) {
    console.error("Poll error:", error.message);
  } finally {
    isProcessing = false;
  }
}

// ---- Express Server (for health checks and manual triggers) ----

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    bundleReady: !!bundleLocation,
    isProcessing,
  });
});

// Manual trigger endpoint (called by edge function)
app.post("/render", async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ error: "jobId required" });

  const { data: job, error } = await supabase
    .from("render_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !job) return res.status(404).json({ error: "Job not found" });
  if (job.status !== "pending") return res.status(409).json({ error: `Job is ${job.status}` });

  res.json({ success: true, message: "Render queued" });

  // Process async
  if (!isProcessing) {
    isProcessing = true;
    processJob(job).finally(() => { isProcessing = false; });
  }
});

app.listen(PORT, () => {
  console.log(`Rendering server listening on port ${PORT}`);
  console.log(`Polling for jobs every ${POLL_INTERVAL_MS}ms`);

  // Pre-bundle on startup
  ensureBundle().catch((e) => console.error("Initial bundle failed:", e.message));

  // Start polling
  setInterval(pollForJobs, POLL_INTERVAL_MS);
});
