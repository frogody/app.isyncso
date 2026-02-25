import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RevolutTransaction {
  id: string;
  type: string;
  state: string;
  created_at: string;
  completed_at?: string;
  request_id?: string;
  reference?: string;
  legs: Array<{
    leg_id: string;
    amount: number;
    currency: string;
    description?: string;
    balance?: number;
    account_id?: string;
    counterparty?: {
      id?: string;
      account_id?: string;
      account_type?: string;
      name?: string;
    };
  }>;
  merchant?: {
    name?: string;
    city?: string;
    country?: string;
    category_code?: string;
  };
}

interface SyncRequest {
  company_id?: string;
  mode?: "manual" | "cron";
}

// Revolut API base URLs
const REVOLUT_SANDBOX_URL = "https://sandbox-b2b.revolut.com/api/1.0";
const REVOLUT_PRODUCTION_URL = "https://b2b.revolut.com/api/1.0";

function getRevolutBaseUrl(): string {
  const env = Deno.env.get("REVOLUT_ENV") || "sandbox";
  return env === "production" ? REVOLUT_PRODUCTION_URL : REVOLUT_SANDBOX_URL;
}

// Refresh Revolut access token using JWT client assertion
async function refreshAccessToken(
  supabase: any,
  connection: any
): Promise<string | null> {
  // If token is still valid, return it
  if (connection.access_token && connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    // Add 5 min buffer
    if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
      return connection.access_token;
    }
  }

  // Try refresh token flow
  if (connection.refresh_token) {
    try {
      const baseUrl = getRevolutBaseUrl();
      const resp = await fetch(`${baseUrl}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
          client_id: connection.client_id,
        }),
      });

      if (resp.ok) {
        const tokenData = await resp.json();
        const expiresAt = new Date(Date.now() + (tokenData.expires_in || 2400) * 1000);

        await supabase
          .from("bank_connections")
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || connection.refresh_token,
            token_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        console.log(`[revolut-sync] Token refreshed, expires at ${expiresAt.toISOString()}`);
        return tokenData.access_token;
      } else {
        const errText = await resp.text();
        console.error(`[revolut-sync] Token refresh failed: ${resp.status} ${errText}`);
      }
    } catch (e) {
      console.error("[revolut-sync] Token refresh error:", e);
    }
  }

  return connection.access_token || null;
}

// Fetch transactions from Revolut API with pagination
async function fetchTransactions(
  accessToken: string,
  fromDate: string,
  toDate: string
): Promise<RevolutTransaction[]> {
  const baseUrl = getRevolutBaseUrl();
  const allTransactions: RevolutTransaction[] = [];
  let offset = 0;
  const count = 100;

  while (true) {
    const params = new URLSearchParams({
      from: fromDate,
      to: toDate,
      count: count.toString(),
    });

    const url = `${baseUrl}/transactions?${params.toString()}`;
    console.log(`[revolut-sync] Fetching transactions: offset=${offset}`);

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Revolut API error ${resp.status}: ${errText}`);
    }

    const transactions: RevolutTransaction[] = await resp.json();
    allTransactions.push(...transactions);

    // If fewer than count returned, we've reached the end
    if (transactions.length < count) break;
    offset += count;
  }

  return allTransactions;
}

