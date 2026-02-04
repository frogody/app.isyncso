/**
 * Flow Template Generator
 * Generates React Flow node/edge templates based on campaign context
 */

import { generateNodeId } from '@/components/flows/flowUtils';

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * Build an AI agent system prompt from campaign context
 * @param {Object} campaign - Campaign object with role_context, target_audience, campaign_goals
 * @returns {string} System prompt for the AI agent node
 */
function buildAgentPrompt(campaign) {
  const productDescription = campaign?.role_context?.product_description || '';
  const targetAudience = campaign?.target_audience || '';
  const primaryGoal = campaign?.campaign_goals?.primary_goal || '';

  const sections = [
    'You are a personalized outreach specialist. Write a highly personalized cold outreach message for the prospect below.',
    '',
    'Use the knowledge base context and prospect data to craft a message that feels genuine and relevant.',
  ];

  if (productDescription) {
    sections.push('');
    sections.push(`## Product/Service`);
    sections.push(productDescription);
  }

  if (targetAudience) {
    sections.push('');
    sections.push(`## Target Audience`);
    sections.push(targetAudience);
  }

  if (primaryGoal) {
    sections.push('');
    sections.push(`## Campaign Goal`);
    sections.push(primaryGoal);
  }

  sections.push('');
  sections.push('## Instructions');
  sections.push('- Reference specific details about their company, role, or recent activity');
  sections.push('- Keep it concise (under 150 words for email, under 300 characters for LinkedIn)');
  sections.push('- Include a clear but soft call-to-action');
  sections.push('- Do NOT use generic templates or filler phrases');
  sections.push('- Output a JSON object with "subject" and "agent_response" fields');

  return sections.join('\n');
}

// ============================================================================
// Template Generator
// ============================================================================

/**
 * Generate a React Flow template based on campaign configuration
 * @param {Object} campaign - Campaign object
 * @param {Object} [campaign.campaign_goals] - Campaign goals
 * @param {Object} [campaign.campaign_goals.channels] - Channel configuration
 * @param {boolean} [campaign.campaign_goals.channels.email] - Include email node
 * @param {boolean} [campaign.campaign_goals.channels.linkedin] - Include LinkedIn node
 * @param {boolean} [campaign.campaign_goals.channels.phone] - Include phone/SMS node
 * @param {Object} [campaign.role_context] - Role context with product_description
 * @param {string} [campaign.target_audience] - Target audience description
 * @returns {{ nodes: Array, edges: Array }} React Flow nodes and edges
 */
