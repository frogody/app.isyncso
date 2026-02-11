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
  | "getOffer"
  | "createOffer"
  | "updateOffer"
  | "getReturns"
  | "handleReturn";

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
  retries = 2
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
          // Use a lightweight endpoint to verify the token works
          const commissions = await bolFetch(tokenResult.token, "/commission", "GET");
          result = { success: true, data: { connected: true, commissions } };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Connection test failed";
          result = { success: false, error: msg };
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

        const offerPage = (body.page as number) || 1;
        const offersData = await bolFetch(tokenResult.token, `/offers?page=${offerPage}`, "GET");
        result = { success: true, data: offersData };
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
              status: "registered",
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
