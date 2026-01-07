/**
 * Create (AI Content Generation) Tool Functions for SYNC
 *
 * Actions:
 * - generate_image
 * - list_generated_content
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ActionResult, ActionContext } from './types.ts';
import {
  formatDate,
  successResult,
  errorResult,
  formatList,
} from '../utils/helpers.ts';

// ============================================================================
// Create Types
// ============================================================================

interface ImageGenerationData {
  prompt: string;
  style?: string;
  use_case?: 'product_variation' | 'product_scene' | 'marketing_creative' | 'quick_draft' | 'premium_quality';
  model?: string;
  width?: number;
  height?: number;
  product_name?: string;
}

// ============================================================================
// Generate Image
// ============================================================================

export async function generateImage(
  ctx: ActionContext,
  data: ImageGenerationData
): Promise<ActionResult> {
  try {
    // Get brand context if available
    let brandContext = null;
    if (ctx.companyId) {
      const { data: brand } = await ctx.supabase
        .from('brand_assets')
        .select('colors, typography, visual_style')
        .eq('company_id', ctx.companyId)
        .limit(1)
        .single();

      brandContext = brand;
    }

    // Build product context if product name provided
    let productContext = null;
    if (data.product_name) {
      const { data: products } = await ctx.supabase
        .from('products')
        .select('id, name, description, type')
        .ilike('name', `%${data.product_name}%`)
        .limit(1);

      if (products && products.length > 0) {
        productContext = products[0];
      }
    }

    // Call the generate-image edge function
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: data.prompt,
        style: data.style || 'photorealistic',
        use_case: data.use_case || 'marketing_creative',
        model_key: data.model,
        width: data.width || 1024,
        height: data.height || 1024,
        brand_context: brandContext,
        product_context: productContext,
        company_id: ctx.companyId,
        user_id: ctx.userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return errorResult(
        `Failed to generate image: ${error.error || error.details || 'Unknown error'}`,
        error.error
      );
    }

    const result = await response.json();

    return successResult(
      `✅ Image Generated!\n\n**Prompt:** ${data.prompt.substring(0, 100)}${data.prompt.length > 100 ? '...' : ''}\n` +
      `- Model: ${result.model}\n` +
      `- Size: ${result.dimensions.width}x${result.dimensions.height}\n` +
      `- Cost: $${result.cost_usd.toFixed(4)}\n\n` +
      `**View:** ${result.url}`,
      result,
      '/create'
    );
  } catch (err) {
    return errorResult(`Exception generating image: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List Generated Content
// ============================================================================

export async function listGeneratedContent(
  ctx: ActionContext,
  data: { content_type?: string; limit?: number } = {}
): Promise<ActionResult> {
  try {
    // Get AI usage log for generated content
    let query = ctx.supabase
      .from('ai_usage_log')
      .select('id, model, cost_usd, content_type, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(data.limit || 20);

    if (data.content_type) {
      query = query.eq('content_type', data.content_type);
    }
    if (ctx.companyId) {
      query = query.eq('company_id', ctx.companyId);
    }

    const { data: content, error } = await query;

    if (error) {
      return errorResult(`Failed to list content: ${error.message}`, error.message);
    }

    if (!content || content.length === 0) {
      return successResult('No generated content found. Try "generate an image of..."', []);
    }

    // Calculate total cost
    const totalCost = content.reduce((sum, c) => sum + (c.cost_usd || 0), 0);

    const list = formatList(content, (c) => {
      const type = c.content_type === 'image' ? '🖼️' : c.content_type === 'video' ? '🎬' : '📄';
      const date = formatDate(c.created_at);
      return `- ${type} **${c.model}** | $${(c.cost_usd || 0).toFixed(4)} | ${date}`;
    });

    return successResult(
      `📁 Generated Content (${content.length} items)\n\n` +
      `Total Cost: $${totalCost.toFixed(4)}\n\n${list}`,
      { items: content, total_cost: totalCost },
      '/create'
    );
  } catch (err) {
    return errorResult(`Exception listing content: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Create Action Router
// ============================================================================

export async function executeCreateAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'generate_image':
      return generateImage(ctx, data);
    case 'list_generated_content':
      return listGeneratedContent(ctx, data);
    default:
      return errorResult(`Unknown create action: ${action}`, 'Unknown action');
  }
}
