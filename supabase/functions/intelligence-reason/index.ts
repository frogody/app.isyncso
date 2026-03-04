/**
 * Intelligence Reason — Two-Pass LLM Reasoning Engine
 *
 * Pass 1: Deep analysis — find correlations, risks, opportunities
 * Pass 2: Generate precise, actionable suggestions with full business context
 *
 * Invoked by intelligence-collect after snapshot is saved.
 * Outputs suggestions to suggest-action pipeline → pending_actions → desktop pill.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const MODEL = 'moonshotai/Kimi-K2-Instruct';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const togetherKey = Deno.env.get('TOGETHER_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { snapshotId, userId, companyId } = body;

    if (!snapshotId || !userId || !companyId) {
      return new Response(JSON.stringify({ error: 'snapshotId, userId, companyId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load snapshot
    const { data: snapshot, error: snapErr } = await supabase
      .from('intelligence_snapshots')
      .select('snapshot')
      .eq('id', snapshotId)
      .single();

    if (snapErr || !snapshot) {
      return new Response(JSON.stringify({ error: 'Snapshot not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();

    // ── Pass 1: Deep Analysis ─────────────────────────────────────
    const analysis = await runPass1Analysis(togetherKey, snapshot.snapshot);

    // Save analysis to snapshot
    await supabase
      .from('intelligence_snapshots')
      .update({ analysis })
      .eq('id', snapshotId);

    // ── Pass 2: Suggestion Generation ─────────────────────────────
    const userProfile = snapshot.snapshot.user_profile || {};
    const suggestions = await runPass2Suggestions(togetherKey, analysis, userProfile, snapshot.snapshot);

    if (!suggestions || suggestions.length === 0) {
      await supabase
        .from('intelligence_snapshots')
        .update({ suggestions_generated: 0 })
        .eq('id', snapshotId);

      return new Response(JSON.stringify({ suggestions: 0, durationMs: Date.now() - startTime }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Route suggestions through suggest-action ──────────────────
    let inserted = 0;
    for (const suggestion of suggestions) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/suggest-action`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            companyId,
            source: 'intelligence_engine',
            title: suggestion.title,
            subtitle: suggestion.subtitle,
            actionType: suggestion.action_type || 'task_create',
            actionPayload: suggestion.action_payload || {},
            importance: suggestion.importance || 7,
            urgency: suggestion.urgency || 5,
            entityId: suggestion.entity_id,
            entityType: suggestion.entity_type,
            reasoning: suggestion.reasoning,
            domains: suggestion.domains || [],
            dedupKey: suggestion.dedup_key,
            intelligenceSnapshotId: snapshotId,
          }),
        });

        if (res.ok) inserted++;
      } catch (sugErr) {
        console.warn('[intelligence-reason] suggest-action call failed:', (sugErr as Error).message);
      }
    }

    await supabase
      .from('intelligence_snapshots')
      .update({
        suggestions_generated: suggestions.length,
        run_duration_ms: Date.now() - startTime,
      })
      .eq('id', snapshotId);

    return new Response(JSON.stringify({
      suggestions_generated: suggestions.length,
      suggestions_inserted: inserted,
      durationMs: Date.now() - startTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[intelligence-reason] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Pass 1: Deep Analysis ──────────────────────────────────────────

async function runPass1Analysis(apiKey: string, snapshot: any): Promise<any> {
  const contextStr = JSON.stringify(snapshot, null, 1);

  const systemPrompt = `You are a business intelligence analyst. You have a snapshot of a user's business data.

ABSOLUTE RULE — ZERO FABRICATION:
You may ONLY reference names, amounts, dates, and entities that appear EXACTLY in the provided data. Do NOT invent client names, amounts, invoice numbers, deal names, or any other details. If a field is missing or null, do not guess a value. If the data is sparse, return fewer insights rather than fabricated ones.

Analyze the data for:
1. Cross-domain correlations between areas (e.g., overdue invoice from a client whose deal is also stale)
2. Hidden risks (deadline clusters, neglected contacts, cash flow gaps)
3. Timing opportunities based on calendar position
4. Relationship insights from interaction patterns
5. Workload awareness

ONLY reference entities and values that exist in the snapshot. Every client name, EUR amount, invoice number, and date you mention MUST come from the data below.

Output ONLY valid JSON:
{
  "correlations": [{ "domains": ["finance", "crm"], "entities": ["Client X"], "insight": "...", "financial_impact": 12000 }],
  "risks": [{ "description": "...", "severity": "high|medium|low", "deadline": "2026-03-10" }],
  "opportunities": [{ "description": "...", "value": "...", "time_sensitivity": "high|medium|low" }],
  "timing_factors": [{ "factor": "...", "relevance": "..." }],
  "workload_assessment": { "level": "overloaded|heavy|balanced|light", "bottlenecks": ["..."] }
}`;

  const response = await callLLM(apiKey, systemPrompt, `Business snapshot:\n${contextStr}`, 0.5, 3000);

  try {
    return JSON.parse(response);
  } catch {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        console.warn('[intelligence-reason] Pass 1 JSON parse failed');
        return { correlations: [], risks: [], opportunities: [], timing_factors: [], workload_assessment: { level: 'unknown', bottlenecks: [] } };
      }
    }
    return { correlations: [], risks: [], opportunities: [], timing_factors: [], workload_assessment: { level: 'unknown', bottlenecks: [] } };
  }
}

// ── Pass 2: Suggestion Generation ──────────────────────────────────

async function runPass2Suggestions(apiKey: string, analysis: any, profile: any, snapshot: any): Promise<any[]> {
  const dismissed = snapshot.recent_activity?.dismissed_suggestions_7d || [];
  const dismissedKeys = dismissed.map((d: any) => d.dedup_key).filter(Boolean);
  const dismissedEntityIds = dismissed.map((d: any) => d.entity_id).filter(Boolean);

  const systemPrompt = `You are a business action recommender. Generate 1-5 actionable suggestions based on the analysis and data.

ABSOLUTE RULE — ZERO FABRICATION:
Every client name, EUR amount, invoice number, deal name, date, and entity you reference MUST come EXACTLY from the business data provided. Do NOT invent or hallucinate any names, amounts, or details. If the data contains "Corinne Purnot", use exactly "Corinne Purnot" — do not change, abbreviate, or embellish names. If no good suggestions exist based on real data, return an empty array [].

RULES:
- Each suggestion MUST reference ONLY data present in the snapshot below
- Title max 60 chars
- Subtitle: 1-2 sentences with real data points only
- Include WHO, WHAT, HOW MUCH, WHEN — but ONLY if those values exist in the data
- Rank by combined value: financial impact × urgency
- If fewer than 3 good suggestions exist, return fewer. Quality > quantity.
- NEVER suggest things from this dismissed list: ${JSON.stringify(dismissedKeys)}
- NEVER suggest for these entity IDs (already dismissed): ${JSON.stringify(dismissedEntityIds)}
${profile.formality_preference === 'casual' ? '- Use casual, direct language' : '- Use professional language'}
${profile.preferred_detail_level === 'brief' ? '- Keep subtitles brief (1 sentence)' : '- Include full context in subtitles'}

Output ONLY a JSON array:
[{
  "title": "Short action title with real name/amount",
  "subtitle": "Context using only real data from the snapshot.",
  "reasoning": "Which data points support this suggestion.",
  "action_type": "task_create",
  "action_payload": { "params": { "title": "...", "description": "...", "priority": "high", "due_date": "YYYY-MM-DD" } },
  "importance": 1-10,
  "urgency": 1-10,
  "domains": ["finance", "crm"],
  "entity_id": "uuid-from-data-if-available",
  "entity_type": "invoice|deal|task|product",
  "dedup_key": "unique_key",
  "financial_impact": 0
}]`;

  const userMessage = `Analysis results:\n${JSON.stringify(analysis, null, 1)}\n\nBusiness snapshot summary:\n${summarizeSnapshot(snapshot)}`;

  const response = await callLLM(apiKey, systemPrompt, userMessage, 0.3, 2000);

  try {
    const parsed = JSON.parse(response);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        console.warn('[intelligence-reason] Pass 2 JSON parse failed');
        return [];
      }
    }
    return [];
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function summarizeSnapshot(snapshot: any): string {
  const parts: string[] = [];

  // Financial
  const fin = snapshot.financial;
  if (fin) {
    if (fin.overdue_invoices?.length > 0) {
      parts.push(`OVERDUE INVOICES (${fin.overdue_invoices.length}):`);
      for (const inv of fin.overdue_invoices.slice(0, 5)) {
        parts.push(`  - ${inv.client}: ${inv.invoice} EUR ${inv.amount} (${inv.days_overdue}d overdue, ${inv.urgency})`);
      }
      parts.push(`  Total overdue: EUR ${fin.total_overdue_amount}`);
    }
    if (fin.accepted_proposals_not_invoiced?.length > 0) {
      parts.push(`ACCEPTED PROPOSALS NOT INVOICED (${fin.accepted_proposals_not_invoiced.length}):`);
      for (const p of fin.accepted_proposals_not_invoiced) {
        parts.push(`  - ${p.client}: ${p.title} EUR ${p.amount}`);
      }
    }
  }

  // CRM
  const crm = snapshot.crm;
  if (crm) {
    if (crm.stale_deals?.length > 0) {
      parts.push(`STALE DEALS (${crm.stale_deals.length}):`);
      for (const d of crm.stale_deals.slice(0, 5)) {
        parts.push(`  - ${d.name} at ${d.company}: EUR ${d.deal_value || '?'}, stage ${d.stage}, ${d.days_silent}d silent`);
      }
    }
    if (crm.closing_soon?.length > 0) {
      parts.push(`DEALS CLOSING SOON (${crm.closing_soon.length}):`);
      for (const d of crm.closing_soon) {
        parts.push(`  - ${d.name} at ${d.company}: EUR ${d.deal_value || '?'}, ${d.days_until_followup}d until follow-up`);
      }
    }
  }

  // Tasks
  const tasks = snapshot.tasks;
  if (tasks) {
    if (tasks.overdue?.length > 0) {
      parts.push(`OVERDUE TASKS (${tasks.overdue.length}):`);
      for (const t of tasks.overdue) {
        parts.push(`  - ${t.title} (${t.priority}, ${t.days_overdue}d overdue)`);
      }
    }
    if (tasks.due_soon?.length > 0) {
      parts.push(`TASKS DUE SOON (${tasks.due_soon.length}):`);
      for (const t of tasks.due_soon) {
        parts.push(`  - ${t.title} (${t.priority})`);
      }
    }
  }

  // Products
  const prod = snapshot.products;
  if (prod) {
    if (prod.low_stock?.length > 0) {
      parts.push(`LOW STOCK (${prod.low_stock.length}):`);
      for (const p of prod.low_stock) {
        parts.push(`  - ${p.name}: ${p.current}/${p.minimum} (deficit: ${p.deficit})`);
      }
    }
    if (prod.margin_alerts?.length > 0) {
      parts.push(`MARGIN ALERTS (${prod.margin_alerts.length}):`);
      for (const a of prod.margin_alerts) {
        parts.push(`  - ${a.product}: ${a.current_margin}% vs target ${a.target}% (${a.severity})`);
      }
    }
  }

  // Temporal
  const temporal = snapshot.temporal;
  if (temporal) {
    const pos = temporal.temporal_position || {};
    const timeParts: string[] = [];
    if (pos.is_month_end) timeParts.push('MONTH-END');
    if (pos.is_quarter_end) timeParts.push('QUARTER-END');
    if (pos.is_friday) timeParts.push('FRIDAY');
    if (pos.is_monday) timeParts.push('MONDAY');
    if (timeParts.length > 0) parts.push(`CALENDAR: ${timeParts.join(', ')}`);

    const deadlines = temporal.future?.deadlines_14d || [];
    if (deadlines.length > 0) {
      parts.push(`UPCOMING DEADLINES (${deadlines.length}):`);
      for (const d of deadlines.slice(0, 8)) {
        parts.push(`  - ${d.title} in ${d.days_until}d [${d.entity_type}]`);
      }
    }

    const present = temporal.present || {};
    if (present.overdue_tasks > 0 || present.overdue_invoices_total > 0) {
      parts.push(`NOW: ${present.open_tasks} open tasks, ${present.overdue_tasks} overdue, EUR ${present.overdue_invoices_total} overdue invoices`);
    }
  }

  // People
  const people = snapshot.people;
  if (people?.neglected_contacts?.length > 0) {
    parts.push(`NEGLECTED HIGH-VALUE CONTACTS:`);
    for (const c of people.neglected_contacts) {
      parts.push(`  - ${c.name} at ${c.company}: EUR ${c.deal_value}, ${c.days_since_contact}d since contact`);
    }
  }

  // Recent activity
  const recent = snapshot.recent_activity;
  if (recent) {
    if (recent.top_apps_4h?.length > 0) {
      parts.push(`CURRENT APPS: ${recent.top_apps_4h.map((a: any) => `${a.app} ${a.minutes}min`).join(', ')}`);
    }
    parts.push(`FOCUS: ${recent.focus_score ? Math.round(recent.focus_score * 100) + '%' : 'unknown'}`);
  }

  return parts.join('\n');
}

async function callLLM(apiKey: string, system: string, user: string, temp: number, maxTokens: number): Promise<string> {
  const response = await fetch(TOGETHER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: temp,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
