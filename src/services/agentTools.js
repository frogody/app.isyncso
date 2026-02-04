/**
 * Agent Tools Service - Claude Tool System for AI Agent Nodes
 *
 * Provides tool definitions (Anthropic tool_use format) and handlers
 * for AI nodes executing in flows. Tools are organized into categories:
 * - Research: Search knowledge, prospect history, company research
 * - Composition: Email, subject lines, LinkedIn messages
 * - Analysis: Prospect analysis, timing evaluation
 * - Action: Save drafts, schedule follow-ups, update status
 *
 * Each tool handler executes the actual logic and returns results
 * that Claude can use to continue its reasoning.
 */

import {
  searchKnowledge,
  searchMemories,
  scrapeAndEmbed
} from './embeddingService';
import { supabase } from '@/api/supabaseClient';

// ============================================================================
// Tool Definitions (Anthropic tool_use format)
// ============================================================================

/**
 * Tool definitions for Claude API
 * These follow the Anthropic tool_use format specification
 */
export const AGENT_TOOLS = [
  // ============ RESEARCH TOOLS ============
  {
    name: "search_knowledge",
    description: "Search the company knowledge base for relevant information about products, case studies, pricing, best practices, or templates. Use this to find information to help with outreach.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to search for in the knowledge base"
        },
        collection: {
          type: "string",
          enum: ["company", "templates", "patterns", "playbooks", "case_studies", "all"],
          description: "Which collection to search. Use 'company' for product info, 'templates' for email templates, 'patterns' for successful approaches, 'playbooks' for outreach sequences, 'case_studies' for customer stories, or 'all' for everything."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "search_prospect_history",
    description: "Search past interactions and communications with a specific prospect. Use this to understand the relationship history before reaching out.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to search for in the interaction history"
        },
        outcome_filter: {
          type: "string",
          enum: ["positive", "negative", "neutral", "all"],
          description: "Filter by interaction outcome"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "research_company",
    description: "Research a company by scraping their website and storing the information. Use this to gather intel about a prospect's company.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The company website URL to research"
        },
        focus_areas: {
          type: "array",
          items: { type: "string" },
          description: "Specific areas to focus on: 'products', 'about', 'team', 'news', 'careers', 'pricing'"
        }
      },
      required: ["url"]
    }
  },
  {
    name: "get_similar_prospects",
    description: "Find prospects similar to the current one who had successful outcomes. Use this to learn what approaches worked for similar profiles.",
    input_schema: {
      type: "object",
      properties: {
        similarity_factors: {
          type: "array",
          items: { type: "string" },
          description: "Factors to match on: 'industry', 'company_size', 'role', 'location'"
        },
        outcome: {
          type: "string",
          enum: ["converted", "meeting_booked", "replied", "any_positive"],
          description: "What successful outcome to look for"
        }
      },
      required: ["similarity_factors"]
    }
  },

  // ============ COMPOSITION TOOLS ============
  {
    name: "compose_email",
    description: "Compose a personalized email for the prospect. Returns a draft that can be reviewed.",
    input_schema: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          enum: ["introduction", "follow_up", "value_prop", "meeting_request", "check_in", "breakup", "referral_ask", "case_study_share"],
          description: "The purpose of the email"
        },
        tone: {
          type: "string",
          enum: ["professional", "casual", "urgent", "friendly", "consultative"],
          description: "The tone of voice for the email"
        },
        key_points: {
          type: "array",
          items: { type: "string" },
          description: "Key points to include in the email"
        },
        max_length: {
          type: "string",
          enum: ["short", "medium", "long"],
          description: "Desired email length: short (2-3 sentences), medium (1 paragraph), long (2-3 paragraphs)"
        },
        include_cta: {
          type: "boolean",
          description: "Whether to include a clear call-to-action"
        }
      },
      required: ["intent"]
    }
  },
  {
    name: "compose_subject_line",
    description: "Generate subject line options for an email.",
    input_schema: {
      type: "object",
      properties: {
        email_intent: {
          type: "string",
          description: "What the email is about"
        },
        style: {
          type: "string",
          enum: ["question", "benefit", "curiosity", "direct", "personalized", "number", "how_to"],
          description: "Style of subject line"
        },
        count: {
          type: "number",
          description: "Number of options to generate (1-5)"
        }
      },
      required: ["email_intent"]
    }
  },
  {
    name: "compose_linkedin_message",
    description: "Compose a LinkedIn connection request or message.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["connection_request", "inmail", "follow_up", "comment_on_post"],
          description: "Type of LinkedIn message"
        },
        hook: {
          type: "string",
          description: "The personalization hook to use (mutual connection, shared interest, their content, etc.)"
        },
        goal: {
          type: "string",
          enum: ["connect", "start_conversation", "book_meeting", "share_resource"],
          description: "What you want to achieve with this message"
        }
      },
      required: ["type"]
    }
  },
  {
    name: "compose_sms",
    description: "Compose a short SMS message for the prospect.",
    input_schema: {
      type: "object",
      properties: {
        purpose: {
          type: "string",
          enum: ["meeting_reminder", "follow_up", "quick_question", "value_share"],
          description: "Purpose of the SMS"
        },
        include_link: {
          type: "boolean",
          description: "Whether to include a trackable link"
        }
      },
      required: ["purpose"]
    }
  },
  {
    name: "compose_call_script",
    description: "Generate a cold call script or talking points.",
    input_schema: {
      type: "object",
      properties: {
        opening_style: {
          type: "string",
          enum: ["pattern_interrupt", "referral", "trigger_event", "direct"],
          description: "How to open the call"
        },
        include_objection_handlers: {
          type: "boolean",
          description: "Whether to include objection handling responses"
        },
        goal: {
          type: "string",
          enum: ["book_meeting", "qualify", "gather_info", "pitch"],
          description: "Primary goal of the call"
        }
      },
      required: ["opening_style"]
    }
  },

  // ============ ANALYSIS TOOLS ============
  {
    name: "analyze_prospect",
    description: "Analyze a prospect to identify pain points, triggers, and best approach angles.",
    input_schema: {
      type: "object",
      properties: {
        analysis_type: {
          type: "string",
          enum: ["pain_points", "triggers", "objections", "approach_angles", "buying_committee", "timeline", "full"],
          description: "Type of analysis to perform"
        },
        depth: {
          type: "string",
          enum: ["quick", "detailed"],
          description: "How deep to analyze"
        }
      },
      required: ["analysis_type"]
    }
  },
  {
    name: "evaluate_timing",
    description: "Evaluate the best time and channel to reach the prospect based on engagement patterns and signals.",
    input_schema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          enum: ["email", "linkedin", "phone", "sms", "any"],
          description: "Which channel to evaluate timing for"
        },
        consider_timezone: {
          type: "boolean",
          description: "Whether to factor in prospect's timezone"
        }
      }
    }
  },
  {
    name: "score_engagement",
    description: "Calculate an engagement score based on prospect interactions.",
    input_schema: {
      type: "object",
      properties: {
        timeframe_days: {
          type: "number",
          description: "How many days back to analyze (default 30)"
        }
      }
    }
  },

  // ============ ACTION TOOLS ============
  {
    name: "save_draft",
    description: "Save a composed message as a draft for review.",
    input_schema: {
      type: "object",
      properties: {
        content_type: {
          type: "string",
          enum: ["email", "linkedin", "sms", "call_script"],
          description: "Type of content"
        },
        subject: {
          type: "string",
          description: "Subject line (for email)"
        },
        body: {
          type: "string",
          description: "The message content"
        },
        notes: {
          type: "string",
          description: "Internal notes about this draft"
        },
        priority: {
          type: "string",
          enum: ["high", "normal", "low"],
          description: "Priority level for review"
        }
      },
      required: ["content_type", "body"]
    }
  },
  {
    name: "schedule_follow_up",
    description: "Schedule a follow-up action for later.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["send_email", "send_linkedin", "make_call", "send_sms", "check_engagement", "re_evaluate"],
          description: "What action to schedule"
        },
        delay_days: {
          type: "number",
          description: "Days from now to perform the action"
        },
        condition: {
          type: "string",
          enum: ["always", "if_no_reply", "if_opened", "if_clicked"],
          description: "Condition for executing the follow-up"
        },
        notes: {
          type: "string",
          description: "Notes for the follow-up context"
        }
      },
      required: ["action", "delay_days"]
    }
  },
  {
    name: "update_prospect_status",
    description: "Update the prospect's status or add notes.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["new", "contacted", "engaged", "meeting_scheduled", "qualified", "not_interested", "nurture", "closed_won", "closed_lost"],
          description: "New status for the prospect"
        },
        notes: {
          type: "string",
          description: "Notes to add to the prospect record"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to add to the prospect"
        }
      }
    }
  },
  {
    name: "log_interaction",
    description: "Log an interaction that happened outside the system.",
    input_schema: {
      type: "object",
      properties: {
        interaction_type: {
          type: "string",
          enum: ["call", "email", "meeting", "linkedin", "event", "referral"],
          description: "Type of interaction"
        },
        outcome: {
          type: "string",
          enum: ["positive", "neutral", "negative"],
          description: "How the interaction went"
        },
        summary: {
          type: "string",
          description: "Brief summary of the interaction"
        },
        next_steps: {
          type: "string",
          description: "Agreed next steps, if any"
        }
      },
      required: ["interaction_type", "summary"]
    }
  }
];

