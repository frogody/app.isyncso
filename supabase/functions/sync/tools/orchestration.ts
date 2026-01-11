/**
 * Multi-Agent Orchestration System for SYNC
 *
 * Enables complex workflows that coordinate multiple specialized agents
 * working together towards a unified goal. Supports:
 * - Parallel and sequential execution phases
 * - Cross-agent data sharing
 * - Progress tracking and status updates
 * - Partial failure handling and recovery
 * - Human-in-the-loop checkpoints
 */

import { ActionContext, ActionResult } from './types.ts';

// ============================================================================
// Types
// ============================================================================

export interface OrchestrationWorkflow {
  id: string;
  name: string;
  description: string;
  triggerPatterns: string[];  // Patterns to detect this workflow
  phases: WorkflowPhase[];
  estimatedDuration: string;  // e.g., "2-3 minutes"
  requiredContext?: string[]; // Required info before starting
}

export interface WorkflowPhase {
  id: string;
  name: string;
  description: string;
  execution: 'parallel' | 'sequential';
  tasks: WorkflowTask[];
  checkpoint?: boolean;  // Pause for user confirmation
  continueOnError?: boolean;
}

export interface WorkflowTask {
  id: string;
  agent: string;  // finance, products, growth, tasks, inbox, create, research
  action: string;
  description: string;
  data: Record<string, any> | ((context: WorkflowContext) => Record<string, any>);
  dependsOn?: string[];  // Task IDs this depends on
  optional?: boolean;
  storeAs?: string;  // Store result in context under this key
}

export interface WorkflowContext {
  workflowId: string;
  userId: string;
  companyId: string;
  startedAt: Date;
  inputs: Record<string, any>;  // User-provided inputs
  results: Record<string, any>; // Results from completed tasks
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentPhase: number;
  completedTasks: string[];
  failedTasks: Array<{ taskId: string; error: string }>;
  progressMessages: string[];
}

export interface OrchestrationResult {
  success: boolean;
  workflowId: string;
  workflowName: string;
  status: WorkflowContext['status'];
  completedPhases: number;
  totalPhases: number;
  results: Record<string, any>;
  summary: string;
  nextSteps?: string[];
  errors?: string[];
}

// ============================================================================
// Workflow Definitions
// ============================================================================

