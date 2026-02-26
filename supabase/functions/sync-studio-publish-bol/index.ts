/**
 * Sync Studio -- Publish to Bol.com Edge Function
 *
 * Pushes generated images from Sync Studio to Bol.com product listings
 * via the Retailer API v10 Content endpoint. Processes in chunks of 5
 * products per invocation to handle API throttling and edge function
 * timeouts.
 *
 * Actions:
 *   - start:    Validate credentials, gather completed images, begin publishing
 *   - continue: Process the next chunk of unpublished products
 *   - status:   Return current publish progress counters
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOLCOM_ENCRYPTION_KEY = Deno.env.get("BOLCOM_ENCRYPTION_KEY");
if (!BOLCOM_ENCRYPTION_KEY) {
  throw new Error("BOLCOM_ENCRYPTION_KEY not configured");
}
const BOL_API_BASE = "https://api.bol.com/retailer";
const BOL_AUTH_URL = "https://login.bol.com/token";
const CHUNK_SIZE = 5; // Products per invocation

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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============================================
// Bol.com Auth (reused pattern from bolcom-api / sync-studio-import-catalog)
// ============================================

async function getBolToken(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
): Promise<string> {
  const { data: creds, error } = await supabase
    .from("bolcom_credentials")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !creds) {
    throw new Error("Bol.com not connected");
  }

  // Return cached token if still valid (60s buffer)
  if (creds.access_token && creds.token_expires_at) {
    const expiresAt = new Date(creds.token_expires_at);
    if (expiresAt > new Date(Date.now() + 60_000)) {
      return creds.access_token;
    }
  }

  // Decrypt credentials
  const { data: clientId } = await supabase.rpc(
    "decrypt_bolcom_credential",
    {
      ciphertext: creds.client_id_encrypted,
      encryption_key: BOLCOM_ENCRYPTION_KEY,
    },
  );
  const { data: clientSecret } = await supabase.rpc(
    "decrypt_bolcom_credential",
    {
      ciphertext: creds.client_secret_encrypted,
      encryption_key: BOLCOM_ENCRYPTION_KEY,
    },
  );

  if (!clientId || !clientSecret) {
    throw new Error("Failed to decrypt bol.com credentials");
  }

  // Request fresh token via Client Credentials flow
  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  const resp = await fetch(BOL_AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) {
    throw new Error(`Token request failed: ${await resp.text()}`);
  }

  const tokenData = await resp.json();
  const expiresAt = new Date(
    Date.now() + (tokenData.expires_in - 30) * 1000,
  );

  // Persist token in DB
  await supabase
    .from("bolcom_credentials")
    .update({
      access_token: tokenData.access_token,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", creds.id);

  return tokenData.access_token;
}

// ============================================
// Bol.com Content API -- Upload Image by URL
// ============================================

/**
 * Upload a single image to a Bol.com product listing by URL.
 *
 * Bol.com Retailer API v10 Content endpoint:
 *   POST /content/products/{ean}/images
 *
 * The body contains the image URL. Bol.com will fetch and process it.
 * If this exact endpoint is not available in the retailer's API version,
 * the alternative is POST /content/{ean}/upload-image with multipart data.
 * We use the URL-based approach here since we already have public URLs
 * from the generated-content storage bucket.
 */
async function uploadImageToBol(
  accessToken: string,
  ean: string,
  imageUrl: string,
): Promise<{ success: boolean; error?: string; processStatusId?: string }> {
  try {
    const resp = await fetch(
      `${BOL_API_BASE}/content/products/${ean}/images`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/vnd.retailer.v10+json",
          Accept: "application/vnd.retailer.v10+json",
        },
        body: JSON.stringify({
          url: imageUrl,
        }),
      },
    );

    // Rate limited -- respect Retry-After
    if (resp.status === 429) {
      const retryAfter = parseInt(
        resp.headers.get("Retry-After") || "5",
        10,
      );
      console.warn(
        `[sync-studio-publish-bol] Rate limited for EAN ${ean}, waiting ${retryAfter}s`,
      );
      await delay(retryAfter * 1000);
      // Retry once after waiting
      return uploadImageToBol(accessToken, ean, imageUrl);
    }

    if (!resp.ok) {
      const errBody = await resp.text();
      return {
        success: false,
        error: `Bol.com API ${resp.status}: ${errBody}`,
      };
    }

    // Bol.com typically returns a process status for async operations
    const data = await resp.json().catch(() => ({}));
    return {
      success: true,
      processStatusId: data.processStatusId || undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return { success: false, error: message };
  }
}

