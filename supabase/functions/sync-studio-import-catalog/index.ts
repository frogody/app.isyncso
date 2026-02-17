/**
 * Sync Studio — Import Catalog Edge Function
 *
 * Copies SELECTED products (max 30) from the `products` table into
 * `sync_studio_products` for a photoshoot session.
 *
 * Actions:
 *   - start:  Receive selected product IDs, copy to sync_studio_products, create job
 *   - status: Get current import job status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_PRODUCTS = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function extractImageUrls(featuredImage: any, gallery: any): string[] {
  const urls: string[] = [];
  if (featuredImage?.url) urls.push(featuredImage.url);
  if (Array.isArray(gallery)) {
    for (const img of gallery) {
      if (img?.url && !urls.includes(img.url)) urls.push(img.url);
    }
  }
  return urls;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { action, userId, companyId, importJobId, productIds } =
      await req.json();

    if (!userId || !companyId) {
      return json({ error: "Missing userId or companyId" }, 400);
    }

    switch (action) {
      // ============================
      // START: Import selected products
      // ============================
      case "start": {
        if (!Array.isArray(productIds) || productIds.length === 0) {
          return json({ error: "No products selected" }, 400);
        }

        if (productIds.length > MAX_PRODUCTS) {
          return json(
            { error: `Maximum ${MAX_PRODUCTS} products per session` },
            400
          );
        }

        // Cancel any existing active jobs for this user
        await supabase
          .from("sync_studio_import_jobs")
          .update({ status: "cancelled" })
          .eq("user_id", userId)
          .in("status", ["importing", "planning"]);

        // Clean up previous session data so dashboard only shows current selection
        await supabase
          .from("sync_studio_shoot_plans")
          .delete()
          .eq("user_id", userId);

        await supabase
          .from("sync_studio_products")
          .delete()
          .eq("user_id", userId);

        // Fetch selected products
        const { data: products, error: fetchErr } = await supabase
          .from("products")
          .select(
            "id, name, description, short_description, category, ean, price, featured_image, gallery, tags"
          )
          .eq("company_id", companyId)
          .in("id", productIds);

        if (fetchErr)
          throw new Error(`Failed to fetch products: ${fetchErr.message}`);
        if (!products || products.length === 0) {
          return json({ error: "No matching products found" }, 400);
        }

        console.log(
          `[sync-studio] Importing ${products.length} selected products`
        );

        // Upsert into sync_studio_products
        const categories = new Set<string>();
        let imageCount = 0;

        for (const product of products) {
          const imageUrls = extractImageUrls(
            product.featured_image,
            product.gallery
          );
          imageCount += imageUrls.length;
          if (product.category && product.category !== "Uncategorized")
            categories.add(product.category);

          const ean = product.ean || product.id;

          await supabase.from("sync_studio_products").upsert(
            {
              ean,
              user_id: userId,
              title: product.name || "Untitled",
              description:
                product.description || product.short_description || "",
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
        }

        // Create import job — already done, go straight to planning
        const { data: job, error: jobErr } = await supabase
          .from("sync_studio_import_jobs")
          .insert({
            user_id: userId,
            status: "planning",
            total_products: products.length,
            imported_products: products.length,
            categories_found: categories.size,
            images_found: imageCount,
            metadata: {
              source: "products_table",
              selectedProductIds: productIds,
            },
          })
          .select()
          .single();

        if (jobErr)
          throw new Error(`Failed to create import job: ${jobErr.message}`);

        return json({
          importJobId: job.id,
          status: "planning",
          imported: products.length,
          total: products.length,
          categories: categories.size,
          images: imageCount,
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