export function generateCampaignFlowTemplate(campaign) {
  const nodes = [];
  const edges = [];

  // --- 1. Trigger node (always present) ---
  const triggerId = generateNodeId('trigger');
  nodes.push({
    id: triggerId,
    type: 'trigger',
    position: { x: 250, y: 0 },
    data: {
      name: 'Start - Enriched Prospects',
      trigger_type: 'new_prospect',
    },
  });

  // --- 2. Knowledge Base node (always present) ---
  const knowledgeBaseId = generateNodeId('knowledgeBase');
  nodes.push({
    id: knowledgeBaseId,
    type: 'knowledgeBase',
    position: { x: 250, y: 130 },
    data: {
      name: 'Company Knowledge',
      collections: ['company', 'templates'],
      max_results: 8,
      search_query: '{{prospect.company}} {{prospect.industry}}',
    },
  });

  // --- 3. AI Agent node (always present) ---
  const aiAgentId = generateNodeId('aiAgent');
  nodes.push({
    id: aiAgentId,
    type: 'aiAgent',
    position: { x: 250, y: 260 },
    data: {
      name: 'Generate Personalized Outreach',
      model: 'claude-sonnet',
      prompt: buildAgentPrompt(campaign),
    },
  });

  // --- 4. Channel nodes (conditional) ---
  const channels = campaign?.campaign_goals?.channels || {};
  const channelNodeIds = [];

  if (channels.email) {
    const gmailId = generateNodeId('gmail');
    nodes.push({
      id: gmailId,
      type: 'gmail',
      position: { x: 250, y: 390 },
      data: {
        name: 'Send Email via Gmail',
        subject: '{{aiAgent_result.subject}}',
        body: '{{aiAgent_result.agent_response}}',
        to: '{{prospect.email}}',
      },
    });
    channelNodeIds.push(gmailId);
  }

  if (channels.linkedin) {
    const linkedinId = generateNodeId('linkedin');
    nodes.push({
      id: linkedinId,
      type: 'linkedin',
      position: { x: 500, y: 390 },
      data: {
        name: 'LinkedIn Outreach',
        type: 'connection_request',
      },
    });
    channelNodeIds.push(linkedinId);
  }

  if (channels.phone) {
    const smsId = generateNodeId('sms');
    nodes.push({
      id: smsId,
      type: 'sms',
      position: { x: -10, y: 390 },
      data: {
        name: 'SMS Follow-up',
      },
    });
    channelNodeIds.push(smsId);
  }

  // --- 5. End node ---
  const bottomY = channelNodeIds.length > 0 ? 390 + 130 : 260 + 130;
  const endId = generateNodeId('end');
  nodes.push({
    id: endId,
    type: 'end',
    position: { x: 250, y: bottomY },
    data: {
      name: 'Complete',
    },
  });

  // --- 6. Edges ---
  // trigger → knowledgeBase
  edges.push({
    id: `edge_${triggerId}_${knowledgeBaseId}`,
    source: triggerId,
    target: knowledgeBaseId,
    type: 'custom',
  });

  // knowledgeBase → aiAgent
  edges.push({
    id: `edge_${knowledgeBaseId}_${aiAgentId}`,
    source: knowledgeBaseId,
    target: aiAgentId,
    type: 'custom',
  });

  // aiAgent → each channel node
  for (const channelId of channelNodeIds) {
    edges.push({
      id: `edge_${aiAgentId}_${channelId}`,
      source: aiAgentId,
      target: channelId,
      type: 'custom',
    });
  }

  // each channel node → end
  for (const channelId of channelNodeIds) {
    edges.push({
      id: `edge_${channelId}_${endId}`,
      source: channelId,
      target: endId,
      type: 'custom',
    });
  }

  // If no channel nodes, connect aiAgent directly to end
  if (channelNodeIds.length === 0) {
    edges.push({
      id: `edge_${aiAgentId}_${endId}`,
      source: aiAgentId,
      target: endId,
      type: 'custom',
    });
  }

  return { nodes, edges };
}

// ============================================================================
// Integration Requirements
// ============================================================================

/**
 * Integration definitions keyed by node type
 */
const INTEGRATION_MAP = {
  gmail: { slug: 'gmail', label: 'Gmail', nodeType: 'gmail' },
  hubspot: { slug: 'hubspot', label: 'HubSpot', nodeType: 'hubspot' },
  googleSheets: { slug: 'google_sheets', label: 'Google Sheets', nodeType: 'googleSheets' },
  google_sheets: { slug: 'google_sheets', label: 'Google Sheets', nodeType: 'googleSheets' },
  linkedin: { slug: 'linkedin', label: 'LinkedIn', nodeType: 'linkedin' },
};

/**
 * Determine which third-party integrations are required by a set of flow nodes
 * @param {Array} nodes - React Flow nodes
 * @returns {Array<{ slug: string, label: string, nodeType: string }>} Required integrations
 */
export function getRequiredIntegrations(nodes) {
  const seen = new Set();
  const integrations = [];

  for (const node of nodes) {
    const mapping = INTEGRATION_MAP[node.type];
    if (mapping && !seen.has(mapping.slug)) {
      seen.add(mapping.slug);
      integrations.push({ ...mapping });
    }
  }

  return integrations;
}
