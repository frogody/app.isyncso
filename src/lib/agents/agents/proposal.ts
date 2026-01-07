/**
 * Proposal Agent
 * Handles proposal creation, management, and client interactions
 */

import { BaseAgent } from '../base-agent';
import { AgentRegistry } from '../registry';
import type { AgentConfig, AgentTool } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface Proposal {
  id: string;
  proposalNumber: string;
  title: string;
  client: ProposalClient;
  status: ProposalStatus;
  sections: ProposalSection[];
  pricing: ProposalPricing;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  signedAt?: Date;
  notes?: string;
}

export interface ProposalClient {
  name: string;
  company: string;
  email: string;
  phone?: string;
  address?: string;
}

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'converted';

export interface ProposalSection {
  id: string;
  title: string;
  content: string;
  order: number;
  type: SectionType;
}

export type SectionType =
  | 'introduction'
  | 'problem'
  | 'solution'
  | 'approach'
  | 'timeline'
  | 'team'
  | 'pricing'
  | 'terms'
  | 'custom';

export interface ProposalPricing {
  lineItems: LineItem[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  btwRate: number;
  btwAmount: number;
  total: number;
  currency: string;
  paymentTerms: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  sections: Omit<ProposalSection, 'id'>[];
  defaultPricing?: Partial<ProposalPricing>;
}

// ============================================================================
// Mock Data Store
// ============================================================================

const mockProposals: Map<string, Proposal> = new Map();
const mockTemplates: Map<string, ProposalTemplate> = new Map();
let proposalCounter = 100;

const BTW_RATE = 0.21;

function initMockData(): void {
  if (mockTemplates.size > 0) return;

  const templates: ProposalTemplate[] = [
    {
      id: 'tpl_software',
      name: 'Software Development',
      description: 'Standard template for software development projects',
      sections: [
        {
          title: 'Introduction',
          content: 'Thank you for the opportunity to present this proposal...',
          order: 1,
          type: 'introduction',
        },
        {
          title: 'Understanding Your Needs',
          content: 'Based on our discussions, we understand that...',
          order: 2,
          type: 'problem',
        },
        {
          title: 'Our Solution',
          content: 'We propose developing a custom solution that...',
          order: 3,
          type: 'solution',
        },
        {
          title: 'Project Approach',
          content: 'We follow an agile methodology with 2-week sprints...',
          order: 4,
          type: 'approach',
        },
        {
          title: 'Timeline',
          content: 'Phase 1: Discovery (2 weeks)\nPhase 2: Development (8 weeks)\nPhase 3: Testing & Launch (2 weeks)',
          order: 5,
          type: 'timeline',
        },
        {
          title: 'Investment',
          content: 'See pricing details below.',
          order: 6,
          type: 'pricing',
        },
        {
          title: 'Terms & Conditions',
          content: 'Payment terms: 30% upfront, 40% at midpoint, 30% on delivery...',
          order: 7,
          type: 'terms',
        },
      ],
      defaultPricing: {
        currency: 'EUR',
        btwRate: BTW_RATE,
        paymentTerms: '30% upfront, 40% midpoint, 30% delivery',
      },
    },
    {
      id: 'tpl_consulting',
      name: 'Consulting Engagement',
      description: 'Template for consulting and advisory services',
      sections: [
        {
          title: 'Executive Summary',
          content: 'This proposal outlines our consulting engagement...',
          order: 1,
          type: 'introduction',
        },
        {
          title: 'Current Situation Analysis',
          content: 'Based on our initial assessment...',
          order: 2,
          type: 'problem',
        },
        {
          title: 'Recommended Approach',
          content: 'We recommend a phased approach...',
          order: 3,
          type: 'solution',
        },
        {
          title: 'Deliverables',
          content: '1. Assessment Report\n2. Strategy Document\n3. Implementation Roadmap',
          order: 4,
          type: 'approach',
        },
        {
          title: 'Investment',
          content: 'See pricing details below.',
          order: 5,
          type: 'pricing',
        },
      ],
    },
  ];

  for (const template of templates) {
    mockTemplates.set(template.id, template);
  }

  // Sample proposal
  const sampleProposal: Proposal = {
    id: 'prop_001',
    proposalNumber: 'PROP-2024-0001',
    title: 'Website Redesign Project',
    client: {
      name: 'Jan de Vries',
      company: 'TechFlow B.V.',
      email: 'jan@techflow.nl',
      address: 'Amsterdam, Netherlands',
    },
    status: 'sent',
    sections: [
      { id: 'sec_1', title: 'Introduction', content: 'We are pleased to present...', order: 1, type: 'introduction' },
      { id: 'sec_2', title: 'Our Solution', content: 'A modern, responsive website...', order: 2, type: 'solution' },
    ],
    pricing: {
      lineItems: [
        { description: 'UX/UI Design', quantity: 40, unit: 'hours', unitPrice: 95, total: 3800 },
        { description: 'Frontend Development', quantity: 80, unit: 'hours', unitPrice: 110, total: 8800 },
        { description: 'Testing & QA', quantity: 20, unit: 'hours', unitPrice: 85, total: 1700 },
      ],
      subtotal: 14300,
      btwRate: BTW_RATE,
      btwAmount: 3003,
      total: 17303,
      currency: 'EUR',
      paymentTerms: '50% upfront, 50% on delivery',
    },
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    sentAt: new Date('2024-02-02'),
  };

  mockProposals.set(sampleProposal.id, sampleProposal);
}

// ============================================================================
// Tool Implementations
// ============================================================================

function generateProposalId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function generateProposalNumber(): string {
  proposalCounter++;
  const year = new Date().getFullYear();
  return `PROP-${year}-${proposalCounter.toString().padStart(4, '0')}`;
}

function calculatePricing(lineItems: LineItem[], discountPercent?: number): ProposalPricing {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountPercent ? subtotal * (discountPercent / 100) : 0;
  const afterDiscount = subtotal - discountAmount;
  const btwAmount = afterDiscount * BTW_RATE;
  const total = afterDiscount + btwAmount;

  return {
    lineItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discountPercent,
    discountAmount: Math.round(discountAmount * 100) / 100,
    btwRate: BTW_RATE,
    btwAmount: Math.round(btwAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: 'EUR',
    paymentTerms: '30 days net',
  };
}

async function createProposal(args: {
  title: string;
  client: ProposalClient;
  template_id?: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }>;
  discount_percent?: number;
  valid_days?: number;
  notes?: string;
}): Promise<Proposal> {
  initMockData();

  const { title, client, template_id, line_items, discount_percent, valid_days = 30, notes } = args;

  // Get template sections if specified
  let sections: ProposalSection[] = [];
  if (template_id) {
    const template = mockTemplates.get(template_id);
    if (template) {
      sections = template.sections.map((s, idx) => ({
        ...s,
        id: `sec_${Date.now()}_${idx}`,
      }));
    }
  }

  // Calculate line item totals and pricing
  const lineItems: LineItem[] = line_items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unit_price,
    total: item.quantity * item.unit_price,
  }));

  const pricing = calculatePricing(lineItems, discount_percent);

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + valid_days);

  const proposal: Proposal = {
    id: generateProposalId(),
    proposalNumber: generateProposalNumber(),
    title,
    client,
    status: 'draft',
    sections,
    pricing,
    validUntil,
    createdAt: now,
    updatedAt: now,
    notes,
  };

  mockProposals.set(proposal.id, proposal);
  return proposal;
}

