/**
 * bol.com Retailer API Edge Function
 * Unified endpoint for all bol.com integration operations (Phase 4)
 *
 * Actions:
 * Auth:
 *   - testConnection: Verify credentials work
 *   - refreshToken: Refresh token for one company
 *   - refreshAllTokens: Refresh tokens for all active credentials
 *   - saveCredentials: Encrypt and save client credentials
 *
 * Process Status:
 *   - getProcessStatus: Poll a single process status
 *   - pollProcessStatuses: Poll all pending for a company
 *
 * Replenishment:
 *   - getReplenishmentProductDestinations
 *   - getReplenishmentTimeslots
 *   - createReplenishment
 *   - getReplenishment
 *   - getReplenishmentLabels
 *
 * Stock & Offers:
 *   - getInventory
 *   - syncStock
 *   - updateStock
 *   - listOffers
 *   - getOffer
 *   - createOffer
 *   - updateOffer
 *
 * Returns:
 *   - getReturns
 *   - handleReturn
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ============================================
// Configuration
// ============================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOLCOM_ENCRYPTION_KEY = Deno.env.get("BOLCOM_ENCRYPTION_KEY") || "bolcom-default-key-change-me";
const BOL_API_BASE = "https://api.bol.com/retailer";
const BOL_AUTH_URL = "https://login.bol.com/token";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================
// Types
// ============================================

type BolcomAction =
  | "testConnection"
  | "refreshToken"
  | "refreshAllTokens"
  | "saveCredentials"
  | "deleteCredentials"
  | "getProcessStatus"
  | "pollProcessStatuses"
  | "getReplenishmentProductDestinations"
  | "getReplenishmentTimeslots"
  | "createReplenishment"
  | "getReplenishment"
  | "getReplenishmentLabels"
  | "getInventory"
  | "syncStock"
  | "updateStock"
  | "listOffers"
  | "getOfferExport"
  | "getOffer"
  | "createOffer"
  | "updateOffer"
  | "getReturns"
  | "handleReturn"
  | "enrichProduct"
  | "batchEnrichProducts"
  | "batchEnrichByEan"
  | "importProducts"
  | "fetchPricing"
  | "fetchStock"
  | "fetchImages"
  | "fetchOrders"
  | "repairOrders";

interface BolcomRequest {
  action: BolcomAction;
  companyId: string;
  [key: string]: unknown;
}

interface BolcomResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface TokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface ProcessStatusResponse {
  id: number;
  entityId: string;
  eventType: string;
  description: string;
  status: "PENDING" | "SUCCESS" | "FAILURE" | "TIMEOUT";
  errorMessage?: string;
  createTimestamp: string;
  links: Array<{ rel: string; href: string; method?: string }>;
}

// ============================================
// Rate-Limited bol.com API Fetch
// ============================================

async function bolFetch<T = unknown>(
  token: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown,
  accept?: string,
  retries = 2,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const url = `${BOL_API_BASE}${endpoint}`;
  const contentType = "application/vnd.retailer.v10+json";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": contentType,
        "Accept": accept || contentType,
        ...(extraHeaders || {}),
      },
      ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}),
    });

    // Rate limited — respect Retry-After
    if (resp.status === 429) {
      const retryAfter = parseInt(resp.headers.get("Retry-After") || "5", 10);
      console.warn(`[bolcom-api] Rate limited on ${endpoint}, retry after ${retryAfter}s`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw new Error(`Rate limited on ${endpoint} after ${retries + 1} attempts`);
    }

    // Unauthorized — token may be expired
    if (resp.status === 401) {
      throw new Error("Unauthorized — bol.com token may be expired");
    }

    // Server errors — retry
    if (resp.status >= 500 && attempt < retries) {
      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`[bolcom-api] Server error ${resp.status} on ${endpoint}, retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`bol.com API ${resp.status} on ${method} ${endpoint}: ${errBody}`);
    }

    // 204 No Content
    if (resp.status === 204) return {} as T;

    return (await resp.json()) as T;
  }

  throw new Error(`Max retries exceeded on ${endpoint}`);
}

// ============================================
// Auth: Client Credentials OAuth2
// ============================================

async function getBolToken(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ token: string } | { error: string }> {
  // 1. Fetch active credentials for this company
  const { data: creds, error: credsErr } = await supabase
    .from("bolcom_credentials")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .maybeSingle();

  if (credsErr) return { error: `DB error: ${credsErr.message}` };
  if (!creds) return { error: "No bol.com credentials configured for this company" };

  // 2. If cached token is still valid (>60s buffer), return it
  if (creds.access_token && creds.token_expires_at) {
    const expiresAt = new Date(creds.token_expires_at);
    if (expiresAt > new Date(Date.now() + 60_000)) {
      return { token: creds.access_token };
    }
  }

  // 3. Decrypt credentials
  const { data: clientId, error: decIdErr } = await supabase.rpc("decrypt_bolcom_credential", {
    ciphertext: creds.client_id_encrypted,
    encryption_key: BOLCOM_ENCRYPTION_KEY,
  });
  const { data: clientSecret, error: decSecErr } = await supabase.rpc("decrypt_bolcom_credential", {
    ciphertext: creds.client_secret_encrypted,
    encryption_key: BOLCOM_ENCRYPTION_KEY,
  });

  if (decIdErr || decSecErr || !clientId || !clientSecret) {
    return { error: "Failed to decrypt bol.com credentials" };
  }

  // 4. Request new token via Client Credentials flow
  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  let resp: Response;
  try {
    resp = await fetch(BOL_AUTH_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: "grant_type=client_credentials",
    });
  } catch (fetchErr: unknown) {
    const msg = fetchErr instanceof Error ? fetchErr.message : "Network error";
    return { error: `Token request failed: ${msg}` };
  }

  if (!resp.ok) {
    const errText = await resp.text();
    // Store the error for debugging
    await supabase
      .from("bolcom_credentials")
      .update({ last_token_error: `${resp.status}: ${errText}`, updated_at: new Date().toISOString() })
      .eq("id", creds.id);
    return { error: `Token request failed (${resp.status}): ${errText}` };
  }

  const tokenData: TokenResult = await resp.json();

  // 5. Persist token in DB (subtract 30s for safety margin)
  const expiresAt = new Date(Date.now() + (tokenData.expires_in - 30) * 1000);
  await supabase
    .from("bolcom_credentials")
    .update({
      access_token: tokenData.access_token,
      token_expires_at: expiresAt.toISOString(),
      last_token_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", creds.id);

  console.log(`[bolcom-api] Token refreshed for company ${companyId}, expires at ${expiresAt.toISOString()}`);
  return { token: tokenData.access_token };
}

// ============================================
// Process Status Polling
// ============================================

async function pollProcessStatus(
  token: string,
  processStatusId: string
): Promise<ProcessStatusResponse> {
  return bolFetch<ProcessStatusResponse>(token, `/process-status/${processStatusId}`, "GET");
}

async function queueProcessStatus(
  supabase: SupabaseClient,
  companyId: string,
  processStatusId: string,
  entityType: string,
  entityId?: string
): Promise<void> {
  await supabase.from("bolcom_pending_process_statuses").upsert(
    {
      company_id: companyId,
      process_status_id: processStatusId,
      entity_type: entityType,
      entity_id: entityId || null,
      status: "pending",
      poll_count: 0,
    },
    { onConflict: "company_id,process_status_id" }
  );
}

async function onProcessResolved(
  supabase: SupabaseClient,
  companyId: string,
  ps: { entity_type: string; entity_id: string | null },
  result: ProcessStatusResponse
): Promise<void> {
  // Side-effects when a process status resolves
  if (ps.entity_type === "replenishment" && ps.entity_id && result.status === "SUCCESS") {
    const replenishmentId = result.entityId;
    await supabase
      .from("shipments")
      .update({
        bol_replenishment_id: replenishmentId,
        bol_replenishment_state: "CREATED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ps.entity_id);
    console.log(`[bolcom-api] Replenishment ${replenishmentId} created for shipment ${ps.entity_id}`);
  }
}

async function pollAllPending(
  supabase: SupabaseClient,
  companyId: string,
  token: string
): Promise<{ resolved: number; stillPending: number; errors: number }> {
  const { data: pending, error } = await supabase
    .from("bolcom_pending_process_statuses")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .lt("poll_count", 20);

  if (error) throw error;

  let resolved = 0;
  let stillPending = 0;
  let errors = 0;

  for (const ps of pending || []) {
    try {
      const result = await pollProcessStatus(token, ps.process_status_id);
      const normalizedStatus = result.status?.toUpperCase();

      if (normalizedStatus === "SUCCESS" || normalizedStatus === "FAILURE" || normalizedStatus === "TIMEOUT") {
        await supabase
          .from("bolcom_pending_process_statuses")
          .update({
            status: normalizedStatus.toLowerCase(),
            result_data: result,
            error_message: result.errorMessage || null,
            resolved_at: new Date().toISOString(),
            poll_count: ps.poll_count + 1,
          })
          .eq("id", ps.id);

        await onProcessResolved(supabase, companyId, ps, result);
        resolved++;
      } else {
        // Still pending — increment poll count
        await supabase
          .from("bolcom_pending_process_statuses")
          .update({ poll_count: ps.poll_count + 1 })
          .eq("id", ps.id);
        stillPending++;
      }
    } catch (pollErr: unknown) {
      const msg = pollErr instanceof Error ? pollErr.message : "Unknown error";
      console.error(`[bolcom-api] Error polling process ${ps.process_status_id}: ${msg}`);

      // Mark as timed out if max polls reached
      if (ps.poll_count + 1 >= ps.max_polls) {
        await supabase
          .from("bolcom_pending_process_statuses")
          .update({
            status: "timeout",
            error_message: `Max polls reached: ${msg}`,
            resolved_at: new Date().toISOString(),
            poll_count: ps.poll_count + 1,
          })
          .eq("id", ps.id);
        resolved++;
      } else {
        await supabase
          .from("bolcom_pending_process_statuses")
          .update({ poll_count: ps.poll_count + 1 })
          .eq("id", ps.id);
        errors++;
      }
    }
  }

  return { resolved, stillPending, errors };
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
    const body: BolcomRequest = await req.json();
    const { action, companyId } = body;

    if (!action) {
      return jsonResponse({ success: false, error: "Missing action" }, 400);
    }

    // refreshAllTokens doesn't need companyId
    if (action !== "refreshAllTokens" && !companyId) {
      return jsonResponse({ success: false, error: "Missing companyId" }, 400);
    }

    let result: BolcomResult;

    switch (action) {
      // ==================================================
      // AUTH
      // ==================================================

      case "saveCredentials": {
        const clientId = body.clientId as string;
        const clientSecret = body.clientSecret as string;
        const environment = (body.environment as string) || "production";

        if (!clientId || !clientSecret) {
          result = { success: false, error: "Missing clientId or clientSecret" };
          break;
        }

        // Encrypt credentials
        const { data: encId, error: encIdErr } = await supabase.rpc("encrypt_bolcom_credential", {
          plaintext: clientId,
          encryption_key: BOLCOM_ENCRYPTION_KEY,
        });
        const { data: encSecret, error: encSecErr } = await supabase.rpc("encrypt_bolcom_credential", {
          plaintext: clientSecret,
          encryption_key: BOLCOM_ENCRYPTION_KEY,
        });

        if (encIdErr || encSecErr) {
          result = { success: false, error: "Failed to encrypt credentials" };
          break;
        }

        const { data: saved, error: saveErr } = await supabase
          .from("bolcom_credentials")
          .upsert(
            {
              company_id: companyId,
              client_id_encrypted: encId,
              client_secret_encrypted: encSecret,
              is_active: true,
              environment,
              access_token: null,
              token_expires_at: null,
              last_token_error: null,
            },
            { onConflict: "company_id,environment" }
          )
          .select("id, company_id, environment, is_active, created_at")
          .single();

        if (saveErr) {
          result = { success: false, error: `Failed to save: ${saveErr.message}` };
          break;
        }

        result = { success: true, data: saved };
        break;
      }

      case "deleteCredentials": {
        const { error: delErr } = await supabase
          .from("bolcom_credentials")
          .delete()
          .eq("company_id", companyId)
          .eq("is_active", true);

        if (delErr) {
          result = { success: false, error: delErr.message };
          break;
        }

        result = { success: true, data: { deleted: true } };
        break;
      }

      case "testConnection": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        try {
          // Use /inventory endpoint to verify the token works (standard FBB endpoint)
          const inventory = await bolFetch(tokenResult.token, "/inventory?page=1&quantity=0-10000", "GET");
          result = { success: true, data: { connected: true, inventory } };
        } catch (err: unknown) {
          // If inventory fails, try /offers as fallback
          try {
            const offers = await bolFetch(tokenResult.token, "/offers?page=1", "GET");
            result = { success: true, data: { connected: true, offers } };
          } catch (err2: unknown) {
            const msg = err instanceof Error ? err.message : "Connection test failed";
            result = { success: false, error: msg };
          }
        }
        break;
      }

      case "refreshToken": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }
        result = { success: true, data: { refreshed: true } };
        break;
      }

      case "refreshAllTokens": {
        const { data: allCreds, error: listErr } = await supabase
          .from("bolcom_credentials")
          .select("company_id")
          .eq("is_active", true);

        if (listErr) {
          result = { success: false, error: listErr.message };
          break;
        }

        const results = [];
        for (const cred of allCreds || []) {
          const r = await getBolToken(supabase, cred.company_id);
          results.push({ companyId: cred.company_id, success: !("error" in r) });
        }
        result = { success: true, data: { refreshed: results } };
        break;
      }

      // ==================================================
      // PROCESS STATUS
      // ==================================================

      case "getProcessStatus": {
        const processStatusId = body.processStatusId as string;
        if (!processStatusId) {
          result = { success: false, error: "Missing processStatusId" };
          break;
        }

        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        const status = await pollProcessStatus(tokenResult.token, processStatusId);
        result = { success: true, data: status };
        break;
      }

      case "pollProcessStatuses": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) {
          result = { success: false, error: tokenResult.error };
          break;
        }

        const pollResult = await pollAllPending(supabase, companyId, tokenResult.token);
        result = { success: true, data: pollResult };
        break;
      }

      // ==================================================
      // REPLENISHMENT
      // ==================================================

      case "getReplenishmentProductDestinations": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        // POST /replenishments/product-destinations with list of EANs
        const destData = await bolFetch(tokenResult.token, "/replenishments/product-destinations", "POST", {
          products: body.products, // Array<{ ean: string; quantity: number }>
        });
        result = { success: true, data: destData };
        break;
      }

      case "getReplenishmentTimeslots": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        // POST /replenishments/delivery-dates
        const timeslotData = await bolFetch(tokenResult.token, "/replenishments/delivery-dates", "POST", {
          deliveryInfo: body.deliveryInfo,
        });
        result = { success: true, data: timeslotData };
        break;
      }

      case "createReplenishment": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const shipmentId = body.shipmentId as string;
        const repPayload = {
          reference: body.reference,
          deliveryInfo: body.deliveryInfo,
          labellingByBol: body.labellingByBol ?? true,
          numberOfLoadCarriers: body.numberOfLoadCarriers,
          loadCarriers: body.loadCarriers,
          lines: body.lines, // Array<{ ean: string; quantity: number }>
        };

        const repData = await bolFetch<{ processStatusId: string }>(
          tokenResult.token, "/replenishments", "POST", repPayload
        );

        // Queue the process status for polling
        if (repData.processStatusId) {
          await queueProcessStatus(supabase, companyId, repData.processStatusId, "replenishment", shipmentId);

          // Update shipment state
          if (shipmentId) {
            await supabase
              .from("shipments")
              .update({
                bol_replenishment_state: "CREATING",
                updated_at: new Date().toISOString(),
              })
              .eq("id", shipmentId);
          }
        }

        result = { success: true, data: repData };
        break;
      }

      case "getReplenishment": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const repId = body.replenishmentId as string;
        if (!repId) { result = { success: false, error: "Missing replenishmentId" }; break; }

        const repDetail = await bolFetch(tokenResult.token, `/replenishments/${repId}`, "GET");

        // Optionally update shipment with latest state
        if (body.shipmentId) {
          const state = (repDetail as Record<string, unknown>).state as string;
          if (state) {
            await supabase
              .from("shipments")
              .update({
                bol_replenishment_state: state,
                updated_at: new Date().toISOString(),
              })
              .eq("id", body.shipmentId);
          }
        }

        result = { success: true, data: repDetail };
        break;
      }

      case "getReplenishmentLabels": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const labelRepId = body.replenishmentId as string;
        if (!labelRepId) { result = { success: false, error: "Missing replenishmentId" }; break; }

        // Fetch PDF directly (different Accept header)
        const labelResp = await fetch(`${BOL_API_BASE}/replenishments/${labelRepId}/labels`, {
          headers: {
            "Authorization": `Bearer ${tokenResult.token}`,
            "Accept": "application/vnd.retailer.v10+pdf",
          },
        });

        if (!labelResp.ok) {
          const errText = await labelResp.text();
          result = { success: false, error: `Labels request failed (${labelResp.status}): ${errText}` };
          break;
        }

        // Upload PDF to Supabase Storage
        const pdfBytes = new Uint8Array(await labelResp.arrayBuffer());
        const storagePath = `bolcom-labels/${companyId}/${labelRepId}.pdf`;

        const { error: uploadErr } = await supabase.storage
          .from("documents")
          .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

        if (uploadErr) {
          result = { success: false, error: `Upload failed: ${uploadErr.message}` };
          break;
        }

        const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(storagePath);

        // Update shipment with labels URL
        if (body.shipmentId) {
          await supabase
            .from("shipments")
            .update({ bol_labels_url: publicUrl, updated_at: new Date().toISOString() })
            .eq("id", body.shipmentId);
        }

        result = { success: true, data: { labelsUrl: publicUrl } };
        break;
      }

      // ==================================================
      // STOCK & OFFERS
      // ==================================================

      case "getInventory": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const page = (body.page as number) || 1;
        const ean = body.ean as string | undefined;
        let endpoint = `/inventory?page=${page}`;
        if (ean) endpoint += `&search=${ean}`;

        const invData = await bolFetch(tokenResult.token, endpoint, "GET");
        result = { success: true, data: invData };
        break;
      }

      case "syncStock": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        // 1. Fetch all bol.com inventory (paginate)
        const bolInventory: Array<{ ean: string; bsku: string; regularStock: number; gradedStock: number }> = [];
        let invPage = 1;
        let hasMore = true;
        while (hasMore) {
          const pageData = await bolFetch<{ inventory: typeof bolInventory }>(
            tokenResult.token, `/inventory?page=${invPage}`, "GET"
          );
          if (pageData.inventory && pageData.inventory.length > 0) {
            bolInventory.push(...pageData.inventory);
            invPage++;
          } else {
            hasMore = false;
          }
          if (invPage > 50) break; // safety limit
        }

        // 2. Fetch local offer mappings
        const { data: mappings } = await supabase
          .from("bolcom_offer_mappings")
          .select("ean, product_id, bolcom_stock_amount")
          .eq("company_id", companyId)
          .eq("is_active", true);

        const localMap = new Map((mappings || []).map((m: { ean: string; product_id: string; bolcom_stock_amount: number }) => [m.ean, m]));
        const bolMap = new Map(bolInventory.map((i) => [i.ean, i]));

        const inSync: unknown[] = [];
        const outOfSync: unknown[] = [];
        const bolOnly: unknown[] = [];
        const localOnly: unknown[] = [];

        // Compare
        for (const [ean, bolItem] of bolMap) {
          const local = localMap.get(ean);
          if (local) {
            const bolQty = bolItem.regularStock + bolItem.gradedStock;
            if (bolQty === (local.bolcom_stock_amount || 0)) {
              inSync.push({ ean, bolQty, localQty: local.bolcom_stock_amount || 0 });
            } else {
              outOfSync.push({ ean, bolQty, localQty: local.bolcom_stock_amount || 0, diff: bolQty - (local.bolcom_stock_amount || 0) });
            }
          } else {
            bolOnly.push({ ean, bolQty: bolItem.regularStock + bolItem.gradedStock });
          }
        }

        for (const [ean, local] of localMap) {
          if (!bolMap.has(ean)) {
            localOnly.push({ ean, localQty: local.bolcom_stock_amount || 0 });
          }
        }

        result = { success: true, data: { inSync, outOfSync, bolOnly, localOnly, totalBol: bolInventory.length } };
        break;
      }

      case "updateStock": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const offerId = body.offerId as string;
        if (!offerId) { result = { success: false, error: "Missing offerId" }; break; }

        const stockPayload = {
          amount: body.amount as number,
          managedByRetailer: body.managedByRetailer ?? false,
        };

        const stockResult = await bolFetch<{ processStatusId: string }>(
          tokenResult.token, `/offers/${offerId}/stock`, "PUT", stockPayload
        );

        if (stockResult.processStatusId) {
          await queueProcessStatus(supabase, companyId, stockResult.processStatusId, "stock_update", offerId);
        }

        result = { success: true, data: stockResult };
        break;
      }

      case "listOffers": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        // bol.com uses async export for listing offers: POST /offers/export → reportId → GET /offers/export/{id}
        const exportFormat = (body.format as string) || "CSV";
        const exportResult = await bolFetch<{ processStatusId: string }>(
          tokenResult.token, "/offers/export", "POST", { format: exportFormat }
        );

        if (exportResult.processStatusId) {
          await queueProcessStatus(supabase, companyId, exportResult.processStatusId, "offer", "export");
        }

        result = { success: true, data: { exportRequested: true, processStatusId: exportResult.processStatusId, message: "Offer export queued. Poll process status to get download URL when ready." } };
        break;
      }

      case "getOfferExport": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const reportId = body.reportId as string;
        if (!reportId) { result = { success: false, error: "Missing reportId" }; break; }

        const exportData = await bolFetch(tokenResult.token, `/offers/export/${reportId}`, "GET");
        result = { success: true, data: exportData };
        break;
      }

      case "getOffer": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const getOfferId = body.offerId as string;
        if (!getOfferId) { result = { success: false, error: "Missing offerId" }; break; }

        const offerDetail = await bolFetch(tokenResult.token, `/offers/${getOfferId}`, "GET");
        result = { success: true, data: offerDetail };
        break;
      }

      case "createOffer": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const createOfferPayload = {
          ean: body.ean,
          condition: body.condition || { name: "NEW" },
          reference: body.reference,
          onHoldByRetailer: body.onHoldByRetailer ?? false,
          unknownProductTitle: body.unknownProductTitle,
          pricing: body.pricing,
          stock: body.stock,
          fulfilment: body.fulfilment || { method: "FBB", deliveryCode: "1-2d" },
        };

        const createOfferResult = await bolFetch<{ processStatusId: string }>(
          tokenResult.token, "/offers", "POST", createOfferPayload
        );

        if (createOfferResult.processStatusId) {
          await queueProcessStatus(supabase, companyId, createOfferResult.processStatusId, "offer");
        }

        result = { success: true, data: createOfferResult };
        break;
      }

      case "updateOffer": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const updateOfferId = body.offerId as string;
        if (!updateOfferId) { result = { success: false, error: "Missing offerId" }; break; }

        const updateOfferResult = await bolFetch<{ processStatusId: string }>(
          tokenResult.token, `/offers/${updateOfferId}`, "PUT", body.updates
        );

        if (updateOfferResult.processStatusId) {
          await queueProcessStatus(supabase, companyId, updateOfferResult.processStatusId, "offer", updateOfferId);
        }

        result = { success: true, data: updateOfferResult };
        break;
      }

      // ==================================================
      // RETURNS
      // ==================================================

      case "getReturns": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const retPage = (body.page as number) || 1;
        const handled = body.handled ?? false;
        const retData = await bolFetch<{ returns: Array<{ returnId: string; returnItems: Array<{ ean: string; quantityReturned: number; returnReason: { mainReason: string } }> }> }>(
          tokenResult.token,
          `/returns?handled=${handled}&fulfilment-method=FBB&page=${retPage}`,
          "GET"
        );

        // Auto-create return records in our DB for new returns
        let newReturns = 0;
        for (const ret of (retData.returns || [])) {
          const { data: existing } = await supabase
            .from("returns")
            .select("id")
            .eq("company_id", companyId)
            .eq("source", "bolcom")
            .like("return_code", `%${ret.returnId}%`)
            .maybeSingle();

          if (!existing) {
            await supabase.from("returns").insert({
              company_id: companyId,
              return_code: `RET-BOL-${ret.returnId}`,
              source: "bolcom",
              bol_return_id: ret.returnId,
              status: "registered",
              registered_at: new Date().toISOString(),
            });
            newReturns++;
          }
        }

        result = { success: true, data: { ...retData, newReturnsCreated: newReturns } };
        break;
      }

      case "handleReturn": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const returnId = body.returnId as string;
        if (!returnId) { result = { success: false, error: "Missing returnId" }; break; }

        const handlePayload = {
          handlingResult: body.handlingResult || "RETURN_RECEIVED",
          quantityReturned: body.quantityReturned,
        };

        const handleResult = await bolFetch<{ processStatusId: string }>(
          tokenResult.token, `/returns/${returnId}`, "PUT", handlePayload
        );

        if (handleResult.processStatusId) {
          await queueProcessStatus(supabase, companyId, handleResult.processStatusId, "other", returnId);
        }

        result = { success: true, data: handleResult };
        break;
      }

      // ==================================================
      // PRODUCT ENRICHMENT
      // ==================================================

      case "enrichProduct": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const ean = body.ean as string;
        if (!ean) { result = { success: false, error: "Missing ean" }; break; }

        const enrichData: Record<string, unknown> = { ean };
        const nlHeaders = { "Accept-Language": "nl" };

        // 1. Fetch product assets (images) — PRIMARY and IMAGE separately
        try {
          const allAssets: Array<{ url: string; usage: string; variants?: Array<{ url: string; width: number; height: number }> }> = [];
          for (const usage of ["PRIMARY", "ADDITIONAL", "IMAGE"]) {
            try {
              const assets = await bolFetch<{ assets?: typeof allAssets }>(
                tokenResult.token, `/products/${ean}/assets?usage=${usage}`, "GET",
                undefined, undefined, 1, nlHeaders
              );
              if (assets.assets && assets.assets.length > 0) {
                allAssets.push(...assets.assets);
              }
            } catch {
              // Some usage types may not exist for this product — skip
            }
          }
          if (allAssets.length > 0) enrichData.assets = allAssets;
        } catch (e) {
          enrichData.assetsError = e instanceof Error ? e.message : "Failed to fetch assets";
        }

        // 2. Fetch product placement (category + URL) — requires Accept-Language: nl
        try {
          const placement = await bolFetch<{ url?: string; category?: { categoryId: string; categoryName: string; parentCategories?: Array<{ categoryId: string; categoryName: string }> } }>(
            tokenResult.token, `/products/${ean}/placement`, "GET",
            undefined, undefined, 2, nlHeaders
          );
          enrichData.placement = placement;
        } catch (e) {
          enrichData.placementError = e instanceof Error ? e.message : "Failed to fetch placement";
        }

        // 3. Fetch catalog product content (attributes, classification)
        try {
          const catalog = await bolFetch<{ products?: Array<{ published?: boolean; gpc?: { chunkId: string }; enrichment?: { status: number }; attributes?: Array<{ id: string; values: Array<{ value: string }> }>; parties?: Array<{ name: string; type: string; role: string }> }> }>(
            tokenResult.token, `/catalog-products/${ean}`, "GET",
            undefined, undefined, 2, nlHeaders
          );
          if (catalog.products && catalog.products.length > 0) {
            enrichData.catalog = catalog.products[0];
          }
        } catch (e) {
          enrichData.catalogError = e instanceof Error ? e.message : "Failed to fetch catalog";
        }

        // 4. Fetch competing offers (to get description and pricing)
        try {
          const offers = await bolFetch<{ offers?: Array<{ offerId: string; retailerName: string; bestOffer: boolean; price: number; fulfilmentMethod: string; condition: string; deliveryCode: string }> }>(
            tokenResult.token, `/products/${ean}/offers`, "GET",
            undefined, undefined, 2, nlHeaders
          );
          enrichData.offers = offers.offers || [];
        } catch (e) {
          enrichData.offersError = e instanceof Error ? e.message : "Failed to fetch offers";
        }

        result = { success: true, data: enrichData };
        break;
      }

      case "batchEnrichProducts": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const batchSize = Math.min((body.batchSize as number) || 20, 50);
        const offset = (body.offset as number) || 0;
        const nlHeaders = { "Accept-Language": "nl" };

        // Fetch products that have EANs but haven't been enriched yet (no featured_image or empty gallery)
        const { data: products, error: prodErr } = await supabase
          .from("bolcom_offer_mappings")
          .select("ean, product_id")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .range(offset, offset + batchSize - 1);

        if (prodErr) { result = { success: false, error: prodErr.message }; break; }
        if (!products || products.length === 0) {
          result = { success: true, data: { enriched: 0, total: 0, done: true } };
          break;
        }

        let enriched = 0;
        let skipped = 0;
        let errors = 0;
        const details: Array<{ ean: string; status: string; imageCount?: number; category?: string }> = [];

        for (const mapping of products) {
          const { ean, product_id } = mapping;
          try {
            // Check if product already has images
            const { data: existing } = await supabase
              .from("products")
              .select("featured_image, gallery")
              .eq("id", product_id)
              .single();

            const hasImages = existing?.featured_image?.url || (existing?.gallery && existing.gallery.length > 0);
            if (hasImages) {
              skipped++;
              details.push({ ean, status: "skipped_has_images" });
              continue;
            }

            // Fetch assets (PRIMARY + ADDITIONAL)
            const allAssets: Array<{ url: string; usage: string; order?: number; variants?: Array<{ url: string; width: number; height: number; size: string }> }> = [];
            for (const usage of ["PRIMARY", "ADDITIONAL"]) {
              try {
                const assets = await bolFetch<{ assets?: typeof allAssets }>(
                  tokenResult.token, `/products/${ean}/assets?usage=${usage}`, "GET",
                  undefined, undefined, 1, nlHeaders
                );
                if (assets.assets) allAssets.push(...assets.assets);
              } catch { /* skip */ }
            }

            // Fetch placement
            let placementData: { url?: string; categories?: Array<{ categoryName: string; subcategories?: unknown[] }> } | null = null;
            try {
              placementData = await bolFetch(tokenResult.token, `/products/${ean}/placement`, "GET", undefined, undefined, 1, nlHeaders);
            } catch { /* skip */ }

            // Build update payload
            const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };

            // Set featured image from PRIMARY asset (largest variant)
            const primaryAsset = allAssets.find(a => a.usage === "PRIMARY");
            if (primaryAsset?.variants && primaryAsset.variants.length > 0) {
              const largest = primaryAsset.variants.reduce((a, b) => (a.width > b.width ? a : b));
              updatePayload.featured_image = { url: largest.url, width: largest.width, height: largest.height };
            }

            // Set gallery from ADDITIONAL assets (medium variants)
            const additionalAssets = allAssets.filter(a => a.usage === "ADDITIONAL");
            if (additionalAssets.length > 0) {
              const galleryImages = additionalAssets
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(asset => {
                  const medium = asset.variants?.find(v => v.size === "medium") || asset.variants?.[0];
                  return medium ? { url: medium.url, width: medium.width, height: medium.height } : null;
                })
                .filter(Boolean);
              // Deduplicate by URL
              const seen = new Set<string>();
              updatePayload.gallery = galleryImages.filter(img => {
                if (!img || seen.has((img as { url: string }).url)) return false;
                seen.add((img as { url: string }).url);
                return true;
              });
            }

            // Set category from placement
            if (placementData?.categories?.[0]) {
              const topCat = placementData.categories[0];
              // Walk down the category tree to get the most specific category
              let catName = topCat.categoryName;
              let sub = topCat.subcategories as Array<{ name?: string; categoryName?: string; subcategories?: unknown[] }> | undefined;
              while (sub && sub.length > 0) {
                const child = sub[0];
                catName = child.name || child.categoryName || catName;
                sub = child.subcategories as typeof sub;
              }
              updatePayload.category = catName;
            }

            // Set tags from category hierarchy
            if (placementData?.categories?.[0]) {
              const tags: string[] = [];
              const extractTags = (cats: unknown[]) => {
                for (const cat of cats) {
                  const c = cat as { name?: string; categoryName?: string; subcategories?: unknown[] };
                  const name = c.name || c.categoryName;
                  if (name) tags.push(name);
                  if (c.subcategories) extractTags(c.subcategories as unknown[]);
                }
              };
              extractTags(placementData.categories);
              if (tags.length > 0) updatePayload.tags = tags;
            }

            // Set SEO OG image
            if (updatePayload.featured_image) {
              updatePayload.seo_og_image = (updatePayload.featured_image as { url: string }).url;
            }

            // Only update if we have something new
            if (Object.keys(updatePayload).length > 1) { // >1 because updated_at always present
              const { error: updateErr } = await supabase
                .from("products")
                .update(updatePayload)
                .eq("id", product_id);

              if (updateErr) {
                errors++;
                details.push({ ean, status: `update_error: ${updateErr.message}` });
              } else {
                enriched++;
                details.push({
                  ean,
                  status: "enriched",
                  imageCount: allAssets.length,
                  category: updatePayload.category as string || undefined,
                });
              }
            } else {
              skipped++;
              details.push({ ean, status: "no_data_available" });
            }

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 200));

          } catch (e) {
            errors++;
            details.push({ ean, status: `error: ${e instanceof Error ? e.message : "unknown"}` });
          }
        }

        result = {
          success: true,
          data: {
            enriched,
            skipped,
            errors,
            total: products.length,
            offset,
            nextOffset: offset + products.length,
            done: products.length < batchSize,
            details,
          },
        };
        break;
      }

      case "batchEnrichByEan": {
        // Enriches products directly by EAN from products table (no mapping needed)
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const batchSize = Math.min((body.batchSize as number) || 20, 50);
        const offset = (body.offset as number) || 0;
        const nlHeaders = { "Accept-Language": "nl" };

        // Fetch products with EAN that don't have featured_image yet
        const { data: products, error: prodErr } = await supabase
          .from("products")
          .select("id, ean, name")
          .eq("company_id", companyId)
          .not("ean", "is", null)
          .neq("ean", "")
          .is("featured_image", null)
          .order("created_at", { ascending: true })
          .range(offset, offset + batchSize - 1);

        if (prodErr) { result = { success: false, error: prodErr.message }; break; }
        if (!products || products.length === 0) {
          result = { success: true, data: { enriched: 0, total: 0, done: true } };
          break;
        }

        let enriched = 0;
        let noData = 0;
        let errors = 0;
        const details: Array<{ ean: string; status: string; imageCount?: number; category?: string }> = [];

        for (const product of products) {
          const { id: productId, ean } = product;
          if (!ean) { noData++; continue; }

          try {
            // Fetch assets (PRIMARY + ADDITIONAL)
            const allAssets: Array<{ url: string; usage: string; order?: number; variants?: Array<{ url: string; width: number; height: number; size: string }> }> = [];
            for (const usage of ["PRIMARY", "ADDITIONAL"]) {
              try {
                const assets = await bolFetch<{ assets?: typeof allAssets }>(
                  tokenResult.token, `/products/${ean}/assets?usage=${usage}`, "GET",
                  undefined, undefined, 1, nlHeaders
                );
                if (assets.assets) allAssets.push(...assets.assets);
              } catch { /* skip */ }
            }

            // Fetch placement
            let placementData: { url?: string; categories?: Array<{ categoryName: string; subcategories?: unknown[] }> } | null = null;
            try {
              placementData = await bolFetch(tokenResult.token, `/products/${ean}/placement`, "GET", undefined, undefined, 1, nlHeaders);
            } catch { /* skip */ }

            // Build update payload
            const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };

            // Set featured image from PRIMARY asset
            const primaryAsset = allAssets.find(a => a.usage === "PRIMARY");
            if (primaryAsset?.variants && primaryAsset.variants.length > 0) {
              const largest = primaryAsset.variants.reduce((a, b) => (a.width > b.width ? a : b));
              updatePayload.featured_image = { url: largest.url, width: largest.width, height: largest.height };
            }

            // Set gallery from ADDITIONAL assets
            const additionalAssets = allAssets.filter(a => a.usage === "ADDITIONAL");
            if (additionalAssets.length > 0) {
              const galleryImages = additionalAssets
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(asset => {
                  const medium = asset.variants?.find(v => v.size === "medium") || asset.variants?.[0];
                  return medium ? { url: medium.url, width: medium.width, height: medium.height } : null;
                })
                .filter(Boolean);
              const seen = new Set<string>();
              updatePayload.gallery = galleryImages.filter(img => {
                if (!img || seen.has((img as { url: string }).url)) return false;
                seen.add((img as { url: string }).url);
                return true;
              });
            }

            // Set category from placement
            if (placementData?.categories?.[0]) {
              const topCat = placementData.categories[0];
              let catName = topCat.categoryName;
              let sub = topCat.subcategories as Array<{ name?: string; categoryName?: string; subcategories?: unknown[] }> | undefined;
              while (sub && sub.length > 0) {
                const child = sub[0];
                catName = child.name || child.categoryName || catName;
                sub = child.subcategories as typeof sub;
              }
              updatePayload.category = catName;
            }

            // Set tags from category hierarchy
            if (placementData?.categories?.[0]) {
              const tags: string[] = [];
              const extractTags = (cats: unknown[]) => {
                for (const cat of cats) {
                  const c = cat as { name?: string; categoryName?: string; subcategories?: unknown[] };
                  const name = c.name || c.categoryName;
                  if (name) tags.push(name);
                  if (c.subcategories) extractTags(c.subcategories as unknown[]);
                }
              };
              extractTags(placementData.categories);
              if (tags.length > 0) updatePayload.tags = tags;
            }

            if (updatePayload.featured_image) {
              updatePayload.seo_og_image = (updatePayload.featured_image as { url: string }).url;
            }

            if (Object.keys(updatePayload).length > 1) {
              const { error: updateErr } = await supabase
                .from("products")
                .update(updatePayload)
                .eq("id", productId);

              if (updateErr) {
                errors++;
                details.push({ ean, status: `update_error: ${updateErr.message}` });
              } else {
                enriched++;
                details.push({ ean, status: "enriched", imageCount: allAssets.length, category: updatePayload.category as string || undefined });
              }
            } else {
              noData++;
              details.push({ ean, status: "not_on_bolcom" });
            }

            await new Promise(r => setTimeout(r, 200));
          } catch (e) {
            errors++;
            details.push({ ean, status: `error: ${e instanceof Error ? e.message : "unknown"}` });
          }
        }

        result = {
          success: true,
          data: { enriched, noData, errors, total: products.length, offset, nextOffset: offset + products.length, done: products.length < batchSize, details },
        };
        break;
      }

      // ==================================================
      // IMPORT PRODUCTS
      // ==================================================

      case "importProducts": {
        const tokenResult = await getBolToken(supabase, companyId);
        if ("error" in tokenResult) { result = { success: false, error: tokenResult.error }; break; }

        const nlHeaders = { "Accept-Language": "nl" };

        // 1. Paginate through all inventory (includes title from bol.com)
        const allInventory: Array<{ ean: string; bsku: string; regularStock: number; gradedStock: number; title?: string }> = [];
        let invPage = 1;
        let hasMore = true;
        while (hasMore) {
          const pageData = await bolFetch<{ inventory: typeof allInventory }>(
            tokenResult.token, `/inventory?page=${invPage}`, "GET"
          );
          if (pageData.inventory && pageData.inventory.length > 0) {
            allInventory.push(...pageData.inventory);
            invPage++;
          } else {
            hasMore = false;
          }
          if (invPage > 100) break; // safety limit
        }

        // Deduplicate by EAN (bol.com may return same EAN across pages)
        const seenEans = new Set<string>();
        const dedupedInventory = allInventory.filter(item => {
          if (seenEans.has(item.ean)) return false;
          seenEans.add(item.ean);
          return true;
        });

        console.log(`[bolcom-api] importProducts: found ${allInventory.length} inventory items (${dedupedInventory.length} unique) for company ${companyId}`);

        if (dedupedInventory.length === 0) {
          result = { success: true, data: { imported: 0, updated: 0, errors: 0, total: 0, message: "No inventory found on bol.com" } };
          break;
        }

        let imported = 0;
        let updated = 0;
        let errors = 0;

        // 2. Fetch ALL existing products for this company (chunked to avoid query limits)
        const allEans = dedupedInventory.map(i => i.ean);
        const existingMap = new Map<string, { id: string; name: string; ean: string }>();
        const CHUNK = 500;
        for (let i = 0; i < allEans.length; i += CHUNK) {
          const chunk = allEans.slice(i, i + CHUNK);
          const { data: existingProducts } = await supabase
            .from("products")
            .select("id, name, ean")
            .eq("company_id", companyId)
            .in("ean", chunk);
          for (const p of (existingProducts || []) as Array<{ id: string; name: string; ean: string }>) {
            existingMap.set(p.ean, p);
          }
        }
        console.log(`[bolcom-api] Found ${existingMap.size} existing products`);

        // 3. Split into new vs existing
        const toInsert: Array<{ ean: string; bsku: string; regularStock: number; gradedStock: number; title: string }> = [];
        const toUpdate: Array<{ ean: string; bsku: string; regularStock: number; gradedStock: number; title: string; productId: string }> = [];

        for (const invItem of dedupedInventory) {
          const productName = invItem.title || `Product ${invItem.ean}`;
          const existing = existingMap.get(invItem.ean);
          if (existing) {
            toUpdate.push({ ...invItem, title: productName, productId: existing.id });
          } else {
            toInsert.push({ ...invItem, title: productName });
          }
        }

        console.log(`[bolcom-api] importProducts: ${toInsert.length} new, ${toUpdate.length} existing`);

        // 4. Batch update existing products — fix names + stock
        // Use batch upserts and parallel operations for speed
        const BATCH_SIZE = 200;
        for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
          const batch = toUpdate.slice(i, i + BATCH_SIZE);
          const now = new Date().toISOString();
          const promises: Promise<unknown>[] = [];

          // a) Name updates — only for fallback "Product ..." names, in parallel
          const nameUpdates = batch.filter(item => {
            const existing = existingMap.get(item.ean);
            return existing && existing.name.startsWith("Product ") && item.title !== existing.name;
          });
          if (nameUpdates.length > 0) {
            promises.push(Promise.all(nameUpdates.map(item =>
              supabase.from("products").update({ name: item.title, updated_at: now }).eq("id", item.productId)
            )));
          }

          // b) Batch upsert offer_mappings
          const mappingRows = batch.map(item => ({
            company_id: companyId,
            ean: item.ean,
            product_id: item.productId,
            bolcom_stock_amount: item.regularStock + item.gradedStock,
            is_active: true,
            updated_at: now,
          }));
          promises.push(supabase.from("bolcom_offer_mappings").upsert(mappingRows, { onConflict: "company_id,ean" }));

          // c) Batch upsert physical_products (single query per batch instead of N individual updates)
          // NOTE: physical_products does NOT have updated_at column — do not include it
          const physRows = batch.map(item => ({
            product_id: item.productId,
            sku: item.bsku || item.ean,
            barcode: item.ean,
            inventory: {
              quantity: item.regularStock + item.gradedStock,
              regular_stock: item.regularStock,
              graded_stock: item.gradedStock,
              total: item.regularStock + item.gradedStock,
            },
          }));
          promises.push(supabase.from("physical_products").upsert(physRows, { onConflict: "product_id" }));

          await Promise.all(promises);
          updated += batch.length;
        }

        // 5. Batch insert new products
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
          const batch = toInsert.slice(i, i + BATCH_SIZE);

          // Insert products in batch
          const productRows = batch.map(item => ({
            company_id: companyId,
            name: item.title,
            ean: item.ean,
            type: "physical",
            status: "published",
            slug: `bol-${item.ean}`,
          }));

          const { data: insertedProducts, error: insertErr } = await supabase
            .from("products")
            .insert(productRows)
            .select("id, ean");

          if (insertErr) {
            console.error(`[bolcom-api] Batch insert error: ${insertErr.message}`);
            errors += batch.length;
            continue;
          }

          if (!insertedProducts) continue;

          // Build map of inserted product IDs
          const insertedMap = new Map(insertedProducts.map((p: { id: string; ean: string }) => [p.ean, p.id]));

          // Batch insert physical_products + offer_mappings in parallel
          const physRows = batch
            .filter(item => insertedMap.has(item.ean))
            .map(item => ({
              product_id: insertedMap.get(item.ean)!,
              sku: item.bsku || item.ean,
              barcode: item.ean,
              inventory: {
                quantity: item.regularStock + item.gradedStock,
                regular_stock: item.regularStock,
                graded_stock: item.gradedStock,
                total: item.regularStock + item.gradedStock,
              },
            }));
          const mapRows = batch
            .filter(item => insertedMap.has(item.ean))
            .map(item => ({
              company_id: companyId,
              ean: item.ean,
              product_id: insertedMap.get(item.ean)!,
              bolcom_stock_amount: item.regularStock + item.gradedStock,
              is_active: true,
            }));

          const insertPromises: Promise<unknown>[] = [];
          if (physRows.length > 0) {
            insertPromises.push(supabase.from("physical_products").upsert(physRows, { onConflict: "product_id" }));
          }
          if (mapRows.length > 0) {
            insertPromises.push(supabase.from("bolcom_offer_mappings").upsert(mapRows, { onConflict: "company_id,ean" }));
          }
          if (insertPromises.length > 0) {
            await Promise.all(insertPromises);
          }

          imported += insertedProducts.length;
        }

        console.log(`[bolcom-api] importProducts complete: ${imported} imported, ${updated} updated, ${errors} errors out of ${dedupedInventory.length} unique items`);

        result = {
          success: true,
          data: {
            imported,
            updated,
            errors,
            total: dedupedInventory.length,
          },
        };
        break;
      }

      case "fetchPricing": {
        const pToken = await getBolToken(supabase, companyId);
        if ("error" in pToken) { result = { success: false, error: pToken.error }; break; }

        console.log(`[bolcom-api] fetchPricing: fetching pricing via /products/{ean}/offers for company ${companyId}`);

        // 1. Get all products with EANs for this company
        const allProducts: Array<{ id: string; ean: string }> = [];
        for (let i = 0; ; i += 500) {
          const { data } = await supabase.from("products").select("id, ean")
            .eq("company_id", companyId).not("ean", "is", null)
            .range(i, i + 499);
          if (!data || data.length === 0) break;
          allProducts.push(...(data as Array<{ id: string; ean: string }>));
          if (data.length < 500) break;
        }

        console.log(`[bolcom-api] fetchPricing: found ${allProducts.length} products with EANs`);

        if (allProducts.length === 0) {
          result = { success: true, data: { offersFound: 0, pricesUpdated: 0, offersLinked: 0, totalProducts: 0 } };
          break;
        }

        // 2. Fetch offers for each product with concurrency (10 at a time to respect rate limits)
        interface OfferInfo { ean: string; productId: string; offerId: string; price: number; fulfilment: string; condition: string }
        const offerResults: OfferInfo[] = [];
        let fetchErrors = 0;
        const CONCURRENCY = 10;
        const nlHeaders = { "Accept-Language": "nl" };

        for (let i = 0; i < allProducts.length; i += CONCURRENCY) {
          const batch = allProducts.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.allSettled(
            batch.map(async (prod) => {
              try {
                const offersResp = await bolFetch<{ offers?: Array<{ offerId: string; retailerId: string; bestOffer: boolean; price: number; fulfilmentMethod: string; condition: string }> }>(
                  pToken.token, `/products/${prod.ean}/offers`, "GET",
                  undefined, undefined, 1, nlHeaders
                );
                if (offersResp.offers && offersResp.offers.length > 0) {
                  // Pick the best offer (likely the seller's own offer or the Buy Box winner)
                  const bestOffer = offersResp.offers.find(o => o.bestOffer) || offersResp.offers[0];
                  return {
                    ean: prod.ean,
                    productId: prod.id,
                    offerId: bestOffer.offerId,
                    price: bestOffer.price,
                    fulfilment: bestOffer.fulfilmentMethod || "",
                    condition: bestOffer.condition || "NEW",
                  } as OfferInfo;
                }
                return null;
              } catch {
                return null;
              }
            })
          );

          for (const r of batchResults) {
            if (r.status === "fulfilled" && r.value) {
              offerResults.push(r.value);
            } else {
              fetchErrors++;
            }
          }

          // Small delay between batches to respect rate limits
          if (i + CONCURRENCY < allProducts.length) {
            await new Promise(r => setTimeout(r, 200));
          }
        }

        console.log(`[bolcom-api] fetchPricing: fetched ${offerResults.length} offers, ${fetchErrors} errors`);

        // 3. Batch update pricing + offer IDs
        let pricesUpdated = 0;
        let offersLinked = 0;
        const now = new Date().toISOString();

        // Update offer_mappings in bulk batches of 200
        for (let i = 0; i < offerResults.length; i += 200) {
          const batch = offerResults.slice(i, i + 200);
          const mapRows = batch.map(o => ({
            company_id: companyId,
            ean: o.ean,
            product_id: o.productId,
            bolcom_offer_id: o.offerId || null,
            is_active: true,
            updated_at: now,
          }));
          await supabase.from("bolcom_offer_mappings").upsert(mapRows, { onConflict: "company_id,ean" });
          offersLinked += mapRows.filter(r => r.bolcom_offer_id).length;
        }

        // Update physical_products pricing via upsert
        const pricingUpdates = offerResults.filter(o => o.price > 0);
        console.log(`[bolcom-api] fetchPricing: updating pricing for ${pricingUpdates.length} products`);

        let pricingError = "";
        // Batch upsert pricing — 200 at a time, only product_id + pricing
        for (let i = 0; i < pricingUpdates.length; i += 200) {
          const batch = pricingUpdates.slice(i, i + 200);
          const rows = batch.map(o => ({
            product_id: o.productId,
            pricing: { base_price: o.price, price: o.price, currency: "EUR", fulfilment_method: o.fulfilment, condition: o.condition },
          }));
          const { error: upsertErr } = await supabase
            .from("physical_products")
            .upsert(rows, { onConflict: "product_id" });
          if (upsertErr) {
            pricingError = upsertErr.message;
            console.error(`[bolcom-api] pricing upsert error: ${upsertErr.message} (code: ${upsertErr.code}, details: ${upsertErr.details})`);
          } else {
            pricesUpdated += batch.length;
          }
        }
        console.log(`[bolcom-api] fetchPricing: ${pricesUpdated} prices stored`);

        console.log(`[bolcom-api] fetchPricing complete: ${pricesUpdated} prices updated, ${offersLinked} offers linked`);

        result = {
          success: true,
          data: {
            offersFound: offerResults.length,
            pricesUpdated,
            offersLinked,
            totalProducts: allProducts.length,
            fetchErrors,
            ...(pricingError ? { pricingError } : {}),
          },
        };
        break;
      }

      // ==================================================
      // FETCH STOCK — sync bol.com inventory to all tables
      // ==================================================
      case "fetchStock": {
        const stkToken = await getBolToken(supabase, companyId);
        if ("error" in stkToken) { result = { success: false, error: stkToken.error }; break; }

        console.log(`[bolcom-api] fetchStock: syncing inventory for company ${companyId}`);

        // 1. Paginate through all bol.com inventory
        const stkInventory: Array<{ ean: string; bsku: string; regularStock: number; gradedStock: number; title?: string }> = [];
        let stkPage = 1;
        let stkMore = true;
        while (stkMore) {
          const pageData = await bolFetch<{ inventory: typeof stkInventory }>(
            stkToken.token, `/inventory?page=${stkPage}`, "GET"
          );
          if (pageData.inventory?.length) {
            stkInventory.push(...pageData.inventory);
            stkPage++;
          } else {
            stkMore = false;
          }
          if (stkPage > 100) break;
        }

        // Deduplicate by EAN
        const stkSeen = new Set<string>();
        const stkDeduped = stkInventory.filter(item => {
          if (stkSeen.has(item.ean)) return false;
          stkSeen.add(item.ean);
          return true;
        });

        console.log(`[bolcom-api] fetchStock: ${stkDeduped.length} unique inventory items from bol.com`);

        if (stkDeduped.length === 0) {
          result = { success: true, data: { synced: 0, withStock: 0, fbb: 0, fbr: 0, message: "No inventory found on bol.com" } };
          break;
        }

        // 2. Build EAN→product map (chunked)
        const stkEans = stkDeduped.map(i => i.ean);
        const stkProductMap = new Map<string, { id: string; ean: string }>();
        for (let i = 0; i < stkEans.length; i += 500) {
          const chunk = stkEans.slice(i, i + 500);
          const { data } = await supabase.from("products").select("id, ean")
            .eq("company_id", companyId).in("ean", chunk);
          for (const p of (data || []) as Array<{ id: string; ean: string }>) {
            stkProductMap.set(p.ean, p);
          }
        }

        // 3. Get fulfilment method from existing pricing data (smaller chunks to avoid URL length limits)
        const stkProductIds = [...stkProductMap.values()].map(p => p.id);
        const fulfilmentMap = new Map<string, string>();
        for (let i = 0; i < stkProductIds.length; i += 100) {
          const chunk = stkProductIds.slice(i, i + 100);
          const { data: ppData, error: ppErr } = await supabase.from("physical_products")
            .select("product_id, pricing")
            .in("product_id", chunk);
          if (ppErr) console.warn(`[fetchStock] fulfilment query error: ${ppErr.message}`);
          for (const pp of (ppData || []) as Array<{ product_id: string; pricing: { fulfilment_method?: string } | null }>) {
            if (pp.pricing?.fulfilment_method) {
              fulfilmentMap.set(pp.product_id, pp.pricing.fulfilment_method);
            }
          }
        }
        console.log(`[fetchStock] fulfilmentMap has ${fulfilmentMap.size} entries (${[...fulfilmentMap.values()].filter(v => v === 'FBB').length} FBB, ${[...fulfilmentMap.values()].filter(v => v === 'FBR').length} FBR)`);

        // 4. Batch update all tables
        const STK_BATCH = 200;
        let synced = 0;
        let withStock = 0;
        let fbbCount = 0;
        let fbrCount = 0;
        const now = new Date().toISOString();

        for (let i = 0; i < stkDeduped.length; i += STK_BATCH) {
          const batch = stkDeduped.slice(i, i + STK_BATCH);
          const promises: Promise<unknown>[] = [];

          // a) physical_products.inventory with quantity field
          const physRows = batch
            .filter(item => stkProductMap.has(item.ean))
            .map(item => {
              const prod = stkProductMap.get(item.ean)!;
              const fm = fulfilmentMap.get(prod.id) || "UNKNOWN";
              const qty = item.regularStock + item.gradedStock;
              return {
                product_id: prod.id,
                inventory: {
                  quantity: qty,
                  regular_stock: item.regularStock,
                  graded_stock: item.gradedStock,
                  total: qty,
                  fulfilment_method: fm,
                },
              };
            });
          if (physRows.length > 0) {
            promises.push(supabase.from("physical_products").upsert(physRows, { onConflict: "product_id" }));
          }

          // b) bolcom_offer_mappings.bolcom_stock_amount
          const mapRows = batch
            .filter(item => stkProductMap.has(item.ean))
            .map(item => ({
              company_id: companyId,
              ean: item.ean,
              product_id: stkProductMap.get(item.ean)!.id,
              bolcom_stock_amount: item.regularStock + item.gradedStock,
              is_active: true,
              updated_at: now,
            }));
          if (mapRows.length > 0) {
            promises.push(supabase.from("bolcom_offer_mappings").upsert(mapRows, { onConflict: "company_id,ean" }));
          }

          // c) inventory table — cross-channel stock display
          const invRows = batch
            .filter(item => stkProductMap.has(item.ean))
            .map(item => {
              const prod = stkProductMap.get(item.ean)!;
              const fm = fulfilmentMap.get(prod.id) || "UNKNOWN";
              const qty = item.regularStock + item.gradedStock;
              const isFBB = fm === "FBB";
              if (isFBB) fbbCount++; else fbrCount++;
              if (qty > 0) withStock++;
              return {
                company_id: companyId,
                product_id: prod.id,
                quantity_on_hand: qty,
                quantity_external_bolcom: isFBB ? qty : 0,
                warehouse_location: isFBB ? "bol.com Fulfilment Centre" : null,
                updated_at: now,
              };
            });
          if (invRows.length > 0) {
            promises.push(supabase.from("inventory").upsert(invRows, { onConflict: "company_id,product_id" }));
          }

          // d) product_sales_channels — mark as listed on bolcom
          const channelRows = batch
            .filter(item => stkProductMap.has(item.ean))
            .map(item => ({
              company_id: companyId,
              product_id: stkProductMap.get(item.ean)!.id,
              channel: "bolcom" as const,
              is_active: true,
              listed_at: now,
            }));
          if (channelRows.length > 0) {
            promises.push(supabase.from("product_sales_channels").upsert(channelRows, { onConflict: "company_id,product_id,channel" }));
          }

          await Promise.all(promises);
          synced += batch.filter(item => stkProductMap.has(item.ean)).length;
        }

        console.log(`[bolcom-api] fetchStock complete: ${synced} synced, ${withStock} with stock, ${fbbCount} FBB, ${fbrCount} FBR`);

        result = {
          success: true,
          data: { synced, withStock, fbb: fbbCount, fbr: fbrCount, totalBolInventory: stkDeduped.length },
        };
        break;
      }

      case "fetchImages": {
        const imgToken = await getBolToken(supabase, companyId);
        if ("error" in imgToken) { result = { success: false, error: imgToken.error }; break; }

        // Accept optional batchLimit (default 100 per call to stay within 150s timeout)
        const imgBatchLimit = body.batchLimit ?? 100;
        console.log(`[bolcom-api] fetchImages: fetching images for company ${companyId} (limit: ${imgBatchLimit})`);
        const nlHeaders = { "Accept-Language": "nl" };

        // 1. Get products that need images (no featured_image set), limited to batchLimit
        const productsToEnrich: Array<{ id: string; ean: string }> = [];
        for (let i = 0; productsToEnrich.length < imgBatchLimit; i += 1000) {
          const { data } = await supabase.from("products")
            .select("id, ean, featured_image")
            .eq("company_id", companyId)
            .not("ean", "is", null)
            .range(i, i + 999);
          if (!data || data.length === 0) break;
          for (const p of data as Array<{ id: string; ean: string; featured_image: { url?: string } | null }>) {
            if (!p.featured_image?.url && productsToEnrich.length < imgBatchLimit) {
              productsToEnrich.push({ id: p.id, ean: p.ean });
            }
          }
          if (data.length < 1000) break;
        }

        // Count total remaining (for progress display)
        let totalRemaining = productsToEnrich.length;
        if (productsToEnrich.length === imgBatchLimit) {
          // There may be more — do a quick count
          const { count: totalNoImage } = await supabase.from("products")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .not("ean", "is", null)
            .is("featured_image", null);
          // Also count products with empty featured_image (no url)
          totalRemaining = totalNoImage ?? productsToEnrich.length;
        }

        console.log(`[bolcom-api] fetchImages: ${productsToEnrich.length} products to process this batch, ~${totalRemaining} total remaining`);

        if (productsToEnrich.length === 0) {
          result = { success: true, data: { productsProcessed: 0, imagesFound: 0, imagesUpdated: 0, fetchErrors: 0, remaining: 0 } };
          break;
        }

        // 2. Fetch PRIMARY assets only (1 API call per product) with concurrency
        interface ImageResult { productId: string; featuredUrl: string; width: number; height: number }
        const imageResults: ImageResult[] = [];
        const confirmedNoAsset: string[] = []; // Products where API returned 200 but no assets
        let imgFetchErrors = 0;
        // bol.com rate limit: ~20 req/10s = 2 req/s. Use 3 concurrent + 1.5s delay = ~2 req/s
        const IMG_CONCURRENCY = 3;
        let rateLimited = false;

        for (let i = 0; i < productsToEnrich.length; i += IMG_CONCURRENCY) {
          // If we got rate limited, wait longer before continuing
          if (rateLimited) {
            await new Promise(r => setTimeout(r, 10000));
            rateLimited = false;
          }

          const batch = productsToEnrich.slice(i, i + IMG_CONCURRENCY);
          const batchResults = await Promise.allSettled(
            batch.map(async (prod): Promise<{ type: "image"; data: ImageResult } | { type: "no_asset"; productId: string } | { type: "error" }> => {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                const url = `${BOL_API_BASE}/products/${prod.ean}/assets?usage=PRIMARY`;
                const resp = await fetch(url, {
                  method: "GET",
                  headers: {
                    "Authorization": `Bearer ${imgToken.token}`,
                    "Content-Type": "application/vnd.retailer.v10+json",
                    "Accept": "application/vnd.retailer.v10+json",
                    "Accept-Language": "nl",
                  },
                  signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (resp.status === 404) return { type: "no_asset", productId: prod.id };
                if (resp.status === 429) { rateLimited = true; return { type: "error" }; }
                if (!resp.ok) return { type: "error" };
                const data = await resp.json() as { assets?: Array<{ variants?: Array<{ url: string; width: number; height: number; size: string }> }> };
                if (data.assets?.[0]?.variants?.length) {
                  const largest = data.assets[0].variants.reduce((a: { width: number }, b: { width: number }) => (a.width > b.width ? a : b));
                  return { type: "image", data: { productId: prod.id, featuredUrl: largest.url, width: largest.width, height: largest.height } };
                }
                return { type: "no_asset", productId: prod.id };
              } catch {
                return { type: "error" };
              }
            })
          );

          for (const r of batchResults) {
            if (r.status === "fulfilled") {
              if (r.value.type === "image") imageResults.push(r.value.data);
              else if (r.value.type === "no_asset") confirmedNoAsset.push(r.value.productId);
              else imgFetchErrors++;
            } else {
              imgFetchErrors++;
            }
          }

          // 1.5s delay between batches: 3 concurrent / 1.5s = 2 req/s (within bol.com limits)
          if (i + IMG_CONCURRENCY < productsToEnrich.length) {
            await new Promise(r => setTimeout(r, 1500));
          }
        }

        console.log(`[bolcom-api] fetchImages: ${imageResults.length} images found, ${confirmedNoAsset.length} confirmed no assets, ${imgFetchErrors} errors`);

        // 3. Batch update products with featured_image (100 concurrent updates)
        let imagesUpdated = 0;
        for (let i = 0; i < imageResults.length; i += 100) {
          const batch = imageResults.slice(i, i + 100);
          await Promise.all(batch.map(img =>
            supabase.from("products").update({
              featured_image: { url: img.featuredUrl, width: img.width, height: img.height },
              seo_og_image: img.featuredUrl,
              updated_at: new Date().toISOString(),
            }).eq("id", img.productId)
          ));
          imagesUpdated += batch.length;
        }

        // Only mark products as no_image when we got a confirmed 404 or 200-with-no-assets
        if (confirmedNoAsset.length > 0) {
          for (let i = 0; i < confirmedNoAsset.length; i += 100) {
            const batch = confirmedNoAsset.slice(i, i + 100);
            await Promise.all(batch.map(pid =>
              supabase.from("products").update({
                featured_image: { url: null, no_image: true },
                updated_at: new Date().toISOString(),
              }).eq("id", pid)
            ));
          }
        }

        const remaining = totalRemaining - productsToEnrich.length;
        console.log(`[bolcom-api] fetchImages complete: ${imagesUpdated} products updated, ~${remaining} remaining`);

        result = {
          success: true,
          data: {
            productsProcessed: productsToEnrich.length,
            imagesFound: imageResults.length,
            imagesUpdated,
            fetchErrors: imgFetchErrors,
            remaining: Math.max(0, remaining),
          },
        };
        break;
      }

      // ============================================
      // fetchOrders — Sync bol.com orders into sales_orders
      // Sequential approach with rate-limit aware pacing (max ~2 req/s)
      // ============================================
      case "fetchOrders": {
        const tokenRes = await getBolToken(supabase, companyId);
        if ("error" in tokenRes) { result = { success: false, error: tokenRes.error }; break; }

        const t0 = Date.now();
        const elapsed = () => Date.now() - t0;
        const BUDGET_MS = 130_000; // 130s hard budget (Supabase allows 150s, keep 20s safety margin)
        const DISCOVERY_BUDGET_MS = 80_000; // 80s for discovery, leaving 50s for fetching details + DB insertion
        console.log(`[bolcom-api] fetchOrders: start for company ${companyId}`);

        // Types
        interface Addr {
          firstName?: string; surname?: string; streetName?: string;
          houseNumber?: string; houseNumberExtension?: string;
          zipCode?: string; city?: string; countryCode?: string;
          email?: string; deliveryPhoneNumber?: string;
        }
        interface OItem {
          orderItemId: string; ean: string; quantity: number; unitPrice: number;
          fulfilmentMethod?: string; fulfilmentStatus?: string;
          offer?: { offerId?: string; reference?: string };
          product?: { title?: string; ean?: string };
        }
        interface BolOrder {
          orderId: string; dateTimeOrderPlaced: string;
          orderItems: OItem[];
          shipmentDetails?: Addr; billingDetails?: Addr;
        }
        interface SItem {
          orderItemId: string; orderId: string; orderDate?: string;
          ean: string; title?: string; quantity: number; offerPrice: number;
          fulfilmentMethod?: string; offer?: { offerId?: string; reference?: string };
        }
        interface BolShipment {
          shipmentId: number; shipmentDateTime: string;
          shipmentItems: SItem[]; shipmentDetails?: Addr; billingDetails?: Addr;
        }
        interface SListItem { shipmentId: number; shipmentItems: Array<{ orderId: string }>; }
        interface RItem { rmaId: string; orderId: string; ean: string; expectedQuantity: number; }
        interface REntry { returnId: string; registrationDateTime: string; fulfilmentMethod: string; returnItems: RItem[]; }

        interface OrderData {
          orderId: string; orderDate: string;
          items: Array<{ id: string; ean: string; title: string; qty: number; price: number; sku?: string; fm: string }>;
          shipTo?: Addr; billTo?: Addr; fm: string; shippedAt?: string;
        }

        // Rate-limited sequential API call with adaptive spacing
        // bol.com allows ~25-50 req/min per endpoint; start fast, slow down on 429
        let lastCallTime = 0;
        let apiCallCount = 0;
        let callSpacing = 1200; // Start at 1.2s spacing (~50 req/min)
        const rateLimitedFetch = async <T>(endpoint: string): Promise<T | null> => {
          if (elapsed() > BUDGET_MS) { console.log(`[bolcom-api] BUDGET EXCEEDED at ${elapsed()}ms, skipping ${endpoint}`); return null; }
          const wait = Math.max(0, callSpacing - (Date.now() - lastCallTime));
          if (wait > 0) await new Promise(r => setTimeout(r, wait));
          lastCallTime = Date.now();
          apiCallCount++;
          // Direct fetch to handle 429 gracefully without bolFetch's long retry waits
          const url = `${BOL_API_BASE}${endpoint}`;
          const contentType = "application/vnd.retailer.v10+json";
          for (let attempt = 0; attempt < 3; attempt++) {
            if (elapsed() > BUDGET_MS) return null;
            try {
              const resp = await fetch(url, {
                method: "GET",
                headers: { "Authorization": `Bearer ${tokenRes.token}`, "Content-Type": contentType, "Accept": contentType },
              });
              if (resp.status === 429) {
                const retryAfter = Math.min(parseInt(resp.headers.get("Retry-After") || "5", 10), 15);
                callSpacing = Math.min(callSpacing * 1.5, 5000); // Slow down, max 5s spacing
                console.warn(`[bolcom-api] 429 on ${endpoint}, retry after ${retryAfter}s (spacing now ${callSpacing}ms)`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
                continue;
              }
              if (resp.status === 401) { console.error(`[bolcom-api] 401 on ${endpoint}`); return null; }
              if (!resp.ok) { console.warn(`[bolcom-api] ${resp.status} on ${endpoint}`); return null; }
              if (resp.status === 204) return {} as T;
              return (await resp.json()) as T;
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              console.warn(`[bolcom-api] API call #${apiCallCount} error on ${endpoint}: ${msg}`);
              if (attempt < 2) { await new Promise(r => setTimeout(r, 2000)); continue; }
              return null;
            }
          }
          return null;
        };

        // ── Phase 1: Discover order IDs (sequential, rate-limited) ──

        const orderCache = new Map<string, BolOrder>();
        const shipmentIds: number[] = [];
        const returnData = new Map<string, { date: string; fm: string; items: RItem[] }>();
        const allOrderIds = new Set<string>();

        // 1a. Orders list — both FBB and FBR with full 3-month window
        // Use fulfilment-method filter separately to maximize coverage
        let ordersListPages = 0;
        for (const fm of ['FBB', 'FBR']) {
          for (let page = 1; page <= 100; page++) {
            if (elapsed() > DISCOVERY_BUDGET_MS) { console.log(`[bolcom-api] 1a-${fm}: discovery budget exhausted at page ${page}`); break; }
            const res = await rateLimitedFetch<{ orders?: BolOrder[] }>(`/orders?status=ALL&fulfilment-method=${fm}&page=${page}`);
            if (!res) { console.log(`[bolcom-api] 1a-${fm}: null response at page ${page}, elapsed=${elapsed()}ms`); break; }
            if (!res.orders?.length) { console.log(`[bolcom-api] 1a-${fm}: empty orders at page ${page}, keys=${Object.keys(res).join(',')}, elapsed=${elapsed()}ms`); break; }
            ordersListPages++;
            const sizeBefore = allOrderIds.size;
            for (const o of res.orders) { allOrderIds.add(o.orderId); orderCache.set(o.orderId, o); }
            if (page <= 3 || page % 10 === 0) console.log(`[bolcom-api] 1a-${fm}: page ${page} → ${res.orders.length} orders (total unique: ${allOrderIds.size}, new: ${allOrderIds.size - sizeBefore})`);
            if (res.orders.length < 50) break;
          }
        }
        console.log(`[bolcom-api] fetchOrders: ${elapsed()}ms - ${allOrderIds.size} from ${ordersListPages} pages of orders list (FBB+FBR)`);

        // 1b. Shipments — both FBB and FBR, paginate until empty or discovery budget exhausted
        for (const fm of ['FBB', 'FBR']) {
          for (let page = 1; page <= 100; page++) {
            if (elapsed() > DISCOVERY_BUDGET_MS) break;
            const res = await rateLimitedFetch<{ shipments?: SListItem[] }>(`/shipments?page=${page}&fulfilment-method=${fm}`);
            if (!res?.shipments?.length) break;
            for (const s of res.shipments) {
              shipmentIds.push(s.shipmentId);
              for (const item of (s.shipmentItems || [])) { if (item.orderId) allOrderIds.add(item.orderId); }
            }
            if (res.shipments.length < 50) break;
          }
        }
        console.log(`[bolcom-api] fetchOrders: ${elapsed()}ms - ${shipmentIds.length} shipments (FBB+FBR), ${allOrderIds.size} total orders`);

        // 1c. Returns (handled=true) — both FBB and FBR
        for (const fm of ['FBB', 'FBR']) {
          for (let page = 1; page <= 50; page++) {
            if (elapsed() > DISCOVERY_BUDGET_MS) break;
            const res = await rateLimitedFetch<{ returns?: REntry[] }>(`/returns?handled=true&fulfilment-method=${fm}&page=${page}`);
            if (!res?.returns?.length) break;
            for (const ret of res.returns) {
              for (const item of (ret.returnItems || [])) {
                if (!item.orderId) continue;
                allOrderIds.add(item.orderId);
                if (!returnData.has(item.orderId)) {
                  returnData.set(item.orderId, { date: ret.registrationDateTime, fm: ret.fulfilmentMethod || fm, items: [] });
                }
                const ex = returnData.get(item.orderId)!;
                if (!ex.items.find(i => i.rmaId === item.rmaId)) ex.items.push(item);
              }
            }
            if (res.returns.length < 50) break;
          }
        }

        // 1d. Returns (handled=false) — both FBB and FBR
        for (const fm of ['FBB', 'FBR']) {
          for (let page = 1; page <= 50; page++) {
            if (elapsed() > DISCOVERY_BUDGET_MS) break;
            const res = await rateLimitedFetch<{ returns?: REntry[] }>(`/returns?handled=false&fulfilment-method=${fm}&page=${page}`);
            if (!res?.returns?.length) break;
            for (const ret of res.returns) {
              for (const item of (ret.returnItems || [])) {
                if (!item.orderId) continue;
                allOrderIds.add(item.orderId);
                if (!returnData.has(item.orderId)) {
                  returnData.set(item.orderId, { date: ret.registrationDateTime, fm: ret.fulfilmentMethod || fm, items: [] });
                }
                const ex = returnData.get(item.orderId)!;
                if (!ex.items.find(i => i.rmaId === item.rmaId)) ex.items.push(item);
              }
            }
            if (res.returns.length < 50) break;
          }
        }
        console.log(`[bolcom-api] fetchOrders: ${elapsed()}ms - ${allOrderIds.size} total unique orders discovered`);

        if (allOrderIds.size === 0) {
          result = { success: true, data: { ordersFound: 0, ordersSynced: 0, itemsSynced: 0, customersCreated: 0, elapsed: elapsed(), apiCalls: apiCallCount, ordersListPages, debug: 'no_order_ids_discovered' } };
          break;
        }

        // ── Phase 2: Filter already-synced ──

        const allIds = Array.from(allOrderIds);
        const existingSet = new Set<string>();
        for (let i = 0; i < allIds.length; i += 200) {
          const { data: rows } = await supabase.from("sales_orders").select("external_reference")
            .eq("company_id", companyId).eq("source", "bolcom")
            .in("external_reference", allIds.slice(i, i + 200));
          for (const o of (rows || [])) existingSet.add((o as { external_reference: string }).external_reference);
        }
        const newIds = allIds.filter(id => !existingSet.has(id));
        console.log(`[bolcom-api] fetchOrders: ${elapsed()}ms - ${existingSet.size} existing, ${newIds.length} new`);

        if (newIds.length === 0) {
          result = { success: true, data: { ordersFound: allIds.length, ordersSynced: 0, itemsSynced: 0, alreadySynced: existingSet.size, customersCreated: 0, elapsed: elapsed() } };
          break;
        }

        // ── Phase 3: Build order data ──

        const orderMap = new Map<string, OrderData>();
        let fetchErrors = 0;

        // 3a. Use cached order details from list
        for (const oid of newIds) {
          const c = orderCache.get(oid);
          if (!c?.orderItems?.length) continue;
          orderMap.set(oid, {
            orderId: oid, orderDate: c.dateTimeOrderPlaced,
            items: c.orderItems.map(oi => ({
              id: oi.orderItemId, ean: oi.ean || oi.product?.ean || '',
              title: oi.product?.title || `EAN: ${oi.ean}`,
              qty: oi.quantity, price: oi.unitPrice || 0,
              sku: oi.offer?.reference, fm: oi.fulfilmentMethod || 'FBB',
            })),
            shipTo: c.shipmentDetails, billTo: c.billingDetails,
            fm: c.orderItems[0]?.fulfilmentMethod || 'FBB',
          });
        }

        // 3b. Fetch remaining by ID (budget-limited)
        const miss1 = newIds.filter(id => !orderMap.has(id)).slice(0, 200);
        for (const oid of miss1) {
          if (elapsed() > BUDGET_MS - 20_000) break; // Keep 20s for DB ops
          const o = await rateLimitedFetch<BolOrder>(`/orders/${oid}`);
          if (o?.orderId && o?.orderItems?.length) {
            orderMap.set(o.orderId, {
              orderId: o.orderId, orderDate: o.dateTimeOrderPlaced,
              items: o.orderItems.map(oi => ({
                id: oi.orderItemId, ean: oi.ean || oi.product?.ean || '',
                title: oi.product?.title || `EAN: ${oi.ean}`,
                qty: oi.quantity, price: oi.unitPrice || 0,
                sku: oi.offer?.reference, fm: oi.fulfilmentMethod || 'FBB',
              })),
              shipTo: o.shipmentDetails, billTo: o.billingDetails,
              fm: o.orderItems[0]?.fulfilmentMethod || 'FBB',
            });
          } else { fetchErrors++; }
        }
        console.log(`[bolcom-api] fetchOrders: ${elapsed()}ms - ${orderMap.size} orders from cache+fetch`);

        // 3c. Shipment details for remaining (budget-limited)
        const miss2 = newIds.filter(id => !orderMap.has(id));
        if (miss2.length > 0 && shipmentIds.length > 0) {
          const miss2Set = new Set(miss2);
          const toCheck = shipmentIds.slice(0, 100);
          for (const sid of toCheck) {
            if (elapsed() > BUDGET_MS - 15_000) break;
            const s = await rateLimitedFetch<BolShipment>(`/shipments/${sid}`);
            if (!s) continue;
            for (const si of (s.shipmentItems || [])) {
              if (!si.orderId || !miss2Set.has(si.orderId)) continue;
              let od = orderMap.get(si.orderId);
              if (!od) {
                od = { orderId: si.orderId, orderDate: si.orderDate || s.shipmentDateTime, items: [],
                  shipTo: s.shipmentDetails, billTo: s.billingDetails,
                  fm: si.fulfilmentMethod || 'FBB', shippedAt: s.shipmentDateTime };
                orderMap.set(si.orderId, od);
              }
              if (!od.items.find(e => e.id === si.orderItemId)) {
                od.items.push({ id: si.orderItemId, ean: si.ean, title: si.title || `EAN: ${si.ean}`,
                  qty: si.quantity, price: si.offerPrice || 0, sku: si.offer?.reference,
                  fm: si.fulfilmentMethod || 'FBB' });
              }
            }
          }
        }

        // 3d. Return-data fallback
        const miss3 = newIds.filter(id => !orderMap.has(id));
        if (miss3.length > 0) {
          const eans = new Set<string>();
          for (const id of miss3) { returnData.get(id)?.items.forEach(i => { if (i.ean) eans.add(i.ean); }); }
          const pm = new Map<string, { p: number; n: string }>();
          if (eans.size > 0) {
            const arr = Array.from(eans);
            for (let i = 0; i < arr.length; i += 100) {
              const { data: prods } = await supabase.from("products").select("ean, base_price, name")
                .eq("company_id", companyId).in("ean", arr.slice(i, i + 100));
              for (const p of (prods || []) as Array<{ ean: string; base_price: number; name: string }>)
                pm.set(p.ean, { p: p.base_price || 0, n: p.name });
            }
          }
          for (const id of miss3) {
            const rd = returnData.get(id);
            if (!rd) continue;
            orderMap.set(id, {
              orderId: id, orderDate: rd.date, fm: rd.fm,
              items: rd.items.map(ri => {
                const prod = pm.get(ri.ean);
                return { id: ri.rmaId, ean: ri.ean, title: prod?.n || `EAN: ${ri.ean}`,
                  qty: ri.expectedQuantity, price: prod?.p || 0, fm: rd.fm };
              }),
            });
          }
        }
        console.log(`[bolcom-api] fetchOrders: ${elapsed()}ms - ${orderMap.size} orders resolved (${fetchErrors} fetch errors)`);

        // ── Phase 4: Insert into DB ──

        let ordersSynced = 0, itemsSynced = 0, customersCreated = 0;

        // Product lookup
        const allEans = new Set<string>();
        for (const [, o] of orderMap) o.items.forEach(i => { if (i.ean) allEans.add(i.ean); });
        const eanProdMap = new Map<string, string>();
        if (allEans.size > 0) {
          const arr = Array.from(allEans);
          for (let i = 0; i < arr.length; i += 100) {
            const { data } = await supabase.from("products").select("id, ean").eq("company_id", companyId).in("ean", arr.slice(i, i + 100));
            for (const p of (data || []) as Array<{ id: string; ean: string }>) eanProdMap.set(p.ean, p.id);
          }
        }

        // Batch insert orders (10 at a time)
        const entries = Array.from(orderMap.values());
        for (let i = 0; i < entries.length; i += 10) {
          if (elapsed() > BUDGET_MS) break;
          const batch = entries.slice(i, i + 10);

          // Skip customer creation for bol.com orders — bol.com handles the customer relationship

          // Insert orders
          const rows = batch.map(o => {
            const s = o.shipTo; const b = o.billTo;
            const sub = o.items.reduce((a, i) => a + i.price * i.qty, 0);
            const nm = s ? `${s.firstName || ''} ${s.surname || ''}`.trim() : null;
            return {
              company_id: companyId, customer_id: null,
              order_number: `BOL-${o.orderId}`, external_reference: o.orderId,
              order_date: o.orderDate, status: 'delivered', source: 'bolcom',
              shipping_name: nm,
              shipping_address_line1: s ? `${s.streetName || ''} ${s.houseNumber || ''}${s.houseNumberExtension || ''}`.trim() : null,
              shipping_city: s?.city || null, shipping_postal_code: s?.zipCode || null,
              shipping_country: s?.countryCode || 'NL',
              billing_name: b ? `${b.firstName || ''} ${b.surname || ''}`.trim() : null,
              billing_address_line1: b ? `${b.streetName || ''} ${b.houseNumber || ''}${b.houseNumberExtension || ''}`.trim() : null,
              billing_city: b?.city || null, billing_postal_code: b?.zipCode || null,
              billing_country: b?.countryCode || 'NL',
              billing_same_as_shipping: false, subtotal: sub, total: sub, currency: 'EUR',
              payment_status: 'paid', shipped_at: o.shippedAt || null,
              metadata: { bolcom_order_id: o.orderId, fulfilment_method: o.fm },
            };
          });

          const { data: ins, error: err } = await supabase.from("sales_orders").insert(rows).select("id, external_reference");
          if (err) { console.warn(`[bolcom-api] fetchOrders: insert fail: ${err.message}`); continue; }

          const insMap = new Map((ins || []).map((r: { id: string; external_reference: string }) => [r.external_reference, r.id]));
          ordersSynced += insMap.size;

          // Insert items
          const itemRows: Array<Record<string, unknown>> = [];
          for (const o of batch) {
            const soId = insMap.get(o.orderId);
            if (!soId) continue;
            o.items.forEach((it, idx) => {
              itemRows.push({
                sales_order_id: soId, product_id: eanProdMap.get(it.ean) || null,
                description: it.title, sku: it.sku || null, ean: it.ean,
                quantity: it.qty, unit_price: it.price,
                line_total: it.price * it.qty, line_number: idx + 1,
                tax_percent: 21, tax_amount: (it.price * it.qty) * 0.21 / 1.21,
              });
            });
          }
          if (itemRows.length > 0) {
            const { error: ie } = await supabase.from("sales_order_items").insert(itemRows);
            if (ie) console.warn(`[bolcom-api] fetchOrders: items fail: ${ie.message}`);
            else itemsSynced += itemRows.length;
          }
        }

        const totalElapsed = elapsed();
        // If we hit the budget limit during discovery, there may be more orders to fetch in a follow-up sync
        const hitBudgetDuringDiscovery = elapsed() >= BUDGET_MS * 0.9;
        const missedOrders = newIds.length - orderMap.size;
        console.log(`[bolcom-api] fetchOrders done (${totalElapsed}ms): ${ordersSynced} orders, ${itemsSynced} items, ${missedOrders} missed, hitBudget=${hitBudgetDuringDiscovery}`);
        result = { success: true, data: { ordersFound: allIds.length, ordersSynced, itemsSynced, customersCreated, alreadySynced: existingSet.size, fetchErrors, elapsed: totalElapsed, needsMore: hitBudgetDuringDiscovery || missedOrders > 0 } };
        break;
      }

      // ================================================================
      // REPAIR ORDERS — fix zero-total orders by re-fetching from bol.com
      // ================================================================
      case "repairOrders": {
        const tokenRes = await getBolToken(supabase, companyId);
        if ("error" in tokenRes) { result = { success: false, error: tokenRes.error }; break; }

        interface RepairOItem {
          orderItemId: string; ean: string; quantity: number;
          unitPrice: number; offerPrice?: number;
          product?: { title?: string; ean?: string };
        }
        interface RepairBolOrder {
          orderId: string; dateTimeOrderPlaced?: string;
          orderItems: RepairOItem[];
        }

        const BUDGET_MS = 130_000;
        const t0 = Date.now();
        const elapsed = () => Date.now() - t0;

        // Get zero-total bolcom orders
        const { data: zeroOrders, error: zErr } = await supabase
          .from("sales_orders")
          .select("id, external_reference, order_date, total")
          .eq("company_id", companyId)
          .eq("source", "bolcom")
          .eq("total", 0)
          .range(0, 2999);

        if (zErr || !zeroOrders?.length) {
          result = { success: true, data: { message: "No zero-total orders to repair", count: 0 } };
          break;
        }

        console.log(`[bolcom-api] repairOrders: ${zeroOrders.length} zero-total orders to fix`);

        let lastCall = 0;
        let repairSpacing = 1200;
        const rateLimitedFetchRepair = async <T>(path: string): Promise<T | null> => {
          const wait = Math.max(0, repairSpacing - (Date.now() - lastCall));
          if (wait > 0) await new Promise(r => setTimeout(r, wait));
          lastCall = Date.now();
          const url = `${BOL_API_BASE}${path}`;
          const contentType = "application/vnd.retailer.v10+json";
          for (let attempt = 0; attempt < 3; attempt++) {
            if (elapsed() > BUDGET_MS) return null;
            try {
              const resp = await fetch(url, {
                method: "GET",
                headers: { "Authorization": `Bearer ${tokenRes.token}`, "Content-Type": contentType, "Accept": contentType },
              });
              if (resp.status === 429) {
                const retryAfter = Math.min(parseInt(resp.headers.get("Retry-After") || "5", 10), 15);
                repairSpacing = Math.min(repairSpacing * 1.5, 5000);
                console.warn(`[bolcom-api] repairOrders: 429, retry after ${retryAfter}s`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
                continue;
              }
              if (!resp.ok) return null;
              if (resp.status === 204) return {} as T;
              return (await resp.json()) as T;
            } catch { if (attempt < 2) { await new Promise(r => setTimeout(r, 2000)); continue; } return null; }
          }
          return null;
        };

        let fixed = 0, skipped = 0, errors = 0;

        for (const order of zeroOrders) {
          if (elapsed() > BUDGET_MS) break;

          const oid = order.external_reference;
          const o = await rateLimitedFetchRepair<RepairBolOrder>(`/orders/${oid}`);

          if (!o?.orderItems?.length) {
            skipped++;
            continue;
          }

          // Calculate total from order items
          let orderTotal = 0;
          const itemUpdates: Array<{ ean: string; price: number; title: string; qty: number }> = [];
          for (const oi of o.orderItems) {
            const price = oi.unitPrice || oi.offerPrice || 0;
            const qty = oi.quantity || 1;
            orderTotal += price * qty;
            itemUpdates.push({
              ean: oi.ean || oi.product?.ean || '',
              price,
              title: oi.product?.title || `EAN: ${oi.ean}`,
              qty,
            });
          }

          if (orderTotal === 0) { skipped++; continue; }

          // Update sales_order
          const updateData: Record<string, unknown> = {
            total: orderTotal,
            subtotal: orderTotal,
          };
          if (!order.order_date && o.dateTimeOrderPlaced) {
            updateData.order_date = o.dateTimeOrderPlaced;
          }

          const { error: uErr } = await supabase
            .from("sales_orders")
            .update(updateData)
            .eq("id", order.id);

          if (uErr) { errors++; continue; }

          // Update item prices too
          for (const item of itemUpdates) {
            if (item.price > 0) {
              await supabase
                .from("sales_order_items")
                .update({ unit_price: item.price, line_total: item.price * item.qty })
                .eq("sales_order_id", order.id)
                .eq("ean", item.ean);
            }
          }

          fixed++;
        }

        // Also fix orders with prices but NULL order_date
        const { data: nullDateOrders } = await supabase
          .from("sales_orders")
          .select("id, external_reference")
          .eq("company_id", companyId)
          .eq("source", "bolcom")
          .is("order_date", null)
          .limit(100);

        let dateFixed = 0;
        if (nullDateOrders?.length) {
          for (const order of nullDateOrders) {
            if (elapsed() > BUDGET_MS) break;
            const o = await rateLimitedFetchRepair<RepairBolOrder>(`/orders/${order.external_reference}`);
            if (o?.dateTimeOrderPlaced) {
              await supabase.from("sales_orders").update({ order_date: o.dateTimeOrderPlaced }).eq("id", order.id);
              dateFixed++;
            }
          }
        }

        console.log(`[bolcom-api] repairOrders done (${elapsed()}ms): ${fixed} fixed, ${dateFixed} dates fixed, ${skipped} skipped, ${errors} errors`);
        result = { success: true, data: { totalZero: zeroOrders.length, fixed, dateFixed, skipped, errors, elapsed: elapsed() } };
        break;
      }

      // ================================================================
      // IMPORT ORDERS — bulk import from CSV data
      // ================================================================
      case "importOrders": {
        const csvData = body.csvData as string;
        if (!csvData || typeof csvData !== "string") {
          result = { success: false, error: "csvData (string) is required" };
          break;
        }

        // Parse CSV lines
        const lines = csvData.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          result = { success: false, error: "CSV must have a header row and at least one data row" };
          break;
        }

        // Parse header — support semicolon and comma delimiters
        const delimiter = lines[0].includes(";") ? ";" : ",";
        const parseRow = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === delimiter && !inQuotes) { result.push(current.trim()); current = ""; continue; }
            current += ch;
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""));

        // Column mapping — support Dutch, English, and generic column names
        const colMap: Record<string, string[]> = {
          orderId:     ["bestelnummer", "order_id", "orderid", "order_number", "ordernumber", "bestelling", "bestel_nummer"],
          orderDate:   ["besteldatum", "order_date", "orderdate", "date", "datum", "order_placed"],
          ean:         ["ean", "ean_code", "ean13", "barcode", "product_ean"],
          productName: ["artikelnaam", "product_name", "productname", "titel", "title", "article_name", "omschrijving", "description", "product"],
          quantity:    ["aantal", "quantity", "qty", "hoeveelheid", "aantallen"],
          price:       ["prijs", "price", "unit_price", "unitprice", "stuksprijs", "verkoopprijs", "bedrag", "amount"],
          status:      ["status", "order_status", "orderstatus", "bestelstatus"],
          total:       ["totaal", "total", "order_total", "totaalprijs", "total_price"],
        };

        const findCol = (key: string): number => {
          const aliases = colMap[key] || [];
          for (const alias of aliases) {
            const idx = headers.indexOf(alias);
            if (idx >= 0) return idx;
          }
          return -1;
        };

        const col = {
          orderId: findCol("orderId"),
          orderDate: findCol("orderDate"),
          ean: findCol("ean"),
          productName: findCol("productName"),
          quantity: findCol("quantity"),
          price: findCol("price"),
          status: findCol("status"),
          total: findCol("total"),
        };

        if (col.orderId < 0) {
          result = { success: false, error: `Could not find order ID column. Headers found: ${headers.join(", ")}. Expected one of: ${colMap.orderId.join(", ")}` };
          break;
        }

        // Parse rows and group by orderId
        const orderGroups = new Map<string, Array<{ ean: string; name: string; qty: number; price: number; date: string; status: string; total: number }>>();
        let parseErrors = 0;

        for (let i = 1; i < lines.length; i++) {
          const vals = parseRow(lines[i]);
          const oid = vals[col.orderId]?.trim();
          if (!oid) { parseErrors++; continue; }

          const row = {
            ean: col.ean >= 0 ? (vals[col.ean] || "").trim() : "",
            name: col.productName >= 0 ? (vals[col.productName] || "").trim() : `Order ${oid} item`,
            qty: col.quantity >= 0 ? parseInt(vals[col.quantity]) || 1 : 1,
            price: col.price >= 0 ? parseFloat(vals[col.price]?.replace(",", ".")) || 0 : 0,
            date: col.orderDate >= 0 ? (vals[col.orderDate] || "").trim() : "",
            status: col.status >= 0 ? (vals[col.status] || "").trim().toLowerCase() : "delivered",
            total: col.total >= 0 ? parseFloat(vals[col.total]?.replace(",", ".")) || 0 : 0,
          };

          if (!orderGroups.has(oid)) orderGroups.set(oid, []);
          orderGroups.get(oid)!.push(row);
        }

        console.log(`[bolcom-api] importOrders: parsed ${orderGroups.size} unique orders from ${lines.length - 1} CSV rows (${parseErrors} parse errors)`);

        // Check existing orders for deduplication
        const allOids = Array.from(orderGroups.keys());
        const existingIds = new Set<string>();
        for (let i = 0; i < allOids.length; i += 200) {
          const { data: rows } = await supabase.from("sales_orders").select("external_reference")
            .eq("company_id", companyId).eq("source", "bolcom")
            .in("external_reference", allOids.slice(i, i + 200));
          for (const r of (rows || [])) existingIds.add((r as { external_reference: string }).external_reference);
        }

        const newOids = allOids.filter(id => !existingIds.has(id));
        console.log(`[bolcom-api] importOrders: ${existingIds.size} already exist, ${newOids.length} new to import`);

        if (newOids.length === 0) {
          result = { success: true, data: { imported: 0, skipped: existingIds.size, totalParsed: orderGroups.size, parseErrors } };
          break;
        }

        // Product lookup for EAN matching
        const allEans = new Set<string>();
        for (const oid of newOids) {
          for (const item of orderGroups.get(oid)!) {
            if (item.ean) allEans.add(item.ean);
          }
        }
        const eanProdMap = new Map<string, string>();
        if (allEans.size > 0) {
          const arr = Array.from(allEans);
          for (let i = 0; i < arr.length; i += 100) {
            const { data } = await supabase.from("products").select("id, ean").eq("company_id", companyId).in("ean", arr.slice(i, i + 100));
            for (const p of (data || []) as Array<{ id: string; ean: string }>) eanProdMap.set(p.ean, p.id);
          }
        }

        // Parse date helper
        const parseDate = (d: string): string | null => {
          if (!d) return null;
          // Try ISO format
          const iso = new Date(d);
          if (!isNaN(iso.getTime())) return iso.toISOString();
          // Try DD-MM-YYYY or DD/MM/YYYY
          const m = d.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
          if (m) { const dt = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])); if (!isNaN(dt.getTime())) return dt.toISOString(); }
          // Try YYYY-MM-DD
          const m2 = d.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
          if (m2) { const dt = new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3])); if (!isNaN(dt.getTime())) return dt.toISOString(); }
          return null;
        };

        // Batch insert (10 at a time)
        let imported = 0, itemsImported = 0, insertErrors = 0;

        for (let i = 0; i < newOids.length; i += 10) {
          const batch = newOids.slice(i, i + 10);
          const orderRows = batch.map(oid => {
            const items = orderGroups.get(oid)!;
            const firstItem = items[0];
            const sub = items.reduce((a, it) => a + it.price * it.qty, 0);
            const orderTotal = firstItem.total > 0 ? firstItem.total : sub;
            const statusMap: Record<string, string> = { geannuleerd: "cancelled", cancelled: "cancelled", verzonden: "shipped", shipped: "shipped", afgeleverd: "delivered", delivered: "delivered" };
            const mappedStatus = statusMap[firstItem.status] || "delivered";
            return {
              company_id: companyId, customer_id: null,
              order_number: `BOL-${oid}`, external_reference: oid,
              order_date: parseDate(firstItem.date) || new Date().toISOString(),
              status: mappedStatus, source: "bolcom",
              subtotal: sub, total: orderTotal, currency: "EUR",
              payment_status: mappedStatus === "cancelled" ? "pending" : "paid",
              billing_same_as_shipping: true,
              metadata: { bolcom_order_id: oid, import_source: "csv" },
            };
          });

          const { data: ins, error: err } = await supabase.from("sales_orders").insert(orderRows).select("id, external_reference");
          if (err) { console.warn(`[bolcom-api] importOrders batch fail: ${err.message}`); insertErrors += batch.length; continue; }

          const insMap = new Map((ins || []).map((r: { id: string; external_reference: string }) => [r.external_reference, r.id]));
          imported += insMap.size;

          // Insert items
          const itemRows: Array<Record<string, unknown>> = [];
          for (const oid of batch) {
            const soId = insMap.get(oid);
            if (!soId) continue;
            const items = orderGroups.get(oid)!;
            items.forEach((it, idx) => {
              itemRows.push({
                sales_order_id: soId, product_id: eanProdMap.get(it.ean) || null,
                description: it.name, ean: it.ean || null,
                quantity: it.qty, unit_price: it.price,
                line_total: it.price * it.qty, line_number: idx + 1,
                tax_percent: 21, tax_amount: (it.price * it.qty) * 0.21 / 1.21,
              });
            });
          }
          if (itemRows.length > 0) {
            const { error: ie } = await supabase.from("sales_order_items").insert(itemRows);
            if (ie) console.warn(`[bolcom-api] importOrders items fail: ${ie.message}`);
            else itemsImported += itemRows.length;
          }
        }

        console.log(`[bolcom-api] importOrders done: ${imported} orders, ${itemsImported} items, ${insertErrors} errors`);
        result = { success: true, data: { imported, itemsImported, skipped: existingIds.size, totalParsed: orderGroups.size, parseErrors, insertErrors } };
        break;
      }

      // ================================================================
      // IMPORT ANALYTICS — create order records from bol.com product analytics CSV
      // ================================================================
      case "importAnalytics": {
        const csvData = body.csvData as string;
        const periodStart = body.periodStart as string || "2025-11-01";
        const periodEnd = body.periodEnd as string || "2026-02-24";
        if (!csvData) { result = { success: false, error: "csvData is required" }; break; }

        const lines = csvData.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { result = { success: false, error: "CSV needs header + data rows" }; break; }

        const delimiter = lines[0].includes(";") ? ";" : ",";
        const parseRow = (line: string): string[] => {
          const res: string[] = [];
          let cur = "", inQ = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQ = !inQ; continue; }
            if (ch === delimiter && !inQ) { res.push(cur.trim()); cur = ""; continue; }
            cur += ch;
          }
          res.push(cur.trim());
          return res;
        };

        const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_()]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""));

        // Find columns: EAN, Titel, Prijs, Bestellingen (Totaal)
        const findCol = (needles: string[]): number => {
          for (const n of needles) {
            const idx = headers.findIndex(h => h.includes(n));
            if (idx >= 0) return idx;
          }
          return -1;
        };

        const colEan = findCol(["ean"]);
        const colTitle = findCol(["titel", "title"]);
        const colPrice = findCol(["prijs", "price"]);
        const colOrders = findCol(["bestellingen_(totaal)", "bestellingen_totaal", "orders_total"]);
        const colSales = findCol(["verkopen_(totaal)", "verkopen_totaal", "sales_total"]);

        if (colEan < 0 || colOrders < 0) {
          result = { success: false, error: `Could not find EAN or Bestellingen columns. Headers: ${headers.join(", ")}` };
          break;
        }

        // Parse product rows
        interface ProdRow { ean: string; title: string; price: number; orders: number; sales: number; }
        const products: ProdRow[] = [];
        let totalOrders = 0;
        for (let i = 1; i < lines.length; i++) {
          const vals = parseRow(lines[i]);
          const ean = vals[colEan]?.trim();
          const ordersVal = parseInt(vals[colOrders]) || 0;
          if (!ean || ordersVal <= 0) continue;
          let priceStr = colPrice >= 0 ? (vals[colPrice] || "0") : "0";
          priceStr = priceStr.replace(/[€\s]/g, "").replace(",", ".");
          products.push({
            ean,
            title: colTitle >= 0 ? (vals[colTitle] || `EAN: ${ean}`) : `EAN: ${ean}`,
            price: parseFloat(priceStr) || 0,
            orders: ordersVal,
            sales: colSales >= 0 ? (parseInt(vals[colSales]) || ordersVal) : ordersVal,
          });
          totalOrders += ordersVal;
        }
        console.log(`[bolcom-api] importAnalytics: ${products.length} products with ${totalOrders} total orders`);

        // Count existing orders per EAN for this company in the period
        const eanList = products.map(p => p.ean);
        const existingByEan = new Map<string, number>();
        for (let i = 0; i < eanList.length; i += 100) {
          const batch = eanList.slice(i, i + 100);
          const { data: items } = await supabase
            .from("sales_order_items")
            .select("ean, sales_order_id, sales_orders!inner(company_id, source, order_date)")
            .eq("sales_orders.company_id", companyId)
            .eq("sales_orders.source", "bolcom")
            .gte("sales_orders.order_date", periodStart)
            .in("ean", batch);
          for (const item of (items || []) as Array<{ ean: string }>) {
            existingByEan.set(item.ean, (existingByEan.get(item.ean) || 0) + 1);
          }
        }

        // Check which HIST records already exist
        const existingHist = new Set<string>();
        for (let i = 0; i < eanList.length; i += 200) {
          const refs = eanList.slice(i, i + 200).flatMap(e => Array.from({ length: 100 }, (_, j) => `HIST-${e}-${j + 1}`));
          // Only check first few per EAN
          const { data: rows } = await supabase.from("sales_orders")
            .select("external_reference")
            .eq("company_id", companyId).eq("source", "bolcom")
            .like("external_reference", "HIST-%")
            .limit(5000);
          for (const r of (rows || []) as Array<{ external_reference: string }>) existingHist.add(r.external_reference);
        }

        // Product lookup
        const eanProdMap = new Map<string, string>();
        for (let i = 0; i < eanList.length; i += 100) {
          const { data } = await supabase.from("products").select("id, ean").eq("company_id", companyId).in("ean", eanList.slice(i, i + 100));
          for (const p of (data || []) as Array<{ id: string; ean: string }>) eanProdMap.set(p.ean, p.id);
        }

        // Generate date spread across the period
        const startMs = new Date(periodStart).getTime();
        const endMs = new Date(periodEnd).getTime();
        const spanMs = endMs - startMs;

        // Build order records — only for the gap between CSV total and existing DB count
        let imported = 0, skipped = 0, itemsCreated = 0;
        let orderIdx = 0;
        const totalToCreate = products.reduce((acc, p) => {
          const existing = existingByEan.get(p.ean) || 0;
          return acc + Math.max(0, p.orders - existing);
        }, 0);

        for (const prod of products) {
          const existingCount = existingByEan.get(prod.ean) || 0;
          const toCreate = Math.max(0, prod.orders - existingCount);
          if (toCreate <= 0) { skipped += prod.orders; continue; }

          // Create orders in batches of 10
          for (let batch = 0; batch < toCreate; batch += 10) {
            const batchSize = Math.min(10, toCreate - batch);
            const orderRows = [];
            const batchRefs: string[] = [];

            for (let j = 0; j < batchSize; j++) {
              const idx = existingCount + batch + j + 1;
              const ref = `HIST-${prod.ean}-${idx}`;
              if (existingHist.has(ref)) { skipped++; continue; }
              // Spread date across period
              const dateFrac = totalToCreate > 1 ? orderIdx / totalToCreate : 0.5;
              const orderDate = new Date(startMs + dateFrac * spanMs).toISOString();
              orderIdx++;

              orderRows.push({
                company_id: companyId, customer_id: null,
                order_number: `BOL-HIST-${prod.ean.slice(-6)}-${idx}`,
                external_reference: ref,
                order_date: orderDate, status: "delivered", source: "bolcom",
                subtotal: prod.price, total: prod.price, currency: "EUR",
                payment_status: "paid", billing_same_as_shipping: true,
                metadata: { import_source: "analytics_csv", ean: prod.ean, period: `${periodStart}_${periodEnd}` },
              });
              batchRefs.push(ref);
            }

            if (orderRows.length === 0) continue;

            const { data: ins, error: err } = await supabase.from("sales_orders").insert(orderRows).select("id, external_reference");
            if (err) { console.warn(`[bolcom-api] importAnalytics: batch fail: ${err.message}`); continue; }

            const insMap = new Map((ins || []).map((r: { id: string; external_reference: string }) => [r.external_reference, r.id]));
            imported += insMap.size;

            // Insert items
            const itemRows: Array<Record<string, unknown>> = [];
            for (const [ref, soId] of insMap) {
              itemRows.push({
                sales_order_id: soId, product_id: eanProdMap.get(prod.ean) || null,
                description: prod.title, ean: prod.ean,
                quantity: 1, unit_price: prod.price,
                line_total: prod.price, line_number: 1,
                tax_percent: 21, tax_amount: prod.price * 0.21 / 1.21,
              });
            }
            if (itemRows.length > 0) {
              const { error: ie } = await supabase.from("sales_order_items").insert(itemRows);
              if (!ie) itemsCreated += itemRows.length;
            }
          }
        }

        console.log(`[bolcom-api] importAnalytics done: ${imported} orders created, ${skipped} skipped, ${totalOrders} total in CSV`);
        result = { success: true, data: { imported, itemsCreated, skipped, totalInCsv: totalOrders, totalProducts: products.length, periodStart, periodEnd } };
        break;
      }

      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    return jsonResponse(result, result.success ? 200 : 400);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    console.error("[bolcom-api] Unhandled error:", msg);
    return jsonResponse({ success: false, error: msg }, 500);
  }
});

// ============================================
// Helpers
// ============================================

function jsonResponse(data: BolcomResult, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
