/**
 * Email Agent
 * Handles email composition, sending, and campaign management
 */

import { BaseAgent } from '../base-agent';
import { AgentRegistry } from '../registry';
import type { AgentConfig, AgentTool } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
  company?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category: EmailCategory;
}

export type EmailCategory =
  | 'outreach'
  | 'follow_up'
  | 'proposal'
  | 'invoice'
  | 'newsletter'
  | 'notification';

export interface Email {
  id: string;
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  body: string;
  templateId?: string;
  status: EmailStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  createdAt: Date;
}

export type EmailStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed';

export interface EmailSequence {
  id: string;
  name: string;
  steps: EmailSequenceStep[];
  status: 'active' | 'paused' | 'completed';
  enrolledCount: number;
}

export interface EmailSequenceStep {
  order: number;
  templateId: string;
  delayDays: number;
  condition?: string;
}

// ============================================================================
// Mock Data Store
// ============================================================================

const mockEmails: Map<string, Email> = new Map();
const mockTemplates: Map<string, EmailTemplate> = new Map();
const mockSequences: Map<string, EmailSequence> = new Map();

function initMockData(): void {
  if (mockTemplates.size > 0) return;

  // Sample templates
  const templates: EmailTemplate[] = [
    {
      id: 'tpl_outreach_1',
      name: 'Cold Outreach - SaaS',
      subject: 'Quick question about {{company}}',
      body: `Hi {{firstName}},

I noticed {{company}} is growing fast in the {{industry}} space. Congratulations!

I'm reaching out because we help companies like yours {{valueProposition}}.

Would you be open to a quick 15-minute call this week to explore if there's a fit?

Best regards,
{{senderName}}`,
      variables: ['firstName', 'company', 'industry', 'valueProposition', 'senderName'],
      category: 'outreach',
    },
    {
      id: 'tpl_followup_1',
      name: 'Follow-up - No Response',
      subject: 'Re: Quick question about {{company}}',
      body: `Hi {{firstName}},

I wanted to follow up on my previous email. I understand you're busy, so I'll keep this brief.

{{customMessage}}

Would a 10-minute call work better for your schedule?

Best,
{{senderName}}`,
      variables: ['firstName', 'company', 'customMessage', 'senderName'],
      category: 'follow_up',
    },
    {
      id: 'tpl_proposal_1',
      name: 'Proposal Follow-up',
      subject: 'Proposal for {{company}} - Next Steps',
      body: `Hi {{firstName}},

Thank you for your time during our call. As discussed, I've attached our proposal for {{projectName}}.

Key highlights:
{{proposalHighlights}}

I'm available to discuss any questions you might have. What does your timeline look like for a decision?

Best regards,
{{senderName}}`,
      variables: ['firstName', 'company', 'projectName', 'proposalHighlights', 'senderName'],
      category: 'proposal',
    },
  ];

  for (const template of templates) {
    mockTemplates.set(template.id, template);
  }

  // Sample sequence
  const sequence: EmailSequence = {
    id: 'seq_outreach_1',
    name: 'SaaS Outreach Sequence',
    steps: [
      { order: 1, templateId: 'tpl_outreach_1', delayDays: 0 },
      { order: 2, templateId: 'tpl_followup_1', delayDays: 3 },
      { order: 3, templateId: 'tpl_followup_1', delayDays: 7, condition: 'not_replied' },
    ],
    status: 'active',
    enrolledCount: 45,
  };
  mockSequences.set(sequence.id, sequence);
}

// ============================================================================
// Tool Implementations
// ============================================================================

