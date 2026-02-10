/**
 * Talent Flow Template Generator
 * Generates React Flow node/edge templates for talent outreach campaigns
 * Follows multi-step sequence: trigger → analysis → agent → channel → timer → condition → follow-ups
 */

import { generateNodeId } from '@/components/flows/flowUtils';

// ============================================================================
// Prompt Builder
// ============================================================================

function buildTalentAgentPrompt(campaign, stage = 'initial') {
  const rc = campaign?.role_context || {};
  const sections = [];

  if (stage === 'initial') {
    sections.push('You are a talent recruitment specialist. Write a highly personalized initial outreach message to a potential candidate.');
  } else if (stage === 'follow_up_1') {
    sections.push('You are following up with a candidate who did not respond to the initial outreach. Write a concise, value-driven follow-up.');
  } else {
    sections.push('This is the final follow-up to a candidate. Be direct, acknowledge their silence, and leave the door open.');
  }

  if (rc.perfect_fit_criteria) {
    sections.push('', '## Why This Candidate Fits', rc.perfect_fit_criteria);
  }

  if (rc.selling_points) {
    sections.push('', '## Why Join Us', rc.selling_points);
  }

  if (rc.must_haves?.length > 0) {
    sections.push('', '## Must-Have Skills', rc.must_haves.join(', '));
  }

  sections.push(
    '',
    '## Instructions',
    '- Reference specific details from the candidate profile',
    '- Keep messages concise (under 150 words for email, under 300 chars for LinkedIn)',
    '- Use a warm, professional tone — not corporate or salesy',
    '- Include a soft call-to-action',
    '- Output JSON with "subject" and "agent_response" fields',
  );

  return sections.join('\n');
}

// ============================================================================
// Channel Node Helper
// ============================================================================

function getChannelNodeType(campaignType) {
  switch (campaignType) {
    case 'linkedin': return 'linkedin';
    case 'sms': return 'sms';
    case 'email':
    case 'gmail':
    default: return 'gmail';
  }
}

function getChannelNodeName(type) {
  switch (type) {
    case 'linkedin': return 'Send LinkedIn Message';
    case 'sms': return 'Send SMS';
    default: return 'Send Email';
  }
}

// ============================================================================
// Template Generator
// ============================================================================

/**
 * Generate a talent outreach flow template based on campaign configuration
 * Flow: trigger → aiAnalysis → aiAgent(initial) → [channel] → timer(3d) → condition
 *   → YES: updateStatus("replied") → end
 *   → NO: aiAgent(follow-up 1) → [channel] → timer(4d) → condition
 *     → YES: end
 *     → NO: aiAgent(final) → [channel] → end
 */
