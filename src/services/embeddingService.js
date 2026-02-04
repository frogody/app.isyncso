/**
 * Embedding Service - Client-side interface for RAG operations
 *
 * This service provides methods for:
 * - Embedding and storing documents in the knowledge base
 * - Semantic search across knowledge documents
 * - Scraping and embedding web content
 * - Searching interaction memories
 *
 * All operations call Supabase Edge Functions which handle the actual
 * embedding generation via OpenAI API to keep API keys secure.
 */

import { supabase, functions } from '@/api/supabaseClient';

// ============================================================================
// Constants
// ============================================================================

const MAX_CHUNK_SIZE = 6000;
const CHUNK_OVERLAP = 200;

// ============================================================================
// Text Chunking (client-side utility)
// ============================================================================

/**
 * Chunk long text into smaller pieces for embedding
 * This runs client-side before sending to edge function
 * @param {string} text - The text to chunk
 * @param {number} maxSize - Maximum characters per chunk
 * @param {number} overlap - Character overlap between chunks
 * @returns {Array<{text: string, start: number, end: number}>}
 */
export function chunkText(text, maxSize = MAX_CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxSize;

    // Try to break at a natural boundary (period or newline)
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
// Document Operations
// ============================================================================

/**
 * Embed and store a document in the knowledge base
 * Automatically chunks large documents
 *
 * @param {Object} params
 * @param {string} params.workspaceId - Organization/workspace ID
 * @param {string} params.collection - Collection name (e.g., 'playbooks', 'faqs', 'case_studies')
 * @param {string} params.title - Document title
 * @param {string} params.content - Document content
 * @param {Object} params.metadata - Additional metadata
 * @param {string} params.sourceUrl - Source URL if applicable
 * @param {string} params.sourceType - 'manual', 'scrape', 'upload', etc.
 * @returns {Promise<{success: boolean, parentId?: string, chunkCount?: number, error?: string}>}
 */
export async function embedDocument({
  workspaceId,
  collection,
  title,
  content,
  metadata = {},
  sourceUrl = null,
  sourceType = 'manual'
}) {
  try {
    const { data, error } = await functions.invoke('embed-document', {
      workspaceId,
      collection,
      title,
      content,
      metadata,
      sourceUrl,
      sourceType
    });

    if (error) {
      console.error('[embeddingService] embedDocument error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      parentId: data.parentId,
      chunkCount: data.chunkCount
    };
  } catch (err) {
    console.error('[embeddingService] embedDocument exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a document and all its chunks from the knowledge base
 *
 * @param {string} documentId - The document ID to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteDocument(documentId) {
  try {
    // Delete children first
    await supabase
      .from('knowledge_documents')
      .delete()
      .eq('parent_document_id', documentId);

    // Delete parent
    const { error } = await supabase
      .from('knowledge_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('[embeddingService] deleteDocument error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * List documents in a collection (without embeddings)
 *
 * @param {string} workspaceId - Organization/workspace ID
 * @param {string} collection - Optional collection filter
 * @param {number} limit - Max results
 * @returns {Promise<Array>}
 */
export async function listDocuments(workspaceId, collection = null, limit = 50) {
  try {
    let query = supabase
      .from('knowledge_documents')
      .select('id, title, collection, source_type, source_url, metadata, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .is('parent_document_id', null) // Only get parent documents
      .order('created_at', { ascending: false })
      .limit(limit);

    if (collection) {
      query = query.eq('collection', collection);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[embeddingService] listDocuments error:', err);
    return [];
  }
}

// ============================================================================
// Search Operations
// ============================================================================

/**
 * Semantic search in the knowledge base
 *
 * @param {Object} params
 * @param {string} params.workspaceId - Organization/workspace ID
 * @param {string} params.query - Search query text
 * @param {string[]} params.collections - Optional collection filter
 * @param {number} params.limit - Max results (default 10)
 * @param {number} params.threshold - Similarity threshold 0-1 (default 0.7)
 * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
 */
export async function searchKnowledge({
  workspaceId,
  query,
  collections = null,
  limit = 10,
  threshold = 0.7
}) {
  try {
    const { data, error } = await functions.invoke('search-knowledge', {
      workspaceId,
      query,
      collections,
      limit,
      threshold
    });

    if (error) {
      console.error('[embeddingService] searchKnowledge error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, results: data.results };
  } catch (err) {
    console.error('[embeddingService] searchKnowledge exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Search interaction memories for context
 *
 * @param {Object} params
 * @param {string} params.workspaceId - Organization/workspace ID
 * @param {string} params.query - Search query
 * @param {string} params.prospectId - Optional prospect filter
 * @param {string} params.outcome - Optional outcome filter ('positive', 'negative', 'neutral')
 * @param {number} params.limit - Max results
 * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
 */
export async function searchMemories({
  workspaceId,
  query,
  prospectId = null,
  outcome = null,
  limit = 10
}) {
  try {
    const { data, error } = await functions.invoke('search-knowledge', {
      action: 'search_memories',
      workspaceId,
      query,
      prospectId,
      outcome,
      limit
    });

    if (error) {
      console.error('[embeddingService] searchMemories error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, results: data.results };
  } catch (err) {
    console.error('[embeddingService] searchMemories exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Search learned patterns for similar successful approaches
 *
 * @param {Object} params
 * @param {string} params.workspaceId - Organization/workspace ID
 * @param {string} params.query - Search query
 * @param {string} params.patternType - Optional type filter
 * @param {number} params.minEffectiveness - Minimum effectiveness score
 * @param {number} params.limit - Max results
 * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
 */
export async function searchPatterns({
  workspaceId,
  query,
  patternType = null,
  minEffectiveness = 0.5,
  limit = 10
}) {
  try {
    const { data, error } = await functions.invoke('search-knowledge', {
      action: 'search_patterns',
      workspaceId,
      query,
      patternType,
      minEffectiveness,
      limit
    });

    if (error) {
      console.error('[embeddingService] searchPatterns error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, results: data.results };
  } catch (err) {
    console.error('[embeddingService] searchPatterns exception:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// Web Scraping
// ============================================================================

/**
 * Scrape a URL and embed its content
 *
 * @param {Object} params
 * @param {string} params.workspaceId - Organization/workspace ID
 * @param {string} params.url - URL to scrape
 * @param {string} params.collection - Collection to store in
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<{success: boolean, documentId?: string, title?: string, error?: string}>}
 */
export async function scrapeAndEmbed({
  workspaceId,
  url,
  collection,
  metadata = {}
}) {
  try {
    const { data, error } = await functions.invoke('scrape-embed', {
      workspaceId,
      url,
      collection,
      metadata
    });

    if (error) {
      console.error('[embeddingService] scrapeAndEmbed error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      documentId: data.documentId,
      title: data.title
    };
  } catch (err) {
    console.error('[embeddingService] scrapeAndEmbed exception:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// Prospect Intelligence
// ============================================================================

/**
 * Get prospect intelligence with semantic context
 *
 * @param {string} workspaceId - Organization/workspace ID
 * @param {string} prospectId - Prospect ID
 * @returns {Promise<{success: boolean, intelligence?: Object, error?: string}>}
 */
export async function getProspectIntelligence(workspaceId, prospectId) {
  try {
    const { data, error } = await supabase.rpc('get_prospect_intelligence', {
      p_workspace_id: workspaceId,
      p_prospect_id: prospectId
    });

    if (error) throw error;

    return { success: true, intelligence: data };
  } catch (err) {
    console.error('[embeddingService] getProspectIntelligence error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// Collection Management
// ============================================================================

/**
 * Get available collections for a workspace
 *
 * @param {string} workspaceId - Organization/workspace ID
 * @returns {Promise<Array<{collection: string, count: number}>>}
 */
export async function getCollections(workspaceId) {
  try {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('collection')
      .eq('workspace_id', workspaceId)
      .is('parent_document_id', null);

    if (error) throw error;

    // Count by collection
    const counts = {};
    (data || []).forEach(doc => {
      counts[doc.collection] = (counts[doc.collection] || 0) + 1;
    });

    return Object.entries(counts).map(([collection, count]) => ({
      collection,
      count
    }));
  } catch (err) {
    console.error('[embeddingService] getCollections error:', err);
    return [];
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Document operations
  embedDocument,
  deleteDocument,
  listDocuments,
  chunkText,

  // Search operations
  searchKnowledge,
  searchMemories,
  searchPatterns,

  // Scraping
  scrapeAndEmbed,

  // Intelligence
  getProspectIntelligence,

  // Collections
  getCollections
};
