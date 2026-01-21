/**
 * API Registry - Known external API integrations
 *
 * Maintains a registry of all external APIs used by ISYNCSO,
 * their documentation URLs, and the edge function files that use them.
 */

import type { APIRegistryEntry } from './types.ts';

/**
 * Static registry of known APIs.
 * This can be extended by database entries for dynamic additions.
 */
export const API_REGISTRY: APIRegistryEntry[] = [
  {
    id: 'explorium',
    name: 'explorium',
    display_name: 'Explorium.ai',
    base_urls: ['https://api.explorium.ai/v1'],
    docs_url: 'https://developers.explorium.ai/reference/',
    openapi_url: 'https://api.explorium.ai/openapi.json',
    last_crawl_at: null,
    last_crawl_status: 'never',
    environment_key: 'EXPLORIUM_API_KEY',
    files: [
      'explorium-enrich/index.ts',
      'exploriumPeople/index.ts',
      'exploriumFirmographics/index.ts',
    ],
    active: true,
  },
  {
    id: 'together',
    name: 'together',
    display_name: 'Together.ai',
    base_urls: [
      'https://api.together.xyz/v1',
      'https://api.together.ai/v1',
    ],
    docs_url: 'https://docs.together.ai/reference/',
    openapi_url: null,
    last_crawl_at: null,
    last_crawl_status: 'never',
    environment_key: 'TOGETHER_API_KEY',
    files: [
      'generate-image/index.ts',
      'research-product/index.ts',
      'research-supplier/index.ts',
      'sync-voice/index.ts',
      'sync/index.ts',
    ],
    active: true,
  },
  {
    id: 'google',
    name: 'google',
    display_name: 'Google (Gemini/Veo)',
    base_urls: [
      'https://generativelanguage.googleapis.com',
    ],
    docs_url: 'https://ai.google.dev/docs',
    openapi_url: null,
    last_crawl_at: null,
    last_crawl_status: 'never',
    environment_key: 'GOOGLE_API_KEY',
    files: [
      'generate-image/index.ts',
      'generate-video/index.ts',
      'process-invoice/index.ts',
    ],
    active: true,
  },
  {
    id: 'groq',
    name: 'groq',
    display_name: 'Groq',
    base_urls: ['https://api.groq.com/openai/v1'],
    docs_url: 'https://console.groq.com/docs',
    openapi_url: null,
    last_crawl_at: null,
    last_crawl_status: 'never',
    environment_key: 'GROQ_API_KEY',
    files: [
      'process-invoice/index.ts',
    ],
    active: true,
  },
  {
    id: 'tavily',
    name: 'tavily',
    display_name: 'Tavily',
    base_urls: ['https://api.tavily.com'],
    docs_url: 'https://docs.tavily.com/',
    openapi_url: null,
    last_crawl_at: null,
    last_crawl_status: 'never',
    environment_key: 'TAVILY_API_KEY',
    files: [
      'research-product/index.ts',
      'research-supplier/index.ts',
    ],
    active: true,
  },
  {
    id: 'composio',
    name: 'composio',
    display_name: 'Composio',
    base_urls: [
      'https://backend.composio.dev/api/v1',
      'https://backend.composio.dev/api/v3',
    ],
    docs_url: 'https://docs.composio.dev/',
    openapi_url: null,
    last_crawl_at: null,
    last_crawl_status: 'never',
    environment_key: 'COMPOSIO_API_KEY',
    files: [
      'composio-connect/index.ts',
      'composio-webhooks/index.ts',
    ],
    active: true,
  },
];

/**
 * URL patterns to identify which API a URL belongs to
 */
export const API_URL_PATTERNS: Record<string, RegExp> = {
  explorium: /api\.explorium\.ai/i,
  together: /api\.together\.(xyz|ai)/i,
  google: /generativelanguage\.googleapis\.com/i,
  groq: /api\.groq\.com/i,
  tavily: /api\.tavily\.com/i,
  composio: /backend\.composio\.dev/i,
};

/**
 * Known field renames that have occurred in API updates.
 * Used for detecting potential field mismatches.
 */
export const KNOWN_FIELD_RENAMES: Record<string, Record<string, string>> = {
  explorium: {
    linkedin_url: 'linkedin',
    contact_id: 'prospect_id',
    contacts_to_match: 'prospects_to_match',
    matched_contacts: 'matched_prospects',
    contact_ids: 'prospect_ids',
  },
};

/**
 * Known endpoint migrations that have occurred.
 * Maps old paths to new paths.
 */
export const KNOWN_ENDPOINT_MIGRATIONS: Record<string, Record<string, string>> = {
  explorium: {
    '/v1/contacts/match': '/v1/prospects/match',
    '/v1/contacts/enrich': '/v1/prospects/profiles/enrich',
    '/v1/businesses/enrich': '/v1/businesses/firmographics/enrich',
  },
};

/**
 * Get registry entry by API ID
 */
export function getRegistryEntry(apiId: string): APIRegistryEntry | undefined {
  return API_REGISTRY.find((entry) => entry.id === apiId || entry.name === apiId);
}

/**
 * Identify which API a URL belongs to
 */
export function identifyAPI(url: string): string | null {
  for (const [apiId, pattern] of Object.entries(API_URL_PATTERNS)) {
    if (pattern.test(url)) {
      return apiId;
    }
  }
  return null;
}

/**
 * Get all active APIs
 */
export function getActiveAPIs(): APIRegistryEntry[] {
  return API_REGISTRY.filter((entry) => entry.active);
}

/**
 * Check if a field has a known rename
 */
export function getFieldRename(apiId: string, fieldName: string): string | null {
  return KNOWN_FIELD_RENAMES[apiId]?.[fieldName] || null;
}

/**
 * Check if an endpoint has a known migration
 */
export function getEndpointMigration(apiId: string, path: string): string | null {
  return KNOWN_ENDPOINT_MIGRATIONS[apiId]?.[path] || null;
}