// ============================================================================
// Tool Execution Handler
// ============================================================================

/**
 * Execute a tool call and return results
 *
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} toolInput - Input parameters for the tool
 * @param {Object} context - Execution context (workspaceId, prospectId, etc.)
 * @returns {Promise<Object>} Tool execution result
 */
export async function executeToolCall(toolName, toolInput, context) {
  // Validate context
  if (!context || typeof context !== 'object') {
    return { success: false, error: 'Invalid execution context' };
  }

  const { workspaceId, prospectId, executionId, prospect } = context;

  if (!workspaceId) {
    return { success: false, error: 'Missing workspaceId in context' };
  }
  if (!executionId) {
    return { success: false, error: 'Missing executionId in context' };
  }

  const startTime = Date.now();

  try {
    console.log(`[agentTools] Executing tool: ${toolName}`, {
      toolInput: JSON.stringify(toolInput).slice(0, 200),
      prospectId
    });

    let result;

    switch (toolName) {
      // RESEARCH TOOLS
      case 'search_knowledge':
        result = await handleSearchKnowledge(toolInput, workspaceId);
        break;
      case 'search_prospect_history':
        result = await handleSearchHistory(toolInput, workspaceId, prospectId);
        break;
      case 'research_company':
        result = await handleResearchCompany(toolInput, workspaceId, prospectId);
        break;
      case 'get_similar_prospects':
        result = await handleGetSimilarProspects(toolInput, workspaceId, prospect);
        break;

      // COMPOSITION TOOLS
      case 'compose_email':
        result = handleComposeEmail(toolInput, prospect);
        break;
      case 'compose_subject_line':
        result = handleComposeSubjectLine(toolInput, prospect);
        break;
      case 'compose_linkedin_message':
        result = handleComposeLinkedIn(toolInput, prospect);
        break;
      case 'compose_sms':
        result = handleComposeSMS(toolInput, prospect);
        break;
      case 'compose_call_script':
        result = handleComposeCallScript(toolInput, prospect);
        break;

      // ANALYSIS TOOLS
      case 'analyze_prospect':
        result = await handleAnalyzeProspect(toolInput, prospect, workspaceId);
        break;
      case 'evaluate_timing':
        result = await handleEvaluateTiming(toolInput, prospectId, workspaceId);
        break;
      case 'score_engagement':
        result = await handleScoreEngagement(toolInput, prospectId, workspaceId);
        break;

      // ACTION TOOLS
      case 'save_draft':
        result = await handleSaveDraft(toolInput, prospectId, executionId, workspaceId);
        break;
      case 'schedule_follow_up':
        result = await handleScheduleFollowUp(toolInput, prospectId, executionId, workspaceId);
        break;
      case 'update_prospect_status':
        result = await handleUpdateProspectStatus(toolInput, prospectId, executionId);
        break;
      case 'log_interaction':
        result = await handleLogInteraction(toolInput, prospectId, workspaceId, executionId);
        break;

      default:
        result = { success: false, error: `Unknown tool: ${toolName}` };
    }

    const duration = Date.now() - startTime;
    console.log(`[agentTools] Tool ${toolName} completed in ${duration}ms`, {
      success: result.success !== false
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[agentTools] Tool ${toolName} failed after ${duration}ms:`, error);

    return {
      success: false,
      error: `Tool execution failed: ${error.message}`,
      tool: toolName,
      duration
    };
  }
}

// ============================================================================
// Research Tool Handlers
// ============================================================================

async function handleSearchKnowledge(input, workspaceId) {
  const collections = input.collection === 'all' ? null : [input.collection];

  const result = await searchKnowledge({
    workspaceId,
    query: input.query,
    collections,
    limit: 5,
    threshold: 0.6
  });

  if (!result.success) {
    return { error: result.error, found: 0, results: [] };
  }

  return {
    found: result.results?.length || 0,
    results: (result.results || []).map(r => ({
      title: r.title,
      content: r.content?.slice(0, 500) || '',
      collection: r.collection,
      similarity: r.similarity ? Math.round(r.similarity * 100) + '%' : null
    }))
  };
}

async function handleSearchHistory(input, workspaceId, prospectId) {
  const outcome = input.outcome_filter === 'all' ? null : input.outcome_filter;

  const result = await searchMemories({
    workspaceId,
    query: input.query,
    prospectId,
    outcome,
    limit: 5
  });

  if (!result.success) {
    return { error: result.error, found: 0, interactions: [] };
  }

  return {
    found: result.results?.length || 0,
    interactions: (result.results || []).map(r => ({
      date: r.created_at,
      type: r.interaction_type,
      channel: r.channel,
      outcome: r.outcome,
      summary: r.summary || (typeof r.content === 'string' ? r.content.slice(0, 200) : JSON.stringify(r.content).slice(0, 200))
    }))
  };
}

async function handleResearchCompany(input, workspaceId, prospectId) {
  const result = await scrapeAndEmbed({
    workspaceId,
    url: input.url,
    collection: 'prospects',
    metadata: {
      prospect_id: prospectId,
      focus_areas: input.focus_areas,
      scraped_at: new Date().toISOString()
    }
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    documentId: result.documentId,
    title: result.title,
    message: `Successfully researched and stored information from ${input.url}`
  };
}

async function handleGetSimilarProspects(input, workspaceId, currentProspect) {
  // Build query based on similarity factors
  let query = supabase
    .from('prospects')
    .select('id, company, industry, company_size, stage, notes')
    .eq('workspace_id', workspaceId)
    .neq('id', currentProspect.id);

  // Apply filters based on similarity factors
  if (input.similarity_factors.includes('industry') && currentProspect.industry) {
    query = query.eq('industry', currentProspect.industry);
  }
  if (input.similarity_factors.includes('company_size') && currentProspect.company_size) {
    query = query.eq('company_size', currentProspect.company_size);
  }

  // Filter by outcome
  const outcomeMap = {
    'converted': ['closed_won'],
    'meeting_booked': ['meeting_scheduled', 'qualified', 'closed_won'],
    'replied': ['engaged', 'meeting_scheduled', 'qualified', 'closed_won'],
    'any_positive': ['engaged', 'meeting_scheduled', 'qualified', 'closed_won']
  };

  const stages = outcomeMap[input.outcome] || outcomeMap['any_positive'];
  query = query.in('stage', stages);

  const { data, error } = await query.limit(5);

  if (error) {
    return { error: error.message, similar_prospects: [] };
  }

  return {
    found: data?.length || 0,
    similar_prospects: (data || []).map(p => ({
      company: p.company,
      industry: p.industry,
      company_size: p.company_size,
      outcome: p.stage,
      notes: p.notes?.slice(0, 200)
    }))
  };
}

// ============================================================================
// Composition Tool Handlers (Return guidance for Claude)
// ============================================================================

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 254;
}

function handleComposeEmail(input, prospect) {
  // Validate prospect has a valid email
  const email = prospect?.email || prospect?.company_email || prospect?.work_email;

  if (!email) {
    return {
      success: false,
      error: 'Prospect does not have an email address',
      guidance: 'Cannot compose email - no email address available for this prospect'
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      error: 'Prospect email address is invalid',
      guidance: `Email "${email}" does not appear to be valid`
    };
  }

  return {
    template_guidance: {
      intent: input.intent,
      tone: input.tone || 'professional',
      key_points: input.key_points || [],
      max_length: input.max_length || 'medium',
      include_cta: input.include_cta !== false,
      prospect_name: prospect.name || prospect.full_name ||
        `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim() || 'there',
      prospect_email: email,
      company: prospect.company || prospect.company_name,
      role: prospect.role || prospect.title,
      industry: prospect.industry
    },
    length_guide: {
      short: '2-3 sentences, under 50 words',
      medium: '1 paragraph, 75-100 words',
      long: '2-3 paragraphs, 150-200 words'
    },
    instruction: "Now compose the email using this guidance and the prospect context. Return the full email text."
  };
}

function handleComposeSubjectLine(input, prospect) {
  return {
    guidance: {
      email_intent: input.email_intent,
      style: input.style || 'personalized',
      count: Math.min(input.count || 3, 5),
      prospect_name: prospect.name || prospect.first_name,
      company: prospect.company || prospect.company_name
    },
    style_examples: {
      question: "Quick question about {topic}?",
      benefit: "{Benefit} for {company}",
      curiosity: "Noticed something about {company}...",
      direct: "{Specific request}",
      personalized: "{Name}, {relevant detail}",
      number: "3 ways to {achieve outcome}",
      how_to: "How {similar company} solved {problem}"
    },
    instruction: "Generate subject line options based on this guidance. Keep each under 50 characters."
  };
}

function handleComposeLinkedIn(input, prospect) {
  const charLimits = {
    connection_request: 300,
    inmail: 1900,
    follow_up: 1900,
    comment_on_post: 1250
  };

  return {
    guidance: {
      type: input.type,
      hook: input.hook,
      goal: input.goal || 'connect',
      char_limit: charLimits[input.type] || 300,
      prospect_name: prospect.name || prospect.first_name,
      prospect_title: prospect.role || prospect.title,
      prospect_company: prospect.company || prospect.company_name
    },
    best_practices: {
      connection_request: "Keep it short, specific, and human. Mention something specific about them.",
      inmail: "Lead with value, not a pitch. Reference something relevant to them.",
      follow_up: "Reference previous interaction, provide new value.",
      comment_on_post: "Add genuine insight, not just agreement."
    },
    instruction: `Compose the ${input.type} within the character limit. Be conversational and genuine.`
  };
}

function handleComposeSMS(input, prospect) {
  return {
    guidance: {
      purpose: input.purpose,
      include_link: input.include_link || false,
      prospect_name: prospect.name || prospect.first_name,
      char_limit: 160 // Standard SMS
    },
    best_practices: {
      meeting_reminder: "Brief, time-specific, professional",
      follow_up: "Reference previous contact, quick value add",
      quick_question: "One simple question they can answer easily",
      value_share: "Lead with the value, link to more info"
    },
    instruction: "Compose a brief SMS message (under 160 characters). Be direct and human."
  };
}

function handleComposeCallScript(input, prospect) {
  return {
    guidance: {
      opening_style: input.opening_style,
      include_objection_handlers: input.include_objection_handlers !== false,
      goal: input.goal || 'book_meeting',
      prospect_name: prospect.name || prospect.first_name,
      prospect_title: prospect.role || prospect.title,
      prospect_company: prospect.company || prospect.company_name
    },
    script_structure: [
      "1. Opening (pattern interrupt, not 'How are you?')",
      "2. Reason for call (30 seconds max)",
      "3. Value statement / pain point",
      "4. Qualifying question",
      "5. Handle objections if needed",
      "6. Clear ask / CTA",
      "7. Voicemail alternative"
    ],
    common_objections: [
      "Not interested / We're all set",
      "Send me an email",
      "Bad timing / Too busy",
      "Already working with someone",
      "What's this about?"
    ],
    instruction: "Generate a call script following this structure. Include objection handlers if requested."
  };
}

// ============================================================================
// Analysis Tool Handlers
// ============================================================================

async function handleAnalyzeProspect(input, prospect, workspaceId) {
  // Search for relevant patterns and knowledge
  const searchResult = await searchKnowledge({
    workspaceId,
    query: `${prospect.industry || ''} ${prospect.role || prospect.title || ''} pain points objections buying signals`,
    collections: ['patterns', 'company'],
    limit: 3
  });

  const patterns = searchResult.success ? searchResult.results : [];

  return {
    analysis_type: input.analysis_type,
    depth: input.depth || 'detailed',
    prospect_context: {
      name: prospect.name || prospect.full_name,
      company: prospect.company || prospect.company_name,
      industry: prospect.industry,
      role: prospect.role || prospect.title,
      company_size: prospect.company_size,
      location: prospect.location,
      stage: prospect.stage,
      notes: prospect.notes
    },
    relevant_patterns: patterns.slice(0, 2).map(p => ({
      title: p.title,
      content: p.content?.slice(0, 300)
    })),
    analysis_framework: {
      pain_points: "Identify 3-5 likely pain points based on role, industry, and company size",
      triggers: "Look for timing signals: new role, company growth, funding, etc.",
      objections: "Predict likely objections and prepare responses",
      approach_angles: "Suggest 2-3 personalization angles",
      buying_committee: "Identify other stakeholders likely involved",
      timeline: "Estimate urgency and decision timeline",
      full: "Cover all of the above comprehensively"
    },
    instruction: `Perform ${input.analysis_type} analysis for this prospect using the framework above.`
  };
}

async function handleEvaluateTiming(input, prospectId, workspaceId) {
  // Get recent engagement data from interaction_memory
  const { data: recentInteractions, error } = await supabase
    .from('interaction_memory')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[agentTools] Error fetching interactions:', error);
  }

  const interactions = recentInteractions || [];

  // Analyze engagement patterns
  const emailInteractions = interactions.filter(i => i.channel === 'email');
  const openedEmails = emailInteractions.filter(i => i.content?.opened_at);
  const clickedEmails = emailInteractions.filter(i => i.content?.clicked_at);

  // Extract open times if available
  const openTimes = openedEmails
    .filter(e => e.content?.opened_at)
    .map(e => new Date(e.content.opened_at).getHours());

  const averageOpenHour = openTimes.length > 0
    ? Math.round(openTimes.reduce((a, b) => a + b, 0) / openTimes.length)
    : null;

  return {
    channel: input.channel || 'any',
    consider_timezone: input.consider_timezone || false,
    engagement_data: {
      total_interactions: interactions.length,
      emails_sent: emailInteractions.length,
      emails_opened: openedEmails.length,
      emails_clicked: clickedEmails.length,
      open_rate: emailInteractions.length > 0
        ? Math.round(openedEmails.length / emailInteractions.length * 100) + '%'
        : 'N/A',
      click_rate: openedEmails.length > 0
        ? Math.round(clickedEmails.length / openedEmails.length * 100) + '%'
        : 'N/A',
      average_open_hour: averageOpenHour,
      last_interaction: interactions[0]?.created_at || 'Never'
    },
    instruction: "Based on this engagement data, recommend the best timing and channel to reach this prospect."
  };
}

