/**
 * Talent/Recruitment Tool Functions for SYNC
 *
 * Actions:
 * - talent_list_campaigns
 * - talent_get_campaign
 * - talent_list_outreach_tasks
 * - talent_generate_messages
 * - talent_approve_tasks
 * - talent_send_outreach
 * - talent_get_outreach_stats
 * - talent_check_rate_limits
 * - talent_start_automation
 * - talent_stop_automation
 */

import { ActionResult, ActionContext } from './types.ts';
import {
  successResult,
  errorResult,
  formatList,
  formatDate,
} from '../utils/helpers.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ============================================================================
// talent_list_campaigns
// ============================================================================

async function talentListCampaigns(
  ctx: ActionContext,
  data: { status?: string; limit?: number }
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('campaigns')
      .select('id, name, description, status, campaign_type, total_matched, total_contacted, total_responded, automation_config, created_date')
      .order('created_date', { ascending: false })
      .limit(data.limit || 20);

    if (data.status) {
      query = query.eq('status', data.status);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      return errorResult(`Failed to list talent campaigns: ${error.message}`, error.message);
    }

    if (!campaigns || campaigns.length === 0) {
      return successResult('No recruitment campaigns found.', []);
    }

    const list = formatList(campaigns, (c) => {
      const automationStatus = c.automation_config?.enabled ? '🤖 Auto' : '⏸️ Manual';
      const stats = `${c.total_contacted || 0}/${c.total_matched || 0} contacted, ${c.total_responded || 0} responded`;
      return `- **${c.name}** | ${c.status} | ${c.campaign_type || 'email'} | ${automationStatus} | ${stats}`;
    });

    return successResult(
      `Found ${campaigns.length} recruitment campaign(s):\n\n${list}`,
      campaigns,
      '/talentcampaigns'
    );
  } catch (err) {
    return errorResult(`Exception listing talent campaigns: ${String(err)}`, String(err));
  }
}

// ============================================================================
// talent_get_campaign
// ============================================================================

async function talentGetCampaign(
  ctx: ActionContext,
  data: { id?: string; name?: string }
): Promise<ActionResult> {
  try {
    let campaignId = data.id;

    if (!campaignId && data.name) {
      const { data: campaigns } = await ctx.supabase
        .from('campaigns')
        .select('id, name')
        .ilike('name', `%${data.name}%`)
        .limit(1);

      if (campaigns && campaigns.length > 0) {
        campaignId = campaigns[0].id;
      }
    }

    if (!campaignId) {
      return errorResult('Campaign not found. Please provide a valid ID or name.', 'Not found');
    }

    const { data: campaign, error } = await ctx.supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      return errorResult(`Failed to get campaign: ${error.message}`, error.message);
    }

    // Count matched candidates
    const matchedCount = campaign.matched_candidates?.length || 0;

    // Count outreach tasks by status
    const { data: taskCounts } = await ctx.supabase
      .from('outreach_tasks')
      .select('status')
      .eq('campaign_id', campaignId);

    const statusCounts: Record<string, number> = {};
    for (const t of taskCounts || []) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    }

    const automationStatus = campaign.automation_config?.enabled ? 'Enabled' : 'Disabled';
    const channels = campaign.automation_config?.channels?.join(', ') || campaign.campaign_type || 'Not set';

    return successResult(
      `**${campaign.name}**\n` +
      `- Status: ${campaign.status}\n` +
      `- Type: ${campaign.campaign_type || 'email'}\n` +
      `- Matched Candidates: ${matchedCount}\n` +
      `- Outreach Tasks: ${JSON.stringify(statusCounts)}\n` +
      `- Automation: ${automationStatus}\n` +
      `- Channels: ${channels}`,
      { campaign, statusCounts, matchedCount },
      `/talentcampaigndetail?id=${campaignId}`
    );
  } catch (err) {
    return errorResult(`Exception getting campaign: ${String(err)}`, String(err));
  }
}

// ============================================================================
// talent_list_outreach_tasks
// ============================================================================