function generateEmailId(): string {
  return `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

async function composeEmail(args: {
  to: EmailRecipient[];
  subject: string;
  body: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  templateId?: string;
  variables?: Record<string, string>;
}): Promise<Email> {
  initMockData();

  let { subject, body } = args;
  const { to, cc, bcc, templateId, variables } = args;

  // Apply template if specified
  if (templateId) {
    const template = mockTemplates.get(templateId);
    if (template) {
      subject = template.subject;
      body = template.body;
    }
  }

  // Replace variables
  if (variables) {
    subject = replaceVariables(subject, variables);
    body = replaceVariables(body, variables);
  }

  const email: Email = {
    id: generateEmailId(),
    to,
    cc,
    bcc,
    subject,
    body,
    templateId,
    status: 'draft',
    createdAt: new Date(),
  };

  mockEmails.set(email.id, email);
  return email;
}

async function sendEmail(args: {
  email_id: string;
  schedule_at?: string;
}): Promise<{ success: boolean; email?: Email; message: string }> {
  initMockData();

  const email = mockEmails.get(args.email_id);
  if (!email) {
    return { success: false, message: `Email ${args.email_id} not found` };
  }

  if (email.status !== 'draft') {
    return {
      success: false,
      email,
      message: `Email already ${email.status}`,
    };
  }

  if (args.schedule_at) {
    email.status = 'scheduled';
    email.scheduledAt = new Date(args.schedule_at);
    mockEmails.set(email.id, email);
    return {
      success: true,
      email,
      message: `Email scheduled for ${email.scheduledAt.toISOString()}`,
    };
  }

  // Simulate sending
  email.status = 'sent';
  email.sentAt = new Date();
  mockEmails.set(email.id, email);

  return {
    success: true,
    email,
    message: `Email sent to ${email.to.map((r) => r.email).join(', ')}`,
  };
}

async function getTemplates(args: {
  category?: EmailCategory;
}): Promise<{ templates: EmailTemplate[]; total: number }> {
  initMockData();

  let templates = Array.from(mockTemplates.values());

  if (args.category) {
    templates = templates.filter((t) => t.category === args.category);
  }

  return { templates, total: templates.length };
}

async function trackEmail(args: {
  email_id: string;
}): Promise<{
  email: Email;
  metrics: {
    delivered: boolean;
    opened: boolean;
    clicked: boolean;
    openRate?: string;
  };
}> {
  initMockData();

  const email = mockEmails.get(args.email_id);
  if (!email) {
    throw new Error(`Email ${args.email_id} not found`);
  }

  // Mock metrics
  const metrics = {
    delivered: ['sent', 'delivered', 'opened', 'clicked'].includes(email.status),
    opened: ['opened', 'clicked'].includes(email.status),
    clicked: email.status === 'clicked',
    openRate: email.status === 'sent' ? '0%' : '45%',
  };

  return { email, metrics };
}

async function createSequence(args: {
  name: string;
  templates: Array<{ templateId: string; delayDays: number }>;
}): Promise<EmailSequence> {
  initMockData();

  const sequence: EmailSequence = {
    id: `seq_${Date.now()}`,
    name: args.name,
    steps: args.templates.map((t, idx) => ({
      order: idx + 1,
      templateId: t.templateId,
      delayDays: t.delayDays,
    })),
    status: 'active',
    enrolledCount: 0,
  };

  mockSequences.set(sequence.id, sequence);
  return sequence;
}

// ============================================================================
// Agent Tools Definition
// ============================================================================

const EMAIL_TOOLS: AgentTool[] = [
  {
    type: 'function',
    function: {
      name: 'compose_email',
      description: 'Compose a new email with optional template and variable substitution.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'array',
            description: 'Array of recipient objects with email, name, and company',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Email body content',
          },
          cc: {
            type: 'array',
            description: 'CC recipients',
          },
          bcc: {
            type: 'array',
            description: 'BCC recipients',
          },
          templateId: {
            type: 'string',
            description: 'Template ID to use',
          },
          variables: {
            type: 'object',
            description: 'Variables to replace in template',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send a composed email immediately or schedule for later.',
      parameters: {
        type: 'object',
        properties: {
          email_id: {
            type: 'string',
            description: 'The email ID to send',
          },
          schedule_at: {
            type: 'string',
            description: 'ISO date string to schedule sending',
          },
        },
        required: ['email_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_templates',
      description: 'Get available email templates, optionally filtered by category.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by category: outreach, follow_up, proposal, invoice, newsletter',
            enum: ['outreach', 'follow_up', 'proposal', 'invoice', 'newsletter', 'notification'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'track_email',
      description: 'Track email delivery and engagement metrics.',
      parameters: {
        type: 'object',
        properties: {
          email_id: {
            type: 'string',
            description: 'The email ID to track',
          },
        },
        required: ['email_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_sequence',
      description: 'Create an automated email sequence with multiple steps.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Sequence name',
          },
          templates: {
            type: 'array',
            description: 'Array of steps with templateId and delayDays',
          },
        },
        required: ['name', 'templates'],
      },
    },
  },
];

// ============================================================================
// Agent Configuration
// ============================================================================

const EMAIL_AGENT_CONFIG: AgentConfig = {
  id: 'growth',
  name: 'Email Agent',
  description: 'Handles email composition, templates, sequences, and campaign tracking.',
  systemPrompt: `You are the Email Agent for iSyncSO, specializing in email communication and campaigns.

Your capabilities:
- Compose professional emails with personalization
- Use and manage email templates
- Create automated email sequences
- Track email delivery and engagement
- Suggest improvements to email copy

Best practices you follow:
- Keep subject lines under 50 characters
- Personalize with recipient's name and company
- Include clear call-to-action
- Optimal send times (Tuesday-Thursday, 9-11am)
- Follow-up after 3-5 days if no response

When composing emails:
- Be concise and professional
- Focus on value for the recipient
- Avoid spam trigger words
- Include proper signature`,
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  temperature: 0.7,
  maxTokens: 2048,
  capabilities: [
    'Email composition',
    'Template management',
    'Sequence automation',
    'Engagement tracking',
    'Copy optimization',
  ],
  tools: EMAIL_TOOLS,
};

// ============================================================================
// Email Agent Class
// ============================================================================

export class EmailAgent extends BaseAgent {
  constructor(apiKey?: string) {
    super(EMAIL_AGENT_CONFIG, apiKey);

    this.registerTool('compose_email', composeEmail);
    this.registerTool('send_email', sendEmail);
    this.registerTool('get_templates', getTemplates);
    this.registerTool('track_email', trackEmail);
    this.registerTool('create_sequence', createSequence);
  }

  async quickCompose(
    to: EmailRecipient[],
    subject: string,
    body: string
  ): Promise<Email> {
    return composeEmail({ to, subject, body });
  }

  async getOutreachTemplates(): Promise<EmailTemplate[]> {
    const { templates } = await getTemplates({ category: 'outreach' });
    return templates;
  }
}

// ============================================================================
// Registration & Exports
// ============================================================================

export function registerEmailAgent(): void {
  AgentRegistry.register(EMAIL_AGENT_CONFIG, 'active');
}

export { EMAIL_AGENT_CONFIG, EMAIL_TOOLS };
