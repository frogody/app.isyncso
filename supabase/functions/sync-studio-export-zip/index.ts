/**
 * Sync Studio -- Export Photoshoot ZIP Edge Function
 *
 * Packages all completed images from a photoshoot job as a ZIP file
 * organized by EAN, with a CSV manifest. Uses JSZip for ZIP creation.
 *
 * Actions:
 *   - export: Download ZIP of all completed images for a job
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Helpers
// ============================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Sanitize a product title for use as a folder name.
 * Replaces non-alphanumeric characters (except hyphens and underscores)
 * with underscores and truncates to 50 characters.
 */
function sanitizeTitle(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 50);
}

/**
 * Fetch image bytes from a URL. Returns null on failure.
 */
async function fetchImageBytes(
  url: string,
): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(
        `[sync-studio-export-zip] Failed to fetch image ${url}: ${response.status}`,
      );
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[sync-studio-export-zip] Error fetching image ${url}:`,
      message,
    );
    return null;
  }
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { action, userId, jobId } = await req.json();

    // ---------------------------
    // Validate input
    // ---------------------------
    if (action !== "export") {
      return json({ error: `Unknown action: ${action}` }, 400);
    }

    if (!userId) {
      return json({ error: "Missing userId" }, 400);
    }

    if (!jobId) {
      return json({ error: "Missing jobId" }, 400);
    }

    // ---------------------------
    // Verify job exists and belongs to user
    // ---------------------------
    const { data: job, error: jobErr } = await supabase
      .from("sync_studio_jobs")
      .select("job_id, user_id, status")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .single();

    if (jobErr || !job) {
      return json({ error: "Job not found or access denied" }, 404);
    }

    // ---------------------------
    // Fetch all completed images for this job
    // ---------------------------
    const { data: images, error: imagesErr } = await supabase
      .from("sync_studio_generated_images")
      .select("image_id, product_ean, shot_number, image_url")
      .eq("job_id", jobId)
      .eq("status", "completed")
      .order("product_ean", { ascending: true })
      .order("shot_number", { ascending: true });

    if (imagesErr) {
      return json(
        { error: `Failed to fetch images: ${imagesErr.message}` },
        500,
      );
    }

    if (!images || images.length === 0) {
      return json(
        { error: "No completed images found for this job" },
        404,
      );
    }

    // ---------------------------
    // Fetch product titles by EAN
    // ---------------------------
    const uniqueEans = [...new Set(images.map((img) => img.product_ean))];

    const { data: products } = await supabase
      .from("sync_studio_products")
      .select("ean, title")
      .eq("user_id", userId)
      .in("ean", uniqueEans);

    const titleMap = new Map<string, string>();
    for (const p of products || []) {
      titleMap.set(p.ean, p.title || p.ean);
    }

    // ---------------------------
    // Build ZIP structure
    // ---------------------------
    const zip = new JSZip();
    const rootFolder = zip.folder(`photoshoot-${jobId}`)!;

    // Track CSV manifest rows
    const csvRows: string[] = [
      "EAN,Product Title,Shot Number,Image URL,File Path,Status",
    ];

    // Group images by EAN for folder organization
    const imagesByEan = new Map<
      string,
      Array<{
        image_id: string;
        product_ean: string;
        shot_number: number;
        image_url: string;
      }>
    >();

    for (const img of images) {
      const existing = imagesByEan.get(img.product_ean) || [];
      existing.push(img);
      imagesByEan.set(img.product_ean, existing);
    }

    // Process each EAN group
    for (const [ean, eanImages] of imagesByEan) {
      const rawTitle = titleMap.get(ean) || ean;
      const sanitizedTitle = sanitizeTitle(rawTitle);
      const folderName = `${ean}-${sanitizedTitle}`;
      const eanFolder = rootFolder.folder(folderName)!;

      for (const img of eanImages) {
        const fileName = `shot_${img.shot_number}.jpg`;
        const filePath = `${folderName}/${fileName}`;

        // Fetch image bytes
        const imageBytes = await fetchImageBytes(img.image_url);

        if (imageBytes) {
          eanFolder.file(fileName, imageBytes);
          csvRows.push(
            [
              escapeCsvField(ean),
              escapeCsvField(rawTitle),
              String(img.shot_number),
              escapeCsvField(img.image_url),
              escapeCsvField(filePath),
              "ok",
            ].join(","),
          );
        } else {
          // Image fetch failed -- note in manifest, skip adding to ZIP
          console.error(
            `[sync-studio-export-zip] Skipped image ${img.image_id} (fetch failed)`,
          );
          csvRows.push(
            [
              escapeCsvField(ean),
              escapeCsvField(rawTitle),
              String(img.shot_number),
              escapeCsvField(img.image_url),
              escapeCsvField(filePath),
              "fetch_failed",
            ].join(","),
          );
        }
      }
    }

    // Add manifest CSV to ZIP root
    const csvContent = csvRows.join("\n");
    rootFolder.file("manifest.csv", csvContent);

    // ---------------------------
    // Generate ZIP and return
    // ---------------------------
    const zipData = await zip.generateAsync({ type: "uint8array" });

    return new Response(zipData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="photoshoot-${jobId}.zip"`,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal error";
    console.error("[sync-studio-export-zip]", error);
    return json({ error: message }, 500);
  }
});

// ============================================
// CSV Helpers
// ============================================

/**
 * Escape a value for CSV: wrap in quotes if it contains commas,
 * quotes, or newlines. Double any internal quotes.
 */
function escapeCsvField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