export function generateTalentFlowTemplate(campaign) {
  const nodes = [];
  const edges = [];
  const channelType = getChannelNodeType(campaign?.campaign_type);
  let y = 0;
  const x = 250;
  const spacing = 130;

  // --- 1. Trigger ---
  const triggerId = generateNodeId('trigger');
  nodes.push({
    id: triggerId,
    type: 'trigger',
    position: { x, y },
    data: { name: 'Candidate Matched', trigger_type: 'candidate_matched' },
  });
  y += spacing;

  // --- 2. AI Analysis ---
  const analysisId = generateNodeId('aiAnalysis');
  nodes.push({
    id: analysisId,
    type: 'aiAnalysis',
    position: { x, y },
    data: { name: 'Analyze Candidate Profile', analysis_type: 'candidate_profile' },
  });
  edges.push({ id: `edge_${triggerId}_${analysisId}`, source: triggerId, target: analysisId, type: 'custom' });
  y += spacing;

  // --- 3. AI Agent - Initial Message ---
  const agent1Id = generateNodeId('aiAgent');
  nodes.push({
    id: agent1Id,
    type: 'aiAgent',
    position: { x, y },
    data: {
      name: 'Generate Initial Outreach',
      model: 'claude-sonnet',
      prompt: buildTalentAgentPrompt(campaign, 'initial'),
    },
  });
  edges.push({ id: `edge_${analysisId}_${agent1Id}`, source: analysisId, target: agent1Id, type: 'custom' });
  y += spacing;

  // --- 4. Channel Node 1 ---
  const channel1Id = generateNodeId(channelType);
  nodes.push({
    id: channel1Id,
    type: channelType,
    position: { x, y },
    data: {
      name: getChannelNodeName(channelType),
      subject: '{{aiAgent_result.subject}}',
      body: '{{aiAgent_result.agent_response}}',
      to: '{{candidate.email}}',
    },
  });
  edges.push({ id: `edge_${agent1Id}_${channel1Id}`, source: agent1Id, target: channel1Id, type: 'custom' });
  y += spacing;

  // --- 5. Timer 1 (3 days) ---
  const timer1Id = generateNodeId('timer');
  nodes.push({
    id: timer1Id,
    type: 'timer',
    position: { x, y },
    data: { name: 'Wait 3 Days', delay_days: 3 },
  });
  edges.push({ id: `edge_${channel1Id}_${timer1Id}`, source: channel1Id, target: timer1Id, type: 'custom' });
  y += spacing;

  // --- 6. Condition 1 (replied?) ---
  const cond1Id = generateNodeId('condition');
  nodes.push({
    id: cond1Id,
    type: 'condition',
    position: { x, y },
    data: { name: 'Candidate Replied?', condition: 'candidate.replied === true' },
  });
  edges.push({ id: `edge_${timer1Id}_${cond1Id}`, source: timer1Id, target: cond1Id, type: 'custom' });

  // --- YES branch: updateStatus → end ---
  const updateStatusId = generateNodeId('updateStatus');
  nodes.push({
    id: updateStatusId,
    type: 'updateStatus',
    position: { x: x + 300, y },
    data: { name: 'Mark as Replied', new_status: 'replied' },
  });
  edges.push({ id: `edge_${cond1Id}_true_${updateStatusId}`, source: cond1Id, target: updateStatusId, sourceHandle: 'true', type: 'custom' });

  const end1Id = generateNodeId('end');
  nodes.push({
    id: end1Id,
    type: 'end',
    position: { x: x + 300, y: y + spacing },
    data: { name: 'Complete (Replied)' },
  });
  edges.push({ id: `edge_${updateStatusId}_${end1Id}`, source: updateStatusId, target: end1Id, type: 'custom' });

  // --- NO branch: follow-up 1 ---
  y += spacing;
  const agent2Id = generateNodeId('aiAgent');
  nodes.push({
    id: agent2Id,
    type: 'aiAgent',
    position: { x, y },
    data: {
      name: 'Generate Follow-up 1',
      model: 'claude-sonnet',
      prompt: buildTalentAgentPrompt(campaign, 'follow_up_1'),
    },
  });
  edges.push({ id: `edge_${cond1Id}_false_${agent2Id}`, source: cond1Id, target: agent2Id, sourceHandle: 'false', type: 'custom' });
  y += spacing;

  // --- Channel 2 ---
  const channel2Id = generateNodeId(channelType);
  nodes.push({
    id: channel2Id,
    type: channelType,
    position: { x, y },
    data: {
      name: `${getChannelNodeName(channelType)} (Follow-up)`,
      subject: '{{aiAgent_result.subject}}',
      body: '{{aiAgent_result.agent_response}}',
      to: '{{candidate.email}}',
    },
  });
  edges.push({ id: `edge_${agent2Id}_${channel2Id}`, source: agent2Id, target: channel2Id, type: 'custom' });
  y += spacing;

  // --- Timer 2 (4 days) ---
  const timer2Id = generateNodeId('timer');
  nodes.push({
    id: timer2Id,
    type: 'timer',
    position: { x, y },
    data: { name: 'Wait 4 Days', delay_days: 4 },
  });
  edges.push({ id: `edge_${channel2Id}_${timer2Id}`, source: channel2Id, target: timer2Id, type: 'custom' });
  y += spacing;

  // --- Condition 2 ---
  const cond2Id = generateNodeId('condition');
  nodes.push({
    id: cond2Id,
    type: 'condition',
    position: { x, y },
    data: { name: 'Candidate Replied?', condition: 'candidate.replied === true' },
  });
  edges.push({ id: `edge_${timer2Id}_${cond2Id}`, source: timer2Id, target: cond2Id, type: 'custom' });

  // YES → end
  const end2Id = generateNodeId('end');
  nodes.push({
    id: end2Id,
    type: 'end',
    position: { x: x + 300, y },
    data: { name: 'Complete (Replied)' },
  });
  edges.push({ id: `edge_${cond2Id}_true_${end2Id}`, source: cond2Id, target: end2Id, sourceHandle: 'true', type: 'custom' });

  // NO → final message
  y += spacing;
  const agent3Id = generateNodeId('aiAgent');
  nodes.push({
    id: agent3Id,
    type: 'aiAgent',
    position: { x, y },
    data: {
      name: 'Generate Final Message',
      model: 'claude-sonnet',
      prompt: buildTalentAgentPrompt(campaign, 'final'),
    },
  });
  edges.push({ id: `edge_${cond2Id}_false_${agent3Id}`, source: cond2Id, target: agent3Id, sourceHandle: 'false', type: 'custom' });
  y += spacing;

  // --- Channel 3 ---
  const channel3Id = generateNodeId(channelType);
  nodes.push({
    id: channel3Id,
    type: channelType,
    position: { x, y },
    data: {
      name: `${getChannelNodeName(channelType)} (Final)`,
      subject: '{{aiAgent_result.subject}}',
      body: '{{aiAgent_result.agent_response}}',
      to: '{{candidate.email}}',
    },
  });
  edges.push({ id: `edge_${agent3Id}_${channel3Id}`, source: agent3Id, target: channel3Id, type: 'custom' });
  y += spacing;

  // --- End ---
  const end3Id = generateNodeId('end');
  nodes.push({
    id: end3Id,
    type: 'end',
    position: { x, y },
    data: { name: 'Complete (No Reply)' },
  });
  edges.push({ id: `edge_${channel3Id}_${end3Id}`, source: channel3Id, target: end3Id, type: 'custom' });

  return { nodes, edges };
}

// ============================================================================
// Integration Requirements
// ============================================================================

const TALENT_INTEGRATION_MAP = {
  gmail: { slug: 'gmail', label: 'Gmail', nodeType: 'gmail' },
  linkedin: { slug: 'linkedin', label: 'LinkedIn', nodeType: 'linkedin' },
  sms: { slug: 'twilio', label: 'Twilio SMS', nodeType: 'sms' },
};

/**
 * Determine required integrations from flow nodes
 */
export function getTalentRequiredIntegrations(nodes) {
  const seen = new Set();
  const integrations = [];

  for (const node of nodes) {
    const mapping = TALENT_INTEGRATION_MAP[node.type];
    if (mapping && !seen.has(mapping.slug)) {
      seen.add(mapping.slug);
      integrations.push({ ...mapping });
    }
  }

  return integrations;
}
