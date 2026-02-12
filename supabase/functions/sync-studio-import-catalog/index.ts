/**
 * Sync Studio — Import Catalog Edge Function
 *
 * Copies products from the existing `products` table (Products environment)
 * into `sync_studio_products` for photoshoot planning.
 *
 * No external API calls — purely database reads/writes.
 *
 * Actions:
 *   - start:    Count products, create import job, copy first chunk
 *   - continue: Copy next chunk of products
 *   - status:   Get current import job status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHUNK_SIZE = 200; // Products per invocation (all DB ops, so fast)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Helpers
// ============================================

/** Extract image URLs from products.featured_image + products.gallery */
function extractImageUrls(
  featuredImage: any,
  gallery: any
): string[] {
  const urls: string[] = [];
  if (featuredImage?.url) urls.push(featuredImage.url);
  if (Array.isArray(gallery)) {
    for (const img of gallery) {
      if (img?.url && !urls.includes(img.url)) urls.push(img.url);
    }
  }
  return urls;
}

/** Extract unique category names from a batch of products */
function extractCategories(products: any[]): Set<string> {
  const cats = new Set<string>();
  for (const p of products) {
    if (p.category && p.category !== "Uncategorized") cats.add(p.category);
  }
  return cats;
}

/** Extract unique brand names from tags (first tag often contains brand info) */
function extractBrands(products: any[]): Set<string> {
  const brands = new Set<string>();
  for (const p of products) {
    // Products don't have a dedicated brand column — skip brand counting
    // or extract from tags if pattern found
  }
  return brands;
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
      // START: Count products & create import job
      // ============================
      case "start": {
        // Check for existing active import
        const { data: existing } = await supabase
          .from("sync_studio_import_jobs")
          .select("id, status, imported_products, total_products, metadata")
          .eq("user_id", userId)
          .in("status", ["importing", "planning"])
          .maybeSingle();

        if (existing) {
          return json({
            importJobId: existing.id,
            status: existing.status,
            imported: existing.imported_products || 0,
            total: existing.total_products || 0,
            hasMore: existing.status === "importing",
            message: "Import already in progress",
          });
        }

        // Count products for this company
        const { count, error: countErr } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId);

        if (countErr) throw new Error(`Failed to count products: ${countErr.message}`);

        const totalProducts = count || 0;
        console.log(`[sync-studio] Found ${totalProducts} products for company ${companyId}`);

        if (totalProducts === 0) {
          return json({
            importJobId: null,
            status: "planning",
            imported: 0,
            total: 0,
            hasMore: false,
            message: "No products found in your catalog",
          });
        }

        // Create import job
        const { data: job, error: jobErr } = await supabase
          .from("sync_studio_import_jobs")
          .insert({
            user_id: userId,
            status: "importing",
            total_products: totalProducts,
            imported_products: 0,
            metadata: { source: "products_table" },
          })
          .select()
          .single();

        if (jobErr) throw new Error(`Failed to create import job: ${jobErr.message}`);

        console.log(`[sync-studio] Created import job ${job.id} for ${totalProducts} products`);

        return json({
          importJobId: job.id,
          status: "importing",
          imported: 0,
          total: totalProducts,
          hasMore: true,
        });
      }

      // ============================
      // CONTINUE: Copy next chunk of products
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

        const offset = job.imported_products || 0;
        const totalProducts = job.total_products || 0;

        // Fetch next chunk from products table
        const { data: products, error: fetchErr } = await supabase
          .from("products")
          .select("id, name, description, short_description, category, ean, price, featured_image, gallery, tags")
          .eq("company_id", companyId)
          .order("created_at", { ascending: true })
          .range(offset, offset + CHUNK_SIZE - 1);

        if (fetchErr) throw new Error(`Failed to fetch products: ${fetchErr.message}`);

        if (!products || products.length === 0) {
          // All done — transition to planning
          await supabase
            .from("sync_studio_import_jobs")
            .update({
              status: "planning",
              imported_products: offset,
              metadata: { ...(job.metadata || {}), phase: "done" },
            })
            .eq("id", importJobId);

          return json({
            importJobId,
            status: "planning",
            imported: offset,
            total: totalProducts,
            hasMore: false,
          });
        }

        // Process chunk: upsert into sync_studio_products
        const categories = extractCategories(products);
        let imageCount = 0;
        let processed = 0;

        for (const product of products) {
          const imageUrls = extractImageUrls(product.featured_image, product.gallery);
          imageCount += imageUrls.length;

          const ean = product.ean || product.id; // Use product ID as fallback if no EAN

          await supabase
            .from("sync_studio_products")
            .upsert(
              {
                ean,
                user_id: userId,
                title: product.name || "Untitled",
                description: product.description || product.short_description || "",
                category_path: product.category || "Uncategorized",
                attributes: {
                  tags: product.tags || [],
                  product_id: product.id,
                },
                price: product.price ? parseFloat(product.price) : null,
                existing_image_urls: imageUrls,
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "ean,user_id" }
            );

          processed++;
        }

        const newImported = offset + processed;
        const hasMore = newImported < totalProducts;

        // Accumulate stats
        const newCategories = (job.categories_found || 0) + categories.size;
        const newImages = (job.images_found || 0) + imageCount;

        const updateData: any = {
          imported_products: newImported,
          categories_found: newCategories,
          images_found: newImages,
          current_product: products[processed - 1]?.name || null,
          metadata: { ...(job.metadata || {}), lastOffset: newImported },
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
          imported: newImported,
          total: totalProducts,
          categories: newCategories,
          images: newImages,
          currentProduct: products[processed - 1]?.name || null,
          hasMore,
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
