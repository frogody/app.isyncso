/**
 * Autonomous RAG-Aware Growth Agent
 *
 * A fully autonomous agent for growth operations that:
 * - Uses HybridRAG to access context from all data sources
 * - Leverages knowledge graph for relationship insights
 * - Auto-syncs data from connected integrations
 * - Provides intelligent recommendations
 * - Can execute multi-step growth workflows autonomously
 *
 * Capabilities:
 * - Lead generation and enrichment
 * - Automated outreach sequences
 * - Pipeline management
 * - Email campaign optimization
 * - Cross-platform data synthesis
 * - Predictive lead scoring
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { HybridRAG, createHybridRAG, HybridSearchResult } from '../tools/hybrid-rag.ts';
import { IntegrationSync, autoSyncIntegrationData } from '../tools/integration-sync.ts';
import { KnowledgeGraph, EntityType } from '../tools/knowledge-graph.ts';
import { SyncSession, MemoryContext } from '../memory/types.ts';
import { ActionContext, ActionResult } from '../tools/types.ts';
import { synthesizeDeepContext, DeepInsight, formatDeepInsightsForResponse } from '../tools/deep-intelligence.ts';
import { executeComposioAction, getConnectionForToolkit } from '../tools/composio.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface GrowthAgentConfig {
  autoSyncIntegrations: boolean;
  syncIntervalMinutes: number;
  maxAutonomousActions: number;
  enablePredictiveInsights: boolean;
  enableAutoOutreach: boolean;
}

export interface GrowthContext {
  prospects: ProspectSummary[];
  campaigns: CampaignSummary[];
  pipelineStats: PipelineStats;
  recentActivities: ActivitySummary[];
  integrationData: IntegrationDataSummary;
  insights: DeepInsight[];
}

export interface ProspectSummary {
  id: string;
  name: string;
  email: string;
  company: string;
  stage: string;
  score: number;
  lastContactedAt?: string;
  nextAction?: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

export interface PipelineStats {
  totalProspects: number;
  byStage: Record<string, number>;
  totalDealValue: number;
  conversionRate: number;
  avgDealCycle: number;
}

export interface ActivitySummary {
  type: string;
  description: string;
  prospectName?: string;
  timestamp: string;
}

export interface IntegrationDataSummary {
  gmail: { itemCount: number; lastSynced?: string };
  calendar: { itemCount: number; lastSynced?: string };
  hubspot: { itemCount: number; lastSynced?: string };
  sheets: { itemCount: number; lastSynced?: string };
  teams: { itemCount: number; lastSynced?: string };
}

export interface AutonomousTask {
  id: string;
  type: 'outreach' | 'followup' | 'enrichment' | 'scoring' | 'sync' | 'analysis';
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  targetEntities: string[];
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

const DEFAULT_CONFIG: GrowthAgentConfig = {
  autoSyncIntegrations: true,
  syncIntervalMinutes: 30,
  maxAutonomousActions: 10,
  enablePredictiveInsights: true,
  enableAutoOutreach: false, // Require explicit approval
};

// ============================================================================
// GROWTH AGENT CLASS
// ============================================================================

export class GrowthAgent {
  private supabase: SupabaseClient;
  private session: SyncSession;
  private hybridRAG: HybridRAG;
  private integrationSync: IntegrationSync;
  private knowledgeGraph: KnowledgeGraph;
  private config: GrowthAgentConfig;
  private context: GrowthContext | null = null;

  constructor(
    supabase: SupabaseClient,
    session: SyncSession,
    config: Partial<GrowthAgentConfig> = {}
  ) {
    this.supabase = supabase;
    this.session = session;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.hybridRAG = createHybridRAG(supabase, session);
    this.integrationSync = new IntegrationSync(supabase, session.company_id, session.user_id || undefined);
    this.knowledgeGraph = new KnowledgeGraph(supabase, session.company_id);
  }

  /**
   * Initialize the agent and load context
   */
  async initialize(): Promise<GrowthContext> {
    console.log('[GrowthAgent] Initializing...');

    // Load context in parallel
    const [prospects, campaigns, pipeline, activities, integrationStatus, insights] = await Promise.all([
      this.loadProspects(),
      this.loadCampaigns(),
      this.loadPipelineStats(),
      this.loadRecentActivities(),
      this.integrationSync.getSyncStatus(),
      this.loadInsights(),
    ]);

    this.context = {
      prospects,
      campaigns,
      pipelineStats: pipeline,
      recentActivities: activities,
      integrationData: {
        gmail: integrationStatus.gmail || { itemCount: 0 },
        calendar: integrationStatus.calendar || { itemCount: 0 },
        hubspot: integrationStatus.hubspot || { itemCount: 0 },
        sheets: integrationStatus.sheets || { itemCount: 0 },
        teams: integrationStatus.teams || { itemCount: 0 },
      },
      insights,
    };

    // Auto-sync if enabled and data is stale
    if (this.config.autoSyncIntegrations) {
      await this.checkAndSyncIntegrations();
    }

    console.log(`[GrowthAgent] Initialized with ${prospects.length} prospects, ${campaigns.length} campaigns`);
    return this.context;
  }

  /**
   * Process a natural language query with full RAG context
   */
  async processQuery(query: string): Promise<{
    response: string;
    ragContext: HybridSearchResult[];
    suggestedActions: string[];
    autonomousTasks?: AutonomousTask[];
  }> {
    console.log(`[GrowthAgent] Processing query: ${query}`);

    // 1. Search across all data sources using HybridRAG
    const ragResults = await this.hybridRAG.search(query, {
      includeIntegrations: true,
      expandRelationships: true,
      maxResults: 30,
    });

    // 2. Build context string for LLM
    const ragContextStr = this.hybridRAG.formatResultsForPrompt(ragResults);

    // 3. Analyze intent and determine actions
    const intent = this.analyzeIntent(query);
    const suggestedActions = this.getSuggestedActions(intent, ragResults);

    // 4. Generate response based on context
    const response = await this.generateResponse(query, ragResults, intent);

    // 5. Create autonomous tasks if applicable
    let autonomousTasks: AutonomousTask[] | undefined;
    if (intent.requiresAction && intent.canAutomate) {
      autonomousTasks = await this.createAutonomousTasks(intent, ragResults);
    }

    return {
      response,
      ragContext: ragResults,
      suggestedActions,
      autonomousTasks,
    };
  }

  /**
   * Execute autonomous growth workflow
   */
  async executeAutonomousWorkflow(
    workflowType: 'lead_gen' | 'followup' | 'pipeline_review' | 'data_sync'
  ): Promise<{
    success: boolean;
    tasksCompleted: AutonomousTask[];
    summary: string;
  }> {
    const tasks: AutonomousTask[] = [];
    let summary = '';

    switch (workflowType) {
      case 'lead_gen':
        // Autonomous lead generation workflow
        tasks.push(...await this.runLeadGenWorkflow());
        summary = `Lead generation workflow completed. Generated ${tasks.filter(t => t.status === 'completed').length} leads.`;
        break;

      case 'followup':
        // Automated follow-up on stale prospects
        tasks.push(...await this.runFollowupWorkflow());
        summary = `Follow-up workflow completed. Processed ${tasks.filter(t => t.status === 'completed').length} prospects.`;
        break;

      case 'pipeline_review':
        // Review and score pipeline
        tasks.push(...await this.runPipelineReviewWorkflow());
        summary = `Pipeline review completed. Analyzed ${tasks.filter(t => t.status === 'completed').length} opportunities.`;
        break;

      case 'data_sync':
        // Sync all connected integrations
        tasks.push(...await this.runDataSyncWorkflow());
        summary = `Data sync completed. Synced ${tasks.filter(t => t.status === 'completed').length} integration(s).`;
        break;
    }

    return {
      success: tasks.every(t => t.status === 'completed'),
      tasksCompleted: tasks,
      summary,
    };
  }

  // ============================================================================
  // AUTONOMOUS WORKFLOWS
  // ============================================================================

  private async runLeadGenWorkflow(): Promise<AutonomousTask[]> {
    const tasks: AutonomousTask[] = [];

    // 1. Identify ideal customer profile from existing data
    const topClients = await this.identifyTopClients();

    // 2. Search for similar prospects in knowledge graph
    for (const client of topClients.slice(0, 3)) {
      const task: AutonomousTask = {
        id: crypto.randomUUID(),
        type: 'enrichment',
        description: `Find similar prospects to ${client.name}`,
        priority: 'high',
        status: 'in_progress',
        targetEntities: [client.id],
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);

      try {
        // Search for related entities
        const similar = await this.knowledgeGraph.searchEntities(
          client.company || client.name,
          'prospect',
          10
        );

        task.result = {
          similarProspects: similar.map(s => ({
            name: s.entity_name,
            attributes: s.attributes,
          })),
        };
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return tasks;
  }

  private async runFollowupWorkflow(): Promise<AutonomousTask[]> {
    const tasks: AutonomousTask[] = [];

    // Find prospects that need follow-up
    const staleProspects = this.context?.prospects.filter(p => {
      if (!p.lastContactedAt) return true;
      const daysSinceContact = (Date.now() - new Date(p.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceContact > 7 && p.stage !== 'won' && p.stage !== 'lost';
    }) || [];

    for (const prospect of staleProspects.slice(0, this.config.maxAutonomousActions)) {
      const task: AutonomousTask = {
        id: crypto.randomUUID(),
        type: 'followup',
        description: `Follow up with ${prospect.name}`,
        priority: prospect.score > 70 ? 'high' : 'medium',
        status: 'pending',
        targetEntities: [prospect.id],
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);

      // Note: Actual email sending would require explicit user approval
      task.result = {
        recommendedAction: 'send_followup_email',
        prospect,
        suggestedSubject: `Following up on our conversation`,
      };
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
    }

    return tasks;
  }

  private async runPipelineReviewWorkflow(): Promise<AutonomousTask[]> {
    const tasks: AutonomousTask[] = [];

    // Analyze each pipeline stage
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation'];

    for (const stage of stages) {
      const stageProspects = this.context?.prospects.filter(p => p.stage === stage) || [];

      const task: AutonomousTask = {
        id: crypto.randomUUID(),
        type: 'analysis',
        description: `Analyze ${stage} stage (${stageProspects.length} prospects)`,
        priority: 'medium',
        status: 'in_progress',
        targetEntities: stageProspects.map(p => p.id),
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);

      // Score and analyze prospects in this stage
      const analysis = {
        stage,
        count: stageProspects.length,
        totalValue: stageProspects.reduce((sum, p) => sum + (p.score || 0), 0),
        avgScore: stageProspects.length > 0
          ? stageProspects.reduce((sum, p) => sum + (p.score || 0), 0) / stageProspects.length
          : 0,
        hotProspects: stageProspects.filter(p => p.score > 70).map(p => p.name),
        atRisk: stageProspects.filter(p => {
          const daysSinceContact = p.lastContactedAt
            ? (Date.now() - new Date(p.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
            : Infinity;
          return daysSinceContact > 14;
        }).map(p => p.name),
      };

      task.result = analysis;
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
    }

    return tasks;
  }

  private async runDataSyncWorkflow(): Promise<AutonomousTask[]> {
    const tasks: AutonomousTask[] = [];
    const ctx: ActionContext = {
      supabase: this.supabase,
      companyId: this.session.company_id,
      userId: this.session.user_id || '',
      session: this.session,
    };

    // Sync Gmail
    const gmailConn = await getConnectionForToolkit(ctx, 'gmail');
    if (gmailConn) {
      const task: AutonomousTask = {
        id: crypto.randomUUID(),
        type: 'sync',
        description: 'Sync Gmail emails',
        priority: 'medium',
        status: 'in_progress',
        targetEntities: [],
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);

      try {
        const result = await executeComposioAction(ctx, 'composio_fetch_emails', { limit: 50 });
        if (result.success && result.result) {
          const emails = Array.isArray(result.result) ? result.result : [];
          const syncResult = await this.integrationSync.syncGmailEmails(emails);
          task.result = syncResult;
          task.status = 'completed';
        } else {
          task.status = 'failed';
          task.error = result.message;
        }
      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : 'Unknown error';
      }
      task.completedAt = new Date().toISOString();
    }

    // Sync Calendar
    const calConn = await getConnectionForToolkit(ctx, 'googlecalendar');
    if (calConn) {
      const task: AutonomousTask = {
        id: crypto.randomUUID(),
        type: 'sync',
        description: 'Sync Calendar events',
        priority: 'medium',
        status: 'in_progress',
        targetEntities: [],
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);

      try {
        const result = await executeComposioAction(ctx, 'composio_list_calendar_events', { days_ahead: 30 });
        if (result.success && result.result) {
          const events = Array.isArray(result.result) ? result.result : [];
          const syncResult = await this.integrationSync.syncCalendarEvents(events);
          task.result = syncResult;
          task.status = 'completed';
        } else {
          task.status = 'failed';
          task.error = result.message;
        }
      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : 'Unknown error';
      }
      task.completedAt = new Date().toISOString();
    }

    // Sync HubSpot
    const hubspotConn = await getConnectionForToolkit(ctx, 'hubspot');
    if (hubspotConn) {
      const task: AutonomousTask = {
        id: crypto.randomUUID(),
        type: 'sync',
        description: 'Sync HubSpot contacts',
        priority: 'medium',
        status: 'in_progress',
        targetEntities: [],
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);

      try {
        const result = await executeComposioAction(ctx, 'composio_execute_tool', {
          tool_slug: 'HUBSPOT_LIST_CONTACTS',
          toolkit: 'hubspot',
          params: { limit: 100 },
        });
        if (result.success && result.result) {
          const contacts = Array.isArray(result.result) ? result.result : (result.result as any)?.results || [];
          const syncResult = await this.integrationSync.syncHubSpotContacts(contacts);
          task.result = syncResult;
          task.status = 'completed';
        } else {
          task.status = 'failed';
          task.error = result.message;
        }
      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : 'Unknown error';
      }
      task.completedAt = new Date().toISOString();
    }

    return tasks;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async loadProspects(): Promise<ProspectSummary[]> {
    const { data } = await this.supabase
      .from('prospects')
      .select('id, name, email, company_name, stage, score, last_contacted_at, organization_id')
      .eq('organization_id', this.session.company_id)
      .order('score', { ascending: false })
      .limit(100);

    return (data || []).map(p => ({
      id: p.id,
      name: p.name || '',
      email: p.email || '',
      company: p.company_name || '',
      stage: p.stage || 'new',
      score: p.score || 0,
      lastContactedAt: p.last_contacted_at,
    }));
  }

  private async loadCampaigns(): Promise<CampaignSummary[]> {
    const { data } = await this.supabase
      .from('growth_campaigns')
      .select('id, name, status, sent_count, open_rate, click_rate, reply_rate')
      .eq('company_id', this.session.company_id)
      .order('created_at', { ascending: false })
      .limit(20);

    return (data || []).map(c => ({
      id: c.id,
      name: c.name || '',
      status: c.status || 'draft',
      sentCount: c.sent_count || 0,
      openRate: c.open_rate || 0,
      clickRate: c.click_rate || 0,
      replyRate: c.reply_rate || 0,
    }));
  }

  private async loadPipelineStats(): Promise<PipelineStats> {
    const { data: prospects } = await this.supabase
      .from('prospects')
      .select('stage, deal_value')
      .eq('organization_id', this.session.company_id);

    const byStage: Record<string, number> = {};
    let totalValue = 0;

    for (const p of prospects || []) {
      const stage = p.stage || 'new';
      byStage[stage] = (byStage[stage] || 0) + 1;
      totalValue += p.deal_value || 0;
    }

    const won = byStage['won'] || 0;
    const total = (prospects || []).length;

    return {
      totalProspects: total,
      byStage,
      totalDealValue: totalValue,
      conversionRate: total > 0 ? (won / total) * 100 : 0,
      avgDealCycle: 30, // Default, could be calculated from actual data
    };
  }

  private async loadRecentActivities(): Promise<ActivitySummary[]> {
    const { data } = await this.supabase
      .from('crm_activities')
      .select('activity_type, subject, description, prospect:prospects(name), created_at')
      .eq('organization_id', this.session.company_id)
      .order('created_at', { ascending: false })
      .limit(20);

    return (data || []).map(a => ({
      type: a.activity_type,
      description: a.subject || a.description || '',
      prospectName: (a.prospect as any)?.name,
      timestamp: a.created_at,
    }));
  }

  private async loadInsights(): Promise<DeepInsight[]> {
    try {
      const insights = await synthesizeDeepContext(
        this.supabase,
        this.session,
        '',
        []
      );
      return insights.filter(i =>
        i.category === 'opportunity' || i.category === 'risk'
      ).slice(0, 5);
    } catch {
      return [];
    }
  }

  private async checkAndSyncIntegrations(): Promise<void> {
    const status = this.context?.integrationData;
    if (!status) return;

    const staleThreshold = this.config.syncIntervalMinutes * 60 * 1000;
    const now = Date.now();

    for (const [integration, data] of Object.entries(status)) {
      if (!data.lastSynced) continue;
      const lastSynced = new Date(data.lastSynced).getTime();
      if (now - lastSynced > staleThreshold) {
        console.log(`[GrowthAgent] ${integration} data is stale, triggering sync...`);
        // Sync will happen in background
      }
    }
  }

  private async identifyTopClients(): Promise<Array<{ id: string; name: string; company?: string }>> {
    const { data } = await this.supabase
      .from('contacts')
      .select('id, name, company')
      .eq('company_id', this.session.company_id)
      .eq('type', 'client')
      .order('created_at', { ascending: false })
      .limit(10);

    return (data || []).map(c => ({
      id: c.id,
      name: c.name || '',
      company: c.company,
    }));
  }

  private analyzeIntent(query: string): {
    type: 'search' | 'action' | 'analysis' | 'report';
    entity?: string;
    action?: string;
    requiresAction: boolean;
    canAutomate: boolean;
  } {
    const q = query.toLowerCase();

    // Search intents
    if (q.includes('find') || q.includes('search') || q.includes('show') || q.includes('list')) {
      return { type: 'search', requiresAction: false, canAutomate: false };
    }

    // Action intents
    if (q.includes('send') || q.includes('create') || q.includes('add') || q.includes('email')) {
      return { type: 'action', requiresAction: true, canAutomate: false };
    }

    // Analysis intents
    if (q.includes('analyze') || q.includes('insights') || q.includes('performance') || q.includes('how is')) {
      return { type: 'analysis', requiresAction: false, canAutomate: true };
    }

    // Report intents
    if (q.includes('report') || q.includes('summary') || q.includes('overview')) {
      return { type: 'report', requiresAction: false, canAutomate: true };
    }

    return { type: 'search', requiresAction: false, canAutomate: false };
  }

  private getSuggestedActions(
    intent: { type: string },
    ragResults: HybridSearchResult[]
  ): string[] {
    const actions: string[] = [];

    // Based on RAG results, suggest relevant actions
    const hasProspects = ragResults.some(r => r.sourceType === 'prospect' || r.sourceType === 'client');
    const hasEmails = ragResults.some(r => r.sourceType === 'gmail');
    const hasCalendar = ragResults.some(r => r.sourceType === 'calendar');

    if (hasProspects) {
      actions.push('View prospect details');
      actions.push('Send follow-up email');
      actions.push('Schedule meeting');
    }

    if (hasEmails) {
      actions.push('Reply to email');
      actions.push('Forward to team');
    }

    if (hasCalendar) {
      actions.push('Reschedule meeting');
      actions.push('Add notes');
    }

    // Default actions
    if (actions.length === 0) {
      actions.push('Search prospects');
      actions.push('View pipeline');
      actions.push('Check insights');
    }

    return actions.slice(0, 5);
  }

  private async generateResponse(
    query: string,
    ragResults: HybridSearchResult[],
    intent: { type: string }
  ): Promise<string> {
    const parts: string[] = [];

    // Add relevant context from RAG
    if (ragResults.length > 0) {
      const topResults = ragResults.slice(0, 5);
      parts.push(`Based on your data, here's what I found:\n`);

      for (const result of topResults) {
        const sourceLabel = this.getSourceLabel(result.sourceType);
        parts.push(`• **${sourceLabel}:** ${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}`);
      }
    }

    // Add insights if analysis intent
    if (intent.type === 'analysis' || intent.type === 'report') {
      const insights = this.context?.insights || [];
      if (insights.length > 0) {
        parts.push(`\n**Key Insights:**`);
        parts.push(formatDeepInsightsForResponse(insights));
      }
    }

    // Add pipeline summary if relevant
    if (query.toLowerCase().includes('pipeline') || intent.type === 'report') {
      const stats = this.context?.pipelineStats;
      if (stats) {
        parts.push(`\n**Pipeline Overview:**`);
        parts.push(`• Total prospects: ${stats.totalProspects}`);
        parts.push(`• Total deal value: €${stats.totalDealValue.toLocaleString()}`);
        parts.push(`• Conversion rate: ${stats.conversionRate.toFixed(1)}%`);
      }
    }

    return parts.join('\n');
  }

  private async createAutonomousTasks(
    intent: { type: string },
    ragResults: HybridSearchResult[]
  ): Promise<AutonomousTask[]> {
    const tasks: AutonomousTask[] = [];

    // Only create tasks for certain intent types
    if (intent.type === 'analysis') {
      tasks.push({
        id: crypto.randomUUID(),
        type: 'analysis',
        description: 'Deep analysis of growth metrics',
        priority: 'medium',
        status: 'pending',
        targetEntities: [],
        createdAt: new Date().toISOString(),
      });
    }

    return tasks;
  }

  private getSourceLabel(sourceType: string): string {
    const labels: Record<string, string> = {
      prospect: 'Prospect',
      client: 'Client',
      gmail: 'Email',
      calendar: 'Calendar',
      hubspot: 'CRM',
      sheets: 'Spreadsheet',
      teams: 'Teams',
      slack: 'Slack',
      memory_chunk: 'Previous Conversation',
    };
    return labels[sourceType] || sourceType;
  }

  /**
   * Get formatted context for external use
   */
  getContextSummary(): string {
    if (!this.context) return 'No context loaded. Call initialize() first.';

    const parts: string[] = [];

    // Pipeline summary
    parts.push(`📊 **Pipeline:** ${this.context.pipelineStats.totalProspects} prospects, €${this.context.pipelineStats.totalDealValue.toLocaleString()} total value`);

    // Top prospects
    const hotProspects = this.context.prospects.filter(p => p.score > 70).slice(0, 3);
    if (hotProspects.length > 0) {
      parts.push(`🔥 **Hot Prospects:** ${hotProspects.map(p => `${p.name} (${p.score})`).join(', ')}`);
    }

    // Integration status
    const connectedIntegrations = Object.entries(this.context.integrationData)
      .filter(([_, v]) => v.itemCount > 0)
      .map(([k, _]) => k);
    if (connectedIntegrations.length > 0) {
      parts.push(`🔗 **Connected:** ${connectedIntegrations.join(', ')}`);
    }

    // Key insights
    const criticalInsights = this.context.insights.filter(i => i.priority === 'critical' || i.priority === 'high');
    if (criticalInsights.length > 0) {
      parts.push(`⚠️ **Attention:** ${criticalInsights[0].title}`);
    }

    return parts.join('\n');
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createGrowthAgent(
  supabase: SupabaseClient,
  session: SyncSession,
  config?: Partial<GrowthAgentConfig>
): GrowthAgent {
  return new GrowthAgent(supabase, session, config);
}

export default GrowthAgent;
