/**
 * Compliance Agent
 * Handles EU AI Act compliance, risk assessment, and governance
 */

import { BaseAgent } from '../base-agent';
import { AgentRegistry } from '../registry';
import type { AgentConfig, AgentTool } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface AISystem {
  id: string;
  name: string;
  description: string;
  provider: string;
  purpose: string;
  riskLevel: RiskLevel;
  status: ComplianceStatus;
  category: AICategory;
  dataTypes: DataType[];
  users: string[];
  deploymentDate?: Date;
  lastAssessment?: Date;
  nextReviewDate?: Date;
  documentation: Documentation;
}

export type RiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal';

export type ComplianceStatus =
  | 'compliant'
  | 'partially_compliant'
  | 'non_compliant'
  | 'under_review'
  | 'not_assessed';

export type AICategory =
  | 'biometric'
  | 'critical_infrastructure'
  | 'education'
  | 'employment'
  | 'essential_services'
  | 'law_enforcement'
  | 'migration'
  | 'justice'
  | 'general_purpose'
  | 'other';

export type DataType =
  | 'personal'
  | 'sensitive'
  | 'biometric'
  | 'health'
  | 'financial'
  | 'location'
  | 'behavioral'
  | 'anonymous';

export interface Documentation {
  technicalDoc: boolean;
  riskAssessment: boolean;
  dataProtectionImpact: boolean;
  humanOversight: boolean;
  transparencyInfo: boolean;
  testingResults: boolean;
}

export interface RiskAssessment {
  id: string;
  systemId: string;
  assessedAt: Date;
  assessedBy: string;
  riskLevel: RiskLevel;
  findings: Finding[];
  recommendations: string[];
  overallScore: number;
  nextSteps: string[];
}

