/**
 * Sync Studio — Import Catalog Edge Function
 *
 * Fetches the full Bol.com product catalog for a user's connected store.
 * Processes in chunks to stay within edge function timeouts.
 *
 * Actions:
 *   - start: Begin a new import (creates import job, fetches first chunk)
 *   - continue: Continue an in-progress import (fetches next chunk)
 *   - status: Get current import job status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOLCOM_ENCRYPTION_KEY = Deno.env.get("BOLCOM_ENCRYPTION_KEY") || "bolcom-default-key-change-me";
const BOL_API_BASE = "https://api.bol.com/retailer";
const BOL_AUTH_URL = "https://login.bol.com/token";
const CHUNK_SIZE = 50; // Products per edge function invocation

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Bol.com Auth (reused from bolcom-api)
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

// Fetch inventory page (EANs + stock)
async function fetchInventoryPage(token: string, page: number) {
  return bolFetch(token, `/inventory?page=${page}&quantity=0-10000`);
}

// Fetch product catalog info by EAN (via bol.com content API)
async function fetchProductByEan(token: string, ean: string) {
  try {
    // bol.com catalog API endpoint
    const data = await bolFetch(token, `/products/${ean}`);
    return data;
  } catch (err) {
    console.warn(`[sync-studio] Could not fetch product ${ean}: ${err}`);
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
    const { action, userId, companyId, importJobId, page } = await req.json();

    if (!userId || !companyId) {
      return json({ error: "Missing userId or companyId" }, 400);
    }

    switch (action) {
      // ============================
      // START: Begin new import
      // ============================
      case "start": {
        // Check for existing active import
        const { data: existing } = await supabase
          .from("sync_studio_import_jobs")
          .select("id, status")
          .eq("user_id", userId)
          .in("status", ["importing", "planning"])
          .maybeSingle();

        if (existing) {
          return json({ importJobId: existing.id, status: existing.status, message: "Import already in progress" });
        }

        // Get token
        const token = await getBolToken(supabase, companyId);

        // Fetch first inventory page to estimate total
        const firstPage = await fetchInventoryPage(token, 1);
        const inventory = firstPage.inventory || [];
        const estimatedTotal = inventory.length > 0 ? inventory.length * 10 : 0; // rough estimate

        // Create import job
        const { data: job, error: jobErr } = await supabase
          .from("sync_studio_import_jobs")
          .insert({
            user_id: userId,
            status: "importing",
            total_products: estimatedTotal,
            imported_products: 0,
          })
          .select()
          .single();

        if (jobErr) throw new Error(`Failed to create import job: ${jobErr.message}`);

        // Process first chunk of EANs
        const eans = inventory.map((i: any) => i.ean);
        const categories = new Set<string>();
        const brands = new Set<string>();
        let imageCount = 0;

        for (const ean of eans.slice(0, CHUNK_SIZE)) {
          const product = await fetchProductByEan(token, ean);
          if (!product) continue;

          const title = product.title || product.shortDescription || ean;
          const categoryPath = product.category?.categoryName || product.parentCategoryName || "Uncategorized";
          const price = product.offerData?.offers?.[0]?.price || null;
          const images = product.images?.map((img: any) => img.url || img.mediaUrl) || [];
          const brand = product.brand || null;

          if (categoryPath) categories.add(categoryPath);
          if (brand) brands.add(brand);
          imageCount += images.length;

          // Upsert product
          await supabase
            .from("sync_studio_products")
            .upsert({
              ean,
              user_id: userId,
              title,
              description: product.longDescription || product.shortDescription || "",
              category_path: categoryPath,
              attributes: {
                brand,
                color: product.color || null,
                size: product.size || null,
              },
              price,
              existing_image_urls: images,
              last_synced_at: new Date().toISOString(),
            }, { onConflict: "ean,user_id" });
        }

        // Update job progress
        const imported = Math.min(eans.length, CHUNK_SIZE);
        await supabase
          .from("sync_studio_import_jobs")
          .update({
            imported_products: imported,
            total_products: Math.max(estimatedTotal, eans.length),
            categories_found: categories.size,
            brands_found: brands.size,
            images_found: imageCount,
            current_product: eans[Math.min(CHUNK_SIZE, eans.length) - 1] || null,
          })
          .eq("id", job.id);

        const hasMore = eans.length > CHUNK_SIZE || inventory.length >= 50; // bol.com pages are ~50 items

        return json({
          importJobId: job.id,
          status: "importing",
          imported,
          total: Math.max(estimatedTotal, eans.length),
          categories: categories.size,
          brands: brands.size,
          images: imageCount,
          hasMore,
          nextPage: 2,
        });
      }

      // ============================
      // CONTINUE: Next chunk
      // ============================
      case "continue": {
        if (!importJobId) return json({ error: "Missing importJobId" }, 400);

        const token = await getBolToken(supabase, companyId);

        // Fetch next inventory page
        const currentPage = page || 2;
        const pageData = await fetchInventoryPage(token, currentPage);
        const inventory = pageData.inventory || [];

        if (inventory.length === 0) {
          // No more inventory — mark import as done, transition to planning
          await supabase
            .from("sync_studio_import_jobs")
            .update({ status: "planning" })
            .eq("id", importJobId);

          return json({
            importJobId,
            status: "planning",
            imported: 0,
            hasMore: false,
          });
        }

        const eans = inventory.map((i: any) => i.ean);
        const categories = new Set<string>();
        const brands = new Set<string>();
        let imageCount = 0;
        let processed = 0;

        for (const ean of eans.slice(0, CHUNK_SIZE)) {
          const product = await fetchProductByEan(token, ean);
          if (!product) continue;

          const title = product.title || product.shortDescription || ean;
          const categoryPath = product.category?.categoryName || product.parentCategoryName || "Uncategorized";
          const price = product.offerData?.offers?.[0]?.price || null;
          const images = product.images?.map((img: any) => img.url || img.mediaUrl) || [];
          const brand = product.brand || null;

          if (categoryPath) categories.add(categoryPath);
          if (brand) brands.add(brand);
          imageCount += images.length;

          await supabase
            .from("sync_studio_products")
            .upsert({
              ean,
              user_id: userId,
              title,
              description: product.longDescription || product.shortDescription || "",
              category_path: categoryPath,
              attributes: { brand, color: product.color || null, size: product.size || null },
              price,
              existing_image_urls: images,
              last_synced_at: new Date().toISOString(),
            }, { onConflict: "ean,user_id" });

          processed++;
        }

        // Get current totals
        const { data: job } = await supabase
          .from("sync_studio_import_jobs")
          .select("imported_products, categories_found, brands_found, images_found")
          .eq("id", importJobId)
          .single();

        const newImported = (job?.imported_products || 0) + processed;
        const newCategories = (job?.categories_found || 0) + categories.size;
        const newBrands = (job?.brands_found || 0) + brands.size;
        const newImages = (job?.images_found || 0) + imageCount;

        await supabase
          .from("sync_studio_import_jobs")
          .update({
            imported_products: newImported,
            categories_found: newCategories,
            brands_found: newBrands,
            images_found: newImages,
            current_product: eans[processed - 1] || null,
          })
          .eq("id", importJobId);

        const hasMore = inventory.length >= 50; // bol.com pagination

        return json({
          importJobId,
          status: "importing",
          imported: processed,
          totalImported: newImported,
          categories: newCategories,
          brands: newBrands,
          images: newImages,
          hasMore,
          nextPage: currentPage + 1,
        });
      }

      // ============================
      // STATUS: Check progress
      // ============================
      case "status": {
        if (!importJobId) {
          // Get latest job for user
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