async function talentListOutreachTasks(
  ctx: ActionContext,
  data: { campaign_id?: string; status?: string; stage?: string; channel?: string; limit?: number }
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('outreach_tasks')
      .select('id, campaign_id, candidate_id, status, stage, channel, task_type, sent_at, created_at, candidates(name, email, job_title)')
      .order('created_at', { ascending: false })
      .limit(data.limit || 20);

    if (data.campaign_id) query = query.eq('campaign_id', data.campaign_id);
    if (data.status) query = query.eq('status', data.status);
    if (data.stage) query = query.eq('stage', data.stage);
    if (data.channel) query = query.eq('channel', data.channel);

    const { data: tasks, error } = await query;

    if (error) {
      return errorResult(`Failed to list outreach tasks: ${error.message}`, error.message);
    }

    if (!tasks || tasks.length === 0) {
      return successResult('No outreach tasks found matching criteria.', []);
    }

    const list = formatList(tasks, (t) => {
      const candidateName = t.candidates?.name || t.candidate_id;
      const channelIcon = t.channel === 'linkedin' ? '🔗' : t.channel === 'email' ? '📧' : '📱';
      return `- ${channelIcon} **${candidateName}** | ${t.status} | ${t.stage} | ${t.channel || 'linkedin'}`;
    });

    return successResult(
      `Found ${tasks.length} outreach task(s):\n\n${list}`,
      tasks,
      '/talentcampaigns'
    );
  } catch (err) {
    return errorResult(`Exception listing outreach tasks: ${String(err)}`, String(err));
  }
}

// ============================================================================
// talent_generate_messages
// ============================================================================