async function sendProposal(args: {
  proposal_id: string;
  message?: string;
}): Promise<{ success: boolean; proposal?: Proposal; message: string }> {
  initMockData();

  const proposal = mockProposals.get(args.proposal_id);
  if (!proposal) {
    return { success: false, message: `Proposal ${args.proposal_id} not found` };
  }

  if (proposal.status !== 'draft') {
    return {
      success: false,
      proposal,
      message: `Proposal already ${proposal.status}`,
    };
  }

  proposal.status = 'sent';
  proposal.sentAt = new Date();
  proposal.updatedAt = new Date();
  mockProposals.set(proposal.id, proposal);

  return {
    success: true,
    proposal,
    message: `Proposal ${proposal.proposalNumber} sent to ${proposal.client.email}`,
  };
}

async function updateProposalStatus(args: {
  proposal_id: string;
  status: ProposalStatus;
}): Promise<Proposal> {
  initMockData();

  const proposal = mockProposals.get(args.proposal_id);
  if (!proposal) {
    throw new Error(`Proposal ${args.proposal_id} not found`);
  }

  proposal.status = args.status;
  proposal.updatedAt = new Date();

  if (args.status === 'accepted') {
    proposal.signedAt = new Date();
  }

  mockProposals.set(proposal.id, proposal);
  return proposal;
}

