/**
 * Talent Agent - Recruitment outreach orchestration
 * Handles campaign automation, message generation, sending, and follow-ups.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ============================================================================
// Types
// ============================================================================

interface TalentContext {
  userId: string;
  organizationId: string;
  campaigns: CampaignSummary[];
  rateLimits: RateLimitStatus[];
  integrationStatus: IntegrationStatus;
  outreachStats: OutreachStats;
}

interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  campaign_type: string;
  total_matched: number;
  total_contacted: number;
  total_responded: number;
  automation_config: Record<string, any>;
}

interface RateLimitStatus {
  channel: string;
  send_count: number;
  daily_limit: number;
  remaining: number;
}

interface IntegrationStatus {
  linkedin: boolean;
  gmail: boolean;
  sms: boolean;
}

interface OutreachStats {
  total_tasks: number;
  by_status: Record<string, number>;
  by_channel: Record<string, number>;
  response_rate: number;
}

interface WorkflowResult {
  success: boolean;
  summary: string;
  data?: any;
}

// ============================================================================
// TalentAgent Class
// ============================================================================

export class TalentAgent {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Initialize context with current state for the user
   */
  async initialize(userId: string, organizationId: string): Promise<TalentContext> {
    // Load active campaigns
    const { data: campaigns } = await this.supabase
      .from('campaigns')
      .select('id, name, status, campaign_type, total_matched, total_contacted, total_responded, automation_config')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'draft'])
      .order('created_date', { ascending: false })
      .limit(10);

    // Check rate limits
    const { data: limits } = await this.supabase
      .rpc('get_rate_limit_status', { p_user_id: userId });

    // Check integration connections
    const { data: integrations } = await this.supabase
      .from('user_integrations')
      .select('toolkit_slug, status')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    const connectedSlugs = new Set((integrations || []).map(i => i.toolkit_slug));

    // Get outreach stats
    const { data: tasks } = await this.supabase
      .from('outreach_tasks')
      .select('status, channel')
      .eq('organization_id', organizationId);

    const byStatus: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    for (const t of tasks || []) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (t.channel) byChannel[t.channel] = (byChannel[t.channel] || 0) + 1;
    }

    const sent = (byStatus['sent'] || 0);
    const replied = (byStatus['replied'] || 0);
    const totalDelivered = sent + replied;

    return {
      userId,
      organizationId,
      campaigns: campaigns || [],
      rateLimits: limits || [],
      integrationStatus: {
        linkedin: connectedSlugs.has('linkedin'),
        gmail: connectedSlugs.has('gmail'),
        sms: true, // SMS via Twilio, always available if phone numbers exist
      },
      outreachStats: {
        total_tasks: tasks?.length || 0,
        by_status: byStatus,
        by_channel: byChannel,
        response_rate: totalDelivered > 0 ? Math.round((replied / totalDelivered) * 100) : 0,
      },
    };
  }

  /**
   * Execute a workflow type
   */
  async executeWorkflow(
    type: 'generate_messages' | 'send_approved' | 'process_followups' | 'check_replies',
    context: TalentContext,
    params: Record<string, any> = {}
  ): Promise<WorkflowResult> {
    switch (type) {
      case 'generate_messages':
        return this.generateMessagesWorkflow(context, params);
      case 'send_approved':
        return this.sendApprovedWorkflow(context, params);
      case 'process_followups':
        return this.processFollowupsWorkflow(context, params);
      case 'check_replies':
        return this.checkRepliesWorkflow(context, params);
      default:
        return { success: false, summary: `Unknown workflow: ${type}` };
    }
  }

  /**
   * Workflow: Generate messages for all ungenerated matches in a campaign
   */
  private async generateMessagesWorkflow(
    context: TalentContext,
    params: { campaign_id?: string }
  ): Promise<WorkflowResult> {
    const campaignId = params.campaign_id;
    if (!campaignId) {
      return { success: false, summary: 'campaign_id required for message generation.' };
    }

    const { data: campaign } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      return { success: false, summary: 'Campaign not found.' };
    }

    const matched = campaign.matched_candidates || [];
    const { data: existingTasks } = await this.supabase
      .from('outreach_tasks')
      .select('candidate_id')
      .eq('campaign_id', campaignId);

    const existing = new Set((existingTasks || []).map(t => t.candidate_id));
    const ungenerated = matched.filter((m: any) => !existing.has(m.candidate_id));

    if (ungenerated.length === 0) {
      return { success: true, summary: 'All matched candidates already have outreach tasks.' };
    }

    let generated = 0;
    let failed = 0;

    for (const match of ungenerated.slice(0, 20)) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/generateCampaignOutreach`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            candidate_id: match.candidate_id,
            organization_id: campaign.organization_id,
            candidate_name: match.candidate_name || match.name,
            candidate_title: match.candidate_title || match.title,
            candidate_company: match.candidate_company || match.company,
            match_score: match.match_score,
            match_reasons: match.match_reasons || [],
            intelligence_score: match.intelligence_score,
            best_outreach_angle: match.best_outreach_angle,
            timing_signals: match.timing_signals || [],
            outreach_hooks: match.outreach_hooks || [],
            role_context: campaign.role_context,
            stage: 'initial',
            campaign_type: campaign.campaign_type || 'linkedin',
          }),
        });
        if (res.ok) generated++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return {
      success: true,
      summary: `Generated ${generated} messages (${failed} failed, ${ungenerated.length - Math.min(20, ungenerated.length)} remaining).`,
      data: { generated, failed },
    };
  }

  /**
   * Workflow: Send all approved tasks through the execution engine
   */
  private async sendApprovedWorkflow(
    context: TalentContext,
    params: { campaign_id?: string }
  ): Promise<WorkflowResult> {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/executeTalentOutreach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          campaign_id: params.campaign_id,
          user_id: context.userId,
        }),
      });

      if (!res.ok) {
        return { success: false, summary: `Execution engine error: ${await res.text()}` };
      }

      const result = await res.json();
      return {
        success: true,
        summary: `Sent: ${result.sent}, Failed: ${result.failed}, Rate-limited: ${result.skipped_rate_limit}, No connection: ${result.skipped_no_connection}`,
        data: result,
      };
    } catch (err) {
      return { success: false, summary: `Error: ${String(err)}` };
    }
  }

  /**
   * Workflow: Process follow-ups via the scheduler
   */
  private async processFollowupsWorkflow(
    context: TalentContext,
    params: { campaign_id?: string }
  ): Promise<WorkflowResult> {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/processOutreachScheduler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          organization_id: context.organizationId,
          campaign_id: params.campaign_id,
          force: true,
        }),
      });

      if (!res.ok) {
        return { success: false, summary: `Scheduler error: ${await res.text()}` };
      }

      const result = await res.json();
      return {
        success: true,
        summary: `Analyzed ${result.sent_tasks_analyzed} tasks, created ${result.follow_ups_created} follow-ups.`,
        data: result,
      };
    } catch (err) {
      return { success: false, summary: `Error: ${String(err)}` };
    }
  }

  /**
   * Workflow: Check for new replies (scans outreach tasks)
   */
  private async checkRepliesWorkflow(
    context: TalentContext,
    _params: Record<string, any>
  ): Promise<WorkflowResult> {
    const { data: recentReplies } = await this.supabase
      .from('outreach_tasks')
      .select('id, candidate_id, stage, channel, updated_at, candidates(name)')
      .eq('organization_id', context.organizationId)
      .eq('status', 'replied')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!recentReplies || recentReplies.length === 0) {
      return { success: true, summary: 'No replies detected yet.' };
    }

    const lines = recentReplies.map((r: any) => {
      const name = r.candidates?.name || r.candidate_id;
      return `- ${name} replied via ${r.channel || 'unknown'} (${r.stage})`;
    });

    return {
      success: true,
      summary: `${recentReplies.length} recent replies:\n${lines.join('\n')}`,
      data: recentReplies,
    };
  }
}
