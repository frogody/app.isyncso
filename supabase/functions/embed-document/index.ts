/**
 * Embed Document Edge Function
 *
 * Embeds text content using Together.ai and stores in the knowledge_documents table.
 * Handles automatic chunking of large documents.
 *
 * Model: BAAI/bge-large-en-v1.5 (1024 dimensions) - same as SYNC memory system
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
const MAX_INPUT_LENGTH = 8000; // BGE model context window

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
      collection,
      title,
      content,
      metadata = {},
      sourceUrl = null,
      sourceType = 'manual'
    } = await req.json();

    if (!workspaceId || !collection || !content) {
      return new Response(
        JSON.stringify({ error: 'workspaceId, collection, and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const chunks = chunkText(content);
    const documents = [];
    let parentId: string | null = null;

    // Create parent document if multiple chunks
    if (chunks.length > 1) {
      const { data: parent, error: parentError } = await supabase
        .from('knowledge_documents')
        .insert({
          workspace_id: workspaceId,
          collection,
          title,
          content: content.slice(0, 1000) + '...',
          source_url: sourceUrl,
          source_type: sourceType,
          metadata: { ...metadata, is_parent: true, chunk_count: chunks.length }
        })
        .select('id')
        .single();

      if (parentError) {
        console.error('Error creating parent document:', parentError);
        throw parentError;
      }
      parentId = parent.id;
    }

    // Embed and store each chunk
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
          source_url: sourceUrl,
          source_type: sourceType,
          metadata: { ...metadata, chunk_index: i },
          embedding,
          parent_document_id: parentId,
          chunk_index: i
        })
        .select('id, title')
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
        parentId,
        chunkCount: documents.length,
        documentIds: documents.map(d => d.id)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('embed-document error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
