/**
 * Search Knowledge Edge Function
 *
 * Provides semantic search across knowledge documents, interaction memories,
 * and learned patterns using vector similarity.
 *
 * Embeddings: Together.ai BAAI/bge-large-en-v1.5 (1024 dimensions)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

// ============================================================================
// Configuration
// ============================================================================

const EMBEDDING_MODEL = 'BAAI/bge-large-en-v1.5';
const TOGETHER_API_URL = 'https://api.together.xyz/v1/embeddings';
const MAX_INPUT_LENGTH = 8000;

const ALLOWED_ORIGINS = [
  'https://app.isyncso.com',
  'https://www.isyncso.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    };
  }
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// ============================================================================
// Together.ai Embedding
// ============================================================================

async function getEmbedding(text: string): Promise<number[]> {
  const togetherKey = Deno.env.get('TOGETHER_API_KEY');
  if (!togetherKey) {
    throw new Error('TOGETHER_API_KEY not configured');
  }

  const response = await fetch(TOGETHER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${togetherKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, MAX_INPUT_LENGTH),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Together.ai embedding error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ============================================================================
// Workspace Authorization
// ============================================================================

async function validateWorkspaceAccess(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  workspaceId: string
): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization header' };
  }

  const token = authHeader.slice(7);
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Internal service calls use service_role key - always authorized
  if (token === serviceRoleKey) {
    return { authorized: true };
  }

  // Verify user JWT
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { authorized: false, error: 'Invalid authentication token' };
  }

  // Check workspace membership via users table
  const { data: userData } = await supabase
    .from('users')
    .select('company_id, organization_id')
    .eq('id', user.id)
    .single();

  if (!userData) {
    return { authorized: false, error: 'User not found' };
  }

  if (userData.company_id !== workspaceId && userData.organization_id !== workspaceId) {
    return { authorized: false, error: 'User not authorized for this workspace' };
  }

  return { authorized: true };
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || 'search_knowledge';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Workspace authorization check
    if (body.workspaceId) {
      const authResult = await validateWorkspaceAccess(req, supabase, body.workspaceId);
      if (!authResult.authorized) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const query = body.query;
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const queryEmbedding = await getEmbedding(query);

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
