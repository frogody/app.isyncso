/**
 * Context Builder Service - Core RAG System Component
 *
 * This service builds the complete context that gets passed to Claude
 * for each AI node execution in a flow. It assembles:
 * - Relevant knowledge from vector DB
 * - Prospect profile and intelligence
 * - Past interactions and memories
 * - Successful patterns
 * - Previous node outputs
 *
 * This is called before EVERY Claude API call in the flow engine.
 */

import {
  searchKnowledge,
  searchMemories,
  searchPatterns,
  getProspectIntelligence
} from './embeddingService';
import { supabase } from '@/api/supabaseClient';

// ============================================================================
// Main Context Builder
// ============================================================================

/**
 * Build complete context for an AI node execution
 * This is called before every Claude API call in the flow engine
 *
 * @param {Object} params
 * @param {Object} params.node - The current node being executed
 * @param {Object} params.execution - The flow execution record
 * @param {Object} params.prospect - The prospect this flow is running for
 * @param {Object} params.flow - The flow definition
 * @returns {Promise<Object>} Complete context object for Claude
 */
export async function buildContext({
  node,
  execution,
  prospect,
  flow
}) {
  const workspaceId = execution.workspace_id;

  // 1. Build search query based on node intent and prospect
  const searchQuery = buildSearchQuery(node, prospect, execution.context);

  // 2. Retrieve relevant knowledge from vector DB
  const knowledgeResult = await searchKnowledge({
    workspaceId,
    query: searchQuery,
    collections: flow.knowledge_bases || ['company', 'templates'],
    limit: 8,
    threshold: 0.65
  });
  const knowledgeResults = knowledgeResult.success ? knowledgeResult.results : [];

  // 3. Get prospect-specific intelligence (skip for sheet-based pseudo-prospects)
  let prospectIntel = {};
  if (prospect?.id && !prospect._from_sheet) {
    const prospectIntelResult = await getProspectIntelligence(workspaceId, prospect.id);
    prospectIntel = prospectIntelResult.success ? prospectIntelResult.intelligence : {};
  }

  // 4. Get past interactions with this prospect (skip for sheet-based pseudo-prospects)
  let prospectMemories = [];
  if (prospect?.id && !prospect._from_sheet) {
    const memoriesResult = await searchMemories({
      workspaceId,
      query: `interactions with ${prospect.company || prospect.name}`,
      prospectId: prospect.id,
      limit: 5
    });
    prospectMemories = memoriesResult.success ? memoriesResult.results : [];
  }

  // 5. Get relevant successful patterns
  const patternsResult = await searchPatterns({
    workspaceId,
    query: searchQuery,
    patternType: getPatternTypeForNode(node.type),
    minEffectiveness: 0.5,
    limit: 3
  });
  const patterns = patternsResult.success ? patternsResult.results : [];

  // 6. Get previous node outputs from this execution
  const previousOutputs = execution.context || {};

  // 7. Assemble the full context object
  return {
    systemPrompt: buildSystemPrompt(flow, node),
    knowledge: formatKnowledge(knowledgeResults),
    prospect: {
      profile: formatProspectProfile(prospect),
      intelligence: prospectIntel,
      conversationHistory: formatMemories(prospectMemories)
    },
    previousOutputs,
    patterns: formatPatterns(patterns),
    nodePrompt: node.data?.prompt || '',
    nodeConfig: node.data?.config || {}
  };
}

// ============================================================================
// Search Query Building
// ============================================================================

/**
 * Build a search query from node intent and prospect context
 *
 * @param {Object} node - The node being executed
 * @param {Object} prospect - The prospect data
 * @param {Object} executionContext - Previous execution context
 * @returns {string} Search query string
 */
