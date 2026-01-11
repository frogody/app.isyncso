/**
 * Knowledge Graph Module for SYNC
 *
 * Provides entity relationship understanding for complex queries.
 * Enables queries like "For each client I worked with this week..."
 *
 * Tables:
 * - sync_entities: Entity nodes (clients, products, tasks, etc.)
 * - sync_entity_relationships: Edges between entities
 * - sync_entity_interactions: Usage tracking for importance scoring
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Types
// ============================================================================

export interface Entity {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  entity_name: string;
  attributes: Record<string, unknown>;
  confidence_score: number;
  interaction_count: number;
  last_interaction: string | null;
}

export interface EntityRelationship {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  relationship_type: RelationshipType;
  strength: number;
  context: Record<string, unknown>;
  last_interaction_at: string;
}

export interface EntityGraph {
  entity: Entity;
  relationships: Array<{
    related_entity: Entity;
    relationship_type: RelationshipType;
    strength: number;
  }>;
}

export type EntityType =
  | 'client'
  | 'prospect'
  | 'product'
  | 'task'
  | 'invoice'
  | 'proposal'
  | 'team_member'
  | 'campaign'
  | 'expense'
  | 'email'
  | 'meeting';

export type RelationshipType =
  | 'owns'
  | 'purchased'
  | 'assigned_to'
  | 'contacted'
  | 'worked_on'
  | 'manages'
  | 'participated_in'
  | 'created_for'
  | 'related_to';

// ============================================================================
// Knowledge Graph Class
// ============================================================================

export class KnowledgeGraph {
  constructor(
    private supabase: SupabaseClient,
    private companyId: string
  ) {}

  /**
   * Get all entities of a specific type that were active recently
   */
  async getActiveEntities(
    entityType?: EntityType,
    since?: Date,
    limit: number = 20
  ): Promise<Entity[]> {
    const { data, error } = await this.supabase.rpc('get_active_entities', {
      p_company_id: this.companyId,
      p_entity_type: entityType || null,
      p_since: since?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      p_limit: limit,
    });

    if (error) {
      console.error('[KnowledgeGraph] Error fetching active entities:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get entity with all its relationships (1-hop graph)
   */
  async getEntityGraph(entityId: string): Promise<EntityGraph | null> {
    const { data, error } = await this.supabase.rpc('get_entity_graph', {
      p_company_id: this.companyId,
      p_entity_id: entityId,
    });

    if (error || !data || data.length === 0) {
      console.error('[KnowledgeGraph] Error fetching entity graph:', error);
      return null;
    }

    // Transform flat results into graph structure
    const entity: Entity = {
      id: data[0].entity_id,
      entity_type: data[0].entity_type,
      entity_id: data[0].entity_id,
      entity_name: data[0].entity_name,
      attributes: data[0].attributes || {},
      confidence_score: 0.5,
      interaction_count: 0,
      last_interaction: null,
    };

    const relationships = data
      .filter((row: any) => row.related_entity_id)
      .map((row: any) => ({
        related_entity: {
          id: row.related_entity_id,
          entity_type: row.related_type,
          entity_id: row.related_entity_id,
          entity_name: row.related_name,
          attributes: {},
          confidence_score: 0.5,
          interaction_count: 0,
          last_interaction: null,
        },
        relationship_type: row.relationship_type as RelationshipType,
        strength: row.relationship_strength,
      }));

    return { entity, relationships };
  }

  /**
   * Upsert an entity into the knowledge graph
   */
  async upsertEntity(
    entityType: EntityType,
    sourceId: string,
    name: string,
    attributes: Record<string, unknown> = {}
  ): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('upsert_sync_entity', {
      p_company_id: this.companyId,
      p_entity_type: entityType,
      p_entity_id: sourceId,
      p_name: name,
      p_attributes: attributes,
    });

    if (error) {
      console.error('[KnowledgeGraph] Error upserting entity:', error);
      return null;
    }

    return data;
  }

  /**
   * Create or strengthen a relationship between entities
   */
  async addRelationship(
    fromEntityId: string,
    toEntityId: string,
    relationshipType: RelationshipType,
    context: Record<string, unknown> = {}
  ): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('upsert_entity_relationship', {
      p_company_id: this.companyId,
      p_from_entity_id: fromEntityId,
      p_to_entity_id: toEntityId,
      p_relationship_type: relationshipType,
      p_context: context,
    });

    if (error) {
      console.error('[KnowledgeGraph] Error adding relationship:', error);
      return null;
    }

    return data;
  }

  /**
   * Log an interaction with an entity (increases importance score)
   */
  async logInteraction(
    entityId: string,
    interactionType: 'mentioned' | 'queried' | 'updated' | 'created',
    context?: string,
    sessionId?: string,
    userId?: string
  ): Promise<void> {
    const { error } = await this.supabase.rpc('log_entity_interaction', {
      p_company_id: this.companyId,
      p_user_id: userId || null,
      p_entity_id: entityId,
      p_interaction_type: interactionType,
      p_context: context || null,
      p_session_id: sessionId || null,
    });

    if (error) {
      console.error('[KnowledgeGraph] Error logging interaction:', error);
    }
  }

  /**
   * Find entities by name (fuzzy search)
   */
  async searchEntities(
    query: string,
    entityType?: EntityType,
    limit: number = 10
  ): Promise<Entity[]> {
    let queryBuilder = this.supabase
      .from('sync_entities')
      .select('*')
      .eq('company_id', this.companyId)
      .ilike('entity_name', `%${query}%`)
      .order('interaction_count', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (entityType) {
      queryBuilder = queryBuilder.eq('entity_type', entityType);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[KnowledgeGraph] Error searching entities:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get entities related to a specific entity
   */
  async getRelatedEntities(
    entityId: string,
    relationshipType?: RelationshipType
  ): Promise<Array<{ entity: Entity; relationship: EntityRelationship }>> {
    let queryBuilder = this.supabase
      .from('sync_entity_relationships')
      .select(`
        *,
        to_entity:sync_entities!sync_entity_relationships_to_entity_id_fkey(*),
        from_entity:sync_entities!sync_entity_relationships_from_entity_id_fkey(*)
      `)
      .eq('company_id', this.companyId)
      .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);

    if (relationshipType) {
      queryBuilder = queryBuilder.eq('relationship_type', relationshipType);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[KnowledgeGraph] Error fetching related entities:', error);
      return [];
    }

    return (data || []).map((row: any) => {
      const isFrom = row.from_entity_id === entityId;
      return {
        entity: isFrom ? row.to_entity : row.from_entity,
        relationship: {
          id: row.id,
          from_entity_id: row.from_entity_id,
          to_entity_id: row.to_entity_id,
          relationship_type: row.relationship_type,
          strength: row.strength,
          context: row.context,
          last_interaction_at: row.last_interaction_at,
        },
      };
    });
  }

  /**
   * Sync entities from source tables into the knowledge graph
   * Call this periodically or after relevant actions
   */
  async syncFromSource(entityType: EntityType): Promise<number> {
    let count = 0;

    switch (entityType) {
      case 'client':
      case 'prospect': {
        const { data: prospects } = await this.supabase
          .from('growth_prospects')
          .select('id, first_name, last_name, email, company, status')
          .eq('company_id', this.companyId);

        for (const prospect of prospects || []) {
          await this.upsertEntity(
            prospect.status === 'converted' ? 'client' : 'prospect',
            prospect.id,
            `${prospect.first_name} ${prospect.last_name}`.trim(),
            { email: prospect.email, company: prospect.company, status: prospect.status }
          );
          count++;
        }
        break;
      }

      case 'product': {
        const { data: products } = await this.supabase
          .from('products')
          .select('id, name, type, status, price')
          .eq('company_id', this.companyId);

        for (const product of products || []) {
          await this.upsertEntity('product', product.id, product.name, {
            type: product.type,
            status: product.status,
            price: product.price,
          });
          count++;
        }
        break;
      }

      case 'task': {
        const { data: tasks } = await this.supabase
          .from('tasks')
          .select('id, title, status, priority, due_date')
          .eq('company_id', this.companyId);

        for (const task of tasks || []) {
          await this.upsertEntity('task', task.id, task.title, {
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
          });
          count++;
        }
        break;
      }

      case 'invoice': {
        const { data: invoices } = await this.supabase
          .from('invoices')
          .select('id, invoice_number, client_name, status, total')
          .eq('company_id', this.companyId);

        for (const invoice of invoices || []) {
          await this.upsertEntity('invoice', invoice.id, `Invoice #${invoice.invoice_number}`, {
            client_name: invoice.client_name,
            status: invoice.status,
            total: invoice.total,
          });
          count++;
        }
        break;
      }
    }

    return count;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract entity mentions from user message
 */
export function extractEntityMentions(message: string): Array<{ type: EntityType; name: string }> {
  const mentions: Array<{ type: EntityType; name: string }> = [];

  // Client/prospect patterns
  const clientPatterns = [
    /(?:client|prospect|customer|contact)\s+(?:named?\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /(?:with|for|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:about|regarding)/gi,
  ];

  // Product patterns
  const productPatterns = [
    /(?:product|item)\s+(?:called?\s+)?["']?([^"']+?)["']?(?:\s|$)/gi,
  ];

  for (const pattern of clientPatterns) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      mentions.push({ type: 'client', name: match[1].trim() });
    }
  }

  for (const pattern of productPatterns) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      mentions.push({ type: 'product', name: match[1].trim() });
    }
  }

  return mentions;
}

/**
 * Format entity graph for LLM context
 */
export function formatEntityContext(graph: EntityGraph): string {
  let context = `**${graph.entity.entity_name}** (${graph.entity.entity_type})`;

  if (Object.keys(graph.entity.attributes).length > 0) {
    const attrs = Object.entries(graph.entity.attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    context += `\n  Attributes: ${attrs}`;
  }

  if (graph.relationships.length > 0) {
    context += '\n  Relationships:';
    for (const rel of graph.relationships) {
      context += `\n    - ${rel.relationship_type} → ${rel.related_entity.entity_name} (${rel.related_entity.entity_type})`;
    }
  }

  return context;
}