async function handleScoreEngagement(input, prospectId, workspaceId) {
  const timeframeDays = input.timeframe_days || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

  const { data: interactions, error } = await supabase
    .from('interaction_memory')
    .select('*')
    .eq('prospect_id', prospectId)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message, score: 0 };
  }

  // Calculate engagement score
  let score = 0;
  const factors = [];

  (interactions || []).forEach(i => {
    switch (i.outcome) {
      case 'positive':
        score += 20;
        factors.push(`Positive ${i.interaction_type}`);
        break;
      case 'neutral':
        score += 5;
        break;
      case 'negative':
        score -= 10;
        factors.push(`Negative ${i.interaction_type}`);
        break;
    }

    // Bonus for opens/clicks
    if (i.content?.opened_at) score += 5;
    if (i.content?.clicked_at) score += 10;
    if (i.content?.replied) score += 25;
  });

  // Cap at 100
  score = Math.min(Math.max(score, 0), 100);

  return {
    score,
    level: score >= 70 ? 'hot' : score >= 40 ? 'warm' : score >= 20 ? 'cool' : 'cold',
    timeframe_days: timeframeDays,
    interaction_count: interactions?.length || 0,
    contributing_factors: factors.slice(0, 5),
    recommendation: score >= 70
      ? 'High engagement - prioritize outreach'
      : score >= 40
        ? 'Moderate engagement - continue nurturing'
        : 'Low engagement - try a different approach'
  };
}

