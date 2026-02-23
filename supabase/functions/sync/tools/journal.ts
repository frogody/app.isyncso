/**
 * Journal Tool Functions for SYNC
 *
 * Actions:
 * - generate_journal: Generate (or regenerate) a daily journal for any date
 * - list_journals: List recent journals for the user
 */

import { ActionResult, ActionContext } from './types.ts';
import { successResult, errorResult } from '../utils/helpers.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// ============================================================================
// Generate / Regenerate Journal
// ============================================================================

async function generateJournal(
  ctx: ActionContext,
  data: { date?: string }
): Promise<ActionResult> {
  if (!ctx.userId) {
    return errorResult('User ID is required to generate a journal.');
  }

  // Parse date — accept "yesterday", "2 days ago", "2026-02-20", etc.
  let targetDate: Date;
  const dateStr = (data.date || '').trim().toLowerCase();

  if (!dateStr || dateStr === 'today') {
    targetDate = new Date();
  } else if (dateStr === 'yesterday') {
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);
  } else if (/^\d+ days? ago$/.test(dateStr)) {
    const days = parseInt(dateStr);
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
  } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    targetDate = new Date(dateStr + 'T12:00:00Z');
  } else {
    // Try parsing as natural date
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      return errorResult(`Could not parse date "${data.date}". Use a format like "yesterday", "3 days ago", or "2026-02-20".`);
    }
    targetDate = parsed;
  }

  const journalDate = targetDate.toISOString().split('T')[0];

  try {
    // Call the generate-daily-journal edge function
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-daily-journal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: ctx.userId,
          company_id: ctx.companyId,
          date: targetDate.toISOString(),
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      if (result.error === 'No activity data for this date') {
        return errorResult(`No activity data found for ${journalDate}. The desktop companion app needs to have synced hourly data for that day.`);
      }
      return errorResult(result.error || 'Failed to generate journal');
    }

    const journal = result.journal;
    const aiTag = result.ai_generated ? ' with AI insights' : '';
    const hours = Math.floor((journal.total_active_minutes || 0) / 60);
    const mins = (journal.total_active_minutes || 0) % 60;
    const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    const productivity = Math.round((journal.productivity_score || 0) * 100);

    let summary = `**Journal ${result.journal?.id ? 'regenerated' : 'generated'}** for **${journalDate}**${aiTag}\n\n`;
    summary += `- Active time: ${duration}\n`;
    summary += `- Productivity: ${productivity}%\n`;

    if (journal.overview) {
      summary += `\n**Overview:** ${journal.overview}\n`;
    }

    if (journal.summary_points && journal.summary_points.length > 0) {
      summary += `\n**Key points:**\n`;
      for (const point of journal.summary_points.slice(0, 5)) {
        summary += `- ${point}\n`;
      }
    }

    if (journal.action_items) {
      summary += `\n**Action items:** ${journal.action_items}\n`;
    }

    return successResult(summary, journal, '/dailyjournal');
  } catch (err: any) {
    return errorResult(`Failed to generate journal: ${err.message}`);
  }
}

// ============================================================================
// List Journals
// ============================================================================

async function listJournals(
  ctx: ActionContext,
  data: { limit?: number; days?: number }
): Promise<ActionResult> {
  if (!ctx.userId) {
    return errorResult('User ID is required to list journals.');
  }

  const limit = data.limit || 7;

  try {
    let query = ctx.supabase
      .from('daily_journals')
      .select('id, journal_date, total_active_minutes, productivity_score, ai_generated, overview')
      .eq('user_id', ctx.userId)
      .order('journal_date', { ascending: false })
      .limit(limit);

    if (data.days) {
      const since = new Date();
      since.setDate(since.getDate() - data.days);
      query = query.gte('journal_date', since.toISOString().split('T')[0]);
    }

    const { data: journals, error } = await query;

    if (error) {
      return errorResult(`Failed to fetch journals: ${error.message}`);
    }

    if (!journals || journals.length === 0) {
      return successResult('No journals found. Generate one by saying "generate my journal" or "generate journal for yesterday".', [], '/dailyjournal');
    }

    let summary = `**Your recent journals** (${journals.length}):\n\n`;
    for (const j of journals) {
      const hours = Math.floor((j.total_active_minutes || 0) / 60);
      const mins = (j.total_active_minutes || 0) % 60;
      const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      const productivity = Math.round((j.productivity_score || 0) * 100);
      const aiIcon = j.ai_generated ? ' ✨' : '';
      summary += `- **${j.journal_date}** — ${duration} active, ${productivity}% productivity${aiIcon}\n`;
    }

    summary += `\nSay "regenerate journal for [date]" to refresh any of these.`;

    return successResult(summary, journals, '/dailyjournal');
  } catch (err: any) {
    return errorResult(`Failed to list journals: ${err.message}`);
  }
}

// ============================================================================
// Router
// ============================================================================

export async function executeJournalAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'generate_journal':
      return generateJournal(ctx, data);
    case 'list_journals':
      return listJournals(ctx, data);
    default:
      return errorResult(`Unknown journal action: ${action}`);
  }
}
