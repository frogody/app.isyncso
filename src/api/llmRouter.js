/**
 * LLM Router - Intelligent routing between Groq (cheap/fast) and Anthropic (quality)
 *
 * Task Types and Routing:
 * - CHEAP tier (Groq Llama 3.1): Simple extractions, classifications, summaries
 * - QUALITY tier (Anthropic Claude): Complex analysis, creative writing, multi-step reasoning
 *
 * Usage:
 *   import { llm } from '@/api/llmRouter';
 *
 *   // Simple task (auto-routed to Groq)
 *   const result = await llm.complete('Summarize this text: ...', { tier: 'cheap' });
 *
 *   // Complex task (auto-routed to Anthropic)
 *   const result = await llm.complete('Write a personalized outreach message...', { tier: 'quality' });
 *
 *   // Auto-detect (based on task type)
 *   const result = await llm.complete(prompt, { taskType: 'candidate_intelligence' });
 */

// Configuration
const LLM_CONFIG = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    models: {
      default: 'llama-3.1-8b-instant',
      fast: 'llama-3.1-8b-instant',
      large: 'llama-3.1-70b-versatile'
    },
    maxTokens: 4096,
    costPer1kTokens: 0.00005 // ~$0.05 per 1M tokens
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    models: {
      default: 'claude-3-5-sonnet-20241022',
      fast: 'claude-3-5-haiku-20241022',
      quality: 'claude-3-5-sonnet-20241022'
    },
    maxTokens: 8192,
    costPer1kTokens: 0.003 // ~$3 per 1M tokens
  }
};

// Task type to tier mapping
const TASK_ROUTING = {
  // CHEAP tier - Groq (fast, cheap, good for structured tasks)
  cheap: [
    'skill_extraction',      // Extract skills from text
    'text_classification',   // Categorize content
    'entity_extraction',     // Extract names, companies, etc.
    'summarization',         // Summarize long content
    'translation',           // Translate text
    'formatting',            // Format/clean text
    'simple_qa',             // Simple question answering
    'sentiment_analysis',    // Analyze sentiment
    'keyword_extraction',    // Extract keywords
    'data_parsing'           // Parse structured data
  ],

  // QUALITY tier - Anthropic (slower, expensive, but higher quality)
  quality: [
    'candidate_intelligence',    // Full candidate analysis
    'outreach_message',          // Personalized outreach
    'follow_up_message',         // Context-aware follow-ups
    'campaign_matching',         // Match candidates to campaigns
    'complex_analysis',          // Multi-factor analysis
    'creative_writing',          // Marketing copy, etc.
    'strategic_planning',        // Recommendations
    'conversation',              // Chat interactions
    'code_generation',           // Generate code
    'reasoning'                  // Complex reasoning tasks
  ]
};

// Get API keys from environment
const getApiKeys = () => ({
  groq: import.meta.env.VITE_GROQ_API_KEY || '',
  anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY || ''
});

/**
 * Determine which tier to use based on task type
 */
const determineTier = (taskType, explicitTier) => {
  if (explicitTier) return explicitTier;

  if (TASK_ROUTING.cheap.includes(taskType)) return 'cheap';
  if (TASK_ROUTING.quality.includes(taskType)) return 'quality';

  // Default to cheap for unknown tasks
  return 'cheap';
};

/**
 * Call Groq API (OpenAI-compatible)
 */
