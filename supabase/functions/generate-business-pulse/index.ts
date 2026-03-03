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
      .eq("status", "sent")
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
        action_url: `/finance?invoice=${inv.id}`,
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
        action_url: `/crm?prospect=${deal.id}`,
        related_entity_ids: [deal.id],
      });
    }

    // --- MODULE 3: PRODUCTS (low stock alerts) ---
    const { data: lowStock } = await supabase
      .from("products")
      .select("id, name, status")
      .eq("company_id", company_id)
      .eq("status", "published")
      .limit(5);

    // Note: stock data may be in inventory_items or product variants
    // We check products that are published but might have stock issues

    // --- MODULE 4: TASKS (overdue tasks) ---
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id, title, due_date, priority, assignee_id")
      .eq("company_id", company_id)
      .eq("status", "active")
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
            action_url: `/crm?prospect=${deal.id}`,
            related_entity_ids: [deal.id],
          });
        }
      }
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
