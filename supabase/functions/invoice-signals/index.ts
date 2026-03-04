import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SignalLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  product_id?: string;
}

interface InvoiceSignal {
  type: "accepted_proposal" | "delivered_order" | "recurring_due" | "won_deal";
  source_id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string | null;
  title: string;
  description: string;
  line_items: SignalLineItem[];
  total: number;
  currency: string;
  confidence: "high" | "medium";
  source_date: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { company_id, contact_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signals: InvoiceSignal[] = [];

    // ================================================================
    // SIGNAL 1: Accepted proposals not yet converted to invoices
    // ================================================================
    {
      let query = supabase
        .from("proposals")
        .select("id, prospect_id, title, line_items, subtotal, tax_amount, total, currency, client_name, client_email, signed_at, updated_at")
        .eq("company_id", company_id)
        .eq("status", "accepted")
        .is("converted_to_invoice_id", null)
        .order("signed_at", { ascending: false, nullsFirst: false });

      if (contact_id) {
        query = query.eq("prospect_id", contact_id);
      }

      const { data: proposals } = await query;

      if (proposals?.length) {
        for (const p of proposals) {
          const items: SignalLineItem[] = [];
          const rawItems = p.line_items || [];
          for (const li of rawItems) {
            items.push({
              description: li.description || "Item",
              quantity: Number(li.quantity) || 1,
              unit_price: Number(li.unit_price) || 0,
              product_id: li.product_id || undefined,
            });
          }

          signals.push({
            type: "accepted_proposal",
            source_id: p.id,
            contact_id: p.prospect_id || "",
            contact_name: p.client_name || "Unknown",
            contact_email: p.client_email || null,
            title: `Proposal "${p.title || "Untitled"}" accepted`,
            description: `Accepted proposal with ${items.length} item${items.length !== 1 ? "s" : ""} — ready to invoice`,
            line_items: items,
            total: Number(p.total) || 0,
            currency: p.currency || "EUR",
            confidence: "high",
            source_date: p.signed_at || p.updated_at || new Date().toISOString(),
          });
        }
      }
    }

    // ================================================================
    // SIGNAL 2: Delivered orders not yet invoiced
    // ================================================================
    {
      let query = supabase
        .from("sales_orders")
        .select(`
          id, customer_id, order_number, total, currency, delivered_at,
          shipping_name, payment_status,
          sales_order_items (id, description, sku, quantity, unit_price, line_total, product_id)
        `)
        .eq("company_id", company_id)
        .eq("status", "delivered")
        .is("invoice_id", null)
        .in("payment_status", ["pending", "partial"])
        .order("delivered_at", { ascending: false, nullsFirst: false });

      // sales_orders uses customer_id not prospect_id — skip contact filter for now
      const { data: orders } = await query;

      if (orders?.length) {
        for (const o of orders) {
          const items: SignalLineItem[] = [];
          const orderItems = o.sales_order_items || [];
          for (const oi of orderItems) {
            items.push({
              description: oi.description || oi.sku || "Item",
              quantity: Number(oi.quantity) || 1,
              unit_price: Number(oi.unit_price) || 0,
              product_id: oi.product_id || undefined,
            });
          }

          signals.push({
            type: "delivered_order",
            source_id: o.id,
            contact_id: o.customer_id || "",
            contact_name: o.shipping_name || "Customer",
            contact_email: null,
            title: `Order #${o.order_number || "?"} delivered — awaiting invoice`,
            description: `Delivered order with ${items.length} item${items.length !== 1 ? "s" : ""}, payment ${o.payment_status}`,
            line_items: items,
            total: Number(o.total) || 0,
            currency: o.currency || "EUR",
            confidence: "high",
            source_date: o.delivered_at || new Date().toISOString(),
          });
        }
      }
    }

    // ================================================================
    // SIGNAL 3: Recurring invoices due within 7 days
    // ================================================================
    {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const cutoff = sevenDaysFromNow.toISOString().split("T")[0];

      let query = supabase
        .from("recurring_invoices")
        .select("id, contact_id, client_name, client_email, description, items, frequency, next_generate_date, tax_rate")
        .eq("company_id", company_id)
        .eq("is_active", true)
        .lte("next_generate_date", cutoff)
        .order("next_generate_date", { ascending: true });

      if (contact_id) {
        query = query.eq("contact_id", contact_id);
      }

      const { data: recurring } = await query;

      if (recurring?.length) {
        for (const r of recurring) {
          const items: SignalLineItem[] = [];
          const rawItems = r.items || [];
          let subtotal = 0;
          for (const ri of rawItems) {
            const qty = Number(ri.quantity) || 1;
            const price = Number(ri.unit_price) || 0;
            items.push({
              description: ri.description || "Recurring item",
              quantity: qty,
              unit_price: price,
            });
            subtotal += qty * price;
          }

          const taxRate = Number(r.tax_rate) || 21;
          const total = subtotal * (1 + taxRate / 100);

          signals.push({
            type: "recurring_due",
            source_id: r.id,
            contact_id: r.contact_id || "",
            contact_name: r.client_name || "Unknown",
            contact_email: r.client_email || null,
            title: `${r.frequency} invoice due ${r.next_generate_date}`,
            description: r.description || `Recurring ${r.frequency} invoice with ${items.length} item${items.length !== 1 ? "s" : ""}`,
            line_items: items,
            total: Math.round(total * 100) / 100,
            currency: "EUR",
            confidence: "high",
            source_date: r.next_generate_date,
          });
        }
      }
    }

    // ================================================================
    // SIGNAL 4: Won deals without recent invoice
    // ================================================================
    {
      let query = supabase
        .from("prospects")
        .select("id, first_name, last_name, email, company, deal_value, pipeline_stage, updated_at")
        .eq("company_id", company_id)
        .eq("pipeline_stage", "won")
        .order("updated_at", { ascending: false });

      if (contact_id) {
        query = query.eq("id", contact_id);
      }

      const { data: wonDeals } = await query;

      if (wonDeals?.length) {
        // Check which won deals already have a recent invoice (last 30 days)
        const wonIds = wonDeals.map((d) => d.id);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentInvoices } = await supabase
          .from("invoices")
          .select("contact_id")
          .eq("company_id", company_id)
          .in("contact_id", wonIds)
          .gte("created_at", thirtyDaysAgo.toISOString());

        const invoicedContactIds = new Set(
          (recentInvoices || []).map((inv) => inv.contact_id)
        );

        for (const deal of wonDeals) {
          if (invoicedContactIds.has(deal.id)) continue;

          const name = [deal.first_name, deal.last_name]
            .filter(Boolean)
            .join(" ") || "Unknown";

          signals.push({
            type: "won_deal",
            source_id: deal.id,
            contact_id: deal.id,
            contact_name: name,
            contact_email: deal.email || null,
            title: `Deal won with ${name}${deal.company ? ` (${deal.company})` : ""} — no invoice yet`,
            description: deal.deal_value
              ? `Won deal valued at €${Number(deal.deal_value).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`
              : "Won deal — create an invoice to finalize",
            line_items: [], // No pre-defined items for won deals
            total: Number(deal.deal_value) || 0,
            currency: "EUR",
            confidence: "medium",
            source_date: deal.updated_at || new Date().toISOString(),
          });
        }
      }
    }

