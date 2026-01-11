/**
 * Research Tool Functions for SYNC
 *
 * Actions:
 * - web_search: Search the internet for information
 * - lookup_product_info: Look up product details from the web
 */

import { ActionResult, ActionContext } from './types.ts';
import {
  successResult,
  errorResult,
} from '../utils/helpers.ts';

const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');

// ============================================================================
// Web Search using Tavily
// ============================================================================

interface WebSearchData {
  query: string;
  search_depth?: 'basic' | 'advanced';
  max_results?: number;
  include_answer?: boolean;
  include_images?: boolean;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  answer?: string;
  results: TavilyResult[];
  images?: string[];
}

export async function webSearch(
  ctx: ActionContext,
  data: WebSearchData
): Promise<ActionResult> {
  if (!TAVILY_API_KEY) {
    return errorResult('Web search is not configured', 'Missing TAVILY_API_KEY');
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: data.query,
        search_depth: data.search_depth || 'basic',
        max_results: data.max_results || 5,
        include_answer: data.include_answer !== false,
        include_images: data.include_images || false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return errorResult(`Web search failed: ${error}`, error);
    }

    const result: TavilyResponse = await response.json();

    // Format the results nicely
    let message = '';

    // If Tavily provided a direct answer, show it first
    if (result.answer) {
      message += `**Answer:** ${result.answer}\n\n`;
    }

    // Show top results
    if (result.results && result.results.length > 0) {
      message += '**Sources:**\n';
      for (const r of result.results.slice(0, 3)) {
        message += `- [${r.title}](${r.url})\n`;
        if (r.content) {
          // Truncate content to 150 chars
          const snippet = r.content.length > 150
            ? r.content.substring(0, 150) + '...'
            : r.content;
          message += `  ${snippet}\n`;
        }
      }
    }

    return successResult(
      message || 'No results found for your search.',
      {
        answer: result.answer,
        results: result.results?.slice(0, 5),
        images: result.images?.slice(0, 3),
      }
    );
  } catch (err) {
    return errorResult(`Exception during web search: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Product Information Lookup
// ============================================================================

interface ProductLookupData {
  product_name: string;
  brand?: string;
  info_type?: 'general' | 'specs' | 'pricing' | 'reviews';
}

export async function lookupProductInfo(
  ctx: ActionContext,
  data: ProductLookupData
): Promise<ActionResult> {
  // Build a smart search query
  let query = data.product_name;
  if (data.brand) {
    query = `${data.brand} ${query}`;
  }

  // Add context based on what info is needed
  switch (data.info_type) {
    case 'specs':
      query += ' specifications features';
      break;
    case 'pricing':
      query += ' price MSRP retail';
      break;
    case 'reviews':
      query += ' review rating';
      break;
    default:
      query += ' product information';
  }

  // Use web search to find the info
  return webSearch(ctx, {
    query,
    search_depth: 'basic',
    max_results: 5,
    include_answer: true,
  });
}

// ============================================================================
// Research Action Router
// ============================================================================

export async function executeResearchAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'web_search':
      return webSearch(ctx, data);
    case 'lookup_product_info':
      return lookupProductInfo(ctx, data);
    default:
      return errorResult(`Unknown research action: ${action}`, 'Unknown action');
  }
}