const callGroq = async (prompt, options = {}) => {
  const apiKey = getApiKeys().groq;
  if (!apiKey) {
    throw new Error('Groq API key not configured (VITE_GROQ_API_KEY)');
  }

  const model = options.model || LLM_CONFIG.groq.models.default;
  const maxTokens = options.maxTokens || LLM_CONFIG.groq.maxTokens;
  const temperature = options.temperature ?? 0.7;

  const messages = typeof prompt === 'string'
    ? [{ role: 'user', content: prompt }]
    : prompt;

  // Add system message if provided
  if (options.systemPrompt && messages[0]?.role !== 'system') {
    messages.unshift({ role: 'system', content: options.systemPrompt });
  }

  const response = await fetch(`${LLM_CONFIG.groq.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Groq API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    model,
    provider: 'groq',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
      estimatedCost: (data.usage?.total_tokens || 0) * LLM_CONFIG.groq.costPer1kTokens / 1000
    },
    raw: data
  };
};

/**
 * Call Anthropic API
 */
const callAnthropic = async (prompt, options = {}) => {
  const apiKey = getApiKeys().anthropic;
  if (!apiKey) {
    // Fallback to Groq with larger model if Anthropic not configured
    console.warn('Anthropic API key not configured, falling back to Groq');
    return callGroq(prompt, { ...options, model: 'llama-3.1-70b-versatile' });
  }

  const model = options.model || LLM_CONFIG.anthropic.models.default;
  const maxTokens = options.maxTokens || LLM_CONFIG.anthropic.maxTokens;
  const temperature = options.temperature ?? 0.7;

  const messages = typeof prompt === 'string'
    ? [{ role: 'user', content: prompt }]
    : prompt;

  const body = {
    model,
    max_tokens: maxTokens,
    messages: messages.filter(m => m.role !== 'system'),
    temperature
  };

  // Handle system prompt
  const systemMessage = options.systemPrompt || messages.find(m => m.role === 'system')?.content;
  if (systemMessage) {
    body.system = systemMessage;
  }

  const response = await fetch(`${LLM_CONFIG.anthropic.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Anthropic API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();

  return {
    content: data.content[0]?.text || '',
    model,
    provider: 'anthropic',
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      estimatedCost: ((data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)) * LLM_CONFIG.anthropic.costPer1kTokens / 1000
    },
    raw: data
  };
};

/**
 * Main completion function with automatic routing
 */
const complete = async (prompt, options = {}) => {
  const {
    tier,
    taskType,
    fallbackOnError = true,
    ...providerOptions
  } = options;

  const selectedTier = determineTier(taskType, tier);

  try {
    if (selectedTier === 'quality') {
      return await callAnthropic(prompt, providerOptions);
    } else {
      return await callGroq(prompt, providerOptions);
    }
  } catch (error) {
    console.error(`LLM Router error (${selectedTier}):`, error);

    // Fallback logic
    if (fallbackOnError) {
      if (selectedTier === 'quality') {
        console.log('Falling back to Groq...');
        return await callGroq(prompt, { ...providerOptions, model: 'llama-3.1-70b-versatile' });
      } else {
        // For cheap tier errors, just re-throw (no point falling back to more expensive)
        throw error;
      }
    }

    throw error;
  }
};

/**
 * Structured output helper - parse JSON from LLM response
 */
const completeJSON = async (prompt, options = {}) => {
  const result = await complete(prompt, {
    ...options,
    systemPrompt: `${options.systemPrompt || ''}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.`.trim()
  });

  try {
    // Try to extract JSON from response
    let content = result.content.trim();

    // Remove markdown code blocks if present
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    return {
      ...result,
      data: JSON.parse(content)
    };
  } catch (parseError) {
    console.error('Failed to parse JSON from LLM response:', result.content);
    throw new Error(`Failed to parse JSON response: ${parseError.message}`);
  }
};

/**
 * Streaming completion (Groq only for now)
 */
const completeStream = async function* (prompt, options = {}) {
  const apiKey = getApiKeys().groq;
  if (!apiKey) {
    throw new Error('Groq API key not configured for streaming');
  }

  const model = options.model || LLM_CONFIG.groq.models.default;
  const messages = typeof prompt === 'string'
    ? [{ role: 'user', content: prompt }]
    : prompt;

  if (options.systemPrompt && messages[0]?.role !== 'system') {
    messages.unshift({ role: 'system', content: options.systemPrompt });
  }

  const response = await fetch(`${LLM_CONFIG.groq.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens || LLM_CONFIG.groq.maxTokens,
      temperature: options.temperature ?? 0.7,
      stream: true
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Groq streaming error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield { content, done: false };
          }
        } catch {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }

  yield { content: '', done: true };
};

// Export the LLM router interface
export const llm = {
  complete,
  completeJSON,
  completeStream,
  callGroq,
  callAnthropic,

  // Convenience methods
  cheap: (prompt, options = {}) => complete(prompt, { ...options, tier: 'cheap' }),
  quality: (prompt, options = {}) => complete(prompt, { ...options, tier: 'quality' }),

  // Task-specific helpers
  extractSkills: (text) => completeJSON(
    `Extract all skills from the following text. Return as JSON: { "skills": ["skill1", "skill2", ...], "categories": { "technical": [...], "soft": [...] } }\n\nText: ${text}`,
    { taskType: 'skill_extraction' }
  ),

  summarize: (text, maxLength = 200) => complete(
    `Summarize the following text in ${maxLength} characters or less:\n\n${text}`,
    { taskType: 'summarization' }
  ),

  classifyIntent: (text) => completeJSON(
    `Classify the intent of the following message. Return as JSON: { "intent": "...", "confidence": 0.0-1.0, "entities": [...] }\n\nMessage: ${text}`,
    { taskType: 'text_classification' }
  ),

  // Configuration
  config: LLM_CONFIG,
  taskRouting: TASK_ROUTING
};

export default llm;