// Map Revolut transaction to bank_transactions row
function mapTransaction(txn: RevolutTransaction, bankAccountId: string, companyId: string) {
  const leg = txn.legs?.[0] || {};
  const counterpartyName = leg.counterparty?.name || txn.merchant?.name || null;
  const description = leg.description || txn.reference || `${txn.type}: ${counterpartyName || "Unknown"}`;

  return {
    bank_account_id: bankAccountId,
    company_id: companyId,
    transaction_date: txn.completed_at || txn.created_at,
    amount: leg.amount || 0,
    currency: leg.currency || "EUR",
    description: description.substring(0, 500),
    reference: txn.reference || txn.id,
    counterparty_name: counterpartyName,
    match_status: "unmatched",
    import_source: "revolut_api",
    external_id: txn.id,
    metadata: {
      revolut_type: txn.type,
      revolut_state: txn.state,
      merchant: txn.merchant || null,
      counterparty: leg.counterparty || null,
      leg_id: leg.leg_id,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SyncRequest = await req.json();
    const { company_id, mode = "manual" } = body;

    // Load active bank connections
    let query = supabase
      .from("bank_connections")
      .select("*, bank_accounts(id, name, currency)")
      .eq("is_active", true)
      .eq("provider", "revolut");

    if (company_id) {
      query = query.eq("company_id", company_id);
    }

    const { data: connections, error: connErr } = await query;
    if (connErr) throw new Error(`Failed to load connections: ${connErr.message}`);
    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active Revolut connections found", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[revolut-sync] Processing ${connections.length} connection(s) (mode: ${mode})`);

    const results: Array<{
      company_id: string;
      status: string;
      transactions_imported: number;
      transactions_skipped: number;
      error?: string;
    }> = [];

    for (const connection of connections) {
      try {
        // Refresh token
        const accessToken = await refreshAccessToken(supabase, connection);
        if (!accessToken) {
          throw new Error("No valid access token available");
        }

        // Determine sync window
        const fromDate = connection.last_sync_at
          ? new Date(connection.last_sync_at).toISOString()
          : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(); // default: last 90 days
        const toDate = new Date().toISOString();

        // Fetch transactions
        const transactions = await fetchTransactions(accessToken, fromDate, toDate);
        console.log(`[revolut-sync] Fetched ${transactions.length} transactions for company ${connection.company_id}`);

        // Filter to completed transactions only
        const completed = transactions.filter(t => t.state === "completed");

        let imported = 0;
        let skipped = 0;
        const bankAccountId = connection.bank_account_id || connection.bank_accounts?.id;

        if (!bankAccountId) {
          throw new Error("No bank account linked to this connection");
        }

        // Batch insert with dedup
        for (const txn of completed) {
          // Check if already imported
          const { data: existing } = await supabase
            .from("bank_transactions")
            .select("id")
            .eq("external_id", txn.id)
            .maybeSingle();

          if (existing) {
            skipped++;
            continue;
          }

          const row = mapTransaction(txn, bankAccountId, connection.company_id);
          const { error: insertErr } = await supabase
            .from("bank_transactions")
            .insert(row);

          if (insertErr) {
            if (insertErr.code === "23505") {
              // Unique violation — already exists
              skipped++;
            } else {
              console.error(`[revolut-sync] Insert error for txn ${txn.id}: ${insertErr.message}`);
            }
          } else {
            imported++;
          }
        }

        // Update sync state
        await supabase
          .from("bank_connections")
          .update({
            last_sync_at: toDate,
            last_sync_status: "success",
            last_sync_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        console.log(`[revolut-sync] Company ${connection.company_id}: imported=${imported}, skipped=${skipped}`);

        results.push({
          company_id: connection.company_id,
          status: "success",
          transactions_imported: imported,
          transactions_skipped: skipped,
        });

        // Optionally trigger auto-match
        if (imported > 0) {
          try {
            await supabase.rpc("auto_match_bank_transactions", {
              p_bank_account_id: bankAccountId,
              p_company_id: connection.company_id,
            });
            console.log(`[revolut-sync] Auto-match triggered for company ${connection.company_id}`);
          } catch (e) {
            console.warn("[revolut-sync] Auto-match failed (non-critical):", e);
          }
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        console.error(`[revolut-sync] Error for company ${connection.company_id}: ${errorMsg}`);

        // Update sync state with error
        await supabase
          .from("bank_connections")
          .update({
            last_sync_status: "error",
            last_sync_error: errorMsg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        results.push({
          company_id: connection.company_id,
          status: "error",
          transactions_imported: 0,
          transactions_skipped: 0,
          error: errorMsg,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        connections_processed: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[revolut-sync] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