function buildSearchQuery(node, prospect, executionContext) {
  const parts = [];

  // Add node type context
  switch (node.type) {
    case 'aiAnalysis':
      parts.push('prospect analysis', 'pain points', 'buying signals');
      break;
    case 'sendEmail':
      parts.push('email template', 'outreach', 'personalization');
      break;
    case 'followUp':
      parts.push('follow up', 'nurturing', 're-engagement');
      break;
    case 'generateContent':
      parts.push('content generation', 'messaging', 'value proposition');
      break;
    case 'subjectLine':
      parts.push('email subject line', 'open rate', 'engagement');
      break;
    case 'linkedinMessage':
      parts.push('linkedin outreach', 'connection request', 'networking');
      break;
    case 'callScript':
      parts.push('cold call script', 'phone outreach', 'objection handling');
      break;
    case 'researchProspect':
      parts.push('company research', 'prospect intelligence', 'background');
      break;
    default:
      parts.push('sales outreach');
  }

  // Add prospect context
  if (prospect.industry) parts.push(prospect.industry);
  if (prospect.company_size) parts.push(`${prospect.company_size} employees`);
  if (prospect.role || prospect.title) parts.push(prospect.role || prospect.title);
  if (prospect.company) parts.push(prospect.company);

  // Add pain points or signals if available
  if (prospect.pain_points) {
    if (Array.isArray(prospect.pain_points)) {
      parts.push(...prospect.pain_points.slice(0, 2));
    } else {
      parts.push(prospect.pain_points);
    }
  }

  // Add custom search terms from node config
  if (node.data?.searchTerms) {
    parts.push(...node.data.searchTerms);
  }

  // Add context from previous nodes if relevant
  if (executionContext?.analysis?.key_topics) {
    parts.push(...executionContext.analysis.key_topics.slice(0, 2));
  }

  return parts.join(' ');
}

/**
 * Get the pattern type relevant for a node type
 *
 * @param {string} nodeType - The type of node
 * @returns {string|null} Pattern type for matching
 */
function getPatternTypeForNode(nodeType) {
  const mapping = {
    'aiAnalysis': 'analysis',
    'sendEmail': 'email_body',
    'followUp': 'follow_up',
    'generateContent': 'content',
    'subjectLine': 'subject_line',
    'linkedinMessage': 'linkedin_message',
    'callScript': 'call_script',
    'researchProspect': 'research'
  };
  return mapping[nodeType] || null;
}

// ============================================================================
// System Prompt Building
// ============================================================================

/**
 * Build the system prompt for the AI
 *
 * @param {Object} flow - The flow definition
 * @param {Object} node - The current node
 * @returns {string} System prompt
 */
function buildSystemPrompt(flow, node) {
  const parts = [];

  // Agent persona (from flow config or default)
  parts.push(flow.agent_persona || `You are an expert B2B sales assistant for iSyncSO.
You help craft personalized outreach and analyze prospects to find the best approach.
You are knowledgeable, professional, and focused on creating genuine value for prospects.`);

  parts.push('');
  parts.push('CORE RULES:');

  // Agent rules (from flow config or defaults)
  const rules = flow.agent_rules || [
    'Always be professional and respectful',
    'Never make up facts - only use information from the provided context',
    'If unsure about something, acknowledge the uncertainty',
    'Focus on the prospect\'s potential pain points and needs',
    'Keep messages concise and value-focused',
    'Personalize based on the specific prospect data provided',
    'Avoid generic or spammy language'
  ];

  rules.forEach(rule => parts.push(`- ${rule}`));

  // Node-specific instructions
  const nodeInstructions = getNodeSpecificInstructions(node.type);
  if (nodeInstructions) {
    parts.push('');
    parts.push(nodeInstructions);
  }

  // Output format instructions if specified
  if (node.data?.outputFormat) {
    parts.push('');
    parts.push(`OUTPUT FORMAT: ${node.data.outputFormat}`);
  }

  return parts.join('\n');
}

/**
 * Get node-specific instructions for the system prompt
 *
 * @param {string} nodeType - The type of node
 * @returns {string|null} Node-specific instructions
 */