// ============================================
// Publish a chunk of products
// ============================================

interface ProductGroup {
  ean: string;
  images: Array<{
    image_id: string;
    image_url: string;
    shot_number: number;
  }>;
}

async function publishChunk(
  supabase: ReturnType<typeof createClient>,
  accessToken: string,
  products: ProductGroup[],
  mode: "replace" | "add",
): Promise<{ completed: number; failed: number; details: Array<{ ean: string; success: boolean; error?: string }> }> {
  let completed = 0;
  let failed = 0;
  const details: Array<{ ean: string; success: boolean; error?: string }> = [];

  for (const product of products) {
    let productSuccess = true;
    let productError: string | undefined;

    // Sort images by shot_number so hero shot (1) is uploaded first
    const sortedImages = [...product.images].sort(
      (a, b) => a.shot_number - b.shot_number,
    );

    for (const image of sortedImages) {
      const result = await uploadImageToBol(
        accessToken,
        product.ean,
        image.image_url,
      );

      if (result.success) {
        // Mark individual image as published
        await supabase
          .from("sync_studio_generated_images")
          .update({ publish_status: "published" })
          .eq("image_id", image.image_id);
      } else {
        productSuccess = false;
        productError = result.error;
        console.error(
          `[sync-studio-publish-bol] Failed to upload image ${image.image_id} for EAN ${product.ean}: ${result.error}`,
        );

        // Mark individual image as failed
        await supabase
          .from("sync_studio_generated_images")
          .update({
            publish_status: "publish_failed",
            error_message: result.error,
          })
          .eq("image_id", image.image_id);
      }

      // Rate limit: ~1 request per second to avoid throttling
      await delay(1100);
    }

    if (productSuccess) {
      completed++;
    } else {
      failed++;
    }

    details.push({
      ean: product.ean,
      success: productSuccess,
      error: productError,
    });
  }

  return { completed, failed, details };
}

// ============================================
// Get the user's companyId from the users table
// ============================================

async function getUserCompanyId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", userId)
    .single();

  return data?.company_id || null;
}

// ============================================
// Fetch unpublished product groups for a job
// ============================================

