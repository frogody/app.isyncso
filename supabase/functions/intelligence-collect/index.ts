/**
 * Intelligence Collect — Hourly Context Snapshot Builder
 *
 * Builds a rich ~8K token context snapshot across 10 business domains.
 * Runs hourly during business hours (8 AM - 8 PM Mon-Fri).
 * Saves snapshot to intelligence_snapshots, then invokes intelligence-reason.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { userId, companyId, batch } = body;

    if (batch) {
      // Process all active users who've been active in last 24h
      const { data: activeUsers } = await supabase
        .from('desktop_activity_logs')
        .select('user_id, company_id')
        .gte('hour_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(100);

      const uniqueUsers = new Map<string, string>();
      for (const u of activeUsers || []) {
        if (u.user_id && u.company_id) uniqueUsers.set(u.user_id, u.company_id);
      }

      const results = [];
      for (const [uid, cid] of uniqueUsers) {
        try {
          const snapshot = await collectIntelligence(supabase, uid, cid);
          results.push({ userId: uid, success: true, domains: Object.keys(snapshot) });
        } catch (err) {
          results.push({ userId: uid, success: false, error: (err as Error).message });
        }
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!userId || !companyId) {
      return new Response(JSON.stringify({ error: 'userId and companyId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();
    const snapshot = await collectIntelligence(supabase, userId, companyId);

    // Save snapshot
    const { data: saved, error: saveErr } = await supabase
      .from('intelligence_snapshots')
      .insert({
        user_id: userId,
        company_id: companyId,
        snapshot,
        run_duration_ms: Date.now() - startTime,
      })
      .select('id')
      .single();

    if (saveErr) {
      console.error('[intelligence-collect] Save error:', saveErr.message);
    }

    // Invoke intelligence-reason asynchronously
    if (saved?.id) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/intelligence-reason`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snapshotId: saved.id,
            userId,
            companyId,
          }),
        });
      } catch (reasonErr) {
        console.warn('[intelligence-collect] Failed to invoke intelligence-reason:', (reasonErr as Error).message);
      }
    }

    return new Response(JSON.stringify({
      snapshotId: saved?.id,
      domains: Object.keys(snapshot),
      durationMs: Date.now() - startTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[intelligence-collect] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Main collection function ──────────────────────────────────────

async function collectIntelligence(
  supabase: any,
  userId: string,
  companyId: string
): Promise<Record<string, any>> {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run all 10 domain queries in parallel
  const results = await Promise.allSettled([
    collectFinancial(supabase, userId, companyId, thirtyDaysAgo),
    collectCRM(supabase, userId, companyId, fortyEightHoursAgo, sevenDaysAgo),
    collectProducts(supabase, companyId),
    collectTasks(supabase, userId, companyId, fortyEightHoursAgo),
    collectPeople(supabase, companyId),
    collectUserProfile(supabase, userId),
    collectRecentActivity(supabase, userId, fourHoursAgo, sevenDaysAgo),
    collectTemporalContext(supabase, userId, companyId),
    collectCommunication(supabase, userId, companyId),
    collectExternalContext(supabase, userId, twentyFourHoursAgo),
  ]);

  const domainNames = [
    'financial', 'crm', 'products', 'tasks', 'people',
    'user_profile', 'recent_activity', 'temporal', 'communication', 'external'
  ];

  const snapshot: Record<string, any> = {};
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value) {
      snapshot[domainNames[i]] = result.value;
    } else if (result.status === 'rejected') {
      console.warn(`[intelligence-collect] ${domainNames[i]} failed:`, result.reason?.message);
    }
  }

  return snapshot;
}

// ── Domain collectors ──────────────────────────────────────────────

async function collectFinancial(supabase: any, userId: string, companyId: string, thirtyDaysAgo: string) {
  const [overdueInvoices, pendingRevenue, acceptedProposals, recurringInvoices] = await Promise.all([
    // Overdue invoices — top 10 by amount × days overdue
    // Only include invoices that were actually sent (not drafts)
    supabase
      .from('invoices')
      .select('id, invoice_number, client_name, total, status, due_date, created_at')
      .eq('company_id', companyId)
      .lt('due_date', new Date().toISOString().split('T')[0])
      .in('status', ['sent', 'overdue', 'pending', 'partial'])
      .order('total', { ascending: false })
      .limit(10),

    // Total pending revenue
    supabase
      .from('invoices')
      .select('total, status')
      .eq('company_id', companyId)
      .in('status', ['sent', 'overdue', 'pending']),

    // Accepted proposals not yet invoiced
    supabase
      .from('proposals')
      .select('id, title, client_name, total, valid_until, created_at')
      .eq('company_id', companyId)
      .eq('status', 'accepted')
      .limit(10),

    // Upcoming recurring invoices
    supabase
      .from('recurring_invoices')
      .select('id, client_name, next_generate_date')
      .eq('company_id', companyId)
      .not('next_generate_date', 'is', null)
      .order('next_generate_date', { ascending: true })
      .limit(5),
  ]);

  const overdue = (overdueInvoices.data || []).map((inv: any) => {
    const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / (24 * 60 * 60 * 1000));
    return {
      invoice: `#${inv.invoice_number}`,
      client: inv.client_name,
      amount: inv.total,
      days_overdue: daysOverdue,
      urgency: daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'high' : 'medium',
    };
  });

  const totalPending = (pendingRevenue.data || []).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

  return {
    overdue_invoices: overdue,
    total_overdue_amount: overdue.reduce((s: number, i: any) => s + i.amount, 0),
    total_pending_revenue: totalPending,
    accepted_proposals_not_invoiced: (acceptedProposals.data || []).map((p: any) => ({
      title: p.title,
      client: p.client_name,
      amount: p.total,
    })),
    upcoming_recurring: (recurringInvoices.data || []).map((r: any) => ({
      client: r.client_name,
      next_date: r.next_generate_date,
    })),
  };
}

async function collectCRM(supabase: any, userId: string, companyId: string, fortyEightHoursAgo: string, sevenDaysAgo: string) {
  const [staleDeals, closingSoon, recentActivity] = await Promise.all([
    // Stale deals — no activity in 7+ days, still open
    supabase
      .from('prospects')
      .select('id, first_name, last_name, company, deal_value, stage, next_follow_up, updated_date, email')
      .eq('organization_id', companyId)
      .not('stage', 'in', '("won","lost","disqualified")')
      .lt('updated_date', sevenDaysAgo)
      .order('deal_value', { ascending: false })
      .limit(10),

    // Deals closing within 14 days
    supabase
      .from('prospects')
      .select('id, first_name, last_name, company, deal_value, stage, next_follow_up')
      .eq('organization_id', companyId)
      .not('stage', 'in', '("won","lost","disqualified")')
      .not('next_follow_up', 'is', null)
      .lte('next_follow_up', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('next_follow_up', { ascending: true })
      .limit(10),

    // All CRM activity last 48h
    supabase
      .from('crm_activity_log')
      .select('id, prospect_id, activity_type, description, created_at')
      .eq('company_id', companyId)
      .gte('created_at', fortyEightHoursAgo)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    stale_deals: (staleDeals.data || []).map((d: any) => ({
      name: `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Unknown',
      company: d.company,
      deal_value: d.deal_value,
      stage: d.stage,
      days_silent: Math.floor((Date.now() - new Date(d.updated_date).getTime()) / (24 * 60 * 60 * 1000)),
      email: d.email,
    })),
    closing_soon: (closingSoon.data || []).map((d: any) => ({
      name: `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Unknown',
      company: d.company,
      deal_value: d.deal_value,
      stage: d.stage,
      days_until_followup: Math.floor((new Date(d.next_follow_up).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    })),
    recent_activity_count: (recentActivity.data || []).length,
  };
}

async function collectProducts(supabase: any, companyId: string) {
  const [lowStock, marginAlerts, pendingDeliveries] = await Promise.all([
    // Low stock items
    supabase
      .from('products')
      .select('id, name, quantity, min_stock_level')
      .eq('company_id', companyId)
      .not('min_stock_level', 'is', null)
      .lt('quantity', supabase.raw ? undefined : 100) // will filter client-side
      .limit(20),

    // Margin alerts
    supabase
      .from('margin_alerts')
      .select('product_id, product_name, current_margin, target_margin, alert_type, severity')
      .eq('company_id', companyId)
      .eq('is_resolved', false)
      .order('severity', { ascending: false })
      .limit(10),

    // Pending deliveries
    supabase
      .from('expected_deliveries')
      .select('id, product_id, quantity_expected, expected_date, status')
      .eq('company_id', companyId)
      .not('status', 'in', '("received","cancelled")')
      .order('expected_date', { ascending: true })
      .limit(10),
  ]);

  // Filter low stock client-side (quantity < min_stock_level)
  const lowStockItems = (lowStock.data || []).filter((p: any) =>
    p.min_stock_level && p.quantity < p.min_stock_level
  );

  return {
    low_stock: lowStockItems.map((p: any) => ({
      name: p.name,
      current: p.quantity,
      minimum: p.min_stock_level,
      deficit: p.min_stock_level - p.quantity,
    })),
    margin_alerts: (marginAlerts.data || []).map((a: any) => ({
      product: a.product_name,
      current_margin: a.current_margin,
      target: a.target_margin,
      severity: a.severity,
    })),
    pending_deliveries: (pendingDeliveries.data || []).length,
  };
}

async function collectTasks(supabase: any, userId: string, companyId: string, fortyEightHoursAgo: string) {
  const [overdueTasks, dueToday, recentCompleted] = await Promise.all([
    // All overdue tasks assigned to user
    supabase
      .from('tasks')
      .select('id, title, priority, due_date, status')
      .eq('assigned_to', userId)
      .lt('due_date', new Date().toISOString())
      .not('status', 'in', '("completed","cancelled","done")')
      .order('due_date', { ascending: true })
      .limit(10),

    // Due today or tomorrow
    supabase
      .from('tasks')
      .select('id, title, priority, due_date, status')
      .eq('assigned_to', userId)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .lte('due_date', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .not('status', 'in', '("completed","cancelled","done")')
      .order('due_date', { ascending: true })
      .limit(10),

    // Recently completed (last 48h for context)
    supabase
      .from('tasks')
      .select('id, title, priority')
      .eq('assigned_to', userId)
      .in('status', ['completed', 'done'])
      .gte('updated_at', fortyEightHoursAgo)
      .order('updated_at', { ascending: false })
      .limit(5),
  ]);

  return {
    overdue: (overdueTasks.data || []).map((t: any) => ({
      title: t.title,
      priority: t.priority,
      days_overdue: Math.floor((Date.now() - new Date(t.due_date).getTime()) / (24 * 60 * 60 * 1000)),
    })),
    due_soon: (dueToday.data || []).map((t: any) => ({
      title: t.title,
      priority: t.priority,
      due_date: t.due_date,
    })),
    recently_completed: (recentCompleted.data || []).map((t: any) => t.title),
  };
}

async function collectPeople(supabase: any, companyId: string) {
  // Contacts with declining engagement (no activity in 3+ weeks)
  const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  const { data: neglectedContacts } = await supabase
    .from('prospects')
    .select('id, first_name, last_name, company, deal_value, stage, updated_date')
    .eq('organization_id', companyId)
    .not('stage', 'in', '("won","lost","disqualified")')
    .lt('updated_date', threeWeeksAgo)
    .not('deal_value', 'is', null)
    .order('deal_value', { ascending: false })
    .limit(5);

  return {
    neglected_contacts: (neglectedContacts || []).map((c: any) => ({
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      company: c.company,
      deal_value: c.deal_value,
      days_since_contact: Math.floor((Date.now() - new Date(c.updated_date).getTime()) / (24 * 60 * 60 * 1000)),
    })),
  };
}

async function collectUserProfile(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('user_intelligence_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profile) return null;

  return {
    chronotype: profile.chronotype,
    primary_domain: profile.primary_domain,
    proactivity_preference: profile.proactivity_preference,
    suggestion_acceptance_rate: profile.suggestion_acceptance_rate,
    suggestion_capacity_per_day: profile.suggestion_capacity_per_day,
    preferred_suggestion_hours: profile.preferred_suggestion_hours,
    preferred_detail_level: profile.preferred_detail_level,
    formality_preference: profile.formality_preference,
    efficiency_gaps: profile.efficiency_gaps,
    work_style_tags: profile.work_style_tags,
    risk_tolerance: profile.risk_tolerance,
    avg_focus_score: profile.avg_focus_score,
    suggestion_cooldown_minutes: profile.suggestion_cooldown_minutes,
    suggestion_type_affinity: profile.suggestion_type_affinity,
  };
}

async function collectRecentActivity(supabase: any, userId: string, fourHoursAgo: string, sevenDaysAgo: string) {
  const [activityLogs4h, activityLogs7d, contextEvents, recentQueries, dismissed, accepted] = await Promise.all([
    // Desktop activity logs (last 4h) — what user is doing NOW
    supabase
      .from('desktop_activity_logs')
      .select('hour_start, app_breakdown, total_minutes, focus_score')
      .eq('user_id', userId)
      .gte('hour_start', fourHoursAgo)
      .order('hour_start', { ascending: false })
      .limit(4),

    // Desktop activity logs (last 7d) — behavioral patterns
    supabase
      .from('desktop_activity_logs')
      .select('hour_start, app_breakdown, total_minutes, focus_score')
      .eq('user_id', userId)
      .gte('hour_start', sevenDaysAgo)
      .order('hour_start', { ascending: false })
      .limit(168),

    // Desktop context events (last 24h) — semantic activity context
    supabase
      .from('desktop_context_events')
      .select('event_type, context_data, app_name, window_title, created_at')
      .eq('user_id', userId)
      .gte('created_at', fourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(30),

    // Last SYNC queries
    supabase
      .from('sync_sessions')
      .select('messages, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(3),

    // Dismissed suggestions (7d) — avoid re-suggesting
    supabase
      .from('pending_actions')
      .select('title, action_type, dedup_key, entity_id')
      .eq('user_id', userId)
      .eq('status', 'dismissed')
      .gte('created_at', sevenDaysAgo)
      .limit(20),

    // Accepted suggestions (7d) — learn from
    supabase
      .from('pending_actions')
      .select('title, action_type, dedup_key')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('created_at', sevenDaysAgo)
      .limit(10),
  ]);

  // ── 4-hour current activity ──
  const appTotals4h: Record<string, number> = {};
  let totalMinutes4h = 0;
  let avgFocus4h = 0;
  for (const log of activityLogs4h.data || []) {
    totalMinutes4h += log.total_minutes || 0;
    avgFocus4h += log.focus_score || 0;
    const apps = Array.isArray(log.app_breakdown)
      ? log.app_breakdown
      : Object.entries(log.app_breakdown || {}).map(([k, v]) => ({ appName: k, minutes: v }));
    for (const app of apps) {
      const name = (app as any).appName || (app as any).app_name || 'Unknown';
      appTotals4h[name] = (appTotals4h[name] || 0) + ((app as any).minutes || 0);
    }
  }
  avgFocus4h = (activityLogs4h.data || []).length > 0 ? avgFocus4h / (activityLogs4h.data || []).length : 0;

  // ── 7-day patterns ──
  const appTotals7d: Record<string, number> = {};
  let totalMinutes7d = 0;
  let totalFocusSum = 0;
  let focusCount = 0;
  const dailyMinutes: Record<string, number> = {};
  const hourlyFocus: Record<number, { total: number; count: number }> = {};

  for (const log of activityLogs7d.data || []) {
    totalMinutes7d += log.total_minutes || 0;
    if (log.focus_score != null) {
      totalFocusSum += log.focus_score;
      focusCount++;
    }

    // Track daily totals
    const day = log.hour_start?.split('T')[0];
    if (day) dailyMinutes[day] = (dailyMinutes[day] || 0) + (log.total_minutes || 0);

    // Track hourly focus patterns
    const hour = new Date(log.hour_start).getHours();
    if (!hourlyFocus[hour]) hourlyFocus[hour] = { total: 0, count: 0 };
    hourlyFocus[hour].total += log.focus_score || 0;
    hourlyFocus[hour].count++;

    const apps = Array.isArray(log.app_breakdown)
      ? log.app_breakdown
      : Object.entries(log.app_breakdown || {}).map(([k, v]) => ({ appName: k, minutes: v }));
    for (const app of apps) {
      const name = (app as any).appName || (app as any).app_name || 'Unknown';
      appTotals7d[name] = (appTotals7d[name] || 0) + ((app as any).minutes || 0);
    }
  }

  const avgFocus7d = focusCount > 0 ? totalFocusSum / focusCount : 0;
  const activeDays = Object.keys(dailyMinutes).length;
  const avgDailyMinutes = activeDays > 0 ? totalMinutes7d / activeDays : 0;

  // Peak focus hours
  const peakHours = Object.entries(hourlyFocus)
    .map(([h, v]) => ({ hour: Number(h), avgFocus: v.count > 0 ? v.total / v.count : 0 }))
    .sort((a, b) => b.avgFocus - a.avgFocus)
    .slice(0, 3)
    .map(h => `${h.hour}:00 (${Math.round(h.avgFocus * 100)}%)`);

  // Focus trend: compare last 2 days vs prior 5 days
  const sortedDays = Object.keys(dailyMinutes).sort();
  const recentDays = sortedDays.slice(-2);
  const priorDays = sortedDays.slice(0, -2);
  let focusTrend = 'stable';
  if (recentDays.length >= 1 && priorDays.length >= 2) {
    const recentAvg = avgFocus4h;
    if (recentAvg < avgFocus7d * 0.8) focusTrend = 'declining';
    else if (recentAvg > avgFocus7d * 1.15) focusTrend = 'improving';
  }

  // ── Context events — what the user is working on ──
  const contextSummary: string[] = [];
  const appContext: Record<string, string[]> = {};
  for (const evt of contextEvents.data || []) {
    const app = evt.app_name || 'Unknown';
    const title = evt.window_title || '';
    if (!appContext[app]) appContext[app] = [];
    if (title && appContext[app].length < 3) {
      appContext[app].push(title.substring(0, 80));
    }
  }
  for (const [app, titles] of Object.entries(appContext)) {
    contextSummary.push(`${app}: ${titles.join(' | ')}`);
  }

  // Extract recent user queries from sync sessions
  const recentUserQueries: string[] = [];
  for (const session of recentQueries.data || []) {
    const msgs = session.messages || [];
    for (const msg of msgs) {
      if (msg.role === 'user' && msg.content) {
        recentUserQueries.push(msg.content.substring(0, 100));
        if (recentUserQueries.length >= 10) break;
      }
    }
    if (recentUserQueries.length >= 10) break;
  }

  return {
    // Current session (4h)
    top_apps_4h: Object.entries(appTotals4h)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, mins]) => ({ app: name, minutes: Math.round(mins) })),
    total_active_minutes: Math.round(totalMinutes4h),
    focus_score: Math.round(avgFocus4h * 100) / 100,

    // 7-day patterns
    top_apps_7d: Object.entries(appTotals7d)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, mins]) => ({ app: name, minutes: Math.round(mins) })),
    total_active_minutes_7d: Math.round(totalMinutes7d),
    avg_daily_minutes_7d: Math.round(avgDailyMinutes),
    active_days_7d: activeDays,
    avg_focus_7d: Math.round(avgFocus7d * 100) / 100,
    focus_trend: focusTrend,
    peak_focus_hours: peakHours,

    // Desktop context — what user is currently working on
    current_work_context: contextSummary.slice(0, 8),

    // SYNC queries
    recent_sync_queries: recentUserQueries.slice(0, 5),

    // Suggestion history
    dismissed_suggestions_7d: (dismissed.data || []).map((d: any) => ({
      title: d.title,
      type: d.action_type,
      dedup_key: d.dedup_key,
      entity_id: d.entity_id,
    })),
    accepted_suggestions_7d: (accepted.data || []).map((a: any) => a.title),
  };
}

async function collectTemporalContext(supabase: any, userId: string, companyId: string) {
  const { data, error } = await supabase
    .rpc('assemble_temporal_context', { p_user_id: userId, p_company_id: companyId });

  if (error) {
    console.warn('[intelligence-collect] temporal context RPC error:', error.message);
    return null;
  }

  return typeof data === 'string' ? JSON.parse(data) : data;
}

async function collectCommunication(supabase: any, userId: string, companyId: string) {
  // Unread messages / pending communications
  const { data: unread } = await supabase
    .from('messages')
    .select('id, content, sender_id, created_at')
    .eq('conversation_id', companyId) // simplified — may need refinement
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    unread_messages: (unread || []).length,
  };
}

async function collectExternalContext(supabase: any, userId: string, twentyFourHoursAgo: string) {
  // Recent webhook events (Composio integrations)
  const { data: webhookEvents } = await supabase
    .from('composio_webhook_events')
    .select('trigger_slug, payload, created_at')
    .eq('user_id', userId)
    .gte('created_at', twentyFourHoursAgo)
    .eq('processed', true)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    recent_webhook_events: (webhookEvents || []).map((e: any) => ({
      trigger: e.trigger_slug,
      time: e.created_at,
    })),
  };
}
