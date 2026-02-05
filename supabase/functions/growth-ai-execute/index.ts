/**
 * Growth AI Execute Edge Function
 * Executes AI prompts against Together.ai for prospect research
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Model configurations
const MODELS: Record<string, { id: string; maxTokens: number }> = {
  'moonshotai/Kimi-K2-Instruct': {
    id: 'moonshotai/Kimi-K2-Instruct',
    maxTokens: 4096,
  },
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': {
    id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    maxTokens: 4096,
  },
  'Qwen/Qwen2.5-72B-Instruct-Turbo': {
    id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
    maxTokens: 4096,
  },
  'deepseek-ai/DeepSeek-V3': {
    id: 'deepseek-ai/DeepSeek-V3',
    maxTokens: 8192,
  },
};

// Fallback model if requested model fails
const FALLBACK_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';

interface RequestBody {
  prompt: string;
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

interface TogetherResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const togetherApiKey = Deno.env.get('TOGETHER_API_KEY');
    if (!togetherApiKey) {
      throw new Error('TOGETHER_API_KEY not configured');
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const {
      prompt,
      model = 'moonshotai/Kimi-K2-Instruct',
      systemPrompt = 'You are a data enrichment tool. Your ONLY job is to return the requested data point or value. Rules: Return ONLY the answer — no explanations, no introductions, no conversational filler. Do NOT say "Sure!", "Here is...", "Based on..." or similar phrases. If the answer is unknown, return "N/A". Be factual and precise.',
      maxTokens = 500,
      temperature = 0.7,
    } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get model config (use fallback if not found)
    const modelConfig = MODELS[model] || MODELS[FALLBACK_MODEL];
    const effectiveModel = MODELS[model] ? model : FALLBACK_MODEL;

    // Make request to Together.ai
    const response = await callTogetherAI(
      togetherApiKey,
      effectiveModel,
      systemPrompt,
      prompt,
      Math.min(maxTokens, modelConfig.maxTokens),
      temperature
    );

    return new Response(
      JSON.stringify({
        success: true,
        result: response.content,
        tokens_used: response.totalTokens,
        model: effectiveModel,
        finish_reason: response.finishReason,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Growth AI Execute Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to execute AI analysis',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Call Together.ai API with retry logic
 */
async function callTogetherAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number,
  retryCount = 0
): Promise<{ content: string; totalTokens: number; finishReason: string }> {
  const maxRetries = 2;

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
        top_p: 0.9,
        stop: null,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Together.ai API error (${response.status}):`, errorText);

      // Check for rate limiting
      if (response.status === 429 && retryCount < maxRetries) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '5');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return callTogetherAI(apiKey, model, systemPrompt, userPrompt, maxTokens, temperature, retryCount + 1);
      }

      // Try fallback model on certain errors
      if (response.status === 400 && model !== FALLBACK_MODEL && retryCount === 0) {
        console.log(`Falling back to ${FALLBACK_MODEL}`);
        return callTogetherAI(apiKey, FALLBACK_MODEL, systemPrompt, userPrompt, maxTokens, temperature, 0);
      }

      throw new Error(`Together.ai API error: ${response.status} - ${errorText}`);
    }

    const data: TogetherResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from AI model');
    }

    return {
      content: data.choices[0].message.content,
      totalTokens: data.usage?.total_tokens || 0,
      finishReason: data.choices[0].finish_reason || 'unknown',
    };
  } catch (error) {
    // Retry on network errors
    if (retryCount < maxRetries && error.name === 'TypeError') {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return callTogetherAI(apiKey, model, systemPrompt, userPrompt, maxTokens, temperature, retryCount + 1);
    }

    throw error;
  }
}
