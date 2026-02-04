/**
 * Scrape and Embed Edge Function
 *
 * Fetches content from a URL, extracts text, and embeds it in the knowledge base.
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
const MAX_CHUNK_SIZE = 6000;
const CHUNK_OVERLAP = 200;
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
// Text Processing
// ============================================================================

function chunkText(text: string, maxSize = MAX_CHUNK_SIZE, overlap = CHUNK_OVERLAP): Array<{ text: string; start: number; end: number }> {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxSize;

    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + maxSize / 2) {
        end = breakPoint + 1;
      }
    }

    chunks.push({
      text: text.slice(start, end).trim(),
      start,
      end
    });

    start = end - overlap;
  }

  return chunks;
}

function extractTextFromHtml(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\n\s+/g, '\n');
  text = text.replace(/\n+/g, '\n');
  return text.trim();
}

function extractTitleFromHtml(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
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
    const {
      workspaceId,
      url,
      collection,
      metadata = {}
    } = await req.json();

    if (!workspaceId || !url || !collection) {
      return new Response(
        JSON.stringify({ error: 'workspaceId, url, and collection are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Workspace authorization check
    const authResult = await validateWorkspaceAccess(req, supabase, workspaceId);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; iSyncSO Knowledge Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${response.status} ${response.statusText}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    const text = extractTextFromHtml(html);
    const title = extractTitleFromHtml(html) || parsedUrl.hostname;

    if (!text || text.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Could not extract meaningful content from URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chunks = chunkText(text);
    const documents = [];
    let parentId: string | null = null;

    if (chunks.length > 1) {
      const { data: parent, error: parentError } = await supabase
        .from('knowledge_documents')
        .insert({
          workspace_id: workspaceId,
          collection,
          title,
          content: text.slice(0, 1000) + '...',
          source_url: url,
          source_type: 'scrape',
          metadata: { ...metadata, is_parent: true, chunk_count: chunks.length, scraped_url: url }
        })
        .select('id')
        .single();

      if (parentError) {
        console.error('Error creating parent document:', parentError);
        throw parentError;
      }
      parentId = parent.id;
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getEmbedding(chunk.text);

      const { data, error } = await supabase
        .from('knowledge_documents')
        .insert({
          workspace_id: workspaceId,
          collection,
          title: chunks.length > 1 ? `${title} (Part ${i + 1})` : title,
          content: chunk.text,
          source_url: url,
          source_type: 'scrape',
          metadata: { ...metadata, chunk_index: i, scraped_url: url },
          embedding,
          parent_document_id: parentId,
          chunk_index: i
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing document chunk:', error);
        throw error;
      }
      documents.push(data);
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId: parentId || documents[0]?.id,
        title,
        chunkCount: documents.length,
        contentLength: text.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('scrape-embed error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
