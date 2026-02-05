/**
 * HybridRAG Module for SYNC
 *
 * Combines vector similarity search with knowledge graph traversal
 * for more accurate and contextual retrieval.
 *
 * Based on Microsoft GraphRAG research and HybridRAG best practices:
 * - Vector search for semantic similarity
 * - Graph traversal for relationship context
 * - Entity-aware retrieval
 * - Community summaries for global context
 *
 * @see https://microsoft.github.io/graphrag/
 * @see https://memgraph.com/blog/why-hybridrag
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { generateEmbedding, embeddingToPostgresVector, cosineSimilarity } from '../memory/embeddings.ts';
import { KnowledgeGraph, EntityType, RelationshipType, EntityGraph } from './knowledge-graph.ts';
import { SyncSession, MemorySearchResult } from '../memory/types.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface HybridSearchResult {
  id: string;
  content: string;
  source: 'vector' | 'graph' | 'integration';
  sourceType: string; // 'memory_chunk', 'entity', 'email', 'calendar', etc.
  similarity: number;
  graphRelevance: number;
  combinedScore: number;
  metadata: Record<string, unknown>;
  relatedEntities: EntityReference[];
}

export interface EntityReference {
  id: string;
  name: string;
  type: EntityType;
  relationship?: RelationshipType;
  strength?: number;
}

export interface IntegrationDataSource {
  type: 'gmail' | 'hubspot' | 'calendar' | 'sheets' | 'teams' | 'slack';
  lastSyncedAt?: string;
  itemCount: number;
}

export interface HybridRAGConfig {
  vectorWeight: number;      // Weight for vector similarity (0-1)
  graphWeight: number;       // Weight for graph relevance (0-1)
  minSimilarity: number;     // Minimum similarity threshold
  maxResults: number;        // Maximum results to return
  includeIntegrations: boolean;  // Include data from connected integrations
  expandRelationships: boolean;  // Expand to related entities
  relationshipDepth: number;     // How many hops to traverse
}

const DEFAULT_CONFIG: HybridRAGConfig = {
  vectorWeight: 0.6,
  graphWeight: 0.4,
  minSimilarity: 0.5,
  maxResults: 20,
  includeIntegrations: true,
  expandRelationships: true,
  relationshipDepth: 2,
};

// ============================================================================
// HYBRID RAG CLASS
// ============================================================================

export class HybridRAG {
  private supabase: SupabaseClient;
  private knowledgeGraph: KnowledgeGraph;
  private companyId: string;
  private userId?: string;
  private config: HybridRAGConfig;

  constructor(
    supabase: SupabaseClient,
    companyId: string,
    userId?: string,
    config: Partial<HybridRAGConfig> = {}
  ) {
    this.supabase = supabase;
    this.companyId = companyId;
    this.userId = userId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.knowledgeGraph = new KnowledgeGraph(supabase, companyId);
  }

  /**
   * Perform hybrid search combining vector similarity and graph traversal
   */
  async search(
    query: string,
    options: Partial<HybridRAGConfig> = {}
  ): Promise<HybridSearchResult[]> {
    const config = { ...this.config, ...options };
    const results: HybridSearchResult[] = [];

    try {
      // 1. Extract entities mentioned in query
      const mentionedEntities = await this.extractQueryEntities(query);
      console.log(`[HybridRAG] Found ${mentionedEntities.length} entities in query`);

      // 2. Parallel search across all sources
      const [vectorResults, graphResults, integrationResults] = await Promise.all([
        this.vectorSearch(query, config),
        this.graphSearch(query, mentionedEntities, config),
        config.includeIntegrations ? this.integrationSearch(query, config) : [],
      ]);

      // 3. Merge and deduplicate results
      const mergedResults = this.mergeResults(
        vectorResults,
        graphResults,
        integrationResults,
        config
      );

      // 4. Expand with related entities if enabled
      if (config.expandRelationships && mentionedEntities.length > 0) {
        const expanded = await this.expandWithRelationships(
          mergedResults,
          mentionedEntities,
          config.relationshipDepth
        );
        results.push(...expanded);
      } else {
        results.push(...mergedResults);
      }

      // 5. Sort by combined score and limit
      return results
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, config.maxResults);

    } catch (error) {
      console.error('[HybridRAG] Search error:', error);
      return [];
    }
  }

  /**
   * Vector similarity search using embeddings
   */
  private async vectorSearch(
    query: string,
    config: HybridRAGConfig
  ): Promise<HybridSearchResult[]> {
    try {
      const embedding = await generateEmbedding(query);
      const embeddingStr = embeddingToPostgresVector(embedding);

      const { data, error } = await this.supabase.rpc('search_sync_memory_hybrid', {
        query_embedding: embeddingStr,
        match_company_id: this.companyId,
        match_user_id: this.userId || null,
        match_threshold: config.minSimilarity,
        match_limit: config.maxResults * 2, // Get more for merging
      });

      if (error) {
        console.error('[HybridRAG] Vector search error:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        content: item.content,
        source: 'vector' as const,
        sourceType: item.chunk_type || 'memory_chunk',
        similarity: item.similarity,
        graphRelevance: 0,
        combinedScore: item.similarity * config.vectorWeight,
        metadata: item.metadata || {},
        relatedEntities: [],
      }));

    } catch (error) {
      console.error('[HybridRAG] Vector search failed:', error);
      return [];
    }
  }

  /**
   * Graph-based search using entity relationships
   */
  private async graphSearch(
    query: string,
    mentionedEntities: EntityReference[],
    config: HybridRAGConfig
  ): Promise<HybridSearchResult[]> {
    const results: HybridSearchResult[] = [];

    try {
      // Search for entities matching query terms
      const entityMatches = await this.knowledgeGraph.searchEntities(query, undefined, 10);

      for (const entity of entityMatches) {
        // Get entity's graph (relationships)
        const graph = await this.knowledgeGraph.getEntityGraph(entity.id);

        if (graph) {
          // Calculate graph relevance based on interaction count and relationships
          const graphRelevance = this.calculateGraphRelevance(graph, mentionedEntities);

          results.push({
            id: entity.id,
            content: this.formatEntityContent(graph),
            source: 'graph',
            sourceType: entity.entity_type,
            similarity: 0.5, // Base similarity for graph matches
            graphRelevance,
            combinedScore: graphRelevance * config.graphWeight,
            metadata: entity.attributes,
            relatedEntities: graph.relationships.map(r => ({
              id: r.related_entity.id,
              name: r.related_entity.entity_name,
              type: r.related_entity.entity_type as EntityType,
              relationship: r.relationship_type,
              strength: r.strength,
            })),
          });
        }
      }

      return results;

    } catch (error) {
      console.error('[HybridRAG] Graph search failed:', error);
      return [];
    }
  }

  /**
   * Search indexed integration data (emails, calendar, etc.)
   */
  private async integrationSearch(
    query: string,
    config: HybridRAGConfig
  ): Promise<HybridSearchResult[]> {
    const results: HybridSearchResult[] = [];

    try {
      const embedding = await generateEmbedding(query);
      const embeddingStr = embeddingToPostgresVector(embedding);

      // Search integration data index
      const { data, error } = await this.supabase.rpc('search_integration_data', {
        query_embedding: embeddingStr,
        match_company_id: this.companyId,
        match_user_id: this.userId || null,
        match_threshold: config.minSimilarity,
        match_limit: config.maxResults,
      });

      if (error) {
        // Table might not exist yet, which is OK
        console.log('[HybridRAG] Integration search not available:', error.message);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        content: item.content,
        source: 'integration' as const,
        sourceType: item.integration_type,
        similarity: item.similarity,
        graphRelevance: 0,
        combinedScore: item.similarity * config.vectorWeight,
        metadata: {
          integrationId: item.integration_id,
          externalId: item.external_id,
          syncedAt: item.synced_at,
          ...item.metadata,
        },
        relatedEntities: [],
      }));

    } catch (error) {
      console.error('[HybridRAG] Integration search failed:', error);
      return [];
    }
  }

  /**
   * Extract entity references from query
   */
  private async extractQueryEntities(query: string): Promise<EntityReference[]> {
    const entities: EntityReference[] = [];

    // Pattern matching for common entity references
    const patterns = [
      // Client/prospect names
      { regex: /(?:client|prospect|customer|contact)\s+(?:named?\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, type: 'client' as EntityType },
      // Product names
      { regex: /(?:product|item|service)\s+(?:called?\s+)?["']?([^"']+?)["']?(?:\s|,|$)/gi, type: 'product' as EntityType },
      // Email mentions
      { regex: /(?:email|message)\s+(?:from|to|about)\s+([A-Z][a-z]+)/gi, type: 'client' as EntityType },
      // Task references
      { regex: /(?:task|todo)\s+(?:about|for|called)\s+["']?([^"']+?)["']?(?:\s|$)/gi, type: 'task' as EntityType },
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(query)) !== null) {
        const name = match[1].trim();
        // Try to find matching entity in database
        const matches = await this.knowledgeGraph.searchEntities(name, pattern.type, 1);
        if (matches.length > 0) {
          entities.push({
            id: matches[0].id,
            name: matches[0].entity_name,
            type: matches[0].entity_type as EntityType,
          });
        } else {
          // Add as unresolved reference
          entities.push({
            id: `unresolved_${name.toLowerCase().replace(/\s+/g, '_')}`,
            name,
            type: pattern.type,
          });
        }
      }
    }

    return entities;
  }

  /**
   * Calculate graph relevance based on entity relationships
   */
  private calculateGraphRelevance(
    graph: EntityGraph,
    queryEntities: EntityReference[]
  ): number {
    let relevance = 0;

    // Base relevance from interaction count
    relevance += Math.min(graph.entity.interaction_count / 100, 0.3);

    // Boost for relationships with query entities
    for (const rel of graph.relationships) {
      const isRelatedToQuery = queryEntities.some(
        qe => qe.id === rel.related_entity.id || qe.name.toLowerCase() === rel.related_entity.entity_name.toLowerCase()
      );
      if (isRelatedToQuery) {
        relevance += 0.2 * rel.strength;
      }
    }

    // Boost for recent interactions
    if (graph.entity.last_interaction) {
      const daysSinceInteraction = (Date.now() - new Date(graph.entity.last_interaction).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceInteraction < 7) {
        relevance += 0.2;
      } else if (daysSinceInteraction < 30) {
        relevance += 0.1;
      }
    }

    return Math.min(relevance, 1);
  }

  /**
   * Format entity graph as searchable content
   */
  private formatEntityContent(graph: EntityGraph): string {
    const parts: string[] = [];

    parts.push(`${graph.entity.entity_type}: ${graph.entity.entity_name}`);

    if (Object.keys(graph.entity.attributes).length > 0) {
      const attrs = Object.entries(graph.entity.attributes)
        .filter(([_, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (attrs) parts.push(`Attributes: ${attrs}`);
    }

    if (graph.relationships.length > 0) {
      const rels = graph.relationships
        .map(r => `${r.relationship_type} ${r.related_entity.entity_name} (${r.related_entity.entity_type})`)
        .join(', ');
      parts.push(`Relationships: ${rels}`);
    }

    return parts.join('\n');
  }

  /**
   * Merge results from different sources
   */
  private mergeResults(
    vectorResults: HybridSearchResult[],
    graphResults: HybridSearchResult[],
    integrationResults: HybridSearchResult[],
    config: HybridRAGConfig
  ): HybridSearchResult[] {
    const merged = new Map<string, HybridSearchResult>();

    // Add all results, combining scores for duplicates
    const allResults = [...vectorResults, ...graphResults, ...integrationResults];

    for (const result of allResults) {
      const key = `${result.sourceType}_${result.id}`;

      if (merged.has(key)) {
        // Combine scores
        const existing = merged.get(key)!;
        existing.similarity = Math.max(existing.similarity, result.similarity);
        existing.graphRelevance = Math.max(existing.graphRelevance, result.graphRelevance);
        existing.combinedScore = (
          existing.similarity * config.vectorWeight +
          existing.graphRelevance * config.graphWeight
        );
        // Merge related entities
        for (const entity of result.relatedEntities) {
          if (!existing.relatedEntities.some(e => e.id === entity.id)) {
            existing.relatedEntities.push(entity);
          }
        }
      } else {
        // Recalculate combined score
        result.combinedScore = (
          result.similarity * config.vectorWeight +
          result.graphRelevance * config.graphWeight
        );
        merged.set(key, result);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Expand results with related entities
   */
  private async expandWithRelationships(
    results: HybridSearchResult[],
    queryEntities: EntityReference[],
    depth: number
  ): Promise<HybridSearchResult[]> {
    if (depth <= 0) return results;

    const expanded = [...results];
    const seenIds = new Set(results.map(r => r.id));

    for (const entity of queryEntities) {
      if (entity.id.startsWith('unresolved_')) continue;

      // Get related entities
      const related = await this.knowledgeGraph.getRelatedEntities(entity.id);

      for (const { entity: relEntity, relationship } of related) {
        if (seenIds.has(relEntity.id)) continue;
        seenIds.add(relEntity.id);

        // Add related entity as result with lower score
        expanded.push({
          id: relEntity.id,
          content: `Related to ${entity.name}: ${relEntity.entity_name} (${relEntity.entity_type})`,
          source: 'graph',
          sourceType: relEntity.entity_type,
          similarity: 0.3,
          graphRelevance: relationship.strength * 0.5,
          combinedScore: (0.3 * this.config.vectorWeight + relationship.strength * 0.5 * this.config.graphWeight),
          metadata: relEntity.attributes,
          relatedEntities: [{
            id: entity.id,
            name: entity.name,
            type: entity.type,
            relationship: relationship.relationship_type,
            strength: relationship.strength,
          }],
        });
      }
    }

    return expanded;
  }

  /**
   * Build context string for LLM from search results
   */
  formatResultsForPrompt(results: HybridSearchResult[]): string {
    if (results.length === 0) return '';

    const sections: string[] = [];

    // Group by source type
    const bySource: Record<string, HybridSearchResult[]> = {};
    for (const result of results) {
      const key = result.sourceType;
      if (!bySource[key]) bySource[key] = [];
      bySource[key].push(result);
    }

    // Format each source type
    for (const [sourceType, items] of Object.entries(bySource)) {
      const header = this.getSourceTypeHeader(sourceType);
      const content = items
        .slice(0, 5)
        .map(item => {
          let text = `• ${item.content}`;
          if (item.relatedEntities.length > 0) {
            const related = item.relatedEntities
              .slice(0, 3)
              .map(e => e.name)
              .join(', ');
            text += ` [Related: ${related}]`;
          }
          return text;
        })
        .join('\n');

      sections.push(`**${header}**\n${content}`);
    }

    return sections.join('\n\n');
  }

  private getSourceTypeHeader(sourceType: string): string {
    const headers: Record<string, string> = {
      memory_chunk: 'Conversation History',
      entity: 'Related Entities',
      client: 'Clients',
      prospect: 'Prospects',
      product: 'Products',
      task: 'Tasks',
      invoice: 'Invoices',
      gmail: 'Emails',
      calendar: 'Calendar Events',
      hubspot: 'CRM Data',
      sheets: 'Spreadsheet Data',
      teams: 'Teams Messages',
      slack: 'Slack Messages',
    };
    return headers[sourceType] || sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create HybridRAG instance from session context
 */
export function createHybridRAG(
  supabase: SupabaseClient,
  session: SyncSession,
  config?: Partial<HybridRAGConfig>
): HybridRAG {
  return new HybridRAG(
    supabase,
    session.company_id,
    session.user_id || undefined,
    config
  );
}

export default HybridRAG;
