/**
 * Sync Studio — Import Catalog Edge Function
 *
 * Fetches the full Bol.com product catalog for a user's connected store
 * using the Offer Export flow (works for both FBR and FBB sellers).
 *
 * Flow:
 *   1. start  → Request offer export CSV from bol.com
 *   2. continue (phase: exporting)  → Poll process status until CSV is ready
 *   3. continue (phase: enriching)  → Fetch product details for each EAN in chunks
 *
 * Actions:
 *   - start: Begin a new import (requests offer export)
 *   - continue: Continue an in-progress import (check export / enrich next chunk)
 *   - status: Get current import job status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOLCOM_ENCRYPTION_KEY = Deno.env.get("BOLCOM_ENCRYPTION_KEY") || "bolcom-default-key-change-me";
const BOL_API_BASE = "https://api.bol.com/retailer";
const BOL_AUTH_URL = "https://login.bol.com/token";
const CHUNK_SIZE = 25; // Products per edge function invocation (each requires a product API call)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Bol.com Auth
// ============================================

async function getBolToken(supabase: any, companyId: string): Promise<string> {
  const { data: creds, error } = await supabase
    .from("bolcom_credentials")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !creds) throw new Error("No bol.com credentials configured");

  // Check cached token
  if (creds.access_token && creds.token_expires_at) {
    const expiresAt = new Date(creds.token_expires_at);
    if (expiresAt > new Date(Date.now() + 60_000)) {
      return creds.access_token;
    }
  }

  // Decrypt and refresh
  const { data: clientId } = await supabase.rpc("decrypt_bolcom_credential", {
    ciphertext: creds.client_id_encrypted,
    encryption_key: BOLCOM_ENCRYPTION_KEY,
  });
  const { data: clientSecret } = await supabase.rpc("decrypt_bolcom_credential", {
    ciphertext: creds.client_secret_encrypted,
    encryption_key: BOLCOM_ENCRYPTION_KEY,
  });

  if (!clientId || !clientSecret) throw new Error("Failed to decrypt bol.com credentials");

  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  const resp = await fetch(BOL_AUTH_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) throw new Error(`Token request failed: ${await resp.text()}`);

  const tokenData = await resp.json();
  const expiresAt = new Date(Date.now() + (tokenData.expires_in - 30) * 1000);

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
// Bol.com API Calls
// ============================================

async function bolFetch(token: string, endpoint: string, method = "GET", body?: unknown) {
  const contentType = "application/vnd.retailer.v10+json";
  const resp = await fetch(`${BOL_API_BASE}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": contentType,
      "Accept": contentType,
    },
    ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}),
  });

  if (resp.status === 429) {
    const retryAfter = parseInt(resp.headers.get("Retry-After") || "5", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return bolFetch(token, endpoint, method, body);
  }

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`bol.com ${resp.status}: ${errBody}`);
  }

  if (resp.status === 204) return {};
  return resp.json();
}

// Fetch CSV text (for offer export download)
async function bolFetchText(token: string, endpoint: string) {
  const resp = await fetch(`${BOL_API_BASE}${endpoint}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.retailer.v10+csv",
    },
  });

  if (resp.status === 429) {
    const retryAfter = parseInt(resp.headers.get("Retry-After") || "5", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return bolFetchText(token, endpoint);
  }

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`bol.com ${resp.status}: ${errBody}`);
  }

  return resp.text();
}

// Fetch product catalog info by EAN
async function fetchProductByEan(token: string, ean: string) {
  try {
    const data = await bolFetch(token, `/products/${ean}`);
    return data;
  } catch (err) {
    console.warn(`[sync-studio] Could not fetch product ${ean}: ${err}`);
    return null;
  }
}

// Parse offer export CSV → array of { ean, title, price, stock }
function parseOfferExportCsv(csvText: string): Array<{ ean: string; title: string; price: number | null; stock: number | null }> {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  // Find column indices from header
  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, "").toLowerCase());
  const eanIdx = header.indexOf("ean");
  const titleIdx = header.indexOf("unknownproducttitle");
  const priceIdx = header.indexOf("price");
  const stockIdx = header.indexOf("stock");

  if (eanIdx === -1) {
    console.error("[sync-studio] CSV missing 'ean' column. Headers:", header.join(", "));
    return [];
  }

  const results: Array<{ ean: string; title: string; price: number | null; stock: number | null }> = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const ean = cols[eanIdx];
    if (!ean || seen.has(ean)) continue;
    seen.add(ean);

    results.push({
      ean,
      title: titleIdx >= 0 ? (cols[titleIdx] || ean) : ean,
      price: priceIdx >= 0 ? parseFloat(cols[priceIdx]) || null : null,
      stock: stockIdx >= 0 ? parseInt(cols[stockIdx], 10) || null : null,
    });
  }

  return results;
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
    const { action, userId, companyId, importJobId } = await req.json();

    if (!userId || !companyId) {
      return json({ error: "Missing userId or companyId" }, 400);
    }

    switch (action) {
      // ============================
      // START: Request offer export
      // ============================
      case "start": {
        // Check for existing active import
        const { data: existing } = await supabase
          .from("sync_studio_import_jobs")
          .select("id, status, metadata")
          .eq("user_id", userId)
          .in("status", ["importing", "planning"])
          .maybeSingle();

        if (existing) {
          const meta = existing.metadata || {};
          return json({
            importJobId: existing.id,
            status: existing.status,
            phase: meta.phase || "enriching",
            imported: 0,
            total: 0,
            hasMore: true,
            message: "Import already in progress",
          });
        }

        // Get token and request offer export
        const token = await getBolToken(supabase, companyId);

        console.log("[sync-studio] Requesting offer export from bol.com...");
        const exportResp = await bolFetch(token, "/offers/export", "POST", { format: "CSV" });
        const processStatusId = exportResp.processStatusId;

        if (!processStatusId) {
          throw new Error("bol.com did not return processStatusId for offer export");
        }

        console.log("[sync-studio] Export processStatusId:", processStatusId);

        // Create import job
        const { data: job, error: jobErr } = await supabase
          .from("sync_studio_import_jobs")
          .insert({
            user_id: userId,
            status: "importing",
            total_products: 0,
            imported_products: 0,
            metadata: {
              phase: "exporting",
              processStatusId,
            },
          })
          .select()
          .single();

        if (jobErr) throw new Error(`Failed to create import job: ${jobErr.message}`);

        return json({
          importJobId: job.id,
          status: "importing",
          phase: "exporting",
          imported: 0,
          total: 0,
          hasMore: true,
        });
      }

      // ============================
      // CONTINUE: Check export / enrich next chunk
      // ============================
      case "continue": {
        if (!importJobId) return json({ error: "Missing importJobId" }, 400);

        // Get current job
        const { data: job } = await supabase
          .from("sync_studio_import_jobs")
          .select("*")
          .eq("id", importJobId)
          .single();

        if (!job) return json({ error: "Job not found" }, 404);
        if (job.status !== "importing") {
          return json({ importJobId, status: job.status, hasMore: false });
        }

        const token = await getBolToken(supabase, companyId);
        const metadata = job.metadata || {};

        // ----- Phase: EXPORTING (waiting for CSV) -----
        if (metadata.phase === "exporting") {
          const psId = metadata.processStatusId;
          if (!psId) throw new Error("No processStatusId in job metadata");

          const statusResp = await bolFetch(token, `/process-status/${psId}`);
          console.log("[sync-studio] Export status:", statusResp.status, statusResp.entityId || "");

          if (statusResp.status === "PENDING") {
            return json({
              importJobId,
              status: "importing",
              phase: "exporting",
              imported: 0,
              total: 0,
              hasMore: true,
            });
          }

          if (statusResp.status === "SUCCESS") {
            const reportId = statusResp.entityId;
            if (!reportId) throw new Error("No entityId in process status response");

            // Download CSV
            console.log("[sync-studio] Downloading offer export CSV, reportId:", reportId);
            const csvText = await bolFetchText(token, `/offers/export/${reportId}`);
            const offers = parseOfferExportCsv(csvText);

            console.log(`[sync-studio] Parsed ${offers.length} unique EANs from offer export`);

            if (offers.length === 0) {
              // No offers found — mark as planning (0 products)
              await supabase
                .from("sync_studio_import_jobs")
                .update({
                  status: "planning",
                  total_products: 0,
                  metadata: { phase: "done" },
                })
                .eq("id", importJobId);

              return json({
                importJobId,
                status: "planning",
                imported: 0,
                total: 0,
                hasMore: false,
              });
            }

            // Store EANs and transition to enriching phase
            const eanList = offers.map((o) => o.ean);
            await supabase
              .from("sync_studio_import_jobs")
              .update({
                total_products: eanList.length,
                metadata: {
                  phase: "enriching",
                  eans: eanList,
                  eanIndex: 0,
                  offerData: Object.fromEntries(offers.map((o) => [o.ean, { title: o.title, price: o.price, stock: o.stock }])),
                },
              })
              .eq("id", importJobId);

            return json({
              importJobId,
              status: "importing",
              phase: "enriching",
              imported: 0,
              total: eanList.length,
              hasMore: true,
            });
          }

          if (statusResp.status === "FAILURE" || statusResp.status === "TIMEOUT") {
            await supabase
              .from("sync_studio_import_jobs")
              .update({ status: "failed", error_message: `Offer export ${statusResp.status}` })
              .eq("id", importJobId);
            return json({ error: `Offer export ${statusResp.status}`, status: "failed" }, 500);
          }

          // Unknown status — just wait
          return json({
            importJobId,
            status: "importing",
            phase: "exporting",
            imported: 0,
            total: 0,
            hasMore: true,
          });
        }

        // ----- Phase: ENRICHING (fetch product details for each EAN) -----
        if (metadata.phase === "enriching") {
          const eans: string[] = metadata.eans || [];
          const startIndex: number = metadata.eanIndex || 0;
          const offerData: Record<string, any> = metadata.offerData || {};
          const chunk = eans.slice(startIndex, startIndex + CHUNK_SIZE);

          if (chunk.length === 0) {
            // All done — transition to planning
            await supabase
              .from("sync_studio_import_jobs")
              .update({
                status: "planning",
                metadata: { ...metadata, phase: "done" },
              })
              .eq("id", importJobId);

            return json({
              importJobId,
              status: "planning",
              imported: startIndex,
              total: eans.length,
              hasMore: false,
            });
          }

          const categories = new Set<string>();
          const brands = new Set<string>();
          let imageCount = 0;
          let processed = 0;

          for (const ean of chunk) {
            const product = await fetchProductByEan(token, ean);
            const offer = offerData[ean] || {};

            // Use product API data, fall back to offer export data
            const title = product?.title || product?.shortDescription || offer.title || ean;
            const categoryPath = product?.category?.categoryName || product?.parentCategoryName || "Uncategorized";
            const price = product?.offerData?.offers?.[0]?.price || offer.price || null;
            const images = product?.images?.map((img: any) => img.url || img.mediaUrl) || [];
            const brand = product?.brand || null;

            if (categoryPath && categoryPath !== "Uncategorized") categories.add(categoryPath);
            if (brand) brands.add(brand);
            imageCount += images.length;

            // Upsert product
            await supabase
              .from("sync_studio_products")
              .upsert({
                ean,
                user_id: userId,
                title,
                description: product?.longDescription || product?.shortDescription || "",
                category_path: categoryPath,
                attributes: {
                  brand,
                  color: product?.color || null,
                  size: product?.size || null,
                  stock: offer.stock || null,
                },
                price,
                existing_image_urls: images,
                last_synced_at: new Date().toISOString(),
              }, { onConflict: "ean,user_id" });

            processed++;
          }

          const newIndex = startIndex + processed;
          const totalImported = newIndex;
          const hasMore = newIndex < eans.length;

          // Accumulate stats
          const newCategories = (job.categories_found || 0) + categories.size;
          const newBrands = (job.brands_found || 0) + brands.size;
          const newImages = (job.images_found || 0) + imageCount;

          const updateData: any = {
            imported_products: totalImported,
            categories_found: newCategories,
            brands_found: newBrands,
            images_found: newImages,
            current_product: chunk[processed - 1] || null,
            metadata: { ...metadata, eanIndex: newIndex },
          };

          if (!hasMore) {
            updateData.status = "planning";
            updateData.metadata.phase = "done";
          }

          await supabase
            .from("sync_studio_import_jobs")
            .update(updateData)
            .eq("id", importJobId);

          return json({
            importJobId,
            status: hasMore ? "importing" : "planning",
            imported: totalImported,
            total: eans.length,
            categories: newCategories,
            brands: newBrands,
            images: newImages,
            hasMore,
          });
        }

        // Unknown phase — return current state
        return json({
          importJobId,
          status: job.status,
          imported: job.imported_products || 0,
          total: job.total_products || 0,
          hasMore: false,
        });
      }

      // ============================
      // STATUS: Check progress
      // ============================
      case "status": {
        if (!importJobId) {
          const { data: latest } = await supabase
            .from("sync_studio_import_jobs")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return json(latest || { status: "none" });
        }

        const { data: job } = await supabase
          .from("sync_studio_import_jobs")
          .select("*")
          .eq("id", importJobId)
          .single();

        return json(job || { error: "Job not found" });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: any) {
    console.error("[sync-studio-import-catalog]", error);
    return json({ error: error.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
