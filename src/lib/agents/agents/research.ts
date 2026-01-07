/**
 * Research Agent
 * Handles prospect research, company enrichment, and market intelligence
 */

import { BaseAgent } from '../base-agent';
import { AgentRegistry } from '../registry';
import type { AgentConfig, AgentTool } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: CompanySize;
  revenue?: string;
  founded?: number;
  headquarters: string;
  description: string;
  technologies?: string[];
  socialProfiles?: SocialProfiles;
  contacts?: Contact[];
  enrichedAt: Date;
}

export type CompanySize =
  | '1-10'
  | '11-50'
  | '51-200'
  | '201-500'
  | '501-1000'
  | '1001-5000'
  | '5000+';

export interface SocialProfiles {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  crunchbase?: string;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  email?: string;
  linkedin?: string;
  phone?: string;
  department: string;
}

export interface Prospect {
  id: string;
  company: Company;
  contacts: Contact[];
  score: number;
  status: ProspectStatus;
  signals: Signal[];
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProspectStatus =
  | 'new'
  | 'researching'
  | 'qualified'
  | 'contacted'
  | 'engaged'
  | 'converted'
  | 'disqualified';

export interface Signal {
  type: SignalType;
  description: string;
  strength: 'weak' | 'medium' | 'strong';
  detectedAt: Date;
}

export type SignalType =
  | 'funding'
  | 'hiring'
  | 'expansion'
  | 'technology_adoption'
  | 'leadership_change'
  | 'news_mention'
  | 'website_visit';

export interface ICP {
  id: string;
  name: string;
  industries: string[];
  companySizes: CompanySize[];
  technologies?: string[];
  regions?: string[];
  minRevenue?: string;
  signals?: SignalType[];
}

// ============================================================================
// Mock Data Store
// ============================================================================

const mockCompanies: Map<string, Company> = new Map();
const mockProspects: Map<string, Prospect> = new Map();

function initMockData(): void {
  if (mockCompanies.size > 0) return;

  const companies: Company[] = [
    {
      id: 'comp_001',
      name: 'TechFlow B.V.',
      domain: 'techflow.nl',
      industry: 'Software Development',
      size: '51-200',
      revenue: '€5M-10M',
      founded: 2018,
      headquarters: 'Amsterdam, Netherlands',
      description: 'Cloud-native software development company specializing in enterprise solutions.',
      technologies: ['React', 'Node.js', 'AWS', 'Kubernetes'],
      socialProfiles: {
        linkedin: 'https://linkedin.com/company/techflow-bv',
        twitter: 'https://twitter.com/techflownl',
      },
      contacts: [
        {
          id: 'cont_001',
          name: 'Jan de Vries',
          title: 'CEO',
          email: 'jan@techflow.nl',
          linkedin: 'https://linkedin.com/in/jandevries',
          department: 'Executive',
        },
        {
          id: 'cont_002',
          name: 'Anna Bakker',
          title: 'CTO',
          email: 'anna@techflow.nl',
          department: 'Engineering',
        },
      ],
      enrichedAt: new Date(),
    },
    {
      id: 'comp_002',
      name: 'DataScale GmbH',
      domain: 'datascale.de',
      industry: 'Data Analytics',
      size: '201-500',
      revenue: '€20M-50M',
      founded: 2015,
      headquarters: 'Berlin, Germany',
      description: 'Enterprise data analytics platform for real-time business intelligence.',
      technologies: ['Python', 'Spark', 'Snowflake', 'Tableau'],
      socialProfiles: {
        linkedin: 'https://linkedin.com/company/datascale',
        crunchbase: 'https://crunchbase.com/organization/datascale',
      },
      enrichedAt: new Date(),
    },
    {
      id: 'comp_003',
      name: 'GreenEnergy Solutions',
      domain: 'greenenergy.eu',
      industry: 'Clean Technology',
      size: '11-50',
      revenue: '€1M-5M',
      founded: 2020,
      headquarters: 'Rotterdam, Netherlands',
      description: 'Sustainable energy solutions for commercial buildings.',
      technologies: ['IoT', 'Machine Learning', 'Solar'],
      enrichedAt: new Date(),
    },
  ];

  for (const company of companies) {
    mockCompanies.set(company.id, company);
  }

  // Create prospects from companies
  const prospects: Prospect[] = [
    {
      id: 'pros_001',
      company: companies[0],
      contacts: companies[0].contacts || [],
      score: 85,
      status: 'qualified',
      signals: [
        { type: 'funding', description: 'Series A funding of €3M', strength: 'strong', detectedAt: new Date() },
        { type: 'hiring', description: 'Hiring 5 engineers', strength: 'medium', detectedAt: new Date() },
      ],
      notes: ['Met at SaaS conference', 'Interested in AI solutions'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'pros_002',
      company: companies[1],
      contacts: [],
      score: 72,
      status: 'researching',
      signals: [
        { type: 'technology_adoption', description: 'Evaluating new BI tools', strength: 'medium', detectedAt: new Date() },
      ],
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const prospect of prospects) {
    mockProspects.set(prospect.id, prospect);
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================

async function researchCompany(args: {
  domain?: string;
  name?: string;
}): Promise<Company | { error: string }> {
  initMockData();

  const { domain, name } = args;

  // Search by domain first
  if (domain) {
    for (const company of mockCompanies.values()) {
      if (company.domain.toLowerCase() === domain.toLowerCase()) {
        return company;
      }
    }
  }

  // Search by name
  if (name) {
    for (const company of mockCompanies.values()) {
      if (company.name.toLowerCase().includes(name.toLowerCase())) {
        return company;
      }
    }
  }

  // Mock enrichment for unknown company
  if (domain) {
    const newCompany: Company = {
      id: `comp_${Date.now()}`,
      name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
      domain,
      industry: 'Technology',
      size: '11-50',
      headquarters: 'Unknown',
      description: 'Company information being enriched...',
      enrichedAt: new Date(),
    };
    mockCompanies.set(newCompany.id, newCompany);
    return newCompany;
  }

  return { error: 'Please provide either a domain or company name' };
}

async function findProspects(args: {
  industry?: string;
  size?: CompanySize;
  region?: string;
  limit?: number;
}): Promise<{ prospects: Prospect[]; total: number }> {
  initMockData();

  let prospects = Array.from(mockProspects.values());

  if (args.industry) {
    prospects = prospects.filter((p) =>
      p.company.industry.toLowerCase().includes(args.industry!.toLowerCase())
    );
  }

  if (args.size) {
    prospects = prospects.filter((p) => p.company.size === args.size);
  }

  if (args.region) {
    prospects = prospects.filter((p) =>
      p.company.headquarters.toLowerCase().includes(args.region!.toLowerCase())
    );
  }

  // Sort by score descending
  prospects.sort((a, b) => b.score - a.score);

  const limit = args.limit || 10;
  return {
    prospects: prospects.slice(0, limit),
    total: prospects.length,
  };
}

async function scoreProspect(args: {
  prospect_id?: string;
  company_id?: string;
  icp?: Partial<ICP>;
}): Promise<{
  score: number;
  breakdown: Record<string, number>;
  recommendation: string;
}> {
  initMockData();

  let company: Company | undefined;

  if (args.prospect_id) {
    const prospect = mockProspects.get(args.prospect_id);
    company = prospect?.company;
  } else if (args.company_id) {
    company = mockCompanies.get(args.company_id);
  }

  if (!company) {
    throw new Error('Prospect or company not found');
  }

  // Mock scoring logic
  const breakdown: Record<string, number> = {
    industry_fit: 25,
    company_size: 20,
    technology_stack: 15,
    funding_signals: 20,
    engagement_history: 10,
  };

  const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  let recommendation = 'Neutral';
  if (score >= 80) recommendation = 'High priority - Contact immediately';
  else if (score >= 60) recommendation = 'Good fit - Add to outreach sequence';
  else if (score >= 40) recommendation = 'Monitor - Nurture with content';
  else recommendation = 'Low priority - Review ICP fit';

  return { score, breakdown, recommendation };
}

async function getSignals(args: {
  company_id?: string;
  signal_type?: SignalType;
  days?: number;
}): Promise<{ signals: Signal[]; company?: string }> {
  initMockData();

  const signals: Signal[] = [];
  let companyName: string | undefined;

  if (args.company_id) {
    const company = mockCompanies.get(args.company_id);
    companyName = company?.name;

    for (const prospect of mockProspects.values()) {
      if (prospect.company.id === args.company_id) {
        signals.push(...prospect.signals);
      }
    }
  } else {
    for (const prospect of mockProspects.values()) {
      signals.push(...prospect.signals);
    }
  }

  let filtered = signals;
  if (args.signal_type) {
    filtered = signals.filter((s) => s.type === args.signal_type);
  }

  return { signals: filtered, company: companyName };
}

async function enrichContact(args: {
  email?: string;
  linkedin?: string;
  name?: string;
  company?: string;
}): Promise<Contact | { error: string }> {
  initMockData();

  // Search existing contacts
  for (const company of mockCompanies.values()) {
    for (const contact of company.contacts || []) {
      if (
        (args.email && contact.email === args.email) ||
        (args.linkedin && contact.linkedin === args.linkedin)
      ) {
        return contact;
      }
    }
  }

  // Mock enrichment
  if (args.email || args.linkedin) {
    const contact: Contact = {
      id: `cont_${Date.now()}`,
      name: args.name || 'Unknown',
      title: 'Professional',
      email: args.email,
      linkedin: args.linkedin,
      department: 'Unknown',
    };
    return contact;
  }

  return { error: 'Please provide email or LinkedIn URL' };
}

// ============================================================================
// Agent Tools Definition
// ============================================================================

const RESEARCH_TOOLS: AgentTool[] = [
  {
    type: 'function',
    function: {
      name: 'research_company',
      description: 'Research and enrich company information by domain or name.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Company website domain' },
          name: { type: 'string', description: 'Company name' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_prospects',
      description: 'Find prospects matching criteria like industry, size, and region.',
      parameters: {
        type: 'object',
        properties: {
          industry: { type: 'string', description: 'Industry filter' },
          size: {
            type: 'string',
            description: 'Company size',
            enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'],
          },
          region: { type: 'string', description: 'Geographic region' },
          limit: { type: 'number', description: 'Max results to return' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'score_prospect',
      description: 'Calculate fit score for a prospect based on ICP criteria.',
      parameters: {
        type: 'object',
        properties: {
          prospect_id: { type: 'string', description: 'Prospect ID' },
          company_id: { type: 'string', description: 'Company ID' },
          icp: { type: 'object', description: 'ICP criteria to score against' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_signals',
      description: 'Get buying signals for companies (funding, hiring, tech adoption, etc.).',
      parameters: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: 'Filter by company' },
          signal_type: {
            type: 'string',
            description: 'Signal type filter',
            enum: ['funding', 'hiring', 'expansion', 'technology_adoption', 'leadership_change', 'news_mention'],
          },
          days: { type: 'number', description: 'Signals from last N days' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enrich_contact',
      description: 'Enrich contact information from email or LinkedIn.',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Email address' },
          linkedin: { type: 'string', description: 'LinkedIn profile URL' },
          name: { type: 'string', description: 'Contact name' },
          company: { type: 'string', description: 'Company name' },
        },
      },
    },
  },
];

// ============================================================================
// Agent Configuration
// ============================================================================

const RESEARCH_AGENT_CONFIG: AgentConfig = {
  id: 'growth',
  name: 'Research Agent',
  description: 'Handles prospect research, company enrichment, and buying signal detection.',
  systemPrompt: `You are the Research Agent for iSyncSO, specializing in B2B prospect research and intelligence.

Your capabilities:
- Research and enrich company information
- Find prospects matching ideal customer profiles
- Score prospects based on fit criteria
- Detect buying signals (funding, hiring, tech adoption)
- Enrich contact information

Research best practices:
- Verify information from multiple sources
- Focus on decision-makers and influencers
- Look for recent buying signals
- Consider company growth trajectory
- Assess technology stack compatibility

When presenting research:
- Lead with most relevant findings
- Highlight buying signals prominently
- Provide actionable recommendations
- Include confidence levels where applicable`,
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  temperature: 0.5,
  maxTokens: 2048,
  capabilities: [
    'Company research',
    'Prospect discovery',
    'Lead scoring',
    'Signal detection',
    'Contact enrichment',
  ],
  tools: RESEARCH_TOOLS,
};

// ============================================================================
// Research Agent Class
// ============================================================================

export class ResearchAgent extends BaseAgent {
  constructor(apiKey?: string) {
    super(RESEARCH_AGENT_CONFIG, apiKey);

    this.registerTool('research_company', researchCompany);
    this.registerTool('find_prospects', findProspects);
    this.registerTool('score_prospect', scoreProspect);
    this.registerTool('get_signals', getSignals);
    this.registerTool('enrich_contact', enrichContact);
  }

  async quickResearch(domain: string): Promise<Company | { error: string }> {
    return researchCompany({ domain });
  }

  async getTopProspects(limit = 5): Promise<Prospect[]> {
    const { prospects } = await findProspects({ limit });
    return prospects;
  }
}

// ============================================================================
// Registration & Exports
// ============================================================================

export function registerResearchAgent(): void {
  AgentRegistry.register(RESEARCH_AGENT_CONFIG, 'active');
}

export { RESEARCH_AGENT_CONFIG, RESEARCH_TOOLS };
