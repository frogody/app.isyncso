import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, company_id } = await req.json();
    if (!user_id || !company_id) {
      return new Response(JSON.stringify({ error: "user_id and company_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const today = new Date().toISOString().split("T")[0];
    const items: any[] = [];

    // --- MODULE 1: FINANCE (overdue invoices, large pending) ---
    const { data: overdueInvoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, client_name, total, due_date, status")
      .eq("company_id", company_id)
      .in("status", ["sent", "pending", "draft"])
      .lt("due_date", today)
      .order("total", { ascending: false })
      .limit(5);

    for (const inv of overdueInvoices || []) {
      const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
      items.push({
        user_id, company_id, pulse_date: today,
        item_type: "overdue_invoice",
        title: `Invoice #${inv.invoice_number} is ${daysOverdue} days overdue`,
        description: `${inv.client_name} owes €${inv.total}. This invoice was due on ${inv.due_date}. Consider sending a payment reminder.`,
        urgency: Math.min(10, 5 + Math.floor(daysOverdue / 7)),
        impact: inv.total > 1000 ? 8 : inv.total > 500 ? 6 : 4,
        source_modules: ["finance", "crm"],
        action_label: "Send Reminder",
        action_url: `/financeinvoices?id=${inv.id}`,
        related_entity_ids: [inv.id],
      });
    }

    // --- MODULE 2: CRM (deals at risk - no activity in 7+ days) ---
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: companyRow } = await supabase
      .from("companies")
      .select("organization_id")
      .eq("id", company_id)
      .single();

    const orgId = companyRow?.organization_id;

    let staleDeals: any[] | null = null;
    if (orgId) {
      const { data } = await supabase
        .from("prospects")
        .select("id, first_name, last_name, company, deal_value, stage, updated_date")
        .eq("organization_id", orgId)
        .in("stage", ["qualified", "proposal", "negotiation"])
        .lt("updated_date", sevenDaysAgo)
        .order("deal_value", { ascending: false })
        .limit(5);
      staleDeals = data;
    }

    for (const deal of staleDeals || []) {
      const daysSilent = Math.floor((Date.now() - new Date(deal.updated_date).getTime()) / 86400000);
      items.push({
        user_id, company_id, pulse_date: today,
        item_type: "stale_deal",
        title: `${deal.first_name} ${deal.last_name} (${deal.company || 'unknown'}) - no activity in ${daysSilent} days`,
        description: `Deal worth €${deal.deal_value || 0} in "${deal.stage}" stage hasn't been touched. Risk of losing this opportunity.`,
        urgency: Math.min(10, 4 + Math.floor(daysSilent / 3)),
        impact: (deal.deal_value || 0) > 5000 ? 9 : (deal.deal_value || 0) > 1000 ? 7 : 5,
        source_modules: ["crm", "finance"],
        action_label: "Follow Up",
        action_url: `/crmcontactprofile?id=${deal.id}`,
        related_entity_ids: [deal.id],
      });
    }

    // --- MODULE 3: PRODUCTS (low stock alerts from inventory) ---
    const { data: inventoryItems } = await supabase
      .from("inventory")
      .select("product_id, quantity_on_hand, reorder_point, products!inner(name)")
      .eq("company_id", company_id)
      .limit(50);

    for (const inv of inventoryItems || []) {
      const qty = inv.quantity_on_hand ?? 0;
      const reorder = inv.reorder_point ?? 10;
      if (qty <= reorder) {
        const productName = (inv as any).products?.name || "Unknown Product";
        items.push({
          user_id, company_id, pulse_date: today,
          item_type: "low_stock",
          title: `${productName} is running low (${qty} left)`,
          description: `Stock is at or below the reorder point of ${reorder}. Consider placing a new purchase order.`,
          urgency: qty === 0 ? 10 : qty <= reorder / 2 ? 8 : 6,
          impact: 7,
          source_modules: ["products", "finance"],
          action_label: "Reorder",
          action_url: `/productdetail?id=${inv.product_id}`,
          related_entity_ids: [inv.product_id],
        });
      }
    }

    // --- MODULE 4: TASKS (overdue tasks) ---
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id, title, due_date, priority, assignee_id")
      .eq("company_id", company_id)
      .in("status", ["active", "pending", "todo", "in_progress"])
      .lt("due_date", today)
      .order("priority", { ascending: false })
      .limit(5);

    for (const task of overdueTasks || []) {
      const daysOverdue = Math.floor((Date.now() - new Date(task.due_date).getTime()) / 86400000);
      items.push({
        user_id, company_id, pulse_date: today,
        item_type: "overdue_task",
        title: `Task "${task.title}" is ${daysOverdue} days overdue`,
        description: `This ${task.priority || 'normal'} priority task needs attention.`,
        urgency: Math.min(10, 5 + daysOverdue),
        impact: task.priority === "high" ? 7 : task.priority === "urgent" ? 9 : 5,
        source_modules: ["tasks", "team"],
        action_label: "View Task",
        action_url: `/tasks?id=${task.id}`,
        related_entity_ids: [task.id],
      });
    }

    // --- MODULE 5: Cross-module: Invoice + CRM correlation ---
    // Find clients with overdue invoices who also have active deals
    const overdueClientNames = (overdueInvoices || []).map(i => i.client_name?.toLowerCase()).filter(Boolean);
    if (overdueClientNames.length > 0 && staleDeals?.length) {
      for (const deal of staleDeals) {
        const fullName = `${deal.first_name} ${deal.last_name}`.toLowerCase();
        const companyName = (deal.company || '').toLowerCase();
        if (overdueClientNames.some(n => n?.includes(fullName) || n?.includes(companyName) || fullName.includes(n || '') || companyName.includes(n || ''))) {
          items.push({
            user_id, company_id, pulse_date: today,
            item_type: "payment_risk_deal",
            title: `${deal.first_name} ${deal.last_name} has both overdue payment AND stale deal`,
            description: `This client has unpaid invoices and an inactive deal in "${deal.stage}". Address the payment issue before pursuing the new deal.`,
            urgency: 9,
            impact: 9,
            source_modules: ["finance", "crm"],
            action_label: "Review Client",
            action_url: `/crmcontactprofile?id=${deal.id}`,
            related_entity_ids: [deal.id],
          });
        }
      }
    }

    // --- MODULE 6: INVOICE OPPORTUNITIES (ready-to-invoice signals) ---

    // 6a: Accepted proposals not yet converted
    const { data: acceptedProposals } = await supabase
      .from("proposals")
      .select("id, title, client_name, prospect_id, total, currency, signed_at")
      .eq("company_id", company_id)
      .eq("status", "accepted")
      .is("converted_to_invoice_id", null)
      .order("signed_at", { ascending: false, nullsFirst: false })
      .limit(5);

    for (const p of acceptedProposals || []) {
      const daysSinceAccepted = p.signed_at
        ? Math.floor((Date.now() - new Date(p.signed_at).getTime()) / 86400000)
        : 0;
      items.push({
        user_id, company_id, pulse_date: today,
        item_type: "ready_to_invoice",
        title: `Proposal "${p.title || 'Untitled'}" accepted — ready to invoice`,
        description: `${p.client_name || 'Client'} accepted this proposal${daysSinceAccepted > 0 ? ` ${daysSinceAccepted} days ago` : ''}. Total: €${p.total || 0}. Create an invoice to finalize.`,
        urgency: daysSinceAccepted > 14 ? 8 : daysSinceAccepted > 7 ? 6 : 5,
        impact: (p.total || 0) > 1000 ? 8 : (p.total || 0) > 500 ? 6 : 4,
        source_modules: ["finance", "crm"],
        action_label: "Create Invoice",
        action_url: `/financeinvoices`,
        related_entity_ids: [p.id, p.prospect_id].filter(Boolean),
      });
    }

    // 6b: Delivered orders not yet invoiced
    const { data: deliveredOrders } = await supabase
      .from("sales_orders")
      .select("id, order_number, shipping_name, total, currency, delivered_at, payment_status")
      .eq("company_id", company_id)
      .eq("status", "delivered")
      .is("invoice_id", null)
      .in("payment_status", ["pending", "partial"])
      .order("delivered_at", { ascending: false, nullsFirst: false })
      .limit(5);

    for (const o of deliveredOrders || []) {
      const daysSinceDelivery = o.delivered_at
        ? Math.floor((Date.now() - new Date(o.delivered_at).getTime()) / 86400000)
        : 0;
      items.push({
        user_id, company_id, pulse_date: today,
        item_type: "ready_to_invoice",
        title: `Order #${o.order_number || '?'} delivered — awaiting invoice`,
        description: `Delivered to ${o.shipping_name || 'customer'}${daysSinceDelivery > 0 ? ` ${daysSinceDelivery} days ago` : ''}. Total: €${o.total || 0}. Payment: ${o.payment_status}.`,
        urgency: daysSinceDelivery > 14 ? 8 : daysSinceDelivery > 7 ? 6 : 5,
        impact: (o.total || 0) > 1000 ? 8 : (o.total || 0) > 500 ? 6 : 4,
        source_modules: ["finance", "products"],
        action_label: "Create Invoice",
        action_url: `/financeinvoices`,
        related_entity_ids: [o.id],
      });
    }

    // 6c: Recurring invoices due within 7 days
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const { data: recurringDue } = await supabase
      .from("recurring_invoices")
      .select("id, client_name, description, frequency, next_generate_date")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .lte("next_generate_date", sevenDaysFromNow)
      .order("next_generate_date", { ascending: true })
      .limit(5);

    for (const r of recurringDue || []) {
      const daysUntilDue = Math.floor((new Date(r.next_generate_date).getTime() - Date.now()) / 86400000);
      items.push({
        user_id, company_id, pulse_date: today,
        item_type: "ready_to_invoice",
        title: `${r.frequency} invoice for ${r.client_name || 'client'} due ${daysUntilDue <= 0 ? 'today' : `in ${daysUntilDue} days`}`,
        description: r.description || `Recurring ${r.frequency} invoice is coming due.`,
        urgency: daysUntilDue <= 0 ? 9 : daysUntilDue <= 3 ? 7 : 5,
        impact: 5,
        source_modules: ["finance"],
        action_label: "Create Invoice",
        action_url: `/financeinvoices`,
        related_entity_ids: [r.id],
      });
    }

    // Sort by priority and take top 7
    items.sort((a, b) => (b.urgency * b.impact) - (a.urgency * a.impact));
    const topItems = items.slice(0, 7);

    // Upsert into database
    let inserted = 0;
    for (const item of topItems) {
      const { error } = await supabase
        .from("business_pulse_items")
        .upsert(item, { onConflict: "user_id,pulse_date,item_type,title" });
      if (!error) inserted++;
    }

    return new Response(
      JSON.stringify({ success: true, items_generated: inserted, total_candidates: items.length, items: topItems }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Business Pulse error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
