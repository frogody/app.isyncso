/**
 * Action Template Manager
 * Handles storage and retrieval of successful action patterns
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import {
  SyncSession,
  ActionTemplate,
  ActionTemplateInsert,
  ActionTemplateSearchResult,
} from './types.ts';
import { generateEmbedding, embeddingToPostgresVector } from './embeddings.ts';

/**
 * Action Template Manager Class
 * Stores successful actions and retrieves similar patterns
 */
export class ActionTemplateManager {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Store a successful action as a template
   */
  async storeActionTemplate(
    session: SyncSession,
    actionType: string,
    userRequest: string,
    actionData: Record<string, unknown>,
    intentDescription?: string
  ): Promise<string | null> {
    try {
      // Generate embedding for the user request
      const embedding = await generateEmbedding(userRequest);
      const embeddingStr = embeddingToPostgresVector(embedding);

      // Generate intent description if not provided
      const intent = intentDescription || this.generateIntentDescription(actionType, actionData);

      const { data, error } = await this.supabase
        .from('sync_action_templates')
        .insert({
          user_id: session.user_id,
          organization_id: session.organization_id,
          company_id: session.company_id,
          action_type: actionType,
          intent_description: intent,
          example_request: userRequest,
          action_data: actionData,
          embedding: embeddingStr,
        })
        .select('id')
        .single();

      if (error) {
        console.error("Failed to store action template:", error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error("Error storing action template:", error);
      return null;
    }
  }

  /**
   * Generate intent description from action type and data
   */
  private generateIntentDescription(
    actionType: string,
    actionData: Record<string, unknown>
  ): string {
    const descriptions: Record<string, (data: Record<string, unknown>) => string> = {
      create_invoice: (data) => {
        const client = data.client_name || 'client';
        const itemCount = Array.isArray(data.items) ? data.items.length : 0;
        return `Create invoice for ${client} with ${itemCount} item(s)`;
      },
      create_proposal: (data) => {
        const client = data.client_name || 'client';
        return `Create proposal for ${client}`;
      },
      search_products: (data) => {
        const query = data.query || 'products';
        return `Search for ${query}`;
      },
      search_prospects: (data) => {
        const query = data.query || 'prospects';
        return `Search for prospects matching ${query}`;
      },
      create_task: (data) => {
        const title = data.title || 'task';
        return `Create task: ${title}`;
      },
      create_expense: (data) => {
        const amount = data.amount || 0;
        return `Log expense of €${amount}`;
      },
    };

    const generator = descriptions[actionType];
    if (generator) {
      return generator(actionData);
    }

    return `Execute ${actionType.replace(/_/g, ' ')}`;
  }

  /**
   * Search for similar action templates
   */
  async searchTemplates(
    session: SyncSession,
    query: string,
    actionType?: string,
    limit = 3
  ): Promise<ActionTemplateSearchResult[]> {
    try {
      const embedding = await generateEmbedding(query);
      const embeddingStr = embeddingToPostgresVector(embedding);

      const { data, error } = await this.supabase.rpc('search_action_templates', {
        query_embedding: embeddingStr,
        match_user_id: session.user_id,
        match_company_id: session.company_id,
        match_action_type: actionType || null,
        match_limit: limit,
      });

      if (error) {
        console.error("Action template search failed:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Failed to search action templates:", error);
      return [];
    }
  }

  /**
   * Increment success count for a template
   */
  async incrementSuccessCount(templateId: string): Promise<void> {
    try {
      await this.supabase.rpc('increment_action_template_success', {
        p_template_id: templateId,
      });
    } catch (error) {
      console.error("Failed to increment success count:", error);
    }
  }

  /**
   * Get most successful templates for an action type
   */
  async getTopTemplates(
    session: SyncSession,
    actionType: string,
    limit = 5
  ): Promise<ActionTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('sync_action_templates')
        .select('*')
        .eq('user_id', session.user_id)
        .eq('action_type', actionType)
        .order('success_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Failed to get top templates:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error getting top templates:", error);
      return [];
    }
  }

  /**
   * Format action templates for prompt injection
   */
  formatTemplatesForPrompt(templates: ActionTemplateSearchResult[]): string {
    if (templates.length === 0) {
      return '';
    }

    const lines: string[] = [
      '## Similar Successful Actions',
      'Based on your request, here are similar actions that worked before:',
      '',
    ];

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      lines.push(`${i + 1}. **${template.action_type}** (${template.success_count} uses)`);
      lines.push(`   Request: "${template.example_request}"`);
      lines.push(`   Intent: ${template.intent_description}`);
      lines.push('');
    }

    lines.push('Use these as guidance for structuring your action.');

    return lines.join('\n');
  }

  /**
   * Check if an action should be stored as template
   */
  shouldStoreAsTemplate(
    actionType: string,
    success: boolean
  ): boolean {
    // Only store successful actions
    if (!success) {
      return false;
    }

    // Define which action types are worth storing
    const storedActionTypes = [
      'create_invoice',
      'create_proposal',
      'create_expense',
      'create_task',
      'create_prospect',
      'move_pipeline_stage',
    ];

    return storedActionTypes.includes(actionType);
  }

  /**
   * Find matching template for action deduplication
   */
  async findMatchingTemplate(
    session: SyncSession,
    actionType: string,
    request: string,
    threshold = 0.9
  ): Promise<ActionTemplate | null> {
    try {
      const embedding = await generateEmbedding(request);
      const embeddingStr = embeddingToPostgresVector(embedding);

      const { data, error } = await this.supabase.rpc('search_action_templates', {
        query_embedding: embeddingStr,
        match_user_id: session.user_id,
        match_action_type: actionType,
        match_limit: 1,
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      // Check if similarity exceeds threshold
      if (data[0].similarity >= threshold) {
        // This is essentially the same request, update count
        await this.incrementSuccessCount(data[0].id);
        return data[0];
      }

      return null;
    } catch (error) {
      console.error("Error finding matching template:", error);
      return null;
    }
  }
}