function getNodeSpecificInstructions(nodeType) {
  const instructions = {
    sendEmail: `EMAIL GUIDELINES:
- Keep subject lines under 50 characters
- First line should hook the reader with something relevant to them
- Include a clear, low-commitment call-to-action
- Personalize based on prospect data - mention specific details
- Keep body under 150 words
- Use a conversational, human tone
- End with a question or clear next step`,

    subjectLine: `SUBJECT LINE GUIDELINES:
- Keep under 50 characters (ideally under 40)
- Create curiosity without being clickbait
- Personalize when possible (company name, industry)
- Avoid spam trigger words (free, guaranteed, act now)
- Test different approaches: question, statement, or personalization`,

    followUp: `FOLLOW-UP GUIDELINES:
- Reference the previous touchpoint naturally
- Provide new value (don't just "check in")
- Shorter than the initial email
- Try a different angle or offer
- Include a clear reason to reply now`,

    linkedinMessage: `LINKEDIN MESSAGE GUIDELINES:
- Keep connection requests under 300 characters
- Direct messages can be slightly longer but stay concise
- Be conversational and human
- Reference a specific reason for connecting
- Don't pitch immediately - build rapport first`,

    callScript: `CALL SCRIPT GUIDELINES:
- Start with a pattern interrupt (not "How are you?")
- Get to the point in first 30 seconds
- Include objection handling responses
- Have a clear ask ready
- Plan for voicemail option`,

    aiAnalysis: `ANALYSIS GUIDELINES:
- Identify 3-5 key pain points the prospect likely has
- Note any timing signals (recent news, changes)
- Suggest the best outreach angle
- Highlight any red flags or concerns
- Be specific about what makes this prospect relevant`,

    researchProspect: `RESEARCH GUIDELINES:
- Find recent company news or announcements
- Identify the prospect's role and responsibilities
- Note any mutual connections or shared interests
- Look for conversation starters
- Assess fit with our ideal customer profile`,

    aiAgent: `OUTPUT FORMAT - CRITICAL:
Your final output will be sent DIRECTLY to the recipient with ZERO human editing. Every word you write will appear in the actual email/message.

ABSOLUTE RULES - VIOLATION MEANS FAILURE:
1. For emails, output ONLY this:
   Subject: [one subject line]

   [the email body - nothing else]

2. DO NOT include ANY of these (instant failure):
   - Preambles like "Here's a compelling email:" or "Based on my research:"
   - Labels like "Email:" or "Body:" or "Draft:"
   - Placeholders like [Your name] or [Company] - use actual names from the context
   - Word counts like "Word count: 142 words"
   - Meta-commentary like "This email is personalized with..." or "Key elements:"
   - Multiple subject line options
   - Markdown formatting (**, ##, *)
   - Explanations of your strategy or approach

3. Sign off with the ACTUAL sender name from context, not [Your name]
4. Start directly with the greeting (e.g., "Hi Gody,") - no preamble before it
5. The output must be copy-paste ready for an email client`
  };

  return instructions[nodeType] || null;
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format knowledge results for the prompt
 *
 * @param {Array} results - Knowledge search results
 * @returns {string} Formatted knowledge text
 */
function formatKnowledge(results) {
  if (!results || results.length === 0) {
    return 'No relevant knowledge found in the database.';
  }

  return results.map((doc, i) => {
    const source = doc.collection ? `[${doc.collection}]` : '[Source]';
    const title = doc.title ? ` ${doc.title}` : '';
    const similarity = doc.similarity ? ` (${Math.round(doc.similarity * 100)}% match)` : '';
    return `${source}${title}${similarity}\n${doc.content}`;
  }).join('\n\n---\n\n');
}

/**
 * Format prospect profile for the prompt
 *
 * @param {Object} prospect - Prospect data
 * @returns {string} Formatted profile text
 */
function formatProspectProfile(prospect) {
  const fields = [
    ['Name', prospect.name || prospect.full_name || `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim()],
    ['Company', prospect.company || prospect.company_name],
    ['Role', prospect.role || prospect.title || prospect.job_title],
    ['Industry', prospect.industry || prospect.company_industry],
    ['Company Size', prospect.company_size || prospect.employee_count || prospect.company_employee_count],
    ['Location', prospect.location || prospect.city || prospect.person_home_location],
    ['Email', prospect.email],
    ['Phone', prospect.phone],
    ['LinkedIn', prospect.linkedin_url || prospect.linkedin_profile],
    ['Stage', prospect.stage],
    ['Notes', prospect.notes]
  ];

  const formatted = fields
    .filter(([_, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');

  return formatted || 'No prospect profile data available.';
}

/**
 * Format memories (past interactions) for the prompt
 *
 * @param {Array} memories - Memory search results
 * @returns {string} Formatted memories text
 */
function formatMemories(memories) {
  if (!memories || memories.length === 0) {
    return 'No previous interactions recorded.';
  }

  return memories.map(m => {
    const date = m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Unknown date';
    const type = m.interaction_type || m.type || 'interaction';
    const content = m.summary || m.content || 'No details';
    const outcome = m.outcome ? ` [${m.outcome}]` : '';
    return `[${date}] ${type}${outcome}: ${typeof content === 'string' ? content : JSON.stringify(content).slice(0, 200)}`;
  }).join('\n');
}

/**
 * Format patterns for the prompt
 *
 * @param {Array} patterns - Pattern search results
 * @returns {Array|null} Formatted patterns array or null
 */
function formatPatterns(patterns) {
  if (!patterns || patterns.length === 0) {
    return null;
  }

  return patterns.map(p => ({
    name: p.pattern_name || p.name,
    type: p.pattern_type || p.type,
    successRate: Math.round((p.effectiveness_score || p.success_rate || 0) * 100) + '%',
    usageCount: p.usage_count || 0,
    content: p.pattern_content || p.content
  }));
}

// ============================================================================
// Context Formatting for Claude
// ============================================================================

/**
 * Format the complete context into a user message for Claude
 *
 * @param {Object} context - Built context object
 * @returns {string} Formatted context for Claude
 */
export function formatContextForClaude(context) {
  const sections = [];

  // Knowledge section
  sections.push(`## RELEVANT KNOWLEDGE\n${context.knowledge}`);

  // Prospect section
  sections.push(`## CURRENT PROSPECT\n${context.prospect.profile}`);

  // Intelligence section
  if (context.prospect.intelligence && Object.keys(context.prospect.intelligence).length > 0) {
    sections.push(`## PROSPECT INTELLIGENCE\n${JSON.stringify(context.prospect.intelligence, null, 2)}`);
  }

  // Conversation history
  if (context.prospect.conversationHistory && context.prospect.conversationHistory !== 'No previous interactions recorded.') {
    sections.push(`## CONVERSATION HISTORY\n${context.prospect.conversationHistory}`);
  }

  // Previous node outputs
  if (context.previousOutputs && Object.keys(context.previousOutputs).length > 0) {
    sections.push(`## PREVIOUS ANALYSIS IN THIS FLOW\n${JSON.stringify(context.previousOutputs, null, 2)}`);
  }

  // Successful patterns
  if (context.patterns && context.patterns.length > 0) {
    const patternText = context.patterns.map(p =>
      `- ${p.name} (${p.successRate} success rate)${p.content ? `\n  Example: ${p.content.slice(0, 150)}...` : ''}`
    ).join('\n');
    sections.push(`## SUCCESSFUL PATTERNS TO CONSIDER\n${patternText}`);
  }

  // Task instructions
  if (context.nodePrompt) {
    sections.push(`## YOUR TASK\n${context.nodePrompt}`);
  }

  // Node-specific config
  if (context.nodeConfig && Object.keys(context.nodeConfig).length > 0) {
    const configText = Object.entries(context.nodeConfig)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');
    sections.push(`## ADDITIONAL REQUIREMENTS\n${configText}`);
  }

  return sections.join('\n\n');
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Estimate token count (rough approximation)
 * More accurate would be using tiktoken, but this is good for rough limits
 *
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
export function estimateTokens(text) {
  if (!text) return 0;
  // Rough estimate: 1 token ≈ 4 characters for English text
  // This tends to slightly overestimate, which is safer
  return Math.ceil(text.length / 4);
}

/**
 * Trim context to fit within token limit
 * Prioritizes keeping: task instructions > prospect data > patterns > knowledge
 *
 * @param {Object} context - Built context object
 * @param {number} maxTokens - Maximum token limit (default 12000)
 * @returns {string} Trimmed context string
 */
export function trimContextToFit(context, maxTokens = 12000) {
  let formatted = formatContextForClaude(context);
  let tokens = estimateTokens(formatted);

  // If within limit, return as is
  if (tokens <= maxTokens) {
    return formatted;
  }

  console.log(`[contextBuilder] Context exceeds ${maxTokens} tokens (${tokens}), trimming...`);

  // Trim knowledge first (usually the longest and least critical)
  if (context.knowledge && context.knowledge.length > 2000) {
    context.knowledge = context.knowledge.slice(0, 2000) + '\n\n[... additional knowledge truncated for length]';
    formatted = formatContextForClaude(context);
    tokens = estimateTokens(formatted);
  }

  // Trim conversation history if still too long
  if (tokens > maxTokens && context.prospect.conversationHistory) {
    context.prospect.conversationHistory = context.prospect.conversationHistory.slice(0, 500) + '\n[... history truncated]';
    formatted = formatContextForClaude(context);
    tokens = estimateTokens(formatted);
  }

  // Trim previous outputs if still too long
  if (tokens > maxTokens && context.previousOutputs) {
    const keys = Object.keys(context.previousOutputs);
    if (keys.length > 3) {
      // Keep only the 3 most recent/relevant outputs
      const trimmedOutputs = {};
      keys.slice(-3).forEach(key => {
        trimmedOutputs[key] = context.previousOutputs[key];
      });
      context.previousOutputs = trimmedOutputs;
      formatted = formatContextForClaude(context);
      tokens = estimateTokens(formatted);
    }
  }

  // Trim intelligence if still too long
  if (tokens > maxTokens && context.prospect.intelligence) {
    const intel = context.prospect.intelligence;
    context.prospect.intelligence = {
      summary: intel.summary || intel.key_insights?.[0],
      pain_points: intel.pain_points?.slice(0, 3),
      timing_signals: intel.timing_signals?.slice(0, 2)
    };
    formatted = formatContextForClaude(context);
  }

  return formatted;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build a minimal context for quick/simple nodes
 *
 * @param {Object} prospect - Prospect data
 * @param {string} taskPrompt - The task to perform
 * @returns {Object} Minimal context object
 */
export function buildMinimalContext(prospect, taskPrompt) {
  return {
    systemPrompt: `You are a helpful B2B sales assistant. Be concise and professional.`,
    knowledge: '',
    prospect: {
      profile: formatProspectProfile(prospect),
      intelligence: {},
      conversationHistory: ''
    },
    previousOutputs: {},
    patterns: null,
    nodePrompt: taskPrompt,
    nodeConfig: {}
  };
}

/**
 * Merge additional context into an existing context object
 *
 * @param {Object} baseContext - Base context object
 * @param {Object} additionalContext - Additional context to merge
 * @returns {Object} Merged context
 */
export function mergeContext(baseContext, additionalContext) {
  return {
    ...baseContext,
    knowledge: additionalContext.knowledge
      ? `${baseContext.knowledge}\n\n---\n\n${additionalContext.knowledge}`
      : baseContext.knowledge,
    prospect: {
      ...baseContext.prospect,
      ...additionalContext.prospect,
      intelligence: {
        ...baseContext.prospect?.intelligence,
        ...additionalContext.prospect?.intelligence
      }
    },
    previousOutputs: {
      ...baseContext.previousOutputs,
      ...additionalContext.previousOutputs
    },
    patterns: [
      ...(baseContext.patterns || []),
      ...(additionalContext.patterns || [])
    ].slice(0, 5) // Limit total patterns
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  buildContext,
  formatContextForClaude,
  estimateTokens,
  trimContextToFit,
  buildMinimalContext,
  mergeContext
};