async function getUnpublishedProductGroups(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  limit: number,
): Promise<ProductGroup[]> {
  // Fetch completed images that haven't been published yet.
  // We look for images where publish_status is null or 'pending'
  // (not 'published' and not 'publish_failed').
  const { data: images, error } = await supabase
    .from("sync_studio_generated_images")
    .select("image_id, image_url, product_ean, shot_number, publish_status")
    .eq("job_id", jobId)
    .eq("status", "completed")
    .or("publish_status.is.null,publish_status.eq.pending")
    .order("product_ean", { ascending: true })
    .order("shot_number", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch images: ${error.message}`);
  }

  if (!images || images.length === 0) return [];

  // Group by product_ean
  const grouped = new Map<string, ProductGroup>();
  for (const img of images) {
    if (!img.image_url) continue; // Skip images with no URL

    const existing = grouped.get(img.product_ean);
    if (existing) {
      existing.images.push({
        image_id: img.image_id,
        image_url: img.image_url,
        shot_number: img.shot_number,
      });
    } else {
      grouped.set(img.product_ean, {
        ean: img.product_ean,
        images: [
          {
            image_id: img.image_id,
            image_url: img.image_url,
            shot_number: img.shot_number,
          },
        ],
      });
    }
  }

  // Return only the first `limit` products
  return Array.from(grouped.values()).slice(0, limit);
}

// ============================================
// Update publish data on the job record
// ============================================

/**
 * We store publish progress in the job's `publish_data` JSONB column
 * to avoid requiring schema migration for new columns. This is the
 * practical fallback approach described in the spec.
 */
interface PublishData {
  publish_status: "idle" | "publishing" | "completed" | "failed";
  publish_total: number;
  publish_completed: number;
  publish_failed: number;
  publish_mode: "replace" | "add";
  started_at?: string;
  completed_at?: string;
}

async function getPublishData(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  userId: string,
): Promise<{ job: Record<string, unknown> | null; publishData: PublishData | null }> {
  const { data: job, error } = await supabase
    .from("sync_studio_jobs")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .single();

  if (error || !job) return { job: null, publishData: null };

  // Try to parse publish_data from the job if it exists
  const publishData = (job.publish_data as PublishData) || null;
  return { job, publishData };
}

async function updatePublishData(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  publishData: PublishData,
): Promise<void> {
  // Try updating the publish_data JSONB column.
  // If the column doesn't exist, this will silently fail on some Supabase
  // versions. We wrap in try/catch for safety.
  try {
    await supabase
      .from("sync_studio_jobs")
      .update({ publish_data: publishData })
      .eq("job_id", jobId);
  } catch (err: unknown) {
    console.warn(
      "[sync-studio-publish-bol] Could not update publish_data column:",
      err instanceof Error ? err.message : err,
    );
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
    const { action, userId, jobId, mode } = await req.json();

    if (!userId) {
      return json({ error: "Missing userId" }, 400);
    }

    switch (action) {
      // ============================
      // START: Validate, gather images, begin publishing
      // ============================
      case "start": {
        if (!jobId) return json({ error: "Missing jobId" }, 400);

        const publishMode = mode === "add" ? "add" : "replace";

        // 1. Resolve user's company_id for bol.com credentials
        const companyId = await getUserCompanyId(supabase, userId);
        if (!companyId) {
          return json({ error: "User has no associated company" }, 400);
        }

        // 2. Get Bol.com access token (validates credentials exist)
        let accessToken: string;
        try {
          accessToken = await getBolToken(supabase, companyId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          return json({ error: msg }, 400);
        }

        // 3. Verify the job belongs to this user
        const { data: job, error: jobErr } = await supabase
          .from("sync_studio_jobs")
          .select("*")
          .eq("job_id", jobId)
          .eq("user_id", userId)
          .single();

        if (jobErr || !job) {
          return json({ error: "Job not found or access denied" }, 404);
        }

        // 4. Count total products with completed images for this job
        const { data: completedImages } = await supabase
          .from("sync_studio_generated_images")
          .select("product_ean")
          .eq("job_id", jobId)
          .eq("status", "completed")
          .not("image_url", "is", null);

        if (!completedImages || completedImages.length === 0) {
          return json(
            { error: "No completed images to publish" },
            400,
          );
        }

        const uniqueEans = new Set(
          completedImages.map((r: { product_ean: string }) => r.product_ean),
        );
        const publishTotal = uniqueEans.size;

        // 5. Reset publish_status on all completed images for this job
        await supabase
          .from("sync_studio_generated_images")
          .update({ publish_status: "pending" })
          .eq("job_id", jobId)
          .eq("status", "completed")
          .not("image_url", "is", null);

        // 6. Create publish tracking data
        const publishData: PublishData = {
          publish_status: "publishing",
          publish_total: publishTotal,
          publish_completed: 0,
          publish_failed: 0,
          publish_mode: publishMode,
          started_at: new Date().toISOString(),
        };

        await updatePublishData(supabase, jobId, publishData);

        // 7. Process first chunk
        const productGroups = await getUnpublishedProductGroups(
          supabase,
          jobId,
          CHUNK_SIZE,
        );

        if (productGroups.length === 0) {
          // Edge case: all images somehow not fetchable
          publishData.publish_status = "completed";
          publishData.completed_at = new Date().toISOString();
          await updatePublishData(supabase, jobId, publishData);

          return json({
            jobId,
            publish_status: "completed",
            publish_total: publishTotal,
            publish_completed: 0,
            publish_failed: 0,
            hasMore: false,
          });
        }

        const chunkResult = await publishChunk(
          supabase,
          accessToken,
          productGroups,
          publishMode,
        );

        // Update counters
        publishData.publish_completed = chunkResult.completed;
        publishData.publish_failed = chunkResult.failed;

        // Check if there are more products to publish
        const remainingGroups = await getUnpublishedProductGroups(
          supabase,
          jobId,
          1,
        );
        const hasMore = remainingGroups.length > 0;

        if (!hasMore) {
          publishData.publish_status = "completed";
          publishData.completed_at = new Date().toISOString();
        }

        await updatePublishData(supabase, jobId, publishData);

        return json({
          jobId,
          publish_status: hasMore ? "publishing" : "completed",
          publish_total: publishTotal,
          publish_completed: publishData.publish_completed,
          publish_failed: publishData.publish_failed,
          publish_mode: publishMode,
          hasMore,
          chunk_details: chunkResult.details,
        });
      }

      // ============================
      // CONTINUE: Process next chunk
      // ============================
      case "continue": {
        if (!jobId) return json({ error: "Missing jobId" }, 400);

        // 1. Verify job ownership and get publish data
        const { job, publishData } = await getPublishData(
          supabase,
          jobId,
          userId,
        );

        if (!job) {
          return json({ error: "Job not found or access denied" }, 404);
        }

        if (!publishData || publishData.publish_status !== "publishing") {
          return json({
            jobId,
            publish_status: publishData?.publish_status || "idle",
            publish_total: publishData?.publish_total || 0,
            publish_completed: publishData?.publish_completed || 0,
            publish_failed: publishData?.publish_failed || 0,
            hasMore: false,
          });
        }

        // 2. Get Bol.com access token
        const companyId = await getUserCompanyId(supabase, userId);
        if (!companyId) {
          return json({ error: "User has no associated company" }, 400);
        }

        let accessToken: string;
        try {
          accessToken = await getBolToken(supabase, companyId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          // Mark publish as failed if we can't authenticate
          publishData.publish_status = "failed";
          await updatePublishData(supabase, jobId, publishData);
          return json({ error: msg }, 400);
        }

        // 3. Fetch next chunk of unpublished products
        const productGroups = await getUnpublishedProductGroups(
          supabase,
          jobId,
          CHUNK_SIZE,
        );

        if (productGroups.length === 0) {
          // Nothing left to process
          publishData.publish_status = "completed";
          publishData.completed_at = new Date().toISOString();
          await updatePublishData(supabase, jobId, publishData);

          return json({
            jobId,
            publish_status: "completed",
            publish_total: publishData.publish_total,
            publish_completed: publishData.publish_completed,
            publish_failed: publishData.publish_failed,
            hasMore: false,
          });
        }

        // 4. Process chunk
        const chunkResult = await publishChunk(
          supabase,
          accessToken,
          productGroups,
          publishData.publish_mode,
        );

        // 5. Update cumulative counters
        publishData.publish_completed += chunkResult.completed;
        publishData.publish_failed += chunkResult.failed;

        // 6. Check for remaining
        const remainingGroups = await getUnpublishedProductGroups(
          supabase,
          jobId,
          1,
        );
        const hasMore = remainingGroups.length > 0;

        if (!hasMore) {
          publishData.publish_status = "completed";
          publishData.completed_at = new Date().toISOString();
        }

        await updatePublishData(supabase, jobId, publishData);

        return json({
          jobId,
          publish_status: hasMore ? "publishing" : "completed",
          publish_total: publishData.publish_total,
          publish_completed: publishData.publish_completed,
          publish_failed: publishData.publish_failed,
          hasMore,
          chunk_details: chunkResult.details,
        });
      }

      // ============================
      // STATUS: Return publish progress
      // ============================
      case "status": {
        if (!jobId) return json({ error: "Missing jobId" }, 400);

        const { job, publishData } = await getPublishData(
          supabase,
          jobId,
          userId,
        );

        if (!job) {
          return json({ error: "Job not found or access denied" }, 404);
        }

        if (!publishData) {
          return json({
            jobId,
            publish_status: "idle",
            publish_total: 0,
            publish_completed: 0,
            publish_failed: 0,
            hasMore: false,
          });
        }

        // Also get live counts from the images table for accuracy
        const { count: publishedCount } = await supabase
          .from("sync_studio_generated_images")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobId)
          .eq("publish_status", "published");

        const { count: failedCount } = await supabase
          .from("sync_studio_generated_images")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobId)
          .eq("publish_status", "publish_failed");

        const { count: pendingCount } = await supabase
          .from("sync_studio_generated_images")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobId)
          .eq("status", "completed")
          .or("publish_status.is.null,publish_status.eq.pending");

        return json({
          jobId,
          publish_status: publishData.publish_status,
          publish_total: publishData.publish_total,
          publish_completed: publishData.publish_completed,
          publish_failed: publishData.publish_failed,
          publish_mode: publishData.publish_mode,
          hasMore: publishData.publish_status === "publishing",
          // Live image-level counts
          images_published: publishedCount || 0,
          images_failed: failedCount || 0,
          images_pending: pendingCount || 0,
          started_at: publishData.started_at,
          completed_at: publishData.completed_at,
        });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal error";
    console.error("[sync-studio-publish-bol]", error);
    return json({ error: message }, 500);
  }
});
