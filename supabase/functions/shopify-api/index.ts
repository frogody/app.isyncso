/**
 * Shopify Admin API Edge Function
 * Unified endpoint for all Shopify integration operations
 *
 * Actions:
 * Auth:
 *   - initiateOAuth: Generate OAuth authorization URL
 *   - handleOAuthCallback: Exchange code for permanent token
 *   - testConnection: Verify token works (GET /shop.json)
 *   - disconnect: Remove webhooks, mark disconnected
 *
 * Products:
 *   - syncProducts: Pull all products, match by EAN/SKU
 *   - createProduct: Push new product to Shopify
 *
 * Inventory:
 *   - getInventoryLevels: Pull stock levels (batch max 50)
 *   - setInventoryLevel: Push single stock update
 *   - batchInventoryUpdate: Push stock for multiple products
 *
 * Orders:
 *   - getOrders: Pull orders (backup poll)
 *   - createFulfillment: Push fulfillment with tracking
 *   - pollNewOrders: Called by pg_cron, all active credentials
 *
 * Webhooks:
 *   - registerWebhooks: Register 8 topics
 *   - deleteWebhooks: Remove all webhooks
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ============================================
// Configuration
// ============================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHOPIFY_API_KEY = Deno.env.get("SHOPIFY_API_KEY");
if (!SHOPIFY_API_KEY) {
  throw new Error("SHOPIFY_API_KEY not configured");
}
const SHOPIFY_API_SECRET = Deno.env.get("SHOPIFY_API_SECRET");
if (!SHOPIFY_API_SECRET) {
  throw new Error("SHOPIFY_API_SECRET not configured");
}
const SHOPIFY_ENCRYPTION_KEY = Deno.env.get("SHOPIFY_ENCRYPTION_KEY");
if (!SHOPIFY_ENCRYPTION_KEY) {
  throw new Error("SHOPIFY_ENCRYPTION_KEY not configured");
}
const SHOPIFY_API_VERSION = "2024-10";
const SHOPIFY_SCOPES = "read_products,write_products,read_inventory,write_inventory,read_orders,write_orders,read_fulfillments,write_fulfillments";
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/shopify-webhooks`;
const OAUTH_REDIRECT_URI = "https://app.isyncso.com/shopifycallback";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Types
// ============================================

type ShopifyAction =
  | "initiateOAuth"
  | "handleOAuthCallback"
  | "testConnection"
  | "disconnect"
  | "syncProducts"
  | "createProduct"
  | "getInventoryLevels"
  | "setInventoryLevel"
  | "batchInventoryUpdate"
  | "getOrders"
  | "createFulfillment"
  | "registerWebhooks"
  | "deleteWebhooks"
  | "pollNewOrders";

interface ShopifyRequest {
  action: ShopifyAction;
  companyId: string;
  [key: string]: unknown;
}

interface ShopifyResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================
// Supabase client
// ============================================

function getSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ============================================
// Rate-Limited Shopify REST API Fetch
// Leaky bucket: 40 requests max, 2/second leak
// ============================================

async function shopifyFetch<T = unknown>(
  shopDomain: string,
  token: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown,
  retries = 2
): Promise<T> {
  const url = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch(url, {
      method,
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}),
    });

    // Check rate limit bucket
    const callLimit = resp.headers.get("X-Shopify-Shop-Api-Call-Limit");
    if (callLimit) {
      const [used, max] = callLimit.split("/").map(Number);
      if (used >= max - 4) {
        const sleepMs = Math.min((used - (max - 4)) * 500, 2000);
        console.log(`[shopify-api] Rate limit ${used}/${max}, sleeping ${sleepMs}ms`);
        await new Promise((r) => setTimeout(r, sleepMs));
      }
    }

    // 429 — Rate limited
    if (resp.status === 429) {
      const retryAfter = parseFloat(resp.headers.get("Retry-After") || "2");
      console.warn(`[shopify-api] Rate limited on ${endpoint}, retry after ${retryAfter}s`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw new Error(`Rate limited on ${endpoint} after ${retries + 1} attempts`);
    }

    // 401 — Token revoked or invalid
    if (resp.status === 401) {
      throw new Error("Unauthorized — Shopify access token may be revoked");
    }

    // 5xx — Server error, retry with backoff
    if (resp.status >= 500 && attempt < retries) {
      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`[shopify-api] Server error ${resp.status} on ${endpoint}, retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      throw new Error(`Shopify API ${resp.status}: ${errBody}`);
    }

    if (resp.status === 204) return {} as T;
    return (await resp.json()) as T;
  }
  throw new Error(`Failed after ${retries + 1} attempts`);
}

// ============================================
// Paginated fetch (Link header cursor)
// ============================================

async function shopifyFetchAll<T>(
  shopDomain: string,
  token: string,
  endpoint: string,
  rootKey: string
): Promise<T[]> {
  let url: string | null = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;
  const allItems: T[] = [];

  while (url) {
    const resp = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    // Rate limit check
    const callLimit = resp.headers.get("X-Shopify-Shop-Api-Call-Limit");
    if (callLimit) {
      const [used, max] = callLimit.split("/").map(Number);
      if (used >= max - 4) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (resp.status === 429) {
      const retryAfter = parseFloat(resp.headers.get("Retry-After") || "2");
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue; // Retry same URL
    }

    if (!resp.ok) {
      throw new Error(`Shopify pagination error ${resp.status}`);
    }

    const data = await resp.json();
    allItems.push(...(data[rootKey] || []));

    // Parse Link header for next page
    const linkHeader = resp.headers.get("Link");
    url = linkHeader?.match(/<([^>]+)>;\s*rel="next"/)?.[1] || null;
  }

  return allItems;
}

// ============================================
// Token retrieval (permanent, no refresh)
// ============================================

async function getShopifyToken(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ token: string; shopDomain: string; credentialsId: string } | { error: string }> {
  const { data: creds, error } = await supabase
    .from("shopify_credentials")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !creds) {
    return { error: "No active Shopify credentials found" };
  }

  if (!creds.access_token_encrypted) {
    return { error: "Shopify not connected — no access token" };
  }

  // Decrypt token
  const { data: token, error: decryptErr } = await supabase.rpc(
    "decrypt_shopify_credential",
    { ciphertext: creds.access_token_encrypted, encryption_key: SHOPIFY_ENCRYPTION_KEY }
  );

  if (decryptErr || !token) {
    return { error: `Failed to decrypt token: ${decryptErr?.message || "empty"}` };
  }

  return { token, shopDomain: creds.shop_domain, credentialsId: creds.id };
}

// ============================================
// HMAC verification for OAuth callback
// ============================================

async function verifyOAuthHmac(params: Record<string, string>): Promise<boolean> {
  const hmac = params.hmac;
  if (!hmac || !params.code || !params.shop) return false;

  // Build message: sorted query params excluding "hmac", joined by "&"
  const message = Object.keys(params)
    .filter((k) => k !== "hmac")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SHOPIFY_API_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe comparison
  if (computed.length !== hmac.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ hmac.charCodeAt(i);
  }
  return mismatch === 0;
}

// ============================================
// Webhook topics to register
// ============================================

const WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/cancelled",
  "inventory_levels/update",
  "products/update",
  "products/delete",
  "refunds/create",
  "app/uninstalled",
];

// ============================================
// Main handler
// ============================================

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ShopifyRequest = await req.json();
    const { action, companyId } = body;

    if (!action) {
      return jsonResponse({ success: false, error: "Missing action" }, 400);
    }

    const supabase = getSupabase();
    let result: ShopifyResult;

    switch (action) {
      // ============================================
      // AUTH
      // ============================================

      case "initiateOAuth": {
        const shopDomain = body.shopDomain as string;
        if (!shopDomain) {
          result = { success: false, error: "Missing shopDomain" };
          break;
        }

        // Validate domain format
        const cleanDomain = shopDomain
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "");

        if (!cleanDomain.includes(".myshopify.com")) {
          result = { success: false, error: "Invalid Shopify domain. Must be yourstore.myshopify.com" };
          break;
        }

        // Generate nonce for CSRF protection
        const state = crypto.randomUUID();

        // Store state in DB for verification on callback
        await supabase.from("shopify_credentials").upsert(
          {
            company_id: companyId,
            shop_domain: cleanDomain,
            oauth_state: state,
            status: "disconnected",
            is_active: true,
          },
          { onConflict: "company_id,shop_domain" }
        );

        const authUrl =
          `https://${cleanDomain}/admin/oauth/authorize` +
          `?client_id=${SHOPIFY_API_KEY}` +
          `&scope=${SHOPIFY_SCOPES}` +
          `&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}` +
          `&state=${state}`;

        result = { success: true, data: { authUrl, state } };
        break;
      }

      case "handleOAuthCallback": {
        const { code, shop, state, hmac, host, timestamp } = body as {
          code: string;
          shop: string;
          state: string;
          hmac?: string;
          host?: string;
          timestamp?: string;
          [key: string]: unknown;
        };

        if (!code || !shop || !state) {
          result = { success: false, error: "Missing code, shop, or state" };
          break;
        }

        // Verify OAuth HMAC if present (Shopify sends it on the redirect)
        if (hmac) {
          const oauthParams: Record<string, string> = { code, shop, state };
          if (host) oauthParams.host = host;
          if (timestamp) oauthParams.timestamp = timestamp;
          oauthParams.hmac = hmac;
          const hmacValid = await verifyOAuthHmac(oauthParams);
          if (!hmacValid) {
            console.error("[shopify-api] OAuth HMAC verification failed");
            result = { success: false, error: "OAuth signature verification failed" };
            break;
          }
        }

        // Verify state matches stored value
        const { data: creds } = await supabase
          .from("shopify_credentials")
          .select("*")
          .eq("shop_domain", shop)
          .eq("oauth_state", state)
          .maybeSingle();

        if (!creds) {
          result = { success: false, error: "Invalid OAuth state — CSRF check failed" };
          break;
        }

        // Exchange code for permanent access token
        const tokenResp = await fetch(`https://${shop}/admin/oauth/access_token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: SHOPIFY_API_KEY,
            client_secret: SHOPIFY_API_SECRET,
            code,
          }),
        });

        if (!tokenResp.ok) {
          const errText = await tokenResp.text();
          result = { success: false, error: `Token exchange failed: ${errText}` };
          break;
        }

        const tokenData = await tokenResp.json();
        const accessToken = tokenData.access_token;
        const scopes = tokenData.scope?.split(",") || [];

        // Encrypt token
        const { data: encrypted } = await supabase.rpc("encrypt_shopify_credential", {
          plaintext: accessToken,
          encryption_key: SHOPIFY_ENCRYPTION_KEY,
        });

        // Fetch shop info
        let shopName = shop;
        try {
          const shopInfo = await shopifyFetch<{ shop: { name: string } }>(
            shop, accessToken, "/shop.json"
          );
          shopName = shopInfo.shop?.name || shop;
        } catch { /* non-critical */ }

        // Fetch locations
        let primaryLocationId: string | null = null;
        try {
          const locations = await shopifyFetch<{ locations: Array<{ id: number; active: boolean }> }>(
            shop, accessToken, "/locations.json"
          );
          const activeLocation = locations.locations?.find((l) => l.active);
          primaryLocationId = activeLocation ? String(activeLocation.id) : null;
        } catch { /* non-critical */ }

        // Update credentials
        await supabase
          .from("shopify_credentials")
          .update({
            access_token_encrypted: encrypted,
            scopes,
            shop_name: shopName,
            primary_location_id: primaryLocationId,
            status: "connected",
            oauth_state: null,
            connected_by: body.userId as string || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", creds.id);

        // Register webhooks
        const webhookIds: number[] = [];
        for (const topic of WEBHOOK_TOPICS) {
          try {
            const wh = await shopifyFetch<{ webhook: { id: number } }>(
              shop, accessToken, "/webhooks.json", "POST",
              { webhook: { topic, address: WEBHOOK_URL, format: "json" } }
            );
            if (wh.webhook?.id) webhookIds.push(wh.webhook.id);
            // Small delay between registrations to avoid rate limits
            await new Promise((r) => setTimeout(r, 300));
          } catch (e) {
            console.warn(`[shopify-api] Failed to register webhook ${topic}: ${e}`);
          }
        }

        // Store webhook IDs
        await supabase
          .from("shopify_credentials")
          .update({ webhook_ids: webhookIds })
          .eq("id", creds.id);

        result = {
          success: true,
          data: { shopName, scopes, primaryLocationId, webhooksRegistered: webhookIds.length },
        };
        break;
      }

      case "testConnection": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        try {
          const shopInfo = await shopifyFetch<{ shop: { name: string; email: string; plan_name: string } }>(
            tokenResult.shopDomain, tokenResult.token, "/shop.json"
          );

          // Update last API call
          await supabase
            .from("shopify_credentials")
            .update({
              status: "connected",
              last_sync_at: new Date().toISOString(),
              last_error: null,
            })
            .eq("id", tokenResult.credentialsId);

          result = { success: true, data: shopInfo.shop };
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          await supabase
            .from("shopify_credentials")
            .update({ status: "error", last_error: errMsg })
            .eq("id", tokenResult.credentialsId);
          result = { success: false, error: errMsg };
        }
        break;
      }

      case "disconnect": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if (!("error" in tokenResult)) {
          // Delete webhooks from Shopify
          const { data: creds } = await supabase
            .from("shopify_credentials")
            .select("webhook_ids")
            .eq("id", tokenResult.credentialsId)
            .single();

          if (creds?.webhook_ids) {
            for (const whId of creds.webhook_ids as number[]) {
              try {
                await shopifyFetch(
                  tokenResult.shopDomain, tokenResult.token,
                  `/webhooks/${whId}.json`, "DELETE"
                );
              } catch { /* best effort */ }
            }
          }
        }

        // Mark credentials disconnected
        await supabase
          .from("shopify_credentials")
          .update({
            status: "disconnected",
            is_active: false,
            access_token_encrypted: null,
            webhook_ids: [],
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .eq("is_active", true);

        // Deactivate all mappings
        await supabase
          .from("shopify_product_mappings")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("company_id", companyId);

        result = { success: true, data: { disconnected: true } };
        break;
      }

      // ============================================
      // PRODUCTS
      // ============================================

      case "syncProducts": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        // Fetch all Shopify products
        const products = await shopifyFetchAll<{
          id: number;
          title: string;
          variants: Array<{
            id: number;
            barcode: string;
            sku: string;
            price: string;
            inventory_item_id: number;
            title: string;
          }>;
        }>(
          tokenResult.shopDomain,
          tokenResult.token,
          "/products.json?limit=250",
          "products"
        );

        // Fetch our products for matching
        const { data: ourProducts } = await supabase
          .from("products")
          .select("id, name, sku, ean")
          .eq("company_id", companyId);

        const eanMap = new Map<string, { id: string; name: string }>();
        const skuMap = new Map<string, { id: string; name: string }>();
        for (const p of ourProducts || []) {
          if (p.ean) eanMap.set(p.ean, { id: p.id, name: p.name });
          if (p.sku) skuMap.set(p.sku, { id: p.id, name: p.name });
        }

        // Fetch all existing mappings upfront (avoids N+1 per-variant queries)
        const { data: existingMappings } = await supabase
          .from("shopify_product_mappings")
          .select("id, shopify_variant_id")
          .eq("company_id", companyId);
        const existingMap = new Map(
          (existingMappings || []).map((m: { id: string; shopify_variant_id: number }) => [m.shopify_variant_id, m.id])
        );

        const mapped: unknown[] = [];
        const unmapped: unknown[] = [];
        let newMappings = 0;

        for (const product of products) {
          for (const variant of product.variants || []) {
            // Check existing mapping via in-memory map
            const existingId = existingMap.get(variant.id);

            if (existingId) {
              // Update cached info
              await supabase
                .from("shopify_product_mappings")
                .update({
                  shopify_product_title: product.title,
                  shopify_variant_title: variant.title,
                  shopify_sku: variant.sku,
                  last_synced_at: new Date().toISOString(),
                })
                .eq("id", existingId);
              mapped.push({ shopifyProductId: product.id, variantId: variant.id, title: product.title });
              continue;
            }

            // Try EAN match (barcode field)
            const eanMatch = variant.barcode ? eanMap.get(variant.barcode) : null;
            if (eanMatch) {
              await supabase.from("shopify_product_mappings").insert({
                company_id: companyId,
                product_id: eanMatch.id,
                shopify_product_id: product.id,
                shopify_variant_id: variant.id,
                shopify_inventory_item_id: variant.inventory_item_id,
                matched_by: "ean",
                shopify_product_title: product.title,
                shopify_variant_title: variant.title,
                shopify_sku: variant.sku,
                is_active: true,
                sync_inventory: true,
              });
              mapped.push({ shopifyProductId: product.id, variantId: variant.id, title: product.title, matchedBy: "ean" });
              newMappings++;
              continue;
            }

            // Try SKU match
            const skuMatch = variant.sku ? skuMap.get(variant.sku) : null;
            if (skuMatch) {
              await supabase.from("shopify_product_mappings").insert({
                company_id: companyId,
                product_id: skuMatch.id,
                shopify_product_id: product.id,
                shopify_variant_id: variant.id,
                shopify_inventory_item_id: variant.inventory_item_id,
                matched_by: "sku",
                shopify_product_title: product.title,
                shopify_variant_title: variant.title,
                shopify_sku: variant.sku,
                is_active: true,
                sync_inventory: true,
              });
              mapped.push({ shopifyProductId: product.id, variantId: variant.id, title: product.title, matchedBy: "sku" });
              newMappings++;
              continue;
            }

            // No match — add to unmapped list
            unmapped.push({
              shopifyProductId: product.id,
              shopifyVariantId: variant.id,
              shopifyInventoryItemId: variant.inventory_item_id,
              title: product.title,
              variantTitle: variant.title,
              barcode: variant.barcode,
              sku: variant.sku,
              price: variant.price,
            });
          }
        }

        // Update sync timestamp
        await supabase
          .from("shopify_credentials")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", tokenResult.credentialsId);

        result = {
          success: true,
          data: {
            total: products.length,
            mapped: mapped.length,
            unmapped: unmapped.length,
            newMappings,
            unmappedProducts: unmapped,
          },
        };
        break;
      }

      case "createProduct": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        const { productId } = body as { productId: string; [key: string]: unknown };
        const { data: product } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();

        if (!product) {
          result = { success: false, error: "Product not found" };
          break;
        }

        const shopifyProduct = await shopifyFetch<{
          product: { id: number; variants: Array<{ id: number; inventory_item_id: number }> };
        }>(
          tokenResult.shopDomain, tokenResult.token,
          "/products.json", "POST",
          {
            product: {
              title: product.name,
              body_html: product.description || "",
              vendor: product.brand || "",
              product_type: product.category || "",
              variants: [{
                barcode: product.ean || "",
                sku: product.sku || "",
                price: product.retail_price || "0.00",
                inventory_management: "shopify",
                inventory_policy: "deny",
                requires_shipping: true,
              }],
              metafields: [{
                namespace: "isyncso",
                key: "product_id",
                value: product.id,
                type: "single_line_text_field",
              }],
            },
          }
        );

        const variant = shopifyProduct.product.variants[0];

        // Create mapping
        await supabase.from("shopify_product_mappings").insert({
          company_id: companyId,
          product_id: product.id,
          shopify_product_id: shopifyProduct.product.id,
          shopify_variant_id: variant.id,
          shopify_inventory_item_id: variant.inventory_item_id,
          matched_by: "auto_created",
          shopify_product_title: product.name,
          is_active: true,
          sync_inventory: true,
        });

        // Update product
        await supabase
          .from("products")
          .update({ shopify_listed: true })
          .eq("id", product.id);

        result = {
          success: true,
          data: {
            shopifyProductId: shopifyProduct.product.id,
            shopifyVariantId: variant.id,
            inventoryItemId: variant.inventory_item_id,
          },
        };
        break;
      }

      // ============================================
      // INVENTORY
      // ============================================

      case "getInventoryLevels": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        const inventoryItemIds = body.inventoryItemIds as number[];
        if (!inventoryItemIds?.length) {
          result = { success: false, error: "Missing inventoryItemIds" };
          break;
        }

        // Batch max 50 per request
        const levels: unknown[] = [];
        for (let i = 0; i < inventoryItemIds.length; i += 50) {
          const batch = inventoryItemIds.slice(i, i + 50);
          const data = await shopifyFetch<{ inventory_levels: unknown[] }>(
            tokenResult.shopDomain, tokenResult.token,
            `/inventory_levels.json?inventory_item_ids=${batch.join(",")}`
          );
          levels.push(...(data.inventory_levels || []));
        }

        result = { success: true, data: { levels } };
        break;
      }

      case "setInventoryLevel": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        const { inventoryItemId, locationId, available } = body as {
          inventoryItemId: number;
          locationId?: string;
          available: number;
          [key: string]: unknown;
        };

        // Use primary location if not specified
        let locId = locationId;
        if (!locId) {
          const { data: creds } = await supabase
            .from("shopify_credentials")
            .select("primary_location_id")
            .eq("id", tokenResult.credentialsId)
            .single();
          locId = creds?.primary_location_id;
        }

        if (!locId) {
          result = { success: false, error: "No location ID available" };
          break;
        }

        const data = await shopifyFetch(
          tokenResult.shopDomain, tokenResult.token,
          "/inventory_levels/set.json", "POST",
          { location_id: Number(locId), inventory_item_id: inventoryItemId, available }
        );

        result = { success: true, data };
        break;
      }

      case "batchInventoryUpdate": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        const updates = body.updates as Array<{ inventoryItemId: number; available: number }>;
        if (!updates?.length) {
          result = { success: false, error: "Missing updates array" };
          break;
        }

        const { data: creds } = await supabase
          .from("shopify_credentials")
          .select("primary_location_id")
          .eq("id", tokenResult.credentialsId)
          .single();

        const locId = creds?.primary_location_id;
        if (!locId) {
          result = { success: false, error: "No location ID" };
          break;
        }

        const results: Array<{ inventoryItemId: number; success: boolean; error?: string }> = [];
        for (const upd of updates) {
          try {
            await shopifyFetch(
              tokenResult.shopDomain, tokenResult.token,
              "/inventory_levels/set.json", "POST",
              { location_id: Number(locId), inventory_item_id: upd.inventoryItemId, available: upd.available }
            );
            results.push({ inventoryItemId: upd.inventoryItemId, success: true });
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            results.push({ inventoryItemId: upd.inventoryItemId, success: false, error: errMsg });
          }
          // Throttle to respect rate limits
          await new Promise((r) => setTimeout(r, 300));
        }

        await supabase
          .from("shopify_credentials")
          .update({ last_inventory_sync_at: new Date().toISOString() })
          .eq("id", tokenResult.credentialsId);

        result = { success: true, data: { results } };
        break;
      }

      // ============================================
      // ORDERS
      // ============================================

      case "getOrders": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        const status = (body.status as string) || "any";
        const fulfillmentStatus = (body.fulfillmentStatus as string) || "unfulfilled";
        const limit = (body.limit as number) || 50;
        const sinceId = body.sinceId as string;

        let endpoint = `/orders.json?status=${status}&fulfillment_status=${fulfillmentStatus}&limit=${limit}`;
        if (sinceId) endpoint += `&since_id=${sinceId}`;

        const data = await shopifyFetch<{ orders: unknown[] }>(
          tokenResult.shopDomain, tokenResult.token, endpoint
        );

        await supabase
          .from("shopify_credentials")
          .update({ last_order_sync_at: new Date().toISOString() })
          .eq("id", tokenResult.credentialsId);

        result = { success: true, data: { orders: data.orders || [] } };
        break;
      }

      case "createFulfillment": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        const { orderId, trackingNumber, trackingCompany, trackingUrl } = body as {
          orderId: number;
          trackingNumber: string;
          trackingCompany: string;
          trackingUrl?: string;
          [key: string]: unknown;
        };

        // Step 1: Get fulfillment orders
        const foData = await shopifyFetch<{
          fulfillment_orders: Array<{
            id: number;
            line_items: Array<{ id: number; quantity: number }>;
          }>;
        }>(
          tokenResult.shopDomain, tokenResult.token,
          `/orders/${orderId}/fulfillment_orders.json`
        );

        const fulfillmentOrders = foData.fulfillment_orders || [];
        if (!fulfillmentOrders.length) {
          result = { success: false, error: "No fulfillment orders found" };
          break;
        }

        // Step 2: Create fulfillment
        const lineItemsByFo = fulfillmentOrders.map((fo) => ({
          fulfillment_order_id: fo.id,
          fulfillment_order_line_items: fo.line_items.map((li) => ({
            id: li.id,
            quantity: li.quantity,
          })),
        }));

        const fulfillment = await shopifyFetch<{ fulfillment: { id: number; status: string } }>(
          tokenResult.shopDomain, tokenResult.token,
          "/fulfillments.json", "POST",
          {
            fulfillment: {
              line_items_by_fulfillment_order: lineItemsByFo,
              tracking_info: {
                company: trackingCompany,
                number: trackingNumber,
                ...(trackingUrl ? { url: trackingUrl } : {}),
              },
              notify_customer: true,
            },
          }
        );

        result = { success: true, data: fulfillment };
        break;
      }

      // ============================================
      // WEBHOOKS
      // ============================================

      case "registerWebhooks": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        const webhookIds: number[] = [];
        const errors: string[] = [];

        for (const topic of WEBHOOK_TOPICS) {
          try {
            const wh = await shopifyFetch<{ webhook: { id: number } }>(
              tokenResult.shopDomain, tokenResult.token,
              "/webhooks.json", "POST",
              { webhook: { topic, address: WEBHOOK_URL, format: "json" } }
            );
            if (wh.webhook?.id) webhookIds.push(wh.webhook.id);
          } catch (e: unknown) {
            errors.push(`${topic}: ${e instanceof Error ? e.message : String(e)}`);
          }
          await new Promise((r) => setTimeout(r, 300));
        }

        await supabase
          .from("shopify_credentials")
          .update({ webhook_ids: webhookIds })
          .eq("id", tokenResult.credentialsId);

        result = { success: true, data: { registered: webhookIds.length, errors } };
        break;
      }

      case "deleteWebhooks": {
        const tokenResult = await getShopifyToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        const { data: creds } = await supabase
          .from("shopify_credentials")
          .select("webhook_ids")
          .eq("id", tokenResult.credentialsId)
          .single();

        let deleted = 0;
        for (const whId of (creds?.webhook_ids || []) as number[]) {
          try {
            await shopifyFetch(
              tokenResult.shopDomain, tokenResult.token,
              `/webhooks/${whId}.json`, "DELETE"
            );
            deleted++;
          } catch { /* best effort */ }
        }

        await supabase
          .from("shopify_credentials")
          .update({ webhook_ids: [] })
          .eq("id", tokenResult.credentialsId);

        result = { success: true, data: { deleted } };
        break;
      }

      case "pollNewOrders": {
        // Called by pg_cron — iterate all active Shopify connections and import missed orders
        const { data: allCreds } = await supabase
          .from("shopify_credentials")
          .select("*")
          .eq("is_active", true)
          .eq("status", "connected");

        const pollResults: Array<{ shopDomain: string; orders: number; error?: string }> = [];

        for (const creds of allCreds || []) {
          try {
            if (!creds.access_token_encrypted || !creds.auto_sync_orders) continue;

            const { data: token } = await supabase.rpc("decrypt_shopify_credential", {
              ciphertext: creds.access_token_encrypted,
              encryption_key: SHOPIFY_ENCRYPTION_KEY,
            });

            if (!token) continue;

            let endpoint = `/orders.json?status=any&fulfillment_status=unfulfilled&limit=50`;
            if (creds.last_order_sync_at) {
              endpoint += `&created_at_min=${creds.last_order_sync_at}`;
            }

            // deno-lint-ignore no-explicit-any
            const data = await shopifyFetch<{ orders: any[] }>(
              creds.shop_domain, token, endpoint
            );

            const orders = data.orders || [];
            let imported = 0;

            for (const order of orders) {
              // Dedup check
              const { data: existing } = await supabase
                .from("sales_orders")
                .select("id")
                .eq("company_id", creds.company_id)
                .eq("shopify_order_id", order.id)
                .maybeSingle();

              if (existing) continue;

              // Import the order (same logic as shopify-webhooks orders/create)
              let customerId: string | null = null;
              if (order.email) {
                const { data: customer } = await supabase
                  .from("customers")
                  .select("id")
                  .eq("company_id", creds.company_id)
                  .eq("email", order.email)
                  .maybeSingle();

                if (customer) {
                  customerId = customer.id;
                } else {
                  const { data: newCustomer } = await supabase
                    .from("customers")
                    .insert({
                      company_id: creds.company_id,
                      name: `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() || order.email,
                      email: order.email,
                      phone: order.phone || null,
                    })
                    .select("id")
                    .single();
                  customerId = newCustomer?.id || null;
                }
              }

              const shipping = order.shipping_address || {};
              const orderNumber = order.name || `#${order.order_number}`;

              const { data: salesOrder, error: orderErr } = await supabase
                .from("sales_orders")
                .insert({
                  company_id: creds.company_id,
                  customer_id: customerId,
                  source: "shopify",
                  shopify_order_id: order.id,
                  shopify_order_number: orderNumber,
                  order_date: order.created_at || new Date().toISOString(),
                  status: "confirmed",
                  shipping_name: shipping.name || "",
                  shipping_address_line1: shipping.address1 || "",
                  shipping_address_line2: shipping.address2 || "",
                  shipping_city: shipping.city || "",
                  shipping_state: shipping.province || "",
                  shipping_postal_code: shipping.zip || "",
                  shipping_country: shipping.country_code || "NL",
                  billing_same_as_shipping: true,
                  subtotal: parseFloat(order.subtotal_price || "0"),
                  discount_amount: parseFloat(order.total_discounts || "0"),
                  tax_amount: parseFloat(order.total_tax || "0"),
                  shipping_cost: parseFloat(order.total_shipping_price_set?.shop_money?.amount || "0"),
                  total: parseFloat(order.total_price || "0"),
                  currency: order.currency || "EUR",
                  payment_status: order.financial_status === "paid" ? "paid" : "pending",
                  metadata: { shopify_raw: { id: order.id, name: orderNumber }, source: "poll_import" },
                })
                .select("id")
                .single();

              if (orderErr) {
                console.error(`[shopify-api] pollNewOrders: Failed to import ${order.id}: ${orderErr.message}`);
                continue;
              }

              // Create line items
              for (const item of order.line_items || []) {
                let productId: string | null = null;
                if (item.variant_id) {
                  const { data: mapping } = await supabase
                    .from("shopify_product_mappings")
                    .select("product_id")
                    .eq("company_id", creds.company_id)
                    .eq("shopify_variant_id", item.variant_id)
                    .eq("is_active", true)
                    .maybeSingle();
                  productId = mapping?.product_id || null;
                }

                await supabase.from("sales_order_items").insert({
                  sales_order_id: salesOrder.id,
                  product_id: productId,
                  product_name: item.title || item.name || "",
                  sku: item.sku || "",
                  quantity: item.quantity || 1,
                  unit_price: parseFloat(item.price || "0"),
                  discount_amount: parseFloat(item.total_discount || "0"),
                  total: parseFloat(item.price || "0") * (item.quantity || 1),
                });

                // Reserve inventory
                if (productId) {
                  const { data: inv } = await supabase
                    .from("inventory")
                    .select("id, quantity_reserved")
                    .eq("product_id", productId)
                    .eq("company_id", creds.company_id)
                    .maybeSingle();

                  if (inv) {
                    await supabase
                      .from("inventory")
                      .update({ quantity_reserved: (inv.quantity_reserved || 0) + (item.quantity || 1) })
                      .eq("id", inv.id);
                  }
                }
              }

              imported++;
            }

            await supabase
              .from("shopify_credentials")
              .update({ last_order_sync_at: new Date().toISOString() })
              .eq("id", creds.id);

            pollResults.push({ shopDomain: creds.shop_domain, orders: imported });
          } catch (e: unknown) {
            pollResults.push({
              shopDomain: creds.shop_domain,
              orders: 0,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        result = { success: true, data: { pollResults } };
        break;
      }

      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    return jsonResponse(result, result.success ? 200 : 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[shopify-api] Error:", message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
