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
  | "importProducts";

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

        // 1. Paginate through all inventory
        const allInventory: Array<{ ean: string; bsku: string; regularStock: number; gradedStock: number }> = [];
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

        console.log(`[bolcom-api] importProducts: found ${allInventory.length} inventory items for company ${companyId}`);

        if (allInventory.length === 0) {
          result = { success: true, data: { imported: 0, updated: 0, errors: 0, total: 0, message: "No inventory found on bol.com" } };
          break;
        }

        let imported = 0;
        let updated = 0;
        let errors = 0;
        const details: Array<{ ean: string; status: string; name?: string }> = [];

        for (const invItem of allInventory) {
          const { ean, bsku, regularStock, gradedStock } = invItem;
          try {
            // Check if product with this EAN already exists for this company
            const { data: existingProduct } = await supabase
              .from("products")
              .select("id, name")
              .eq("company_id", companyId)
              .eq("ean", ean)
              .maybeSingle();

            if (existingProduct) {
              // Update stock in offer_mapping
              await supabase
                .from("bolcom_offer_mappings")
                .upsert({
                  company_id: companyId,
                  ean,
                  product_id: existingProduct.id,
                  bolcom_stock_amount: regularStock + gradedStock,
                  is_active: true,
                  updated_at: new Date().toISOString(),
                }, { onConflict: "company_id,ean" });

              // Update physical_products inventory
              await supabase
                .from("physical_products")
                .update({
                  inventory: {
                    regular_stock: regularStock,
                    graded_stock: gradedStock,
                    total: regularStock + gradedStock,
                  },
                  updated_at: new Date().toISOString(),
                })
                .eq("product_id", existingProduct.id);

              updated++;
              details.push({ ean, status: "updated", name: existingProduct.name });
              continue;
            }

            // New product — fetch catalog data for title
            let productName = `Product ${ean}`;
            let featuredImage: { url: string; width: number; height: number } | null = null;
            const gallery: Array<{ url: string; width: number; height: number }> = [];
            let category: string | null = null;
            const tags: string[] = [];

            // Fetch catalog-products for title
            try {
              const catalog = await bolFetch<{ products?: Array<{ attributes?: Array<{ id: string; values: Array<{ value: string }> }> }> }>(
                tokenResult.token, `/catalog-products/${ean}`, "GET",
                undefined, undefined, 2, nlHeaders
              );
              if (catalog.products && catalog.products[0]?.attributes) {
                const titleAttr = catalog.products[0].attributes.find(
                  (a: { id: string }) => a.id === "Title" || a.id === "title" || a.id.toLowerCase().includes("title")
                );
                if (titleAttr?.values?.[0]?.value) {
                  productName = titleAttr.values[0].value;
                }
              }
            } catch { /* skip — use default name */ }

            await new Promise(r => setTimeout(r, 200));

            // Fetch assets (PRIMARY + ADDITIONAL)
            try {
              for (const usage of ["PRIMARY", "ADDITIONAL"]) {
                try {
                  const assets = await bolFetch<{ assets?: Array<{ url: string; usage: string; order?: number; variants?: Array<{ url: string; width: number; height: number; size: string }> }> }>(
                    tokenResult.token, `/products/${ean}/assets?usage=${usage}`, "GET",
                    undefined, undefined, 1, nlHeaders
                  );
                  if (assets.assets) {
                    for (const asset of assets.assets) {
                      if (asset.usage === "PRIMARY" && asset.variants?.length) {
                        const largest = asset.variants.reduce((a, b) => (a.width > b.width ? a : b));
                        featuredImage = { url: largest.url, width: largest.width, height: largest.height };
                      } else if (asset.usage === "ADDITIONAL" && asset.variants?.length) {
                        const medium = asset.variants.find(v => v.size === "medium") || asset.variants[0];
                        if (medium) gallery.push({ url: medium.url, width: medium.width, height: medium.height });
                      }
                    }
                  }
                } catch { /* skip */ }
              }
            } catch { /* skip */ }

            await new Promise(r => setTimeout(r, 200));

            // Fetch placement (category)
            try {
              const placement = await bolFetch<{ categories?: Array<{ categoryName: string; subcategories?: unknown[] }> }>(
                tokenResult.token, `/products/${ean}/placement`, "GET",
                undefined, undefined, 1, nlHeaders
              );
              if (placement.categories?.[0]) {
                const topCat = placement.categories[0];
                let catName = topCat.categoryName;
                let sub = topCat.subcategories as Array<{ name?: string; categoryName?: string; subcategories?: unknown[] }> | undefined;
                while (sub && sub.length > 0) {
                  const child = sub[0];
                  catName = child.name || child.categoryName || catName;
                  sub = child.subcategories as typeof sub;
                }
                category = catName;

                // Extract tags from category hierarchy
                const extractTags = (cats: unknown[]) => {
                  for (const cat of cats) {
                    const c = cat as { name?: string; categoryName?: string; subcategories?: unknown[] };
                    const name = c.name || c.categoryName;
                    if (name) tags.push(name);
                    if (c.subcategories) extractTags(c.subcategories as unknown[]);
                  }
                };
                extractTags(placement.categories);
              }
            } catch { /* skip */ }

            await new Promise(r => setTimeout(r, 200));

            // Generate slug
            const slug = `bol-${ean}`;

            // Insert into products
            const { data: newProduct, error: insertErr } = await supabase
              .from("products")
              .insert({
                company_id: companyId,
                name: productName,
                ean,
                type: "physical",
                status: "published",
                slug,
                featured_image: featuredImage,
                gallery: gallery.length > 0 ? gallery : null,
                category,
                tags: tags.length > 0 ? tags : null,
                seo_og_image: featuredImage?.url || null,
              })
              .select("id")
              .single();

            if (insertErr) {
              errors++;
              details.push({ ean, status: `product_insert_error: ${insertErr.message}` });
              continue;
            }

            // Insert into physical_products
            await supabase
              .from("physical_products")
              .upsert({
                product_id: newProduct.id,
                sku: bsku || ean,
                barcode: ean,
                inventory: {
                  regular_stock: regularStock,
                  graded_stock: gradedStock,
                  total: regularStock + gradedStock,
                },
              }, { onConflict: "product_id" });

            // Insert into bolcom_offer_mappings
            await supabase
              .from("bolcom_offer_mappings")
              .upsert({
                company_id: companyId,
                ean,
                product_id: newProduct.id,
                bolcom_stock_amount: regularStock + gradedStock,
                is_active: true,
              }, { onConflict: "company_id,ean" });

            imported++;
            details.push({ ean, status: "imported", name: productName });

          } catch (e) {
            errors++;
            details.push({ ean, status: `error: ${e instanceof Error ? e.message : "unknown"}` });
          }
        }

        console.log(`[bolcom-api] importProducts complete: ${imported} imported, ${updated} updated, ${errors} errors out of ${allInventory.length} total`);

        result = {
          success: true,
          data: {
            imported,
            updated,
            errors,
            total: allInventory.length,
            details,
          },
        };
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