async function listProposals(args: {
  status?: ProposalStatus;
  client_company?: string;
}): Promise<{ proposals: Proposal[]; summary: object }> {
  initMockData();

  let proposals = Array.from(mockProposals.values());

  if (args.status) {
    proposals = proposals.filter((p) => p.status === args.status);
  }

  if (args.client_company) {
    proposals = proposals.filter((p) =>
      p.client.company.toLowerCase().includes(args.client_company!.toLowerCase())
    );
  }

  proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const summary = {
    total: proposals.length,
    totalValue: proposals.reduce((sum, p) => sum + p.pricing.total, 0),
    byStatus: {
      draft: proposals.filter((p) => p.status === 'draft').length,
      sent: proposals.filter((p) => p.status === 'sent').length,
      accepted: proposals.filter((p) => p.status === 'accepted').length,
      declined: proposals.filter((p) => p.status === 'declined').length,
    },
    acceptanceRate:
      proposals.length > 0
        ? `${Math.round(
            (proposals.filter((p) => p.status === 'accepted').length / proposals.length) * 100
          )}%`
        : '0%',
  };

  return { proposals, summary };
}

async function getTemplates(): Promise<{ templates: ProposalTemplate[] }> {
  initMockData();
  return { templates: Array.from(mockTemplates.values()) };
}

// ============================================================================
// Agent Tools Definition
// ============================================================================

const PROPOSAL_TOOLS: AgentTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_proposal',
      description: 'Create a new proposal with pricing and optional template.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Proposal title' },
          client: {
            type: 'object',
            description: 'Client details with name, company, email',
          },
          template_id: { type: 'string', description: 'Template ID to use' },
          line_items: {
            type: 'array',
            description: 'Array of line items with description, quantity, unit, unit_price',
          },
          discount_percent: { type: 'number', description: 'Discount percentage' },
          valid_days: { type: 'number', description: 'Days until expiration (default: 30)' },
          notes: { type: 'string', description: 'Internal notes' },
        },
        required: ['title', 'client', 'line_items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_proposal',
      description: 'Send a proposal to the client.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: { type: 'string', description: 'Proposal ID to send' },
          message: { type: 'string', description: 'Custom message to include' },
        },
        required: ['proposal_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_proposal_status',
      description: 'Update proposal status (accepted, declined, etc.).',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: { type: 'string', description: 'Proposal ID' },
          status: {
            type: 'string',
            enum: ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted'],
          },
        },
        required: ['proposal_id', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_proposals',
      description: 'List proposals with optional filtering.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted'],
          },
          client_company: { type: 'string', description: 'Filter by client company' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_templates',
      description: 'Get available proposal templates.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// ============================================================================
// Agent Configuration
// ============================================================================

const PROPOSAL_AGENT_CONFIG: AgentConfig = {
  id: 'finance',
  name: 'Proposal Agent',
  description: 'Handles proposal creation, pricing, and client management with Dutch BTW calculation.',
  systemPrompt: `You are the Proposal Agent for iSyncSO, specializing in professional proposal creation.

Your capabilities:
- Create professional proposals with templates
- Calculate pricing with Dutch BTW (21%)
- Track proposal status and conversions
- Manage proposal templates

Best practices:
- Use clear, benefit-focused language
- Include detailed scope and deliverables
- Set realistic timelines
- Provide transparent pricing
- Include clear terms and conditions

Dutch business conventions:
- Standard BTW rate: 21%
- Payment terms: typically 14-30 days
- Quote validity: usually 30 days
- Include KvK number and BTW-nummer

When creating proposals:
- Focus on client's specific needs
- Highlight unique value proposition
- Include relevant case studies
- Make next steps clear`,
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  temperature: 0.6,
  maxTokens: 2048,
  capabilities: [
    'Proposal creation',
    'Pricing calculation',
    'Template management',
    'Status tracking',
    'Conversion analytics',
  ],
  tools: PROPOSAL_TOOLS,
};

// ============================================================================
// Proposal Agent Class
// ============================================================================

export class ProposalAgent extends BaseAgent {
  constructor(apiKey?: string) {
    super(PROPOSAL_AGENT_CONFIG, apiKey);

    this.registerTool('create_proposal', createProposal);
    this.registerTool('send_proposal', sendProposal);
    this.registerTool('update_proposal_status', updateProposalStatus);
    this.registerTool('list_proposals', listProposals);
    this.registerTool('get_templates', getTemplates);
  }

  async getDraftProposals(): Promise<Proposal[]> {
    const { proposals } = await listProposals({ status: 'draft' });
    return proposals;
  }

  async getAcceptedProposals(): Promise<Proposal[]> {
    const { proposals } = await listProposals({ status: 'accepted' });
    return proposals;
  }
}

// ============================================================================
// Registration & Exports
// ============================================================================

export function registerProposalAgent(): void {
  AgentRegistry.register(PROPOSAL_AGENT_CONFIG, 'active');
}

export { PROPOSAL_AGENT_CONFIG, PROPOSAL_TOOLS };
