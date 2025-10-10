/**
 * AI Configuration for TalentFlow
 * 
 * CRITICAL: Always use Claude Sonnet 4.5 (claude-sonnet-4-20250514)
 * This is the latest and most capable model as of January 2025
 */

export const AI_CONFIG = {
  // Model configuration - ALWAYS USE SONNET 4.5
  MODEL: 'claude-sonnet-4-20250514',

  // Temperature settings per use case
  TEMPERATURES: {
    intelligence: 0.7,    // Balanced analysis
    matching: 0.5,        // Consistent scoring
    outreach: 0.8,        // Creative messaging
    follow_up: 0.8        // Creative messaging
  },

  // Max tokens per use case
  MAX_TOKENS: {
    intelligence: 4096,
    matching: 2048,
    outreach: 1500,
    follow_up: 1200
  },

  // Batch processing
  BATCH_SIZE: 5,          // Process 5 candidates at a time

  // Thresholds
  MIN_MATCH_SCORE: 60,    // Minimum score to be considered a match

  // Rate limiting (to prevent API overload)
  MAX_CONCURRENT_REQUESTS: 10,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,

  // Forbidden models - NEVER use these
  FORBIDDEN_MODELS: [
    'invoke_lm',
    'gpt-4',
    'gpt-3.5-turbo',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-5-sonnet-20240620',
    'claude-sonnet-4-20241022', // Old Sonnet 4
    'auto'
  ]
};

// System prompts (structured for future caching)
export const SYSTEM_PROMPTS = {
  intelligence_analyst: {
    role: 'recruitment intelligence analyst',
    expertise: [
      'LinkedIn profile analysis',
      'Career trajectory evaluation',
      'Skill assessment',
      'Culture fit prediction',
      'Growth potential scoring'
    ],
    output_format: {
      intelligence_score: 'number 0-100',
      intelligence_level: 'Low | Medium | High | Critical',
      summary: 'string (2-3 sentences)',
      strengths: 'array of strings',
      career_trajectory: 'object with direction and signals',
      engagement_timing: 'object with readiness and reasoning',
      concerns: 'array of strings',
      recommendation: 'string'
    },
    instructions: `Analyze candidates objectively and thoroughly.
Consider:
- Current role vs target role fit
- Company trajectory (growth signals)
- Career progression patterns
- Location compatibility
- Timing signals (job tenure, recent changes)

Provide actionable insights for recruiters.`
  },

  outreach_specialist: {
    role: 'senior recruitment outreach specialist',
    expertise: [
      'Personalized messaging',
      'Value proposition crafting',
      'Candidate psychology',
      'Response rate optimization'
    ],
    tone_guidelines: {
      professional: 'Respectful, competent, trustworthy',
      friendly: 'Warm but not overly casual',
      concise: 'Clear value in first 2 sentences',
      personalized: 'Reference specific candidate details'
    },
    structure: [
      'Hook (1 sentence - why you reached out)',
      'Relevance (2-3 sentences - why them specifically)',
      'Value proposition (2 sentences - what\'s in it for them)',
      'Call to action (1 sentence - clear next step)'
    ]
  },

  matching_analyst: {
    role: 'recruitment matching specialist',
    expertise: [
      'Requirement analysis',
      'Candidate qualification scoring',
      'Deal-breaker identification',
      'Match reasoning'
    ],
    scoring_criteria: {
      role_match: 'How well does current role align? (0-25 points)',
      experience_level: 'Years and depth of experience (0-20 points)',
      skills_match: 'Technical and soft skills fit (0-20 points)',
      location: 'Geographic compatibility (0-10 points)',
      career_timing: 'Likelihood to be open to opportunities (0-15 points)',
      culture_fit: 'Company culture alignment signals (0-10 points)'
    },
    thresholds: {
      excellent: '85-100',
      good: '70-84',
      moderate: '60-69',
      poor: 'below 60'
    }
  }
};

// Helper to build system prompt from config
export function buildSystemPrompt(config) {
  let prompt = `You are an expert ${config.role}.

Your expertise includes:
${config.expertise.map(e => `- ${e}`).join('\n')}

${config.instructions || ''}`;

  if (config.tone_guidelines) {
    prompt += `\n\nTone Guidelines:
${Object.entries(config.tone_guidelines).map(([key, value]) => `- ${key}: ${value}`).join('\n')}`;
  }

  if (config.structure) {
    prompt += `\n\nMessage Structure:
${config.structure.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  }

  if (config.scoring_criteria) {
    prompt += `\n\nScoring Criteria:
${Object.entries(config.scoring_criteria).map(([key, value]) => `- ${key}: ${value}`).join('\n')}`;
  }

  if (config.output_format) {
    prompt += `\n\nAlways respond with valid JSON matching this structure:
${JSON.stringify(config.output_format, null, 2)}`;
  }

  prompt += '\n\nBe objective, thorough, and actionable in your analysis.';

  return prompt;
}

export default AI_CONFIG;