// ============================================================================
// Action Tool Handlers
// ============================================================================

async function handleSaveDraft(input, prospectId, executionId, workspaceId) {
  const { data, error } = await supabase
    .from('interaction_memory')
    .insert({
      workspace_id: workspaceId,
      prospect_id: prospectId,
      execution_id: executionId,
      interaction_type: 'draft_created',
      channel: input.content_type,
      content: {
        subject: input.subject,
        body: input.body,
        notes: input.notes,
        priority: input.priority || 'normal'
      },
      outcome: 'pending'
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    draft_id: data.id,
    message: `Draft ${input.content_type} saved successfully`,
    priority: input.priority || 'normal'
  };
}

async function handleScheduleFollowUp(input, prospectId, executionId, workspaceId) {
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + input.delay_days);

  // Store in flow_executions or a dedicated follow_ups table
  const { data, error } = await supabase
    .from('interaction_memory')
    .insert({
      workspace_id: workspaceId,
      prospect_id: prospectId,
      execution_id: executionId,
      interaction_type: 'follow_up_scheduled',
      channel: input.action.replace('send_', '').replace('make_', ''),
      content: {
        scheduled_action: input.action,
        scheduled_for: scheduledDate.toISOString(),
        condition: input.condition || 'always',
        notes: input.notes
      },
      outcome: 'pending'
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    follow_up_id: data.id,
    scheduled_for: scheduledDate.toISOString(),
    action: input.action,
    condition: input.condition || 'always',
    message: `Follow-up ${input.action} scheduled for ${scheduledDate.toLocaleDateString()}${input.condition && input.condition !== 'always' ? ` (${input.condition})` : ''}`
  };
}

async function handleUpdateProspectStatus(input, prospectId, executionId) {
  if (!prospectId) {
    return { success: false, error: 'No prospect ID provided' };
  }

  // Check for duplicate update in this execution (idempotency)
  if (executionId && input.status) {
    const { data: existingUpdate } = await supabase
      .from('interaction_memory')
      .select('id')
      .eq('prospect_id', prospectId)
      .eq('interaction_type', 'status_update')
      .eq('content', `Status changed to ${input.status}`)
      .limit(1)
      .maybeSingle();

    if (existingUpdate) {
      console.log(`[agentTools] Idempotent: prospect ${prospectId} already updated to ${input.status}`);
      return {
        success: true,
        message: 'Prospect already updated in this execution',
        idempotent: true
      };
    }
  }

  // Get current prospect state
  const { data: prospect, error: fetchError } = await supabase
    .from('prospects')
    .select('stage, notes, tags')
    .eq('id', prospectId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const previousStatus = prospect?.stage;
  const updates = {};
  if (input.status) updates.stage = input.status;
  if (input.notes) {
    updates.notes = prospect?.notes
      ? `${prospect.notes}\n\n[${new Date().toISOString()}] ${input.notes}`
      : input.notes;
  }

  // Handle tags
  if (input.tags && input.tags.length > 0) {
    const existingTags = prospect?.tags || [];
    updates.tags = [...new Set([...existingTags, ...input.tags])];
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', prospectId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log the update for idempotency tracking
  if (input.status) {
    await supabase.from('interaction_memory').insert({
      prospect_id: prospectId,
      interaction_type: 'status_update',
      outcome: 'updated',
      content: `Status changed to ${input.status}`,
      metadata: {
        execution_id: executionId,
        update_type: 'status_change',
        previous_status: previousStatus,
        new_status: input.status,
        notes: input.notes
      }
    }).then(null, err => console.warn('[agentTools] Failed to log status update:', err));
  }

  return {
    success: true,
    message: `Prospect updated${input.status ? ` - status: ${input.status}` : ''}${input.tags ? ` - added tags: ${input.tags.join(', ')}` : ''}`,
    previous_status: previousStatus,
    new_status: input.status
  };
}

async function handleLogInteraction(input, prospectId, workspaceId, executionId) {
  const { data, error } = await supabase
    .from('interaction_memory')
    .insert({
      workspace_id: workspaceId,
      prospect_id: prospectId,
      execution_id: executionId,
      interaction_type: input.interaction_type,
      outcome: input.outcome,
      summary: input.summary,
      content: {
        next_steps: input.next_steps,
        logged_manually: true
      }
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    interaction_id: data.id,
    message: `${input.interaction_type} interaction logged (${input.outcome})`
  };
}

// ============================================================================
// Tool Filtering by Node Type
// ============================================================================

/**
 * Get tools filtered by node type
 * Different nodes have access to different tools based on their purpose
 *
 * @param {string} nodeType - The type of node
 * @returns {Array} Filtered tool definitions
 */
export function getToolsForNodeType(nodeType) {
  const toolsByType = {
    // Analysis nodes - research and analyze
    aiAnalysis: [
      'search_knowledge',
      'search_prospect_history',
      'analyze_prospect',
      'get_similar_prospects',
      'score_engagement'
    ],

    // Research nodes - gather information
    researchProspect: [
      'research_company',
      'search_knowledge',
      'search_prospect_history',
      'get_similar_prospects',
      'analyze_prospect'
    ],

    // Email composition nodes
    sendEmail: [
      'compose_email',
      'compose_subject_line',
      'search_knowledge',
      'search_prospect_history',
      'save_draft',
      'schedule_follow_up'
    ],

    // Follow-up nodes
    followUp: [
      'compose_email',
      'compose_subject_line',
      'schedule_follow_up',
      'search_prospect_history',
      'evaluate_timing',
      'save_draft'
    ],

    // LinkedIn nodes
    linkedinMessage: [
      'compose_linkedin_message',
      'search_knowledge',
      'search_prospect_history',
      'save_draft'
    ],

    // SMS nodes
    smsMessage: [
      'compose_sms',
      'search_prospect_history',
      'evaluate_timing',
      'save_draft'
    ],

    // Call preparation nodes
    callPrep: [
      'compose_call_script',
      'search_knowledge',
      'search_prospect_history',
      'analyze_prospect',
      'save_draft'
    ],

    // Generic content generation
    generateContent: [
      'search_knowledge',
      'compose_email',
      'compose_subject_line',
      'compose_linkedin_message',
      'save_draft'
    ],

    // Timing evaluation
    evaluateTiming: [
      'evaluate_timing',
      'score_engagement',
      'search_prospect_history'
    ],

    // Status update nodes
    updateStatus: [
      'update_prospect_status',
      'log_interaction',
      'schedule_follow_up'
    ]
  };

  const allowedTools = toolsByType[nodeType];

  // If node type has specific tools, filter to those
  if (allowedTools) {
    return AGENT_TOOLS.filter(t => allowedTools.includes(t.name));
  }

  // Default: return all tools
  return AGENT_TOOLS;
}

/**
 * Get tool names only (for quick checks)
 *
 * @param {string} nodeType - The type of node
 * @returns {Array<string>} Array of tool names
 */
export function getToolNamesForNodeType(nodeType) {
  return getToolsForNodeType(nodeType).map(t => t.name);
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  AGENT_TOOLS,
  executeToolCall,
  getToolsForNodeType,
  getToolNamesForNodeType
};