async function talentGenerateMessages(
  ctx: ActionContext,
  data: { campaign_id: string; limit?: number }
): Promise<ActionResult> {
  try {
    if (!data.campaign_id) {
      return errorResult('campaign_id is required.', 'Missing campaign_id');
    }

    // Get campaign with matched candidates
    const { data: campaign, error: campError } = await ctx.supabase
      .from('campaigns')
      .select('*')
      .eq('id', data.campaign_id)
      .single();

    if (campError || !campaign) {
      return errorResult('Campaign not found.', 'Not found');
    }

    const matched = campaign.matched_candidates || [];
    if (matched.length === 0) {
      return errorResult('No matched candidates in this campaign. Run matching first.', 'No matches');
    }

    // Find candidates that don't have outreach tasks yet
    const { data: existingTasks } = await ctx.supabase
      .from('outreach_tasks')
      .select('candidate_id')
      .eq('campaign_id', data.campaign_id);

    const existingCandidateIds = new Set((existingTasks || []).map(t => t.candidate_id));
    const ungenerated = matched.filter((m: any) => !existingCandidateIds.has(m.candidate_id));

    if (ungenerated.length === 0) {
      return successResult('All matched candidates already have outreach tasks.', { total: matched.length, existing: existingTasks?.length || 0 });
    }

    const batchLimit = Math.min(data.limit || 10, ungenerated.length);
    const batch = ungenerated.slice(0, batchLimit);
    let generated = 0;
    let failed = 0;

    for (const match of batch) {
      try {
        // Call generateCampaignOutreach edge function
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/generateCampaignOutreach`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              campaign_id: data.campaign_id,
              candidate_id: match.candidate_id,
              organization_id: campaign.organization_id,
              candidate_name: match.candidate_name || match.name,
              candidate_title: match.candidate_title || match.title,
              candidate_company: match.candidate_company || match.company,
              candidate_skills: match.candidate_skills || match.skills || [],
              match_score: match.match_score,
              match_reasons: match.match_reasons || [],
              intelligence_score: match.intelligence_score,
              best_outreach_angle: match.best_outreach_angle,
              timing_signals: match.timing_signals || [],
              outreach_hooks: match.outreach_hooks || [],
              company_pain_points: match.company_pain_points || [],
              key_insights: match.key_insights || [],
              role_context: campaign.role_context,
              role_title: campaign.role_context?.role_title || campaign.name,
              stage: 'initial',
              campaign_type: campaign.campaign_type || 'linkedin',
            }),
          }
        );

        if (response.ok) {
          generated++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return successResult(
      `Message generation complete!\n\n` +
      `- Generated: ${generated}\n` +
      `- Failed: ${failed}\n` +
      `- Remaining ungenerated: ${ungenerated.length - batchLimit}`,
      { generated, failed, remaining: ungenerated.length - batchLimit },
      `/talentcampaigndetail?id=${data.campaign_id}`
    );
  } catch (err) {
    return errorResult(`Exception generating messages: ${String(err)}`, String(err));
  }
}

// ============================================================================
// talent_approve_tasks
// ============================================================================

async function talentApproveTasks(
  ctx: ActionContext,
  data: { campaign_id?: string; task_ids?: string[]; status_filter?: string }
): Promise<ActionResult> {
  try {
    let taskIds = data.task_ids;

    // If no specific task IDs, approve all draft/pending tasks for the campaign
    if (!taskIds && data.campaign_id) {
      const { data: tasks } = await ctx.supabase
        .from('outreach_tasks')
        .select('id')
        .eq('campaign_id', data.campaign_id)
        .in('status', [data.status_filter || 'draft', 'pending']);

      taskIds = (tasks || []).map(t => t.id);
    }

    if (!taskIds || taskIds.length === 0) {
      return errorResult('No tasks to approve. Provide task_ids or campaign_id with draft tasks.', 'No tasks');
    }

    const { data: updated, error } = await ctx.supabase
      .from('outreach_tasks')
      .update({
        status: 'approved_ready',
        approved_at: new Date().toISOString(),
        approved_by: ctx.userId,
      })
      .in('id', taskIds)
      .select();

    if (error) {
      return errorResult(`Failed to approve tasks: ${error.message}`, error.message);
    }

    return successResult(
      `Approved ${updated?.length || 0} outreach task(s). They are now ready to send.`,
      { approved: updated?.length || 0, task_ids: taskIds },
      data.campaign_id ? `/talentcampaigndetail?id=${data.campaign_id}` : undefined
    );
  } catch (err) {
    return errorResult(`Exception approving tasks: ${String(err)}`, String(err));
  }
}

// ============================================================================
// talent_send_outreach
// ============================================================================

async function talentSendOutreach(
  ctx: ActionContext,
  data: { campaign_id?: string; limit?: number }
): Promise<ActionResult> {
  try {
    // Trigger the execution engine
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/executeTalentOutreach`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          campaign_id: data.campaign_id,
          user_id: ctx.userId,
          limit: data.limit || 25,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return errorResult(`Execution engine failed: ${errText}`, errText);
    }

    const result = await response.json();

    return successResult(
      `Outreach execution complete!\n\n` +
      `- Sent: ${result.sent || 0}\n` +
      `- Failed: ${result.failed || 0}\n` +
      `- Skipped (rate limit): ${result.skipped_rate_limit || 0}\n` +
      `- Skipped (no connection): ${result.skipped_no_connection || 0}`,
      result,
      data.campaign_id ? `/talentcampaigndetail?id=${data.campaign_id}` : undefined
    );
  } catch (err) {
    return errorResult(`Exception sending outreach: ${String(err)}`, String(err));
  }
}

// ============================================================================
// talent_get_outreach_stats
// ============================================================================

async function talentGetOutreachStats(
  ctx: ActionContext,
  data: { campaign_id?: string }
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('outreach_tasks')
      .select('status, channel, sent_at');

    if (data.campaign_id) {
      query = query.eq('campaign_id', data.campaign_id);
    }

    const { data: tasks, error } = await query;

    if (error) {
      return errorResult(`Failed to get outreach stats: ${error.message}`, error.message);
    }

    if (!tasks || tasks.length === 0) {
      return successResult('No outreach data yet.', { total: 0 });
    }

    const stats = {
      total: tasks.length,
      by_status: {} as Record<string, number>,
      by_channel: {} as Record<string, number>,
      sent: 0,
      replied: 0,
      response_rate: '0%',
    };

    for (const t of tasks) {
      stats.by_status[t.status] = (stats.by_status[t.status] || 0) + 1;
      if (t.channel) {
        stats.by_channel[t.channel] = (stats.by_channel[t.channel] || 0) + 1;
      }
    }

    stats.sent = stats.by_status['sent'] || 0;
    stats.replied = stats.by_status['replied'] || 0;
    const totalSentOrReplied = stats.sent + stats.replied;
    stats.response_rate = totalSentOrReplied > 0
      ? `${Math.round((stats.replied / totalSentOrReplied) * 100)}%`
      : '0%';

    const statusLines = Object.entries(stats.by_status)
      .map(([s, c]) => `  - ${s}: ${c}`)
      .join('\n');

    const channelLines = Object.entries(stats.by_channel)
      .map(([ch, c]) => `  - ${ch}: ${c}`)
      .join('\n');

    return successResult(
      `📊 **Outreach Stats**\n\n` +
      `Total tasks: ${stats.total}\n` +
      `Response rate: ${stats.response_rate}\n\n` +
      `**By Status:**\n${statusLines}\n\n` +
      `**By Channel:**\n${channelLines}`,
      stats,
      data.campaign_id ? `/talentcampaigndetail?id=${data.campaign_id}` : '/talentcampaigns'
    );
  } catch (err) {
    return errorResult(`Exception getting outreach stats: ${String(err)}`, String(err));
  }
}

// ============================================================================
// talent_check_rate_limits
// ============================================================================

