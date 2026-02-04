/**
 * Scrape and Embed Edge Function
 *
 * Fetches content from a URL, extracts text, and embeds it in the knowledge base.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';
import OpenAI from 'https://esm.sh/openai@4.28.0';

// ============================================================================
// Configuration
// ============================================================================

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_CHUNK_SIZE = 6000;
const CHUNK_OVERLAP = 200;
const MAX_INPUT_LENGTH = 8191;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Remove script tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove style tags and their content
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Replace common block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Normalize whitespace
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
// Main Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
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

    // Validate required fields
    if (!workspaceId || !url || !collection) {
      return new Response(
        JSON.stringify({ error: 'workspaceId, url, and collection are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Fetch the URL
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

    // Extract text and title
    const text = extractTextFromHtml(html);
    const title = extractTitleFromHtml(html) || parsedUrl.hostname;

    if (!text || text.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Could not extract meaningful content from URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chunk the content
    const chunks = chunkText(text);
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

    // Embed and store each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: chunk.text.slice(0, MAX_INPUT_LENGTH)
      });
      const embedding = embeddingResponse.data[0].embedding;

      // Store document with embedding
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
