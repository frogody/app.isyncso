/**
 * Search Knowledge Edge Function
 *
 * Provides semantic search across knowledge documents, interaction memories,
 * and learned patterns using vector similarity.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';
import OpenAI from 'https://esm.sh/openai@4.28.0';

// ============================================================================
// Configuration
// ============================================================================

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_INPUT_LENGTH = 8191;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || 'search_knowledge';

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Generate embedding for query
    const query = body.query;
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query.slice(0, MAX_INPUT_LENGTH)
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    let results;

    switch (action) {
      case 'search_knowledge':
        results = await searchKnowledge(supabase, queryEmbedding, body);
        break;
      case 'search_memories':
        results = await searchMemories(supabase, queryEmbedding, body);
        break;
      case 'search_patterns':
        results = await searchPatterns(supabase, queryEmbedding, body);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('search-knowledge error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Search Functions
// ============================================================================

async function searchKnowledge(
  supabase: any,
  queryEmbedding: number[],
  params: {
    workspaceId: string;
    collections?: string[] | null;
    limit?: number;
    threshold?: number;
  }
) {
  const { workspaceId, collections, limit = 10, threshold = 0.7 } = params;

  if (!workspaceId) {
    throw new Error('workspaceId is required');
  }

  const { data, error } = await supabase.rpc('search_knowledge', {
    p_workspace_id: workspaceId,
    p_query_embedding: queryEmbedding,
    p_collections: collections,
    p_limit: limit,
    p_threshold: threshold
  });

  if (error) {
    console.error('search_knowledge RPC error:', error);
    throw error;
  }

  return data || [];
}

async function searchMemories(
  supabase: any,
  queryEmbedding: number[],
  params: {
    workspaceId: string;
    prospectId?: string | null;
    outcome?: string | null;
    limit?: number;
  }
) {
  const { workspaceId, prospectId, outcome, limit = 10 } = params;

  if (!workspaceId) {
    throw new Error('workspaceId is required');
  }

  const { data, error } = await supabase.rpc('search_memories', {
    p_workspace_id: workspaceId,
    p_query_embedding: queryEmbedding,
    p_prospect_id: prospectId,
    p_outcome: outcome,
    p_limit: limit
  });

  if (error) {
    console.error('search_memories RPC error:', error);
    throw error;
  }

  return data || [];
}

async function searchPatterns(
  supabase: any,
  queryEmbedding: number[],
  params: {
    workspaceId: string;
    patternType?: string | null;
    minEffectiveness?: number;
    limit?: number;
  }
) {
  const { workspaceId, patternType, minEffectiveness = 0.5, limit = 10 } = params;

  if (!workspaceId) {
    throw new Error('workspaceId is required');
  }

  const { data, error } = await supabase.rpc('search_patterns', {
    p_workspace_id: workspaceId,
    p_query_embedding: queryEmbedding,
    p_pattern_type: patternType,
    p_min_effectiveness: minEffectiveness,
    p_limit: limit
  });

  if (error) {
    console.error('search_patterns RPC error:', error);
    throw error;
  }

  return data || [];
}