export interface Finding {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  requirement: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface Obligation {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  systemIds: string[];
  article: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================================================
// Mock Data Store
// ============================================================================

const mockSystems: Map<string, AISystem> = new Map();
const mockAssessments: Map<string, RiskAssessment> = new Map();
const mockObligations: Map<string, Obligation> = new Map();

function initMockData(): void {
  if (mockSystems.size > 0) return;

  const systems: AISystem[] = [
    {
      id: 'sys_001',
      name: 'Customer Support Chatbot',
      description: 'AI-powered chatbot for handling customer inquiries',
      provider: 'OpenAI',
      purpose: 'Automate customer support responses',
      riskLevel: 'limited',
      status: 'compliant',
      category: 'general_purpose',
      dataTypes: ['personal', 'behavioral'],
      users: ['Customer Support Team'],
      deploymentDate: new Date('2024-01-15'),
      lastAssessment: new Date('2024-06-01'),
      nextReviewDate: new Date('2025-06-01'),
      documentation: {
        technicalDoc: true,
        riskAssessment: true,
        dataProtectionImpact: true,
        humanOversight: true,
        transparencyInfo: true,
        testingResults: true,
      },
    },
    {
      id: 'sys_002',
      name: 'CV Screening Tool',
      description: 'AI system for initial resume screening and candidate ranking',
      provider: 'Internal',
      purpose: 'Automate initial candidate screening in recruitment',
      riskLevel: 'high',
      status: 'under_review',
      category: 'employment',
      dataTypes: ['personal', 'sensitive'],
      users: ['HR Team', 'Hiring Managers'],
      deploymentDate: new Date('2023-09-01'),
      lastAssessment: new Date('2024-03-15'),
      nextReviewDate: new Date('2024-09-15'),
      documentation: {
        technicalDoc: true,
        riskAssessment: true,
        dataProtectionImpact: true,
        humanOversight: false,
        transparencyInfo: false,
        testingResults: true,
      },
    },
    {
      id: 'sys_003',
      name: 'Sales Forecasting Model',
      description: 'Predictive model for sales pipeline forecasting',
      provider: 'Internal',
      purpose: 'Predict quarterly sales performance',
      riskLevel: 'minimal',
      status: 'compliant',
      category: 'other',
      dataTypes: ['financial', 'behavioral'],
      users: ['Sales Team', 'Finance Team'],
      documentation: {
        technicalDoc: true,
        riskAssessment: false,
        dataProtectionImpact: false,
        humanOversight: true,
        transparencyInfo: true,
        testingResults: true,
      },
    },
  ];

  for (const system of systems) {
    mockSystems.set(system.id, system);
  }

  // Sample obligations
  const obligations: Obligation[] = [
    {
      id: 'obl_001',
      title: 'Human Oversight Documentation',
      description: 'Document human oversight procedures for high-risk AI systems',
      dueDate: new Date('2024-08-01'),
      status: 'in_progress',
      systemIds: ['sys_002'],
      article: 'Article 14',
      priority: 'high',
    },
    {
      id: 'obl_002',
      title: 'Transparency Notice Update',
      description: 'Update transparency notices for all customer-facing AI systems',
      dueDate: new Date('2024-09-15'),
      status: 'pending',
      systemIds: ['sys_001', 'sys_002'],
      article: 'Article 13',
      priority: 'medium',
    },
    {
      id: 'obl_003',
      title: 'Annual Risk Re-assessment',
      description: 'Conduct annual risk assessment for high-risk systems',
      dueDate: new Date('2024-06-30'),
      status: 'overdue',
      systemIds: ['sys_002'],
      article: 'Article 9',
      priority: 'critical',
    },
  ];

  for (const obligation of obligations) {
    mockObligations.set(obligation.id, obligation);
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================

async function classifySystem(args: {
  name: string;
  description: string;
  purpose: string;
  category: AICategory;
  data_types: DataType[];
}): Promise<{
  riskLevel: RiskLevel;
  reasoning: string;
  requirements: string[];
  nextSteps: string[];
}> {
  initMockData();

  const { category, data_types, purpose } = args;

  // EU AI Act classification logic
  let riskLevel: RiskLevel = 'minimal';
  const requirements: string[] = [];
  const reasoning: string[] = [];

  // Check for unacceptable risk
  if (
    purpose.toLowerCase().includes('social scoring') ||
    purpose.toLowerCase().includes('subliminal')
  ) {
    riskLevel = 'unacceptable';
    reasoning.push('System appears to involve prohibited practices under Article 5');
  }

  // Check for high-risk categories
  const highRiskCategories: AICategory[] = [
    'biometric',
    'critical_infrastructure',
    'education',
    'employment',
    'essential_services',
    'law_enforcement',
    'migration',
    'justice',
  ];

  if (highRiskCategories.includes(category)) {
    riskLevel = 'high';
    reasoning.push(`Category "${category}" is listed as high-risk under Annex III`);
    requirements.push(
      'Risk management system (Article 9)',
      'Data governance (Article 10)',
      'Technical documentation (Article 11)',
      'Record-keeping (Article 12)',
      'Transparency (Article 13)',
      'Human oversight (Article 14)',
      'Accuracy & robustness (Article 15)'
    );
  }

  // Check for sensitive data
  if (data_types.includes('biometric') || data_types.includes('health')) {
    if (riskLevel === 'minimal') riskLevel = 'limited';
    reasoning.push('Processing of sensitive data requires additional safeguards');
    requirements.push('Data Protection Impact Assessment required');
  }

  // Limited risk for interactive systems
  if (riskLevel === 'minimal' && purpose.toLowerCase().includes('chat')) {
    riskLevel = 'limited';
    reasoning.push('Interactive AI systems have transparency obligations');
    requirements.push('Users must be informed they are interacting with AI (Article 52)');
  }

  const nextSteps =
    riskLevel === 'high'
      ? [
          'Conduct full conformity assessment',
          'Prepare technical documentation',
          'Implement human oversight measures',
          'Register in EU database',
        ]
      : riskLevel === 'limited'
      ? [
          'Implement transparency requirements',
          'Update user notifications',
          'Document AI system characteristics',
        ]
      : ['Document system for internal records', 'Monitor for regulatory updates'];

  return {
    riskLevel,
    reasoning: reasoning.join('. '),
    requirements,
    nextSteps,
  };
}

async function assessRisk(args: {
  system_id: string;
}): Promise<RiskAssessment> {
  initMockData();

  const system = mockSystems.get(args.system_id);
  if (!system) {
    throw new Error(`System ${args.system_id} not found`);
  }

  const findings: Finding[] = [];
  let score = 100;

  // Check documentation
  if (!system.documentation.humanOversight && system.riskLevel === 'high') {
    findings.push({
      id: `find_${Date.now()}_1`,
      category: 'Human Oversight',
      severity: 'critical',
      description: 'Human oversight procedures not documented',
      requirement: 'Article 14 requires human oversight for high-risk systems',
      status: 'open',
    });
    score -= 25;
  }

  if (!system.documentation.transparencyInfo) {
    findings.push({
      id: `find_${Date.now()}_2`,
      category: 'Transparency',
      severity: system.riskLevel === 'high' ? 'high' : 'medium',
      description: 'Transparency information not provided',
      requirement: 'Article 13 requires transparency for users',
      status: 'open',
    });
    score -= 15;
  }

  if (!system.documentation.riskAssessment && system.riskLevel === 'high') {
    findings.push({
      id: `find_${Date.now()}_3`,
      category: 'Risk Management',
      severity: 'high',
      description: 'Risk assessment documentation missing',
      requirement: 'Article 9 requires risk management system',
      status: 'open',
    });
    score -= 20;
  }

  const assessment: RiskAssessment = {
    id: `assess_${Date.now()}`,
    systemId: system.id,
    assessedAt: new Date(),
    assessedBy: 'Compliance Agent',
    riskLevel: system.riskLevel,
    findings,
    recommendations: findings.map(
      (f) => `Address ${f.category}: ${f.description}`
    ),
    overallScore: Math.max(0, score),
    nextSteps:
      findings.length > 0
        ? ['Review and address critical findings', 'Update documentation', 'Schedule follow-up assessment']
        : ['Continue monitoring', 'Schedule next annual review'],
  };

  mockAssessments.set(assessment.id, assessment);
  return assessment;
}

async function listSystems(args: {
  risk_level?: RiskLevel;
  status?: ComplianceStatus;
}): Promise<{ systems: AISystem[]; summary: object }> {
  initMockData();

  let systems = Array.from(mockSystems.values());

  if (args.risk_level) {
    systems = systems.filter((s) => s.riskLevel === args.risk_level);
  }

  if (args.status) {
    systems = systems.filter((s) => s.status === args.status);
  }

  const summary = {
    total: systems.length,
    byRiskLevel: {
      high: systems.filter((s) => s.riskLevel === 'high').length,
      limited: systems.filter((s) => s.riskLevel === 'limited').length,
      minimal: systems.filter((s) => s.riskLevel === 'minimal').length,
    },
    byStatus: {
      compliant: systems.filter((s) => s.status === 'compliant').length,
      under_review: systems.filter((s) => s.status === 'under_review').length,
      non_compliant: systems.filter((s) => s.status === 'non_compliant').length,
    },
  };

  return { systems, summary };
}

async function getObligations(args: {
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority?: 'critical' | 'high' | 'medium' | 'low';
}): Promise<{ obligations: Obligation[]; overdue: number }> {
  initMockData();

  let obligations = Array.from(mockObligations.values());

  if (args.status) {
    obligations = obligations.filter((o) => o.status === args.status);
  }

  if (args.priority) {
    obligations = obligations.filter((o) => o.priority === args.priority);
  }

  // Sort by due date
  obligations.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const overdue = obligations.filter((o) => o.status === 'overdue').length;

  return { obligations, overdue };
}

async function generateReport(args: {
  system_id?: string;
  report_type: 'compliance_summary' | 'risk_assessment' | 'obligations';
}): Promise<{ report: string; generatedAt: Date }> {
  initMockData();

  let report = '';
  const { report_type, system_id } = args;

  if (report_type === 'compliance_summary') {
    const { systems, summary } = await listSystems({});
    report = `# EU AI Act Compliance Summary

## Overview
- Total AI Systems: ${summary.total}
- High-Risk Systems: ${(summary as any).byRiskLevel.high}
- Compliant Systems: ${(summary as any).byStatus.compliant}

## Systems by Risk Level
${systems.map((s) => `- **${s.name}**: ${s.riskLevel} risk, ${s.status}`).join('\n')}

## Recommendations
1. Prioritize high-risk system compliance
2. Complete documentation gaps
3. Schedule regular assessments
`;
  } else if (report_type === 'obligations' ) {
    const { obligations, overdue } = await getObligations({});
    report = `# Compliance Obligations Report

## Summary
- Total Obligations: ${obligations.length}
- Overdue: ${overdue}

## Upcoming Deadlines
${obligations
  .map(
    (o) =>
      `- **${o.title}** (${o.priority}): Due ${o.dueDate.toLocaleDateString()} - ${o.status}`
  )
  .join('\n')}
`;
  } else {
    report = 'Report type not supported';
  }

  return { report, generatedAt: new Date() };
}

// ============================================================================
// Agent Tools Definition
// ============================================================================

const COMPLIANCE_TOOLS: AgentTool[] = [
  {
    type: 'function',
    function: {
      name: 'classify_system',
      description: 'Classify an AI system according to EU AI Act risk levels.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'System name' },
          description: { type: 'string', description: 'System description' },
          purpose: { type: 'string', description: 'Intended purpose' },
          category: {
            type: 'string',
            description: 'AI category',
            enum: ['biometric', 'critical_infrastructure', 'education', 'employment', 'essential_services', 'law_enforcement', 'migration', 'justice', 'general_purpose', 'other'],
          },
          data_types: {
            type: 'array',
            description: 'Types of data processed',
          },
        },
        required: ['name', 'description', 'purpose', 'category', 'data_types'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assess_risk',
      description: 'Perform a risk assessment for a registered AI system.',
      parameters: {
        type: 'object',
        properties: {
          system_id: { type: 'string', description: 'System ID to assess' },
        },
        required: ['system_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_systems',
      description: 'List registered AI systems with optional filtering.',
      parameters: {
        type: 'object',
        properties: {
          risk_level: {
            type: 'string',
            enum: ['unacceptable', 'high', 'limited', 'minimal'],
          },
          status: {
            type: 'string',
            enum: ['compliant', 'partially_compliant', 'non_compliant', 'under_review', 'not_assessed'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_obligations',
      description: 'Get compliance obligations and deadlines.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'overdue'],
          },
          priority: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description: 'Generate compliance reports.',
      parameters: {
        type: 'object',
        properties: {
          system_id: { type: 'string', description: 'Specific system (optional)' },
          report_type: {
            type: 'string',
            enum: ['compliance_summary', 'risk_assessment', 'obligations'],
          },
        },
        required: ['report_type'],
      },
    },
  },
];

// ============================================================================
// Agent Configuration
// ============================================================================

const COMPLIANCE_AGENT_CONFIG: AgentConfig = {
  id: 'sentinel',
  name: 'Compliance Agent',
  description: 'Handles EU AI Act compliance, risk assessment, and governance documentation.',
  systemPrompt: `You are the Compliance Agent (Sentinel) for iSyncSO, specializing in EU AI Act compliance.

Your expertise covers:
- EU AI Act (Regulation 2024/1689) requirements
- AI system risk classification (Article 6, Annex III)
- High-risk AI system requirements (Chapter 2)
- Transparency obligations (Article 52)
- Governance and documentation requirements

Risk Classification Guide:
- **Unacceptable**: Social scoring, subliminal manipulation, exploiting vulnerabilities
- **High-Risk**: Biometrics, critical infrastructure, education, employment, law enforcement
- **Limited**: Chatbots, emotion recognition, deepfakes (transparency required)
- **Minimal**: Spam filters, AI in games (voluntary codes of conduct)

Key Deadlines:
- February 2025: Prohibited AI practices apply
- August 2025: GPAI and governance rules apply
- August 2026: Full high-risk AI requirements apply

When advising on compliance:
- Be specific about applicable articles
- Prioritize by risk and deadline
- Provide actionable next steps
- Consider proportionality for SMEs`,
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  temperature: 0.3,
  maxTokens: 2048,
  capabilities: [
    'AI system classification',
    'Risk assessment',
    'Compliance monitoring',
    'Obligation tracking',
    'Report generation',
  ],
  tools: COMPLIANCE_TOOLS,
};

// ============================================================================
// Compliance Agent Class
// ============================================================================

export class ComplianceAgent extends BaseAgent {
  constructor(apiKey?: string) {
    super(COMPLIANCE_AGENT_CONFIG, apiKey);

    this.registerTool('classify_system', classifySystem);
    this.registerTool('assess_risk', assessRisk);
    this.registerTool('list_systems', listSystems);
    this.registerTool('get_obligations', getObligations);
    this.registerTool('generate_report', generateReport);
  }

  async getHighRiskSystems(): Promise<AISystem[]> {
    const { systems } = await listSystems({ risk_level: 'high' });
    return systems;
  }

  async getOverdueObligations(): Promise<Obligation[]> {
    const { obligations } = await getObligations({ status: 'overdue' });
    return obligations;
  }
}

// ============================================================================
// Registration & Exports
// ============================================================================

export function registerComplianceAgent(): void {
  AgentRegistry.register(COMPLIANCE_AGENT_CONFIG, 'active');
}

export { COMPLIANCE_AGENT_CONFIG, COMPLIANCE_TOOLS };