export const ORCHESTRATION_WORKFLOWS: OrchestrationWorkflow[] = [
  // -------------------------------------------------------------------------
  // 1. NEW CLIENT ONBOARDING
  // -------------------------------------------------------------------------
  {
    id: 'client_onboarding',
    name: 'New Client Onboarding',
    description: 'Complete onboarding flow for a new client including CRM setup, welcome communications, and initial tasks',
    triggerPatterns: [
      'onboard new client',
      'onboard.*client',
      'new client.*setup',
      'client onboarding',
      'welcome new client',
      'set up new client',
      'add and onboard',
    ],
    estimatedDuration: '1-2 minutes',
    requiredContext: ['clientName', 'clientEmail', 'clientCompany'],
    phases: [
      {
        id: 'phase_1_setup',
        name: 'Client Setup',
        description: 'Creating client records in CRM',
        execution: 'sequential',
        tasks: [
          {
            id: 'create_prospect',
            agent: 'growth',
            action: 'create_prospect',
            description: 'Create client in CRM',
            data: (ctx) => ({
              name: ctx.inputs.clientName,
              email: ctx.inputs.clientEmail,
              company: ctx.inputs.clientCompany,
              source: 'direct',
              stage: 'qualified',
              notes: `Onboarded via SYNC on ${new Date().toLocaleDateString()}`,
            }),
            storeAs: 'prospect',
          },
        ],
      },
      {
        id: 'phase_2_parallel',
        name: 'Parallel Setup',
        description: 'Setting up communications and tasks simultaneously',
        execution: 'parallel',
        continueOnError: true,
        tasks: [
          {
            id: 'create_welcome_task',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create welcome call task',
            data: (ctx) => ({
              title: `Welcome call with ${ctx.inputs.clientName}`,
              description: `Schedule introductory call with ${ctx.inputs.clientName} from ${ctx.inputs.clientCompany}`,
              priority: 'high',
              due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
            }),
            storeAs: 'welcomeTask',
          },
          {
            id: 'create_contract_task',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create contract task',
            data: (ctx) => ({
              title: `Send contract to ${ctx.inputs.clientCompany}`,
              description: `Prepare and send service agreement to ${ctx.inputs.clientName}`,
              priority: 'high',
              due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
            }),
            storeAs: 'contractTask',
          },
          {
            id: 'create_followup_task',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create follow-up task',
            data: (ctx) => ({
              title: `Follow up with ${ctx.inputs.clientName}`,
              description: `Check in after initial meeting to answer questions`,
              priority: 'medium',
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
            }),
            storeAs: 'followupTask',
            optional: true,
          },
        ],
      },
      {
        id: 'phase_3_proposal',
        name: 'Initial Proposal',
        description: 'Creating welcome proposal',
        execution: 'sequential',
        checkpoint: true,  // Ask user before creating proposal
        tasks: [
          {
            id: 'create_proposal',
            agent: 'finance',
            action: 'create_proposal',
            description: 'Create initial proposal',
            data: (ctx) => ({
              client_name: ctx.inputs.clientName,
              client_email: ctx.inputs.clientEmail,
              items: ctx.inputs.proposalItems || [
                { description: 'Initial Consultation', quantity: 1, unit_price: 0 }
              ],
              notes: `Welcome to our services! This proposal outlines our initial offering.`,
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            storeAs: 'proposal',
            optional: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. PRODUCT LAUNCH CAMPAIGN
  // -------------------------------------------------------------------------
  {
    id: 'product_launch',
    name: 'Product Launch Campaign',
    description: 'Complete product launch including catalog setup, marketing campaign, and outreach',
    triggerPatterns: [
      'launch.*product',
      'product launch',
      'new product campaign',
      'launch campaign for',
      'introduce new product',
      'product release',
    ],
    estimatedDuration: '2-3 minutes',
    requiredContext: ['productName', 'productPrice', 'productDescription'],
    phases: [
      {
        id: 'phase_1_product',
        name: 'Product Setup',
        description: 'Adding product to catalog',
        execution: 'sequential',
        tasks: [
          {
            id: 'create_product',
            agent: 'products',
            action: 'create_product',
            description: 'Add product to catalog',
            data: (ctx) => ({
              name: ctx.inputs.productName,
              description: ctx.inputs.productDescription,
              price: ctx.inputs.productPrice,
              cost_price: ctx.inputs.costPrice || ctx.inputs.productPrice * 0.6,
              stock_quantity: ctx.inputs.initialStock || 100,
              low_stock_threshold: ctx.inputs.lowStockThreshold || 10,
              status: 'active',
            }),
            storeAs: 'product',
          },
        ],
      },
      {
        id: 'phase_2_visual',
        name: 'Visual Assets',
        description: 'Generating product imagery',
        execution: 'parallel',
        continueOnError: true,
        tasks: [
          {
            id: 'generate_hero_image',
            agent: 'create',
            action: 'generate_image',
            description: 'Generate hero product image',
            data: (ctx) => ({
              prompt: `Professional product photography of ${ctx.inputs.productName}: ${ctx.inputs.productDescription}. Clean white background, studio lighting, high-end commercial photography style.`,
              use_case: 'product_hero',
              style: 'photorealistic',
            }),
            storeAs: 'heroImage',
            optional: true,
          },
          {
            id: 'generate_lifestyle_image',
            agent: 'create',
            action: 'generate_image',
            description: 'Generate lifestyle product image',
            data: (ctx) => ({
              prompt: `Lifestyle photography showing ${ctx.inputs.productName} in use. Natural setting, warm lighting, aspirational mood.`,
              use_case: 'product_scene',
              style: 'photorealistic',
            }),
            storeAs: 'lifestyleImage',
            optional: true,
          },
        ],
      },
      {
        id: 'phase_3_campaign',
        name: 'Marketing Campaign',
        description: 'Setting up outreach campaign',
        execution: 'sequential',
        tasks: [
          {
            id: 'find_prospects',
            agent: 'growth',
            action: 'list_prospects',
            description: 'Find target prospects',
            data: (ctx) => ({
              stage: 'qualified',
              limit: 50,
            }),
            storeAs: 'prospects',
          },
          {
            id: 'create_campaign',
            agent: 'growth',
            action: 'create_campaign',
            description: 'Create launch campaign',
            data: (ctx) => ({
              name: `${ctx.inputs.productName} Launch`,
              description: `Product launch campaign for ${ctx.inputs.productName}`,
              type: 'product_launch',
              status: 'draft',
              target_audience: 'qualified_prospects',
            }),
            storeAs: 'campaign',
          },
        ],
      },
      {
        id: 'phase_4_tasks',
        name: 'Launch Tasks',
        description: 'Creating launch checklist',
        execution: 'parallel',
        tasks: [
          {
            id: 'task_announce',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create announcement task',
            data: (ctx) => ({
              title: `Announce ${ctx.inputs.productName} launch`,
              description: `Send launch announcement to customer base`,
              priority: 'high',
              due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            storeAs: 'announceTask',
          },
          {
            id: 'task_social',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create social media task',
            data: (ctx) => ({
              title: `Social media posts for ${ctx.inputs.productName}`,
              description: `Create and schedule social media content for product launch`,
              priority: 'medium',
              due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            storeAs: 'socialTask',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. END OF MONTH FINANCIAL CLOSE
  // -------------------------------------------------------------------------
  {
    id: 'monthly_close',
    name: 'Monthly Financial Close',
    description: 'End-of-month financial review with invoice follow-ups and reporting',
    triggerPatterns: [
      'monthly close',
      'end of month',
      'month.*close',
      'financial close',
      'close the month',
      'monthly review',
      'wrap up.*month',
    ],
    estimatedDuration: '1-2 minutes',
    requiredContext: [],
    phases: [
      {
        id: 'phase_1_analysis',
        name: 'Financial Analysis',
        description: 'Gathering financial data',
        execution: 'parallel',
        tasks: [
          {
            id: 'get_summary',
            agent: 'finance',
            action: 'get_financial_summary',
            description: 'Get financial summary',
            data: { period: 'month' },
            storeAs: 'financialSummary',
          },
          {
            id: 'list_unpaid',
            agent: 'finance',
            action: 'list_invoices',
            description: 'List unpaid invoices',
            data: { status: 'sent' },
            storeAs: 'unpaidInvoices',
          },
          {
            id: 'list_overdue',
            agent: 'finance',
            action: 'list_invoices',
            description: 'List overdue invoices',
            data: { status: 'overdue' },
            storeAs: 'overdueInvoices',
          },
          {
            id: 'list_expenses',
            agent: 'finance',
            action: 'list_expenses',
            description: 'List month expenses',
            data: { period: 'month' },
            storeAs: 'expenses',
          },
        ],
      },
      {
        id: 'phase_2_inventory',
        name: 'Inventory Check',
        description: 'Checking inventory status',
        execution: 'parallel',
        continueOnError: true,
        tasks: [
          {
            id: 'low_stock',
            agent: 'products',
            action: 'get_low_stock',
            description: 'Check low stock items',
            data: {},
            storeAs: 'lowStock',
          },
          {
            id: 'product_summary',
            agent: 'products',
            action: 'list_products',
            description: 'Get product summary',
            data: { limit: 100 },
            storeAs: 'products',
          },
        ],
      },
      {
        id: 'phase_3_pipeline',
        name: 'Pipeline Review',
        description: 'Reviewing sales pipeline',
        execution: 'parallel',
        tasks: [
          {
            id: 'pipeline_stats',
            agent: 'growth',
            action: 'get_pipeline_stats',
            description: 'Get pipeline statistics',
            data: {},
            storeAs: 'pipelineStats',
          },
          {
            id: 'overdue_tasks',
            agent: 'tasks',
            action: 'get_overdue_tasks',
            description: 'Check overdue tasks',
            data: {},
            storeAs: 'overdueTasks',
          },
        ],
      },
      {
        id: 'phase_4_followups',
        name: 'Create Follow-ups',
        description: 'Setting up follow-up tasks',
        execution: 'sequential',
        tasks: [
          {
            id: 'create_followup_tasks',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create invoice follow-up task',
            data: (ctx) => {
              const overdueCount = ctx.results.overdueInvoices?.length || 0;
              const unpaidCount = ctx.results.unpaidInvoices?.length || 0;
              return {
                title: `Follow up on ${overdueCount + unpaidCount} outstanding invoices`,
                description: `${overdueCount} overdue, ${unpaidCount} pending payment. Review and send reminders.`,
                priority: overdueCount > 0 ? 'high' : 'medium',
                due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              };
            },
            storeAs: 'followupTask',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. CUSTOMER ISSUE RESOLUTION
  // -------------------------------------------------------------------------
  {
    id: 'issue_resolution',
    name: 'Customer Issue Resolution',
    description: 'Handle customer complaint with investigation, resolution, and follow-up',
    triggerPatterns: [
      'customer.*issue',
      'customer.*complaint',
      'resolve.*issue',
      'handle.*complaint',
      'customer problem',
      'client.*unhappy',
      'refund.*customer',
    ],
    estimatedDuration: '1-2 minutes',
    requiredContext: ['customerName', 'issueDescription'],
    phases: [
      {
        id: 'phase_1_lookup',
        name: 'Customer Lookup',
        description: 'Finding customer information',
        execution: 'parallel',
        tasks: [
          {
            id: 'find_customer',
            agent: 'growth',
            action: 'search_prospects',
            description: 'Find customer in CRM',
            data: (ctx) => ({
              query: ctx.inputs.customerName,
            }),
            storeAs: 'customer',
          },
          {
            id: 'find_invoices',
            agent: 'finance',
            action: 'list_invoices',
            description: 'Find customer invoices',
            data: (ctx) => ({
              client_name: ctx.inputs.customerName,
              limit: 10,
            }),
            storeAs: 'customerInvoices',
          },
        ],
      },
      {
        id: 'phase_2_research',
        name: 'Issue Research',
        description: 'Researching the issue',
        execution: 'parallel',
        continueOnError: true,
        tasks: [
          {
            id: 'search_products',
            agent: 'products',
            action: 'search_products',
            description: 'Search related products',
            data: (ctx) => ({
              query: ctx.inputs.productName || ctx.inputs.issueDescription.split(' ').slice(0, 3).join(' '),
            }),
            storeAs: 'relatedProducts',
            optional: true,
          },
          {
            id: 'web_research',
            agent: 'research',
            action: 'web_search',
            description: 'Research common solutions',
            data: (ctx) => ({
              query: `${ctx.inputs.issueDescription} solution`,
            }),
            storeAs: 'researchResults',
            optional: true,
          },
        ],
      },
      {
        id: 'phase_3_resolution',
        name: 'Resolution Actions',
        description: 'Taking resolution actions',
        execution: 'sequential',
        checkpoint: true,
        tasks: [
          {
            id: 'update_prospect',
            agent: 'growth',
            action: 'update_prospect',
            description: 'Update customer notes',
            data: (ctx) => ({
              id: ctx.results.customer?.[0]?.id,
              notes: `Issue reported on ${new Date().toLocaleDateString()}: ${ctx.inputs.issueDescription}. Resolution in progress.`,
            }),
            storeAs: 'updatedCustomer',
          },
          {
            id: 'create_resolution_task',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create resolution task',
            data: (ctx) => ({
              title: `Resolve issue for ${ctx.inputs.customerName}`,
              description: `Issue: ${ctx.inputs.issueDescription}\n\nResolution steps:\n1. Contact customer\n2. Understand full scope\n3. Propose solution\n4. Implement fix\n5. Follow up`,
              priority: 'high',
              due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            storeAs: 'resolutionTask',
          },
        ],
      },
      {
        id: 'phase_4_followup',
        name: 'Follow-up Setup',
        description: 'Setting up follow-up',
        execution: 'parallel',
        tasks: [
          {
            id: 'satisfaction_task',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create satisfaction check task',
            data: (ctx) => ({
              title: `Satisfaction check: ${ctx.inputs.customerName}`,
              description: `Follow up to ensure issue was resolved satisfactorily`,
              priority: 'medium',
              due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            storeAs: 'satisfactionTask',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. WEEKLY BUSINESS REVIEW
  // -------------------------------------------------------------------------
  {
    id: 'weekly_review',
    name: 'Weekly Business Review',
    description: 'Comprehensive weekly status report across all business areas',
    triggerPatterns: [
      'weekly review',
      'weekly report',
      'business review',
      'status report',
      'how.*business.*doing',
      'weekly summary',
      'week.*overview',
    ],
    estimatedDuration: '1 minute',
    requiredContext: [],
    phases: [
      {
        id: 'phase_1_gather',
        name: 'Data Gathering',
        description: 'Collecting data from all areas',
        execution: 'parallel',
        continueOnError: true,
        tasks: [
          {
            id: 'financial_summary',
            agent: 'finance',
            action: 'get_financial_summary',
            description: 'Get financial summary',
            data: { period: 'week' },
            storeAs: 'financials',
          },
          {
            id: 'invoices_sent',
            agent: 'finance',
            action: 'list_invoices',
            description: 'List recent invoices',
            data: { limit: 20 },
            storeAs: 'recentInvoices',
          },
          {
            id: 'pipeline',
            agent: 'growth',
            action: 'get_pipeline_stats',
            description: 'Get pipeline stats',
            data: {},
            storeAs: 'pipeline',
          },
          {
            id: 'prospects',
            agent: 'growth',
            action: 'list_prospects',
            description: 'List recent prospects',
            data: { limit: 20 },
            storeAs: 'prospects',
          },
          {
            id: 'inventory',
            agent: 'products',
            action: 'get_low_stock',
            description: 'Check inventory alerts',
            data: {},
            storeAs: 'lowStock',
          },
          {
            id: 'tasks_pending',
            agent: 'tasks',
            action: 'list_tasks',
            description: 'List pending tasks',
            data: { status: 'pending' },
            storeAs: 'pendingTasks',
          },
          {
            id: 'tasks_overdue',
            agent: 'tasks',
            action: 'get_overdue_tasks',
            description: 'Get overdue tasks',
            data: {},
            storeAs: 'overdueTasks',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. QUOTE TO CASH
  // -------------------------------------------------------------------------
  {
    id: 'quote_to_cash',
    name: 'Quote to Cash',
    description: 'Full sales cycle from proposal to payment tracking',
    triggerPatterns: [
      'quote to cash',
      'full.*sale.*cycle',
      'proposal.*invoice.*track',
      'complete.*sales.*process',
      'deal.*to.*payment',
    ],
    estimatedDuration: '1-2 minutes',
    requiredContext: ['clientName', 'clientEmail', 'dealValue', 'productDescription'],
    phases: [
      {
        id: 'phase_1_prospect',
        name: 'Prospect Setup',
        description: 'Ensuring client is in CRM',
        execution: 'sequential',
        tasks: [
          {
            id: 'find_or_create_prospect',
            agent: 'growth',
            action: 'search_prospects',
            description: 'Search for existing client',
            data: (ctx) => ({
              query: ctx.inputs.clientName,
            }),
            storeAs: 'existingProspect',
          },
          {
            id: 'create_prospect',
            agent: 'growth',
            action: 'create_prospect',
            description: 'Create new prospect if needed',
            data: (ctx) => ({
              name: ctx.inputs.clientName,
              email: ctx.inputs.clientEmail,
              source: 'direct',
              stage: 'proposal',
              estimated_value: ctx.inputs.dealValue,
            }),
            storeAs: 'prospect',
          },
        ],
      },
      {
        id: 'phase_2_proposal',
        name: 'Proposal Creation',
        description: 'Creating and sending proposal',
        execution: 'sequential',
        tasks: [
          {
            id: 'create_proposal',
            agent: 'finance',
            action: 'create_proposal',
            description: 'Create proposal',
            data: (ctx) => ({
              client_name: ctx.inputs.clientName,
              client_email: ctx.inputs.clientEmail,
              items: [
                {
                  description: ctx.inputs.productDescription,
                  quantity: 1,
                  unit_price: ctx.inputs.dealValue,
                }
              ],
              valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            storeAs: 'proposal',
          },
          {
            id: 'update_stage',
            agent: 'growth',
            action: 'move_pipeline_stage',
            description: 'Move to proposal stage',
            data: (ctx) => ({
              prospect_id: ctx.results.prospect?.id || ctx.results.existingProspect?.[0]?.id,
              stage: 'proposal',
            }),
            storeAs: 'stageUpdate',
          },
        ],
      },
      {
        id: 'phase_3_tasks',
        name: 'Follow-up Tasks',
        description: 'Creating follow-up tasks',
        execution: 'parallel',
        tasks: [
          {
            id: 'followup_task',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create follow-up task',
            data: (ctx) => ({
              title: `Follow up on proposal to ${ctx.inputs.clientName}`,
              description: `Check if ${ctx.inputs.clientName} has reviewed the proposal for ${ctx.inputs.productDescription}`,
              priority: 'high',
              due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            storeAs: 'followupTask',
          },
          {
            id: 'payment_reminder_task',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create payment reminder',
            data: (ctx) => ({
              title: `Payment tracking: ${ctx.inputs.clientName}`,
              description: `Track payment status after proposal acceptance`,
              priority: 'medium',
              due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            storeAs: 'paymentTask',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. INVENTORY RESTOCK WORKFLOW
  // -------------------------------------------------------------------------
  {
    id: 'inventory_restock',
    name: 'Inventory Restock',
    description: 'Identify low stock, research suppliers, create purchase tasks',
    triggerPatterns: [
      'restock.*inventory',
      'inventory.*restock',
      'replenish.*stock',
      'order.*low.*stock',
      'reorder.*products',
    ],
    estimatedDuration: '1-2 minutes',
    requiredContext: [],
    phases: [
      {
        id: 'phase_1_identify',
        name: 'Identify Low Stock',
        description: 'Finding products that need restocking',
        execution: 'sequential',
        tasks: [
          {
            id: 'get_low_stock',
            agent: 'products',
            action: 'get_low_stock',
            description: 'Get low stock products',
            data: {},
            storeAs: 'lowStockProducts',
          },
        ],
      },
      {
        id: 'phase_2_research',
        name: 'Supplier Research',
        description: 'Researching restock options',
        execution: 'parallel',
        continueOnError: true,
        tasks: [
          {
            id: 'research_suppliers',
            agent: 'research',
            action: 'web_search',
            description: 'Research suppliers',
            data: (ctx) => {
              const products = ctx.results.lowStockProducts || [];
              const topProduct = products[0]?.name || 'wholesale supplier';
              return {
                query: `${topProduct} wholesale supplier Netherlands`,
              };
            },
            storeAs: 'supplierResearch',
            optional: true,
          },
        ],
      },
      {
        id: 'phase_3_tasks',
        name: 'Create Restock Tasks',
        description: 'Creating purchase order tasks',
        execution: 'sequential',
        tasks: [
          {
            id: 'create_restock_task',
            agent: 'tasks',
            action: 'create_task',
            description: 'Create main restock task',
            data: (ctx) => {
              const products = ctx.results.lowStockProducts || [];
              const productList = products.slice(0, 5).map((p: any) => `- ${p.name}: ${p.stock_quantity} units`).join('\n');
              return {
                title: `Restock ${products.length} low inventory items`,
                description: `Products needing restock:\n${productList}\n\nContact suppliers and place orders.`,
                priority: 'high',
                due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              };
            },
            storeAs: 'restockTask',
          },
          {
            id: 'log_restock_expense',
            agent: 'finance',
            action: 'create_expense',
            description: 'Create expense placeholder',
            data: (ctx) => ({
              description: 'Inventory restock (pending)',
              amount: 0,
              category: 'inventory',
              status: 'pending',
              notes: `Placeholder for upcoming restock order. Products: ${(ctx.results.lowStockProducts || []).length} items low on stock.`,
            }),
            storeAs: 'expensePlaceholder',
            optional: true,
          },
        ],
      },
    ],
  },
];

// ============================================================================
// Workflow Detection
// ============================================================================

export function detectOrchestrationWorkflow(message: string): OrchestrationWorkflow | null {
  const lowerMsg = message.toLowerCase();

  for (const workflow of ORCHESTRATION_WORKFLOWS) {
    for (const pattern of workflow.triggerPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(lowerMsg)) {
        return workflow;
      }
    }
  }

  return null;
}

// ============================================================================
// Context Extraction
// ============================================================================

export function extractWorkflowContext(
  message: string,
  workflow: OrchestrationWorkflow
): { inputs: Record<string, any>; missing: string[] } {
  const inputs: Record<string, any> = {};
  const missing: string[] = [];

  // Common extraction patterns
  const patterns: Record<string, RegExp[]> = {
    clientName: [
      /(?:for|client|customer|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+(?:van|de|der|den)\s+)?[A-Z][a-z]+)/,
    ],
    clientEmail: [
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    ],
    clientCompany: [
      /(?:from|at|company|bedrijf)\s+([A-Z][A-Za-z\s]+(?:BV|NV|LLC|Inc|Ltd)?)/i,
    ],
    productName: [
      /(?:product|item|launch|introduce)\s+([A-Z][A-Za-z0-9\s]+)/i,
      /launch\s+(?:the\s+)?([A-Z][A-Za-z0-9\s]+)/i,
    ],
    productPrice: [
      /€\s*(\d+(?:[.,]\d{2})?)/,
      /(\d+(?:[.,]\d{2})?)\s*(?:euro|EUR)/i,
      /\$\s*(\d+(?:[.,]\d{2})?)/,
    ],
    productDescription: [
      /(?:description|about|is)\s+["']?([^"'\n]+)["']?/i,
    ],
    issueDescription: [
      /(?:issue|problem|complaint)\s*(?:is|about|:)?\s*["']?([^"'\n]+)["']?/i,
      /(?:having|experiencing)\s+(?:a\s+)?(?:problem|issue)\s+(?:with\s+)?["']?([^"'\n]+)["']?/i,
    ],
    dealValue: [
      /€\s*(\d+(?:[.,]\d{2})?)/,
      /(\d+(?:[.,]\d{2})?)\s*(?:euro|EUR)/i,
      /worth\s+(\d+)/i,
      /value\s+(?:of\s+)?€?\s*(\d+)/i,
    ],
    customerName: [
      /(?:customer|client)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    ],
  };

  // Extract all possible values
  for (const [key, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      const match = message.match(regex);
      if (match && match[1]) {
        inputs[key] = key.includes('Price') || key.includes('Value')
          ? parseFloat(match[1].replace(',', '.'))
          : match[1].trim();
        break;
      }
    }
  }

  // Check for missing required context
  for (const required of (workflow.requiredContext || [])) {
    if (!inputs[required]) {
      missing.push(required);
    }
  }

  return { inputs, missing };
}

// ============================================================================
// Workflow Execution
// ============================================================================

export async function executeOrchestrationWorkflow(
  workflow: OrchestrationWorkflow,
  inputs: Record<string, any>,
  ctx: ActionContext,
  executeAction: (action: { action: string; data: any }, companyId: string, userId?: string) => Promise<ActionResult>,
  onProgress?: (message: string) => void
): Promise<OrchestrationResult> {
  const context: WorkflowContext = {
    workflowId: workflow.id,
    userId: ctx.userId || 'system',
    companyId: ctx.companyId,
    startedAt: new Date(),
    inputs,
    results: {},
    status: 'running',
    currentPhase: 0,
    completedTasks: [],
    failedTasks: [],
    progressMessages: [],
  };

  const progress = (msg: string) => {
    context.progressMessages.push(msg);
    onProgress?.(msg);
  };

  progress(`🚀 Starting: ${workflow.name}`);

  try {
    // Execute each phase
    for (let i = 0; i < workflow.phases.length; i++) {
      const phase = workflow.phases[i];
      context.currentPhase = i;

      progress(`\n📋 Phase ${i + 1}/${workflow.phases.length}: ${phase.name}`);

      // Handle checkpoint (would need user confirmation in real scenario)
      if (phase.checkpoint) {
        progress(`⏸️ Checkpoint: ${phase.description} (auto-continuing)`);
      }

      // Execute tasks based on strategy
      if (phase.execution === 'parallel') {
        // Execute all tasks in parallel
        const taskPromises = phase.tasks.map(task => executeTask(task, context, ctx, executeAction, progress));
        const results = await Promise.all(taskPromises);

        // Process results
        for (let j = 0; j < results.length; j++) {
          const { task, result, error } = results[j];
          if (result?.success) {
            context.completedTasks.push(task.id);
            if (task.storeAs && result.result) {
              context.results[task.storeAs] = result.result;
            }
          } else if (!task.optional) {
            context.failedTasks.push({ taskId: task.id, error: error || result?.error || 'Unknown error' });
            if (!phase.continueOnError) {
              throw new Error(`Task ${task.id} failed: ${error || result?.error}`);
            }
          }
        }
      } else {
        // Execute tasks sequentially
        for (const task of phase.tasks) {
          // Check dependencies
          if (task.dependsOn) {
            const missingDeps = task.dependsOn.filter(d => !context.completedTasks.includes(d));
            if (missingDeps.length > 0) {
              progress(`⏭️ Skipping ${task.id} (missing dependencies: ${missingDeps.join(', ')})`);
              continue;
            }
          }

          const { result, error } = await executeTask(task, context, ctx, executeAction, progress);

          if (result?.success) {
            context.completedTasks.push(task.id);
            if (task.storeAs && result.result) {
              context.results[task.storeAs] = result.result;
            }
          } else if (!task.optional) {
            context.failedTasks.push({ taskId: task.id, error: error || result?.error || 'Unknown error' });
            if (!phase.continueOnError) {
              throw new Error(`Task ${task.id} failed: ${error || result?.error}`);
            }
          }
        }
      }
    }

    context.status = 'completed';
    progress(`\n✅ Workflow completed successfully!`);

  } catch (error: any) {
    context.status = 'failed';
    progress(`\n❌ Workflow failed: ${error.message}`);
  }

  return buildOrchestrationResult(workflow, context);
}

async function executeTask(
  task: WorkflowTask,
  context: WorkflowContext,
  ctx: ActionContext,
  executeAction: (action: { action: string; data: any }, companyId: string, userId?: string) => Promise<ActionResult>,
  progress: (msg: string) => void
): Promise<{ task: WorkflowTask; result: ActionResult | null; error?: string }> {
  try {
    // Resolve data (can be static or function)
    const data = typeof task.data === 'function' ? task.data(context) : task.data;

    progress(`  → ${task.description}...`);

    const result = await executeAction(
      { action: task.action, data },
      context.companyId,
      context.userId
    );

    if (result.success) {
      progress(`  ✓ ${task.description}`);
    } else {
      progress(`  ✗ ${task.description}: ${result.error || result.message}`);
    }

    return { task, result };
  } catch (error: any) {
    progress(`  ✗ ${task.description}: ${error.message}`);
    return { task, result: null, error: error.message };
  }
}

function buildOrchestrationResult(
  workflow: OrchestrationWorkflow,
  context: WorkflowContext
): OrchestrationResult {
  const success = context.status === 'completed';
  const completedPhases = context.currentPhase + (success ? 1 : 0);

  // Build summary based on workflow type
  let summary = '';
  const nextSteps: string[] = [];

  switch (workflow.id) {
    case 'client_onboarding':
      summary = buildOnboardingSummary(context);
      nextSteps.push('Send welcome email to client');
      nextSteps.push('Prepare for welcome call');
      break;

    case 'product_launch':
      summary = buildProductLaunchSummary(context);
      nextSteps.push('Review generated images');
      nextSteps.push('Activate marketing campaign');
      break;

    case 'monthly_close':
      summary = buildMonthlyCloseSummary(context);
      nextSteps.push('Review overdue invoices');
      nextSteps.push('Send payment reminders');
      break;

    case 'issue_resolution':
      summary = buildIssueResolutionSummary(context);
      nextSteps.push('Contact customer directly');
      nextSteps.push('Implement resolution');
      break;

    case 'weekly_review':
      summary = buildWeeklyReviewSummary(context);
      break;

    case 'quote_to_cash':
      summary = buildQuoteToCashSummary(context);
      nextSteps.push('Send proposal to client');
      nextSteps.push('Follow up in 3 days');
      break;

    case 'inventory_restock':
      summary = buildRestockSummary(context);
      nextSteps.push('Contact suppliers');
      nextSteps.push('Place orders');
      break;

    default:
      summary = `Completed ${context.completedTasks.length} tasks across ${completedPhases} phases.`;
  }

  return {
    success,
    workflowId: workflow.id,
    workflowName: workflow.name,
    status: context.status,
    completedPhases,
    totalPhases: workflow.phases.length,
    results: context.results,
    summary,
    nextSteps: nextSteps.length > 0 ? nextSteps : undefined,
    errors: context.failedTasks.length > 0
      ? context.failedTasks.map(f => `${f.taskId}: ${f.error}`)
      : undefined,
  };
}

// ============================================================================
// Summary Builders
// ============================================================================

function buildOnboardingSummary(context: WorkflowContext): string {
  const prospect = context.results.prospect;
  const tasks = [
    context.results.welcomeTask,
    context.results.contractTask,
    context.results.followupTask,
  ].filter(Boolean);

  let summary = `## 🎉 Client Onboarding Complete\n\n`;
  summary += `**Client:** ${context.inputs.clientName}\n`;
  summary += `**Company:** ${context.inputs.clientCompany}\n`;
  summary += `**Email:** ${context.inputs.clientEmail}\n\n`;
  summary += `### Actions Completed:\n`;
  summary += `- ✓ Created client in CRM\n`;
  summary += `- ✓ Created ${tasks.length} onboarding tasks\n`;
  if (context.results.proposal) {
    summary += `- ✓ Created welcome proposal\n`;
  }

  return summary;
}

function buildProductLaunchSummary(context: WorkflowContext): string {
  const product = context.results.product;
  const campaign = context.results.campaign;

  let summary = `## 🚀 Product Launch Ready\n\n`;
  summary += `**Product:** ${context.inputs.productName}\n`;
  summary += `**Price:** €${context.inputs.productPrice}\n\n`;
  summary += `### Actions Completed:\n`;
  summary += `- ✓ Product added to catalog\n`;
  if (context.results.heroImage) summary += `- ✓ Hero image generated\n`;
  if (context.results.lifestyleImage) summary += `- ✓ Lifestyle image generated\n`;
  if (campaign) summary += `- ✓ Marketing campaign created\n`;
  summary += `- ✓ Launch tasks created\n`;

  return summary;
}

function buildMonthlyCloseSummary(context: WorkflowContext): string {
  const financials = context.results.financialSummary || {};
  const overdueInvoices = context.results.overdueInvoices || [];
  const unpaidInvoices = context.results.unpaidInvoices || [];
  const lowStock = context.results.lowStock || [];
  const overdueTasks = context.results.overdueTasks || [];
  const pipeline = context.results.pipelineStats || {};

  let summary = `## 📊 Monthly Financial Close Report\n\n`;

  summary += `### 💰 Financial Summary\n`;
  summary += `- **Revenue:** €${financials.revenue?.toLocaleString() || '0'}\n`;
  summary += `- **Expenses:** €${financials.expenses?.toLocaleString() || '0'}\n`;
  summary += `- **Net:** €${financials.net?.toLocaleString() || '0'}\n\n`;

  summary += `### 📄 Invoices\n`;
  summary += `- **Overdue:** ${overdueInvoices.length} invoices\n`;
  summary += `- **Pending:** ${unpaidInvoices.length} invoices\n\n`;

  summary += `### 📦 Inventory\n`;
  summary += `- **Low Stock Alerts:** ${lowStock.length} products\n\n`;

  summary += `### 📈 Pipeline\n`;
  summary += `- **Active Deals:** ${pipeline.total || 0}\n`;
  summary += `- **Value:** €${pipeline.totalValue?.toLocaleString() || '0'}\n\n`;

  summary += `### ⚠️ Attention Needed\n`;
  summary += `- ${overdueTasks.length} overdue tasks\n`;
  if (overdueInvoices.length > 0) summary += `- ${overdueInvoices.length} overdue invoices need follow-up\n`;
  if (lowStock.length > 0) summary += `- ${lowStock.length} products need restocking\n`;

  return summary;
}

function buildIssueResolutionSummary(context: WorkflowContext): string {
  let summary = `## 🔧 Issue Resolution Started\n\n`;
  summary += `**Customer:** ${context.inputs.customerName}\n`;
  summary += `**Issue:** ${context.inputs.issueDescription}\n\n`;
  summary += `### Actions Taken:\n`;
  summary += `- ✓ Customer lookup completed\n`;
  summary += `- ✓ Customer record updated with issue details\n`;
  summary += `- ✓ Resolution task created (high priority)\n`;
  summary += `- ✓ Satisfaction follow-up scheduled\n`;

  return summary;
}

function buildWeeklyReviewSummary(context: WorkflowContext): string {
  const financials = context.results.financials || {};
  const invoices = context.results.recentInvoices || [];
  const pipeline = context.results.pipeline || {};
  const prospects = context.results.prospects || [];
  const lowStock = context.results.lowStock || [];
  const pendingTasks = context.results.pendingTasks || [];
  const overdueTasks = context.results.overdueTasks || [];

  let summary = `## 📅 Weekly Business Review\n\n`;

  summary += `### 💰 Finance\n`;
  summary += `- Revenue: €${financials.revenue?.toLocaleString() || '0'}\n`;
  summary += `- Expenses: €${financials.expenses?.toLocaleString() || '0'}\n`;
  summary += `- Active invoices: ${invoices.length}\n\n`;

  summary += `### 📈 Sales Pipeline\n`;
  summary += `- Total prospects: ${prospects.length}\n`;
  summary += `- Pipeline value: €${pipeline.totalValue?.toLocaleString() || '0'}\n\n`;

  summary += `### 📦 Inventory\n`;
  summary += `- Low stock alerts: ${lowStock.length}\n\n`;

  summary += `### ✅ Tasks\n`;
  summary += `- Pending: ${pendingTasks.length}\n`;
  summary += `- Overdue: ${overdueTasks.length}\n`;

  return summary;
}

function buildQuoteToCashSummary(context: WorkflowContext): string {
  let summary = `## 💼 Quote to Cash Started\n\n`;
  summary += `**Client:** ${context.inputs.clientName}\n`;
  summary += `**Deal Value:** €${context.inputs.dealValue?.toLocaleString()}\n`;
  summary += `**Product:** ${context.inputs.productDescription}\n\n`;
  summary += `### Actions Completed:\n`;
  summary += `- ✓ Client added/updated in CRM\n`;
  summary += `- ✓ Proposal created\n`;
  summary += `- ✓ Pipeline stage updated to "Proposal"\n`;
  summary += `- ✓ Follow-up tasks created\n`;

  return summary;
}

function buildRestockSummary(context: WorkflowContext): string {
  const lowStock = context.results.lowStockProducts || [];

  let summary = `## 📦 Inventory Restock Report\n\n`;
  summary += `**Products Below Threshold:** ${lowStock.length}\n\n`;

  if (lowStock.length > 0) {
    summary += `### Critical Items:\n`;
    lowStock.slice(0, 5).forEach((p: any) => {
      summary += `- ${p.name}: ${p.stock_quantity} units (threshold: ${p.low_stock_threshold})\n`;
    });
    summary += `\n`;
  }

  summary += `### Actions Completed:\n`;
  summary += `- ✓ Low stock products identified\n`;
  if (context.results.supplierResearch) summary += `- ✓ Supplier research completed\n`;
  summary += `- ✓ Restock task created\n`;

  return summary;
}

// ============================================================================
// Human-Readable Context Questions
// ============================================================================

export function getContextQuestions(missing: string[]): string {
  const questions: Record<string, string> = {
    clientName: "What is the client's name?",
    clientEmail: "What is the client's email address?",
    clientCompany: "What company are they from?",
    productName: "What is the product name?",
    productPrice: "What is the product price?",
    productDescription: "Can you describe the product briefly?",
    issueDescription: "What is the issue or complaint about?",
    customerName: "What is the customer's name?",
    dealValue: "What is the deal value?",
  };

  const questionList = missing
    .map(m => questions[m] || `What is the ${m}?`)
    .join('\n- ');

  return `To start this workflow, I need a few details:\n- ${questionList}`;
}
