/**
 * Entity Memory - Track clients, products, preferences
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import {
  SyncSession,
  ChatMessage,
  SyncEntity,
  SyncEntityInsert,
  ExtractedEntities,
  EntityReference,
  ActiveEntities,
  EntitySearchResult,
} from './types.ts';
import { generateEmbedding, embeddingToPostgresVector } from './embeddings.ts';

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

/**
 * Entity Manager Class
 * Handles entity extraction, storage, and retrieval
 */
export class EntityManager {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Extract entities from a message using LLM
   */
  async extractEntities(
    message: ChatMessage,
    session: SyncSession
  ): Promise<ExtractedEntities> {
    if (!TOGETHER_API_KEY) {
      return { clients: [], products: [], preferences: {}, intent: null };
    }

    const extractPrompt = `Analyze this message and extract entities.

Message: "${message.content}"

Context: Business platform with clients, products, invoices, proposals.
${session.active_entities.current_intent ? `Current intent: ${session.active_entities.current_intent}` : ''}

Extract in JSON format ONLY (no other text):
{
  "clients": [{"name": "...", "company": "..."}],
  "products": [{"name": "...", "quantity": null}],
  "preferences": {},
  "intent": "create_invoice|create_proposal|search_products|search_prospects|question|other|null"
}

If no entities found, return empty arrays. Always return valid JSON.`;

    try {
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
          messages: [{ role: 'user', content: extractPrompt }],
          max_tokens: 300,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        console.error("Entity extraction API failed:", response.status);
        return { clients: [], products: [], preferences: {}, intent: null };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error("Failed to parse extracted entities:", parseError);
        }
      }
    } catch (error) {
      console.error("Entity extraction failed:", error);
    }

    return { clients: [], products: [], preferences: {}, intent: null };
  }

  /**
   * Update session's active entities with extracted data
   */
  async updateActiveEntities(
    session: SyncSession,
    extracted: ExtractedEntities
  ): Promise<ActiveEntities> {
    const now = new Date().toISOString();

    // Merge clients
    for (const client of extracted.clients || []) {
      if (!client.name) continue;

      const existing = session.active_entities.clients.find(
        c => c.name.toLowerCase() === client.name.toLowerCase()
      );

      if (!existing) {
        session.active_entities.clients.push({
          id: crypto.randomUUID(),
          name: client.name,
          type: 'client',
          company: client.company,
          last_mentioned: now,
        });
      } else {
        existing.last_mentioned = now;
        if (client.company) {
          existing.company = client.company;
        }
      }
    }

    // Merge products
    for (const product of extracted.products || []) {
      if (!product.name) continue;

      const existing = session.active_entities.products.find(
        p => p.name.toLowerCase() === product.name.toLowerCase()
      );

      if (!existing) {
        session.active_entities.products.push({
          id: crypto.randomUUID(),
          name: product.name,
          type: 'product',
          last_mentioned: now,
        });
      } else {
        existing.last_mentioned = now;
      }
    }

    // Merge preferences
    session.active_entities.preferences = {
      ...session.active_entities.preferences,
      ...extracted.preferences,
    };

    // Update intent
    if (extracted.intent && extracted.intent !== 'null') {
      session.active_entities.current_intent = extracted.intent;
    }

    // Persist entities to long-term storage
    await this.persistEntities(session, extracted);

    return session.active_entities;
  }

  /**
   * Persist extracted entities to long-term storage
   */
  private async persistEntities(
    session: SyncSession,
    extracted: ExtractedEntities
  ): Promise<void> {
    // Persist clients
    for (const client of extracted.clients || []) {
      if (!client.name) continue;

      await this.upsertEntity(session, {
        entity_type: 'client',
        entity_name: client.name,
        attributes: { company: client.company },
      });
    }

    // Persist products
    for (const product of extracted.products || []) {
      if (!product.name) continue;

      await this.upsertEntity(session, {
        entity_type: 'product',
        entity_name: product.name,
        attributes: { quantity: product.quantity },
      });
    }
  }

  /**
   * Upsert an entity (update if exists, insert if new)
   */
  private async upsertEntity(
    session: SyncSession,
    entity: Pick<SyncEntityInsert, 'entity_type' | 'entity_name' | 'attributes'>
  ): Promise<void> {
    try {
      // Check if entity exists
      const { data: existing } = await this.supabase
        .from('sync_entities')
        .select('id, interaction_count, attributes')
        .eq('user_id', session.user_id)
        .eq('entity_type', entity.entity_type)
        .ilike('entity_name', entity.entity_name)
        .single();

      if (existing) {
        // Update existing entity
        await this.supabase
          .from('sync_entities')
          .update({
            interaction_count: existing.interaction_count + 1,
            last_interaction: new Date().toISOString(),
            attributes: {
              ...existing.attributes,
              ...entity.attributes,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new entity with embedding
        const embeddingText = `${entity.entity_type}: ${entity.entity_name} ${JSON.stringify(entity.attributes || {})}`;
        const embedding = await generateEmbedding(embeddingText);
        const embeddingStr = embeddingToPostgresVector(embedding);

        await this.supabase.from('sync_entities').insert({
          user_id: session.user_id,
          organization_id: session.organization_id,
          company_id: session.company_id,
          entity_type: entity.entity_type,
          entity_name: entity.entity_name,
          attributes: entity.attributes || {},
          embedding: embeddingStr,
        });
      }
    } catch (error) {
      console.error("Failed to persist entity:", error);
    }
  }

  /**
   * Search for entities relevant to a query
   */
  async searchEntities(
    session: SyncSession,
    query: string,
    types?: string[],
    limit = 5
  ): Promise<EntitySearchResult[]> {
    try {
      const embedding = await generateEmbedding(query);
      const embeddingStr = embeddingToPostgresVector(embedding);

      const { data, error } = await this.supabase.rpc('search_sync_entities', {
        query_embedding: embeddingStr,
        match_user_id: session.user_id,
        match_company_id: session.company_id,
        match_types: types || null,
        match_limit: limit,
      });

      if (error) {
        console.error("Entity search failed:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Failed to search entities:", error);
      return [];
    }
  }

  /**
   * Get frequently interacted entities
   */
  async getFrequentEntities(
    session: SyncSession,
    types?: string[],
    limit = 5
  ): Promise<SyncEntity[]> {
    try {
      let query = this.supabase
        .from('sync_entities')
        .select('*')
        .eq('user_id', session.user_id)
        .order('interaction_count', { ascending: false })
        .limit(limit);

      if (types && types.length > 0) {
        query = query.in('entity_type', types);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to get frequent entities:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error getting frequent entities:", error);
      return [];
    }
  }

  /**
   * Format active entities for prompt injection
   */
  formatActiveEntitiesForPrompt(entities: ActiveEntities): string {
    const parts: string[] = [];

    if (entities.clients.length > 0) {
      parts.push('**Active Clients:**');
      for (const client of entities.clients) {
        const companyInfo = client.company ? ` (${client.company})` : '';
        parts.push(`- ${client.name}${companyInfo}`);
      }
    }

    if (entities.products.length > 0) {
      parts.push('**Active Products:**');
      for (const product of entities.products) {
        parts.push(`- ${product.name}`);
      }
    }

    if (Object.keys(entities.preferences).length > 0) {
      parts.push('**User Preferences:**');
      parts.push(JSON.stringify(entities.preferences, null, 2));
    }

    if (entities.current_intent) {
      parts.push(`**Current Intent:** ${entities.current_intent}`);
    }

    return parts.join('\n');
  }
}