    // --- SUGGEST ACTIONS: Push high-confidence signals to desktop notch ---
    // Extract user_id from auth header for suggest-action calls
    const authHeader = req.headers.get("authorization") || "";
    // Resolve user_id from the JWT if available
    let signalUserId: string | null = null;
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        signalUserId = user?.id || null;
      } catch { /* non-fatal */ }
    }

    if (signalUserId && signals.length > 0) {
      const suggestUrl = `${supabaseUrl}/functions/v1/suggest-action`;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const SIGNAL_EVENT_MAP: Record<string, string> = {
        accepted_proposal: "proposal_accepted",
        delivered_order: "delivered_order",
        recurring_due: "recurring_invoice_due",
        won_deal: "deal_won",
      };

      // Only suggest top 3 highest-value signals
      const topSignals = [...signals]
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      for (const sig of topSignals) {
        try {
          await fetch(suggestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${anonKey}` },
            body: JSON.stringify({
              user_id: signalUserId,
              company_id,
              source: "invoice_signal",
              event_type: SIGNAL_EVENT_MAP[sig.type] || sig.type,
              event_data: {
                title: sig.title,
                details: sig.description,
                entity_id: sig.source_id,
                entity_type: sig.type.includes("invoice") || sig.type.includes("proposal") ? "invoice" : "deal",
              },
            }),
          });
        } catch (err) {
          console.warn("[invoice-signals] suggest-action call failed:", err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        signals,
        count: signals.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("invoice-signals error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
