/**
 * Growth/CRM Tool Functions for SYNC
 *
 * Actions:
 * - create_prospect
 * - update_prospect
 * - search_prospects
 * - list_prospects
 * - move_pipeline_stage
 * - get_pipeline_stats
 * - create_campaign
 * - list_campaigns
 * - update_campaign
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ActionResult, ActionContext } from './types.ts';
import {
  formatCurrency,
  formatDate,
  successResult,
  errorResult,
  formatList,
} from '../utils/helpers.ts';

// Pipeline stages for prospects
const PIPELINE_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

// ============================================================================
// Prospect Types
// ============================================================================

interface ProspectData {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  linkedin_url?: string;
  website?: string;
  location?: string;
  industry?: string;
  source?: string;
  deal_value?: number;
  notes?: string;
  tags?: string[];
}

interface ProspectFilters {
  stage?: string;
  source?: string;
  search?: string;
  is_starred?: boolean;
  owner_id?: string;
  limit?: number;
}

// ============================================================================
// Create Prospect
// ============================================================================

export async function createProspect(
  ctx: ActionContext,
  data: ProspectData
): Promise<ActionResult> {
  try {
    const prospectRecord = {
      organization_id: null, // Will be set based on company context
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      job_title: data.job_title || null,
      linkedin_url: data.linkedin_url || null,
      website: data.website || null,
      location: data.location || null,
      industry: data.industry || null,
      source: data.source || 'manual',
      stage: 'new',
      deal_value: data.deal_value || null,
      probability: 10,
      notes: data.notes || '',
      tags: data.tags || [],
      is_starred: false,
      owner_id: ctx.userId || null,
    };

    const { data: prospect, error } = await ctx.supabase
      .from('prospects')
      .insert(prospectRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create prospect: ${error.message}`, error.message);
    }

    const fullName = `${prospect.first_name} ${prospect.last_name}`;
    return successResult(
      `✅ Prospect created!\n\n**${fullName}**\n- Company: ${prospect.company || 'N/A'}\n- Email: ${prospect.email || 'N/A'}\n- Stage: ${prospect.stage}\n- Deal Value: ${prospect.deal_value ? formatCurrency(prospect.deal_value) : 'Not set'}`,
      prospect,
      '/growth'
    );
  } catch (err) {
    return errorResult(`Exception creating prospect: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Update Prospect
// ============================================================================

export async function updateProspect(
  ctx: ActionContext,
  data: { id?: string; email?: string; name?: string; updates: Partial<ProspectData & { stage?: string }> }
): Promise<ActionResult> {
  try {
    // Find prospect by ID, email, or name
    let prospectId = data.id;
    let prospectName: string | undefined;

    if (!prospectId && data.email) {
      const { data: prospects } = await ctx.supabase
        .from('prospects')
        .select('id, first_name, last_name')
        .eq('email', data.email)
        .limit(1);

      if (prospects && prospects.length > 0) {
        prospectId = prospects[0].id;
        prospectName = `${prospects[0].first_name} ${prospects[0].last_name}`;
      }
    }

    if (!prospectId && data.name) {
      const nameParts = data.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      let query = ctx.supabase
        .from('prospects')
        .select('id, first_name, last_name')
        .ilike('first_name', `%${firstName}%`);

      if (lastName) {
        query = query.ilike('last_name', `%${lastName}%`);
      }

      const { data: prospects } = await query.limit(1);

      if (prospects && prospects.length > 0) {
        prospectId = prospects[0].id;
        prospectName = `${prospects[0].first_name} ${prospects[0].last_name}`;
      }
    }

    if (!prospectId) {
      return errorResult('Prospect not found. Please provide a valid ID, email, or name.', 'Not found');
    }

    // Build update object
    const updateFields: Record<string, any> = { updated_date: new Date().toISOString() };

    if (data.updates.first_name) updateFields.first_name = data.updates.first_name;
    if (data.updates.last_name) updateFields.last_name = data.updates.last_name;
    if (data.updates.email) updateFields.email = data.updates.email;
    if (data.updates.phone) updateFields.phone = data.updates.phone;
    if (data.updates.company) updateFields.company = data.updates.company;
    if (data.updates.job_title) updateFields.job_title = data.updates.job_title;
    if (data.updates.linkedin_url) updateFields.linkedin_url = data.updates.linkedin_url;
    if (data.updates.website) updateFields.website = data.updates.website;
    if (data.updates.location) updateFields.location = data.updates.location;
    if (data.updates.industry) updateFields.industry = data.updates.industry;
    if (data.updates.source) updateFields.source = data.updates.source;
    if (data.updates.deal_value !== undefined) updateFields.deal_value = data.updates.deal_value;
    if (data.updates.notes) updateFields.notes = data.updates.notes;
    if (data.updates.tags) updateFields.tags = data.updates.tags;
    if (data.updates.stage && PIPELINE_STAGES.includes(data.updates.stage)) {
      updateFields.stage = data.updates.stage;
    }

    const { data: updated, error } = await ctx.supabase
      .from('prospects')
      .update(updateFields)
      .eq('id', prospectId)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to update prospect: ${error.message}`, error.message);
    }

    const changes = Object.keys(updateFields).filter(k => k !== 'updated_date');
    return successResult(
      `✅ Prospect updated!\n\n**${prospectName || `${updated.first_name} ${updated.last_name}`}**\nUpdated: ${changes.join(', ')}`,
      updated,
      '/growth'
    );
  } catch (err) {
    return errorResult(`Exception updating prospect: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Search Prospects
// ============================================================================

export async function searchProspects(
  ctx: ActionContext,
  data: { query: string }
): Promise<ActionResult> {
  try {
    const query = data.query.toLowerCase();

    // Search by name, email, or company
    const { data: prospects, error } = await ctx.supabase
      .from('prospects')
      .select('id, first_name, last_name, email, company, job_title, stage, deal_value')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
      .limit(10);

    if (error) {
      return errorResult(`Failed to search prospects: ${error.message}`, error.message);
    }

    if (!prospects || prospects.length === 0) {
      return successResult(`No prospects found matching "${data.query}"`, []);
    }

    // Add computed 'name' field for template compatibility
    const enrichedProspects = prospects.map(p => ({
      ...p,
      name: `${p.first_name} ${p.last_name}`.trim(),
    }));

    const list = formatList(enrichedProspects, (p) => {
      const deal = p.deal_value ? formatCurrency(p.deal_value) : 'N/A';
      return `- **${p.name}** | ${p.company || 'No company'} | ${p.stage} | ${deal}`;
    });

    return successResult(
      `Found ${enrichedProspects.length} prospect(s) matching "${data.query}":\n\n${list}`,
      enrichedProspects,
      '/growth'
    );
  } catch (err) {
    return errorResult(`Exception searching prospects: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List Prospects
// ============================================================================

export async function listProspects(
  ctx: ActionContext,
  filters: ProspectFilters = {}
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('prospects')
      .select('id, first_name, last_name, email, company, job_title, stage, deal_value, probability, source, is_starred, created_date')
      .order('created_date', { ascending: false })
      .limit(filters.limit || 20);

    if (filters.stage) {
      query = query.eq('stage', filters.stage);
    }
    if (filters.source) {
      query = query.eq('source', filters.source);
    }
    if (filters.is_starred !== undefined) {
      query = query.eq('is_starred', filters.is_starred);
    }
    if (filters.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
    }

    const { data: prospects, error } = await query;

    if (error) {
      return errorResult(`Failed to list prospects: ${error.message}`, error.message);
    }

    if (!prospects || prospects.length === 0) {
      return successResult('No prospects found matching your criteria.', []);
    }

    // Add computed 'name' field for template compatibility
    const enrichedProspects = prospects.map(p => ({
      ...p,
      name: `${p.first_name} ${p.last_name}`.trim(),
    }));

    const list = formatList(enrichedProspects, (p) => {
      const deal = p.deal_value ? formatCurrency(p.deal_value) : 'N/A';
      const star = p.is_starred ? '⭐ ' : '';
      return `- ${star}**${p.name}** | ${p.company || 'No company'} | ${p.stage} | ${deal}`;
    });

    const totalValue = enrichedProspects.reduce((sum, p) => sum + (p.deal_value || 0), 0);

    return successResult(
      `Found ${enrichedProspects.length} prospect(s):\n\n${list}\n\n**Total Pipeline Value: ${formatCurrency(totalValue)}**`,
      enrichedProspects,
      '/growth'
    );
  } catch (err) {
    return errorResult(`Exception listing prospects: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Move Pipeline Stage
// ============================================================================

export async function movePipelineStage(
  ctx: ActionContext,
  data: { id?: string; email?: string; name?: string; stage: string }
): Promise<ActionResult> {
  try {
    if (!PIPELINE_STAGES.includes(data.stage)) {
      return errorResult(
        `Invalid stage. Valid stages are: ${PIPELINE_STAGES.join(', ')}`,
        'Invalid stage'
      );
    }

    // Find prospect
    let prospectId = data.id;
    let currentStage: string | undefined;
    let prospectName: string | undefined;

    if (!prospectId && data.name) {
      const nameParts = data.name.split(' ');
      const firstName = nameParts[0];

      const { data: prospects } = await ctx.supabase
        .from('prospects')
        .select('id, first_name, last_name, stage')
        .ilike('first_name', `%${firstName}%`)
        .limit(1);

      if (prospects && prospects.length > 0) {
        prospectId = prospects[0].id;
        currentStage = prospects[0].stage;
        prospectName = `${prospects[0].first_name} ${prospects[0].last_name}`;
      }
    }

    if (!prospectId && data.email) {
      const { data: prospects } = await ctx.supabase
        .from('prospects')
        .select('id, first_name, last_name, stage')
        .eq('email', data.email)
        .limit(1);

      if (prospects && prospects.length > 0) {
        prospectId = prospects[0].id;
        currentStage = prospects[0].stage;
        prospectName = `${prospects[0].first_name} ${prospects[0].last_name}`;
      }
    }

    if (!prospectId) {
      return errorResult('Prospect not found.', 'Not found');
    }

    // Update probability based on stage
    const stageProbabilities: Record<string, number> = {
      new: 10,
      contacted: 20,
      qualified: 40,
      proposal: 60,
      negotiation: 80,
      won: 100,
      lost: 0,
    };

    const { data: updated, error } = await ctx.supabase
      .from('prospects')
      .update({
        stage: data.stage,
        probability: stageProbabilities[data.stage] || 50,
        updated_date: new Date().toISOString(),
      })
      .eq('id', prospectId)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to update stage: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Pipeline stage updated!\n\n**${prospectName || `${updated.first_name} ${updated.last_name}`}**\nStage: ${currentStage || 'unknown'} → **${data.stage}**\nProbability: ${updated.probability}%`,
      updated,
      '/growth'
    );
  } catch (err) {
    return errorResult(`Exception updating pipeline stage: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get Pipeline Stats
// ============================================================================

export async function getPipelineStats(
  ctx: ActionContext,
  data: { owner_id?: string } = {}
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('prospects')
      .select('stage, deal_value, probability');

    if (data.owner_id) {
      query = query.eq('owner_id', data.owner_id);
    }

    const { data: prospects, error } = await query;

    if (error) {
      return errorResult(`Failed to get pipeline stats: ${error.message}`, error.message);
    }

    if (!prospects || prospects.length === 0) {
      return successResult('No prospects in pipeline.', { stages: {}, totals: { count: 0, value: 0, weighted: 0 } });
    }

    // Calculate stats by stage
    const stageStats: Record<string, { count: number; value: number; weighted: number }> = {};

    for (const stage of PIPELINE_STAGES) {
      stageStats[stage] = { count: 0, value: 0, weighted: 0 };
    }

    for (const p of prospects) {
      const stage = p.stage || 'new';
      if (stageStats[stage]) {
        stageStats[stage].count++;
        stageStats[stage].value += p.deal_value || 0;
        stageStats[stage].weighted += (p.deal_value || 0) * ((p.probability || 0) / 100);
      }
    }

    const totalValue = prospects.reduce((sum, p) => sum + (p.deal_value || 0), 0);
    const weightedValue = prospects.reduce((sum, p) => sum + ((p.deal_value || 0) * ((p.probability || 0) / 100)), 0);

    const stageLines = PIPELINE_STAGES
      .filter(s => stageStats[s].count > 0)
      .map(s => `- **${s}**: ${stageStats[s].count} prospects | ${formatCurrency(stageStats[s].value)} | Weighted: ${formatCurrency(stageStats[s].weighted)}`);

    return successResult(
      `📊 **Pipeline Overview**\n\n${stageLines.join('\n')}\n\n**Total**: ${prospects.length} prospects\n**Pipeline Value**: ${formatCurrency(totalValue)}\n**Weighted Value**: ${formatCurrency(weightedValue)}`,
      { stages: stageStats, totals: { count: prospects.length, value: totalValue, weighted: weightedValue } },
      '/growth'
    );
  } catch (err) {
    return errorResult(`Exception getting pipeline stats: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Create Campaign
// ============================================================================

interface CampaignData {
  name: string;
  description?: string;
  target_criteria?: Record<string, any>;
  outreach_template?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
}

export async function createCampaign(
  ctx: ActionContext,
  data: CampaignData
): Promise<ActionResult> {
  try {
    const campaignRecord = {
      organization_id: null,
      name: data.name,
      description: data.description || null,
      status: data.status || 'draft',
    };

    const { data: campaign, error } = await ctx.supabase
      .from('campaigns')
      .insert(campaignRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create campaign: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Campaign created!\n\n**${campaign.name}**\n- Status: ${campaign.status}\n- Description: ${campaign.description || 'No description'}`,
      campaign,
      '/growth/campaigns'
    );
  } catch (err) {
    return errorResult(`Exception creating campaign: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List Campaigns
// ============================================================================

export async function listCampaigns(
  ctx: ActionContext,
  filters: { status?: string; limit?: number } = {}
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('campaigns')
      .select('id, name, description, status, total_matched, total_contacted, total_responded, created_date')
      .order('created_date', { ascending: false })
      .limit(filters.limit || 20);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      return errorResult(`Failed to list campaigns: ${error.message}`, error.message);
    }

    if (!campaigns || campaigns.length === 0) {
      return successResult('No campaigns found.', []);
    }

    const list = formatList(campaigns, (c) => {
      const stats = `${c.total_contacted}/${c.total_matched} contacted, ${c.total_responded} responded`;
      return `- **${c.name}** | ${c.status} | ${stats}`;
    });

    return successResult(
      `Found ${campaigns.length} campaign(s):\n\n${list}`,
      campaigns,
      '/growth/campaigns'
    );
  } catch (err) {
    return errorResult(`Exception listing campaigns: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Update Campaign
// ============================================================================

export async function updateCampaign(
  ctx: ActionContext,
  data: { id?: string; name?: string; updates: Partial<CampaignData> }
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
      return errorResult('Campaign not found.', 'Not found');
    }

    const updateFields: Record<string, any> = { updated_date: new Date().toISOString() };

    if (data.updates.name) updateFields.name = data.updates.name;
    if (data.updates.description !== undefined) updateFields.description = data.updates.description;
    if (data.updates.status) updateFields.status = data.updates.status;
    if (data.updates.target_criteria) updateFields.target_criteria = data.updates.target_criteria;
    if (data.updates.outreach_template) updateFields.outreach_template = data.updates.outreach_template;

    const { data: updated, error } = await ctx.supabase
      .from('campaigns')
      .update(updateFields)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to update campaign: ${error.message}`, error.message);
    }

    const changes = Object.keys(updateFields).filter(k => k !== 'updated_date');
    return successResult(
      `✅ Campaign updated!\n\n**${updated.name}**\nUpdated: ${changes.join(', ')}`,
      updated,
      '/growth/campaigns'
    );
  } catch (err) {
    return errorResult(`Exception updating campaign: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Growth Action Router
// ============================================================================

export async function executeGrowthAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'create_prospect':
      return createProspect(ctx, data);
    case 'update_prospect':
      return updateProspect(ctx, data);
    case 'search_prospects':
      return searchProspects(ctx, data);
    case 'list_prospects':
      return listProspects(ctx, data);
    case 'move_pipeline_stage':
      return movePipelineStage(ctx, data);
    case 'get_pipeline_stats':
      return getPipelineStats(ctx, data);
    case 'create_campaign':
      return createCampaign(ctx, data);
    case 'list_campaigns':
      return listCampaigns(ctx, data);
    case 'update_campaign':
      return updateCampaign(ctx, data);
    default:
      return errorResult(`Unknown growth action: ${action}`, 'Unknown action');
  }
}
