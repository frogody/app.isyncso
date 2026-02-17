/**
 * SYNC Voice API v5 — Fast voice + background actions + persistent memory
 *
 * Two-path architecture:
 * 1. FAST PATH (all messages): Direct LLM → TTS → respond in 2-4s
 * 2. ACTION PATH (when needed): /sync fires in background for real execution
 *
 * Every response feels instant. Actions execute asynchronously.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =============================================================================
// VOICE SYSTEM PROMPT
// =============================================================================

const VOICE_SYSTEM_PROMPT = `You are SYNC, a voice assistant for iSyncSO. You're in a real-time voice conversation.

RULES:
- Reply in 1-2 short sentences max. Think "phone call", not "email".
- Use contractions: I'm, you're, let's, that's, don't, won't.
- NO markdown, bullets, lists, bold, headers, or formatting of any kind.
- NO emojis or special characters.
- Be warm, natural, and conversational — like a smart colleague.
- If asked a greeting, just greet back naturally.
- Numbers spoken naturally: "about twelve hundred" not "1,247".
- Ask follow-up questions to keep the conversation flowing.

ACCURACY — THIS IS CRITICAL:
- NEVER invent or fabricate ANY data: no company names, emails, people, numbers, tasks, invoices, or activity data.
- ONLY reference information explicitly provided in this prompt under DESKTOP CONTEXT, LIVE DATA, or the conversation history.
- If a DESKTOP CONTEXT section is present, use it to answer questions about what the user is doing, their focus, their apps, etc.
- If a LIVE DATA section is present, use ONLY that data to answer the user's question. Summarize it naturally.
- If no relevant data is provided and you don't know, say "I don't have that data right now" or "Let me check on that" — NEVER guess or make up numbers.

DESKTOP AWARENESS:
- You may receive real-time desktop context showing the user's current app, recent activity, focus score, and idle status.
- Use this naturally: "I can see you're in VS Code" or "Looks like you've been focused, your score is 85".
- Don't recite the raw data — summarize conversationally.

ACTIONS:
- You CAN perform business actions like sending emails, creating invoices, looking up data, managing tasks, and more.
- When the user asks you to do something, confirm briefly and naturally, like "Sure, I'll create that invoice for you now" or "Got it, looking that up".
- Keep the confirmation short — the action happens in the background.

EMAIL CONTEXT:
- Messages may start with [EMAIL_CONTEXT: thread_id=X message_id=X from=Y subject=Z] — this means the user is responding to a specific email notification.
- When the user says "reply" or "respond", use that context to send the reply. Confirm naturally: "Sure, I'll send that reply for you."
- Don't read out technical IDs or the context line — keep it natural.`;

// =============================================================================
// ACTION DETECTION — keyword-based, zero latency
// =============================================================================

const ACTION_VERBS = [
  'send', 'create', 'make', 'add', 'delete', 'remove', 'update', 'change',
  'look up', 'lookup', 'find', 'search', 'check', 'show me', 'list',
  'schedule', 'assign', 'complete', 'generate', 'set up', 'configure',
  'connect', 'move', 'mark', 'cancel', 'approve', 'reject', 'invite',
  'reply', 'respond', 'forward',
];

const ACTION_NOUNS = [
  'invoice', 'email', 'task', 'proposal', 'expense', 'product', 'team',
  'campaign', 'prospect', 'client', 'contact', 'message', 'meeting',
  'report', 'image', 'course', 'conversation', 'pipeline',
];

function isActionRequest(msg: string): boolean {
  const lower = msg.toLowerCase();
  const hasVerb = ACTION_VERBS.some(v => lower.includes(v));
  const hasNoun = ACTION_NOUNS.some(n => lower.includes(n));
  // Need both an action verb AND a business noun to trigger action path
  return hasVerb && hasNoun;
}

// =============================================================================
// SESSION MEMORY
// =============================================================================

const VOICE_SESSION_PREFIX = 'voice_';

async function getVoiceSession(userId: string): Promise<{
  sessionId: string;
  messages: Array<{ role: string; content: string }>;
  summary: string | null;
}> {
  const sessionId = `${VOICE_SESSION_PREFIX}${userId}`;

  const { data: existing } = await supabase
    .from('sync_sessions')
    .select('session_id, messages, conversation_summary')
    .eq('session_id', sessionId)
    .single();

  if (existing) {
    return {
      sessionId: existing.session_id,
      messages: existing.messages || [],
      summary: existing.conversation_summary,
    };
  }

  const { error } = await supabase
    .from('sync_sessions')
    .insert({
      session_id: sessionId,
      user_id: userId,
      messages: [],
      conversation_summary: null,
      active_entities: { clients: [], products: [], preferences: {}, current_intent: null },
      context: { type: 'voice' },
      last_agent: 'sync-voice',
      total_messages: 0,
    });

  if (error) console.error('[sync-voice] Session create error:', error.message);
  return { sessionId, messages: [], summary: null };
}

function saveToSession(sessionId: string, allMessages: Array<{ role: string; content: string }>) {
  const trimmed = allMessages.slice(-20);
  supabase
    .from('sync_sessions')
    .update({
      messages: trimmed,
      total_messages: trimmed.length,
      last_agent: 'sync-voice',
      last_activity: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .then(({ error }) => {
      if (error) console.error('[sync-voice] Session save error:', error.message);
    });
}

// =============================================================================
// DESKTOP CONTEXT — build prompt section from desktop app context
// =============================================================================

function buildDesktopContextPrompt(ctx: Record<string, any>): string {
  if (!ctx || typeof ctx !== 'object') return '';
  const parts: string[] = [];

  if (ctx.currentApp) parts.push(`Current app: ${ctx.currentApp}`);
  if (ctx.focusScore !== undefined) parts.push(`Focus score: ${ctx.focusScore}/100`);
  if (ctx.isIdle) parts.push(`Status: User is idle`);
  if (ctx.recentActivity) parts.push(`Recent activity: ${ctx.recentActivity}`);
  if (ctx.recentApps?.length) parts.push(`Recent apps: ${ctx.recentApps.slice(0, 5).join(', ')}`);

  if (parts.length === 0) return '';
  return `\n\nDESKTOP CONTEXT (live from user's computer):\n${parts.join('\n')}`;
}

// =============================================================================
// LIVE DATA QUERIES — fetch real data from Supabase for user questions
// Covers ALL modules: finance, products, CRM, tasks, activity, team, etc.
// =============================================================================

// Resolve companyId from users table if not provided in request
async function resolveCompanyId(userId: string, providedCompanyId?: string): Promise<string | null> {
  if (providedCompanyId) return providedCompanyId;
  try {
    const { data } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();
    return data?.company_id || null;
  } catch { return null; }
}

// Detect if the user is asking a question that requires real data
const DATA_QUERY_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  // Finance — invoices
  { pattern: /\b(invoice|invoices|billing|billed|outstanding|unpaid|overdue invoice|paid invoice|revenue)\b/i, type: 'invoices' },
  // Finance — proposals
  { pattern: /\b(proposal|proposals|quote|quotes|estimate|estimates)\b/i, type: 'proposals' },
  // Finance — expenses
  { pattern: /\b(expense|expenses|spending|spent|cost|costs)\b/i, type: 'expenses' },
  // Finance — summary
  { pattern: /\b(financial summary|financial overview|how much.*made|total revenue|net income|profit|financial|financials)\b/i, type: 'financial_summary' },
  // Products
  { pattern: /\b(product|products|inventory|stock|low stock|out of stock|catalog|sku)\b/i, type: 'products' },
  // CRM / Prospects / Pipeline
  { pattern: /\b(prospect|prospects|lead|leads|client|clients|pipeline|deal|deals|crm|contact|contacts|sales pipeline)\b/i, type: 'prospects' },
  // Tasks
  { pattern: /\b(my tasks?|to.?do|what.?s on my plate|what do i need to do|pending tasks?|overdue tasks?|assigned to me|task list)\b/i, type: 'tasks' },
  // Team
  { pattern: /\b(team|teams|team member|colleagues|who.?s on my team|employees|staff)\b/i, type: 'team' },
  // Campaigns (growth/marketing)
  { pattern: /\b(campaign|campaigns|outreach|marketing|email campaign)\b/i, type: 'campaigns' },
  // Productivity / desktop activity
  { pattern: /\b(how productive|my productivity|focus score|how focused|my focus|how.?s my day|what.?ve i been doing|what am i doing|what.?s my activity|my activity|how.?s my work|my work today)\b/i, type: 'activity' },
  // Daily summary / hours
  { pattern: /\b(how long|how many hours|time today|hours today|worked today|my hours|today.?s summary|daily summary|daily journal)\b/i, type: 'daily_summary' },
  // App usage
  { pattern: /\b(what apps?|which apps?|most used|app usage|screen time|time spent on|using today)\b/i, type: 'activity' },
  // Learning
  { pattern: /\b(course|courses|learning|training|enrolled|my progress|certification)\b/i, type: 'learning' },
  // AI Systems / Sentinel
  { pattern: /\b(ai system|ai systems|compliance|eu ai act|sentinel|risk level)\b/i, type: 'ai_systems' },
  // Conversations / inbox
  { pattern: /\b(unread|messages|inbox|conversations|chat history)\b/i, type: 'inbox' },
];

function detectDataQueries(msg: string): string[] {
  const lower = msg.toLowerCase();
  const matches: string[] = [];
  for (const { pattern, type } of DATA_QUERY_PATTERNS) {
    if (pattern.test(lower) && !matches.includes(type)) {
      matches.push(type);
    }
  }
  return matches;
}

async function fetchLiveData(queryTypes: string[], userId: string, companyId: string | null): Promise<string> {
  const results: string[] = [];

  for (const queryType of queryTypes) {
    try {
      const data = await fetchSingleDataType(queryType, userId, companyId);
      if (data) results.push(data);
    } catch (err) {
      console.error(`[sync-voice] Data query error (${queryType}):`, err);
    }
  }

  return results.length > 0 ? results.join('\n\n') : '';
}

async function fetchSingleDataType(queryType: string, userId: string, companyId: string | null): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  // ── INVOICES ──────────────────────────────────────────────────
  if (queryType === 'invoices' && companyId) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_number, status, client_name, total, due_date, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!invoices?.length) return 'LIVE DATA (invoices): No invoices found.';

    const summary = invoices.map((i: any) =>
      `- #${i.invoice_number}: ${i.client_name || 'N/A'} — ${i.status} — $${i.total || 0}${i.due_date ? ` (due ${i.due_date})` : ''}`
    ).join('\n');

    const statusCounts: Record<string, number> = {};
    let totalValue = 0;
    for (const inv of invoices) {
      statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
      totalValue += (inv.total || 0);
    }
    const statusStr = Object.entries(statusCounts).map(([s, c]) => `${c} ${s}`).join(', ');

    return `LIVE DATA (recent invoices — ${invoices.length} shown):\nBreakdown: ${statusStr}\nTotal value: $${totalValue.toFixed(2)}\n${summary}`;
  }

  // ── PROPOSALS ─────────────────────────────────────────────────
  if (queryType === 'proposals' && companyId) {
    const { data: proposals } = await supabase
      .from('proposals')
      .select('proposal_number, title, status, client_name, total, valid_until, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!proposals?.length) return 'LIVE DATA (proposals): No proposals found.';

    const summary = proposals.map((p: any) =>
      `- #${p.proposal_number}: "${p.title || 'Untitled'}" for ${p.client_name || 'N/A'} — ${p.status} — $${p.total || 0}`
    ).join('\n');

    return `LIVE DATA (recent proposals — ${proposals.length} shown):\n${summary}`;
  }

  // ── EXPENSES ──────────────────────────────────────────────────
  if (queryType === 'expenses' && companyId) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('description, amount, category, vendor, date')
      .eq('company_id', companyId)
      .order('date', { ascending: false })
      .limit(10);

    if (!expenses?.length) return 'LIVE DATA (expenses): No expenses found.';

    let total = 0;
    const summary = expenses.map((e: any) => {
      total += (e.amount || 0);
      return `- $${e.amount || 0}: ${e.description || e.category || 'N/A'}${e.vendor ? ` (${e.vendor})` : ''} — ${e.date || 'no date'}`;
    }).join('\n');

    return `LIVE DATA (recent expenses — ${expenses.length} shown, total $${total.toFixed(2)}):\n${summary}`;
  }

  // ── FINANCIAL SUMMARY ─────────────────────────────────────────
  if (queryType === 'financial_summary' && companyId) {
    const [invoiceRes, expenseRes] = await Promise.all([
      supabase.from('invoices').select('status, total').eq('company_id', companyId),
      supabase.from('expenses').select('amount').eq('company_id', companyId),
    ]);

    const invoices = invoiceRes.data || [];
    const expenses = expenseRes.data || [];

    let revenue = 0, pending = 0, overdue = 0;
    for (const inv of invoices) {
      if (inv.status === 'paid') revenue += (inv.total || 0);
      else if (inv.status === 'sent' || inv.status === 'draft') pending += (inv.total || 0);
      else if (inv.status === 'overdue') overdue += (inv.total || 0);
    }
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const netIncome = revenue - totalExpenses;

    return `LIVE DATA (financial summary):\nRevenue (paid invoices): $${revenue.toFixed(2)}\nPending invoices: $${pending.toFixed(2)}\nOverdue invoices: $${overdue.toFixed(2)}\nTotal expenses: $${totalExpenses.toFixed(2)}\nNet income: $${netIncome.toFixed(2)}\nTotal invoices: ${invoices.length}, Total expenses: ${expenses.length}`;
  }

  // ── PRODUCTS ──────────────────────────────────────────────────
  if (queryType === 'products' && companyId) {
    const { data: products } = await supabase
      .from('products')
      .select('name, type, status, tags, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!products?.length) return 'LIVE DATA (products): No products found.';

    const summary = products.map((p: any) =>
      `- ${p.name} (${p.type || 'unknown'}) — ${p.status}${p.tags?.length ? ` [${p.tags.join(', ')}]` : ''}`
    ).join('\n');

    return `LIVE DATA (products — ${products.length} shown):\n${summary}`;
  }

  // ── PROSPECTS / CRM ───────────────────────────────────────────
  if (queryType === 'prospects') {
    const { data: prospects } = await supabase
      .from('prospects')
      .select('first_name, last_name, email, company, stage, deal_value, source, created_date')
      .order('created_date', { ascending: false })
      .limit(10);

    if (!prospects?.length) return 'LIVE DATA (CRM): No prospects found.';

    const summary = prospects.map((p: any) =>
      `- ${p.first_name || ''} ${p.last_name || ''} (${p.company || 'N/A'}) — ${p.stage || 'new'}${p.deal_value ? ` — $${p.deal_value}` : ''}`
    ).join('\n');

    // Pipeline stats
    const stageCounts: Record<string, number> = {};
    let totalDealValue = 0;
    for (const p of prospects) {
      stageCounts[p.stage || 'new'] = (stageCounts[p.stage || 'new'] || 0) + 1;
      totalDealValue += (p.deal_value || 0);
    }
    const stageStr = Object.entries(stageCounts).map(([s, c]) => `${c} ${s}`).join(', ');

    return `LIVE DATA (CRM prospects — ${prospects.length} shown):\nPipeline: ${stageStr}\nTotal deal value: $${totalDealValue.toFixed(2)}\n${summary}`;
  }

  // ── TASKS ─────────────────────────────────────────────────────
  if (queryType === 'tasks') {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, status, priority, due_date, assigned_to')
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .in('status', ['pending', 'in_progress', 'todo'])
      .order('due_date', { ascending: true })
      .limit(10);

    if (!tasks?.length) return 'LIVE DATA (tasks): No open tasks found.';

    const summary = tasks.map((t: any) => {
      const due = t.due_date ? ` (due ${t.due_date})` : '';
      const pri = t.priority ? ` [${t.priority}]` : '';
      return `- ${t.title}${pri}${due} — ${t.status}`;
    }).join('\n');

    return `LIVE DATA (your open tasks — ${tasks.length} shown):\n${summary}`;
  }

  // ── TEAM ──────────────────────────────────────────────────────
  if (queryType === 'team') {
    const { data: members } = await supabase
      .from('team_members')
      .select('team_id, role, user_id, teams(name)')
      .eq('user_id', userId);

    if (!members?.length) return 'LIVE DATA (team): You are not a member of any teams.';

    const teamIds = [...new Set(members.map((m: any) => m.team_id))];
    const { data: allMembers } = await supabase
      .from('team_members')
      .select('user_id, role, team_id, users(email, full_name)')
      .in('team_id', teamIds)
      .limit(20);

    const teamMap: Record<string, any[]> = {};
    for (const m of (allMembers || [])) {
      const teamName = members.find((tm: any) => tm.team_id === m.team_id)?.teams?.name || m.team_id;
      if (!teamMap[teamName]) teamMap[teamName] = [];
      teamMap[teamName].push(`${(m as any).users?.full_name || (m as any).users?.email || 'Unknown'} (${m.role})`);
    }

    const teamStr = Object.entries(teamMap).map(([name, mems]) =>
      `Team "${name}": ${mems.join(', ')}`
    ).join('\n');

    return `LIVE DATA (your teams):\n${teamStr}`;
  }

  // ── CAMPAIGNS ─────────────────────────────────────────────────
  if (queryType === 'campaigns') {
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('name, status, campaign_type, total_matched, total_contacted, total_responded, created_date')
      .order('created_date', { ascending: false })
      .limit(10);

    if (!campaigns?.length) return 'LIVE DATA (campaigns): No campaigns found.';

    const summary = campaigns.map((c: any) =>
      `- "${c.name}" (${c.campaign_type || 'email'}) — ${c.status}${c.total_matched ? ` — ${c.total_matched} matched, ${c.total_contacted || 0} contacted, ${c.total_responded || 0} responded` : ''}`
    ).join('\n');

    return `LIVE DATA (campaigns — ${campaigns.length} shown):\n${summary}`;
  }

  // ── DESKTOP ACTIVITY ──────────────────────────────────────────
  if (queryType === 'activity') {
    const { data: logs } = await supabase
      .from('desktop_activity_logs')
      .select('hour_start, app_breakdown, total_minutes, focus_score')
      .eq('user_id', userId)
      .gte('hour_start', `${today}T00:00:00`)
      .order('hour_start', { ascending: false })
      .limit(12);

    if (!logs?.length) return 'LIVE DATA (activity): No desktop activity logged for today yet.';

    const totalMinutes = logs.reduce((sum: number, l: any) => sum + (l.total_minutes || 0), 0);
    const avgFocus = Math.round(logs.reduce((sum: number, l: any) => sum + (l.focus_score || 0), 0) / logs.length);

    const appTotals: Record<string, number> = {};
    for (const log of logs) {
      const breakdown = log.app_breakdown || [];
      const items = Array.isArray(breakdown) ? breakdown : Object.entries(breakdown).map(([k, v]) => ({ appName: k, minutes: v }));
      for (const item of items) {
        const name = (item as any).appName || (item as any).app_name || 'Unknown';
        appTotals[name] = (appTotals[name] || 0) + ((item as any).minutes || 0);
      }
    }
    const topApps = Object.entries(appTotals)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([name, mins]) => `${name}: ${Math.round(mins as number)} min`)
      .join(', ');

    return `LIVE DATA (today's desktop activity):\nTotal active time: ${Math.round(totalMinutes)} minutes (${(totalMinutes / 60).toFixed(1)} hours)\nAverage focus score: ${avgFocus}/100\nHours logged: ${logs.length}\nTop apps: ${topApps}`;
  }

  // ── DAILY SUMMARY ─────────────────────────────────────────────
  if (queryType === 'daily_summary') {
    const { data: journal } = await supabase
      .from('daily_journals')
      .select('overview, highlights, focus_areas, journal_date')
      .eq('user_id', userId)
      .gte('journal_date', today)
      .order('journal_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (journal) {
      const highlights = Array.isArray(journal.highlights)
        ? journal.highlights.map((h: any) => typeof h === 'string' ? h : h.text || h.title || JSON.stringify(h)).join('; ')
        : '';
      return `LIVE DATA (today's journal):\nDate: ${journal.journal_date}\nOverview: ${journal.overview || 'No overview'}\nHighlights: ${highlights || 'None'}`;
    }

    const { data: logs } = await supabase
      .from('desktop_activity_logs')
      .select('total_minutes, focus_score')
      .eq('user_id', userId)
      .gte('hour_start', `${today}T00:00:00`);

    if (!logs?.length) return 'LIVE DATA (daily summary): No activity data for today yet.';

    const totalMins = logs.reduce((sum: number, l: any) => sum + (l.total_minutes || 0), 0);
    const avgFocus = Math.round(logs.reduce((sum: number, l: any) => sum + (l.focus_score || 0), 0) / logs.length);

    return `LIVE DATA (today's summary):\nTotal active time: ${Math.round(totalMins)} minutes (${(totalMins / 60).toFixed(1)} hours)\nAverage focus score: ${avgFocus}/100\nHours tracked: ${logs.length}`;
  }

  // ── LEARNING ──────────────────────────────────────────────────
  if (queryType === 'learning') {
    const { data: progress } = await supabase
      .from('user_progress')
      .select('course_id, progress_percent, status, courses(title, category, difficulty)')
      .eq('user_id', userId)
      .limit(10);

    if (!progress?.length) return 'LIVE DATA (learning): No enrolled courses found.';

    const summary = progress.map((p: any) =>
      `- "${(p as any).courses?.title || 'Unknown course'}" (${(p as any).courses?.category || 'N/A'}) — ${p.progress_percent || 0}% complete — ${p.status}`
    ).join('\n');

    return `LIVE DATA (your learning progress — ${progress.length} courses):\n${summary}`;
  }

  // ── AI SYSTEMS / SENTINEL ─────────────────────────────────────
  if (queryType === 'ai_systems' && companyId) {
    const { data: systems } = await supabase
      .from('ai_systems')
      .select('name, description, risk_level, type, vendor, created_date')
      .eq('company_id', companyId)
      .limit(10);

    if (!systems?.length) return 'LIVE DATA (AI compliance): No AI systems registered.';

    const summary = systems.map((s: any) =>
      `- "${s.name}" (${s.type || 'N/A'}) — Risk: ${s.risk_level || 'unclassified'}${s.vendor ? ` — Vendor: ${s.vendor}` : ''}`
    ).join('\n');

    return `LIVE DATA (AI systems — ${systems.length} registered):\n${summary}`;
  }

  // ── INBOX ─────────────────────────────────────────────────────
  if (queryType === 'inbox') {
    const { data: convos } = await supabase
      .from('chat_conversations')
      .select('title, status, created_date, updated_date')
      .eq('user_id', userId)
      .order('updated_date', { ascending: false })
      .limit(5);

    if (!convos?.length) return 'LIVE DATA (inbox): No conversations found.';

    const summary = convos.map((c: any) =>
      `- "${c.title || 'Untitled'}" — ${c.status || 'active'} (updated ${c.updated_date || c.created_date || 'unknown'})`
    ).join('\n');

    return `LIVE DATA (recent conversations — ${convos.length} shown):\n${summary}`;
  }

  return '';
}

// =============================================================================
// BACKGROUND ACTION — fire /sync and save result to session
// =============================================================================

async function fireBackgroundAction(
  message: string,
  userId: string,
  companyId: string | undefined,
  sessionId: string,
  sessionMessages: Array<{ role: string; content: string }>,
): Promise<void> {
  try {
    console.log(`[sync-voice] Background action: "${message.substring(0, 50)}..."`);
    const syncRes = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message,
        sessionId,
        voice: true,
        stream: false,
        context: { userId, companyId },
      }),
    });

    if (!syncRes.ok) {
      console.error(`[sync-voice] Background action failed: ${syncRes.status}`);
      return;
    }

    const syncData = await syncRes.json();
    const actionResult = syncData.response || syncData.text || '';
    console.log(`[sync-voice] Background action done: "${actionResult.substring(0, 80)}"`);

    // Save the action result to session so next voice turn has context
    if (actionResult) {
      const updatedMessages = [
        ...sessionMessages,
        { role: 'system', content: `[Action completed]: ${actionResult}` },
      ];
      saveToSession(sessionId, updatedMessages);
    }
  } catch (e) {
    console.error('[sync-voice] Background action error:', e);
  }
}

// =============================================================================
// DIRECT EMAIL REPLY — bypasses /sync LLM chain, calls Composio directly
// =============================================================================

const COMPOSIO_API_KEY = Deno.env.get("COMPOSIO_API_KEY");

function parseEmailContext(ctxString: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Parse: [EMAIL_CONTEXT: thread_id=abc message_id=xyz from=john@co.com subject=Urgent: Q4]
  const inner = ctxString.match(/\[EMAIL_CONTEXT:\s*([^\]]+)\]/)?.[1] || '';
  // Split on known keys to handle values with spaces
  const keys = ['thread_id', 'message_id', 'from', 'subject'];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const pattern = nextKey
      ? new RegExp(`${key}=(.+?)\\s+${nextKey}=`)
      : new RegExp(`${key}=(.+)$`);
    const match = inner.match(pattern);
    if (match) result[key] = match[1].trim();
  }
  return result;
}

async function fireEmailReply(
  emailCtxString: string,
  userMessage: string,
  userId: string,
  sessionId: string | undefined,
  sessionMessages: Array<{ role: string; content: string }>,
): Promise<{ success: boolean; detail: string }> {
  try {
    const ctx = parseEmailContext(emailCtxString);
    console.log(`[sync-voice] Email reply — parsed context:`, JSON.stringify(ctx));

      if (!ctx.thread_id && !ctx.message_id && !ctx.from) {
        console.error('[sync-voice] Email reply — no thread_id, message_id, or from. Cannot reply.');
        return { success: false, detail: `No context parsed from: ${emailCtxString.substring(0, 100)}` };
      }

      // 1. Look up user's Gmail connected account
      const { data: gmailConn } = await supabase
        .from('user_integrations')
        .select('composio_connected_account_id')
        .eq('user_id', userId)
        .eq('toolkit_slug', 'gmail')
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (!gmailConn?.composio_connected_account_id) {
        console.error('[sync-voice] Email reply — no active Gmail connection for user');
        return { success: false, detail: 'No active Gmail connection for user' };
      }

      // 2. Generate reply body from user's message using quick LLM call
      const replyPrompt = [
        { role: 'system', content: `You are writing a brief, professional email reply. The user told you what to say. Write ONLY the email body text — no subject line, no greeting like "Hi" unless the user specified one, no signature. Keep it natural and concise. Just the reply text.` },
        { role: 'user', content: `Original email from: ${ctx.from || 'someone'}\nSubject: ${ctx.subject || 'N/A'}\n\nThe user wants to reply with: "${userMessage}"\n\nWrite the email reply body:` },
      ];

      const llmRes = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
          messages: replyPrompt,
          temperature: 0.5,
          max_tokens: 200,
          stream: false,
        }),
      });

      let replyBody = userMessage; // fallback to raw user message
      if (llmRes.ok) {
        const llmData = await llmRes.json();
        const generated = llmData.choices?.[0]?.message?.content?.trim();
        if (generated) replyBody = generated;
      }

      console.log(`[sync-voice] Email reply body: "${replyBody.substring(0, 80)}..."`);

      // 3. Call Composio API directly to send the reply
      // Extract clean email from "Name <email>" format
      const fromEmail = ctx.from?.match(/<([^>]+)>/)?.[1] || ctx.from || '';

      // GMAIL_REPLY_TO_THREAD requires: thread_id, message_body, recipient_email
      const composioArgs: Record<string, unknown> = {
        message_body: replyBody,
        recipient_email: fromEmail,
        user_id: 'me',
      };
      if (ctx.thread_id) {
        composioArgs.thread_id = ctx.thread_id;
      } else {
        // No thread_id — fall back to GMAIL_SEND_EMAIL instead of reply
        console.log('[sync-voice] No thread_id — falling back to GMAIL_SEND_EMAIL');
      }

      const toolSlug = ctx.thread_id ? 'GMAIL_REPLY_TO_THREAD' : 'GMAIL_SEND_EMAIL';

      // For GMAIL_SEND_EMAIL, use different param names
      if (toolSlug === 'GMAIL_SEND_EMAIL') {
        delete composioArgs.message_body;
        // GMAIL_SEND_EMAIL uses: recipient_email, body, subject
        composioArgs.body = replyBody;
        composioArgs.subject = `Re: ${ctx.subject || ''}`;
      }

      console.log(`[sync-voice] Calling ${toolSlug} with args:`, JSON.stringify(composioArgs).substring(0, 200));

      const composioRes = await fetch(`${SUPABASE_URL}/functions/v1/composio-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'executeTool',
          toolSlug,
          connectedAccountId: gmailConn.composio_connected_account_id,
          arguments: composioArgs,
        }),
      });

      const composioData = await composioRes.json();
      const resultJson = JSON.stringify(composioData).substring(0, 300);
      console.log(`[sync-voice] Email reply Composio result:`, resultJson);

      // 4. Save result to session
      const sent = composioData.success !== false;
      if (sessionId) {
        const resultMsg = sent
          ? `[Action completed]: Email reply sent to ${ctx.from || 'recipient'}`
          : `[Action failed]: Could not send email reply — ${composioData.error || 'unknown error'}`;
        saveToSession(sessionId, [
          ...sessionMessages,
          { role: 'system', content: resultMsg },
        ]);
      }
      return { success: sent, detail: sent ? `Reply sent to ${fromEmail}` : `Composio error: ${resultJson}` };
  } catch (e) {
    console.error('[sync-voice] Email reply error:', e);
    return { success: false, detail: `Exception: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// =============================================================================
// TTS
// =============================================================================

const VALID_VOICES = ['tara', 'leah', 'jess', 'leo', 'dan', 'mia', 'zac', 'zoe'];
const DEFAULT_VOICE = 'tara';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function generateTTS(
  text: string,
  voice: string,
): Promise<{ audio: string; byteLength: number }> {
  const response = await fetch('https://api.together.ai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'canopylabs/orpheus-3b-0.1-ft',
      input: text,
      voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return { audio: arrayBufferToBase64(buffer), byteLength: buffer.byteLength };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      message,
      history = [],
      userId,
      companyId,
      voiceConfig,
      voice: requestedVoice,
      ttsOnly = false,
      ttsText,
      context: desktopContext,
      sessionId: clientSessionId,
    } = body;

    // TTS-only mode: just generate audio for given text (called as second request)
    if (ttsOnly && ttsText) {
      const voice = VALID_VOICES.includes(requestedVoice || voiceConfig?.voice)
        ? (requestedVoice || voiceConfig?.voice)
        : DEFAULT_VOICE;
      const ttsStart = Date.now();
      try {
        const ttsResult = await generateTTS(ttsText, voice);
        console.log(`[sync-voice] TTS-only: ${Date.now() - ttsStart}ms, ${ttsResult.byteLength} bytes`);
        return new Response(
          JSON.stringify({ audio: ttsResult.audio, audioFormat: 'mp3' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch (err) {
        console.error('[sync-voice] TTS-only failed:', err);
        return new Response(
          JSON.stringify({ audio: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const voice = VALID_VOICES.includes(requestedVoice || voiceConfig?.voice)
      ? (requestedVoice || voiceConfig?.voice)
      : DEFAULT_VOICE;

    const startTime = Date.now();

    // Extract [EMAIL_CONTEXT: ...] prefix if present — keep raw message for action, clean for LLM
    let emailContext = '';
    let cleanMessage = message;
    const emailCtxMatch = message.match(/^\[EMAIL_CONTEXT:\s*([^\]]+)\]\n?/);
    if (emailCtxMatch) {
      emailContext = emailCtxMatch[0]; // Full prefix including brackets
      cleanMessage = message.slice(emailCtxMatch[0].length).trim();
      console.log(`[sync-voice] Email context detected: ${emailCtxMatch[1].substring(0, 60)}`);
    }

    // When email context is present, be more lenient — any reply/send verb triggers action
    // (user doesn't need to say "reply to the email", just "reply" or "tell him" is enough)
    const EMAIL_REPLY_VERBS = ['reply', 'respond', 'send', 'tell him', 'tell her', 'tell them', 'forward', 'let him know', 'let her know', 'let them know', 'write back', 'get back to'];
    const hasEmailReplyIntent = emailContext && EMAIL_REPLY_VERBS.some(v => cleanMessage.toLowerCase().includes(v));
    const needsAction = isActionRequest(cleanMessage) || hasEmailReplyIntent;
    console.log(`[sync-voice] "${cleanMessage.substring(0, 50)}..." voice=${voice} action=${needsAction} userId=${userId?.substring(0, 8) || 'anon'}`);

    // Load session (fast — single row lookup by exact ID)
    let session: { sessionId: string; messages: Array<{ role: string; content: string }>; summary: string | null } | null = null;
    if (userId) {
      try {
        session = await getVoiceSession(userId);
      } catch (_) { /* non-critical */ }
    }

    // Build LLM messages: system + DB context + desktop context + live data + client history + current
    let systemPrompt = VOICE_SYSTEM_PROMPT;
    if (session?.summary) {
      systemPrompt += `\n\nPREVIOUS CONVERSATION SUMMARY:\n${session.summary}`;
    }
    // Inject desktop context from the desktop app
    if (desktopContext) {
      systemPrompt += buildDesktopContextPrompt(desktopContext);
      console.log(`[sync-voice] Desktop context injected: currentApp=${desktopContext.currentApp || 'none'} focus=${desktopContext.focusScore ?? '?'}`);
    }
    // Inject email context into system prompt so LLM knows about the email
    if (emailContext) {
      systemPrompt += `\n\nACTIVE EMAIL CONTEXT:\n${emailContext}The user is responding to this email. If they want to reply, confirm and compose the reply naturally.`;
    }

    // Detect data queries and fetch real data before LLM call
    const dataQueryTypes = detectDataQueries(cleanMessage);
    if (dataQueryTypes.length > 0 && userId) {
      const resolvedCompanyId = await resolveCompanyId(userId, companyId);
      const liveData = await fetchLiveData(dataQueryTypes, userId, resolvedCompanyId);
      if (liveData) {
        systemPrompt += `\n\n${liveData}`;
        console.log(`[sync-voice] Live data injected: types=[${dataQueryTypes.join(',')}] (${liveData.length} chars)`);
      }
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add persisted messages (last 6 from DB)
    if (session?.messages?.length) {
      for (const msg of session.messages.slice(-6)) {
        if (msg.role && msg.content) messages.push(msg);
      }
    }

    // Add client-side history
    for (const msg of history) {
      if (msg.role && msg.content) messages.push(msg);
    }

    // Use clean message for LLM (no [EMAIL_CONTEXT] prefix) — context is in system prompt
    messages.push({ role: 'user', content: cleanMessage });

    // Fast LLM call — always runs, gives instant conversational response
    const llmStart = Date.now();
    const llmResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages,
        temperature: 0.7,
        max_tokens: 100,
        stream: false,
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`LLM error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    let responseText = llmData.choices?.[0]?.message?.content || "Hey, I'm here!";
    const llmTime = Date.now() - llmStart;

    // Strip accidental markdown
    responseText = responseText
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    console.log(`[sync-voice] LLM: ${llmTime}ms — "${responseText.substring(0, 80)}" action=${needsAction}`);

    // Fire background action — MUST await before returning or Deno kills the isolate
    let actionPromise: Promise<void | { success: boolean; detail: string }> | null = null;
    let actionType = '';
    if (needsAction && userId && session) {
      const messagesForAction = [
        ...session.messages,
        { role: 'user', content: cleanMessage },
        { role: 'assistant', content: responseText },
      ];

      if (hasEmailReplyIntent && emailContext) {
        // DIRECT email reply — bypasses /sync LLM chain, calls Composio directly
        actionType = 'email_reply';
        actionPromise = fireEmailReply(emailContext, cleanMessage, userId, session.sessionId, messagesForAction);
      } else {
        // Standard background action via /sync
        actionType = 'background_action';
        const actionMessage = emailContext ? `${emailContext}${cleanMessage}` : cleanMessage;
        actionPromise = fireBackgroundAction(actionMessage, userId, companyId, session.sessionId, messagesForAction);
      }
    }

    // Save to session
    if (session) {
      const updatedMessages = [
        ...session.messages,
        { role: 'user', content: message },
        { role: 'assistant', content: responseText },
      ];
      saveToSession(session.sessionId, updatedMessages);
    }

    // Wait for action to complete before returning — Deno terminates isolate after response
    let actionResult: unknown = null;
    if (actionPromise) {
      console.log(`[sync-voice] Waiting for ${actionType} to complete...`);
      actionResult = await actionPromise;
      console.log(`[sync-voice] ${actionType} completed:`, JSON.stringify(actionResult));
    }

    const totalTime = Date.now() - startTime;
    console.log(`[sync-voice] Total: ${totalTime}ms (llm=${llmTime}ms)`);

    return new Response(
      JSON.stringify({
        text: responseText,
        response: responseText,
        mood: 'neutral',
        actionPending: needsAction,
        actionResult: actionResult || undefined,
        timing: { total: totalTime, llm: llmTime },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('[sync-voice] Error:', error);

    const errorText = "Sorry, something went wrong. Try that again?";
    let errorAudio = '';
    try {
      const tts = await generateTTS(errorText, DEFAULT_VOICE);
      errorAudio = tts.audio;
    } catch (_) { /* silent */ }

    return new Response(
      JSON.stringify({
        text: errorText,
        response: errorText,
        audio: errorAudio || undefined,
        audioFormat: errorAudio ? 'mp3' : undefined,
        mood: 'neutral',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