async function talentCheckRateLimits(
  ctx: ActionContext,
  _data: Record<string, any>
): Promise<ActionResult> {
  try {
    if (!ctx.userId) {
      return errorResult('User ID required.', 'No user');
    }

    const { data: limits, error } = await ctx.supabase
      .rpc('get_rate_limit_status', { p_user_id: ctx.userId });

    if (error) {
      return errorResult(`Failed to check rate limits: ${error.message}`, error.message);
    }

    if (!limits || limits.length === 0) {
      return successResult(
        '📊 **Rate Limits (Today)**\n\n' +
        '  - LinkedIn: 0/25 used\n' +
        '  - Email: 0/200 used\n' +
        '  - SMS: 0/100 used\n\n' +
        'No messages sent today.',
        { linkedin: { used: 0, limit: 25 }, email: { used: 0, limit: 200 }, sms: { used: 0, limit: 100 } }
      );
    }

    const lines = limits.map((l: any) => {
      const icon = l.channel === 'linkedin' ? '🔗' : l.channel === 'email' ? '📧' : '📱';
      const pct = Math.round((l.send_count / l.daily_limit) * 100);
      return `  ${icon} ${l.channel}: ${l.send_count}/${l.daily_limit} (${pct}% used, ${l.remaining} remaining)`;
    });

    return successResult(
      `📊 **Rate Limits (Today)**\n\n${lines.join('\n')}`,
      limits
    );
  } catch (err) {
    return errorResult(`Exception checking rate limits: ${String(err)}`, String(err));
  }
}

// ============================================================================
// talent_start_automation
// ============================================================================

async function talentStartAutomation(
  ctx: ActionContext,
  data: { campaign_id: string; auto_approve_followups?: boolean; channels?: string[] }
): Promise<ActionResult> {
  try {
    if (!data.campaign_id) {
      return errorResult('campaign_id is required.', 'Missing campaign_id');
    }

    const { data: campaign, error: fetchErr } = await ctx.supabase
      .from('campaigns')
      .select('automation_config')
      .eq('id', data.campaign_id)
      .single();

    if (fetchErr) {
      return errorResult(`Campaign not found: ${fetchErr.message}`, fetchErr.message);
    }

    const config = campaign.automation_config || {};
    config.enabled = true;
    if (data.auto_approve_followups !== undefined) {
      config.auto_approve_followups = data.auto_approve_followups;
    }
    if (data.channels) {
      config.channels = data.channels;
    }

    const { error } = await ctx.supabase
      .from('campaigns')
      .update({ automation_config: config })
      .eq('id', data.campaign_id);

    if (error) {
      return errorResult(`Failed to start automation: ${error.message}`, error.message);
    }

    return successResult(
      `🤖 Automation **enabled** for campaign!\n` +
      `- Auto-approve follow-ups: ${config.auto_approve_followups ? 'Yes' : 'No'}\n` +
      `- Channels: ${config.channels?.join(', ') || 'All'}`,
      { campaign_id: data.campaign_id, config },
      `/talentcampaigndetail?id=${data.campaign_id}`
    );
  } catch (err) {
    return errorResult(`Exception starting automation: ${String(err)}`, String(err));
  }
}

// ============================================================================
// talent_stop_automation
// ============================================================================

async function talentStopAutomation(
  ctx: ActionContext,
  data: { campaign_id: string }
): Promise<ActionResult> {
  try {
    if (!data.campaign_id) {
      return errorResult('campaign_id is required.', 'Missing campaign_id');
    }

    const { data: campaign, error: fetchErr } = await ctx.supabase
      .from('campaigns')
      .select('automation_config')
      .eq('id', data.campaign_id)
      .single();

    if (fetchErr) {
      return errorResult(`Campaign not found: ${fetchErr.message}`, fetchErr.message);
    }

    const config = campaign.automation_config || {};
    config.enabled = false;

    const { error } = await ctx.supabase
      .from('campaigns')
      .update({ automation_config: config })
      .eq('id', data.campaign_id);

    if (error) {
      return errorResult(`Failed to stop automation: ${error.message}`, error.message);
    }

    return successResult(
      `⏸️ Automation **disabled** for campaign. No new messages will be sent automatically.`,
      { campaign_id: data.campaign_id, config },
      `/talentcampaigndetail?id=${data.campaign_id}`
    );
  } catch (err) {
    return errorResult(`Exception stopping automation: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Talent Action Router
// ============================================================================

export async function executeTalentAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'talent_list_campaigns':
      return talentListCampaigns(ctx, data);
    case 'talent_get_campaign':
      return talentGetCampaign(ctx, data);
    case 'talent_list_outreach_tasks':
      return talentListOutreachTasks(ctx, data);
    case 'talent_generate_messages':
      return talentGenerateMessages(ctx, data);
    case 'talent_approve_tasks':
      return talentApproveTasks(ctx, data);
    case 'talent_send_outreach':
      return talentSendOutreach(ctx, data);
    case 'talent_get_outreach_stats':
      return talentGetOutreachStats(ctx, data);
    case 'talent_check_rate_limits':
      return talentCheckRateLimits(ctx, data);
    case 'talent_start_automation':
      return talentStartAutomation(ctx, data);
    case 'talent_stop_automation':
      return talentStopAutomation(ctx, data);
    default:
      return errorResult(`Unknown talent action: ${action}`, 'Unknown action');
  }
}
