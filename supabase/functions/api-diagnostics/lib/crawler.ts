/**
 * Firecrawl Documentation Crawler
 *
 * Crawls API documentation using Firecrawl and extracts
 * structured endpoint and schema information.
 */

import type {
  CrawledAPISpec,
  EndpointSpec,
  SchemaSpec,
  FieldSpec,
  FirecrawlCrawlResponse,
  FirecrawlPage,
  APIRegistryEntry,
} from './types.ts';
import { getRegistryEntry } from './registry.ts';

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

/**
 * Crawl API documentation using Firecrawl
 */
export async function crawlAPIDocumentation(
  apiId: string,
  firecrawlApiKey: string,
  options: { maxPages?: number; force?: boolean } = {}
): Promise<CrawledAPISpec> {
  const registry = getRegistryEntry(apiId);
  if (!registry) {
    throw new Error(`Unknown API: ${apiId}`);
  }

  if (!registry.docs_url) {
    throw new Error(`No documentation URL configured for ${apiId}`);
  }

  const maxPages = options.maxPages || 50;

  console.log(`[Crawler] Starting crawl for ${registry.display_name} at ${registry.docs_url}`);

  // Start the crawl job
  const crawlResponse = await fetch(`${FIRECRAWL_API_URL}/crawl`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: registry.docs_url,
      limit: maxPages,
      scrapeOptions: {
        formats: ['markdown'],
        includeTags: ['code', 'pre', 'table', 'h1', 'h2', 'h3', 'h4', 'p', 'li'],
        waitFor: 2000,
      },
      includePaths: ['/reference/*', '/api/*', '/docs/*'],
      excludePaths: ['/blog/*', '/changelog/*', '/pricing/*', '/contact/*'],
    }),
  });

  if (!crawlResponse.ok) {
    const errorText = await crawlResponse.text();
    console.error(`[Crawler] Firecrawl error:`, crawlResponse.status, errorText);
    throw new Error(`Firecrawl crawl failed: ${crawlResponse.status} - ${errorText}`);
  }

  const { id: crawlId } = await crawlResponse.json();
  console.log(`[Crawler] Crawl job started: ${crawlId}`);

  // Poll for completion (max 5 minutes)
  let crawlResult: FirecrawlCrawlResponse | null = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusResponse = await fetch(`${FIRECRAWL_API_URL}/crawl/${crawlId}`, {
      headers: { 'Authorization': `Bearer ${firecrawlApiKey}` },
    });

    if (!statusResponse.ok) {
      console.warn(`[Crawler] Status check failed:`, statusResponse.status);
      continue;
    }

    crawlResult = await statusResponse.json();
    console.log(`[Crawler] Status: ${crawlResult?.status}, pages: ${crawlResult?.data?.length || 0}`);

    if (crawlResult?.status === 'completed') break;
    if (crawlResult?.status === 'failed') {
      throw new Error(`Crawl failed: ${crawlResult.error}`);
    }
  }

  if (!crawlResult?.data || crawlResult.data.length === 0) {
    throw new Error('Crawl completed but no pages were returned');
  }

  console.log(`[Crawler] Crawl completed with ${crawlResult.data.length} pages`);

  // Parse the crawled content
  return parseMarkdownToSpec(apiId, crawlResult.data);
}

/**
 * Parse crawled markdown pages into structured API specification
 */
function parseMarkdownToSpec(apiId: string, pages: FirecrawlPage[]): CrawledAPISpec {
  const endpoints: EndpointSpec[] = [];
  const schemas: SchemaSpec[] = [];
  const sourceUrls: string[] = [];
  let combinedMarkdown = '';

  for (const page of pages) {
    sourceUrls.push(page.url);
    combinedMarkdown += `\n\n--- PAGE: ${page.url} ---\n\n${page.markdown}`;

    // Extract endpoints from this page
    const pageEndpoints = extractEndpoints(page.markdown, page.url);
    endpoints.push(...pageEndpoints);

    // Extract schemas from code blocks
    const pageSchemas = extractSchemas(page.markdown);
    schemas.push(...pageSchemas);
  }

  // Deduplicate endpoints by path+method
  const uniqueEndpoints = deduplicateEndpoints(endpoints);

  // Deduplicate schemas by name
  const uniqueSchemas = deduplicateSchemas(schemas);

  console.log(`[Crawler] Extracted ${uniqueEndpoints.length} endpoints, ${uniqueSchemas.length} schemas`);

  return {
    api_id: apiId,
    version: extractVersion(combinedMarkdown),
    crawled_at: new Date().toISOString(),
    endpoints: uniqueEndpoints,
    schemas: uniqueSchemas,
    authentication: null, // TODO: Extract auth info
    rate_limits: null,
    raw_markdown: combinedMarkdown,
    source_urls: sourceUrls,
  };
}

/**
 * Extract API endpoints from markdown content
 */
function extractEndpoints(markdown: string, sourceUrl: string): EndpointSpec[] {
  const endpoints: EndpointSpec[] = [];

  // Pattern 1: HTTP method + path (e.g., "POST /v1/prospects/match")
  const httpPattern = /\b(GET|POST|PUT|PATCH|DELETE)\s+([\/\w\-\{\}\.]+)/gi;
  let match;

  while ((match = httpPattern.exec(markdown)) !== null) {
    const method = match[1].toUpperCase() as EndpointSpec['method'];
    const path = match[2];

    // Skip obvious non-endpoint patterns
    if (path.includes('.js') || path.includes('.css') || path.includes('.html')) {
      continue;
    }

    // Extract context around the match for description
    const contextStart = Math.max(0, match.index - 200);
    const contextEnd = Math.min(markdown.length, match.index + 500);
    const context = markdown.slice(contextStart, contextEnd);

    // Try to extract required/optional fields from nearby content
    const { requiredFields, optionalFields } = extractFieldsFromContext(context);

    endpoints.push({
      method,
      path,
      description: extractDescription(context),
      request_body: null,
      response_schema: null,
      required_fields: requiredFields,
      optional_fields: optionalFields,
      deprecated: context.toLowerCase().includes('deprecated'),
      successor_path: undefined,
    });
  }

  // Pattern 2: Code blocks with curl examples
  const curlPattern = /curl[^`]*-X\s+(GET|POST|PUT|PATCH|DELETE)\s+['"](https?:\/\/[^'"]+)['"]/gi;
  while ((match = curlPattern.exec(markdown)) !== null) {
    const method = match[1].toUpperCase() as EndpointSpec['method'];
    const fullUrl = match[2];

    // Extract path from URL
    try {
      const url = new URL(fullUrl);
      const path = url.pathname;

      if (!endpoints.some((e) => e.path === path && e.method === method)) {
        endpoints.push({
          method,
          path,
          description: '',
          request_body: null,
          response_schema: null,
          required_fields: [],
          optional_fields: [],
          deprecated: false,
        });
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return endpoints;
}

/**
 * Extract schema definitions from JSON code blocks
 */
function extractSchemas(markdown: string): SchemaSpec[] {
  const schemas: SchemaSpec[] = [];

  // Find JSON code blocks
  const jsonPattern = /```(?:json)?\s*\n([\s\S]*?)\n```/gi;
  let match;

  while ((match = jsonPattern.exec(markdown)) !== null) {
    const jsonContent = match[1].trim();

    try {
      const parsed = JSON.parse(jsonContent);

      // If it looks like a request body, extract field info
      if (typeof parsed === 'object' && parsed !== null) {
        const fields = extractFieldsFromObject(parsed);
        if (fields.length > 0) {
          schemas.push({
            name: `Schema_${schemas.length + 1}`,
            fields,
          });
        }
      }
    } catch {
      // Not valid JSON, skip
    }
  }

  return schemas;
}

/**
 * Extract fields from a JSON object
 */
function extractFieldsFromObject(obj: Record<string, unknown>, prefix = ''): FieldSpec[] {
  const fields: FieldSpec[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;
    const fieldType = Array.isArray(value)
      ? 'array'
      : value === null
      ? 'null'
      : typeof value;

    fields.push({
      name: fieldName,
      type: fieldType,
      required: false, // Can't determine from example alone
      description: '',
      example: value,
      deprecated: false,
    });

    // Recurse into nested objects (but not too deep)
    if (fieldType === 'object' && value && !prefix.includes('.')) {
      fields.push(...extractFieldsFromObject(value as Record<string, unknown>, fieldName));
    }
  }

  return fields;
}

/**
 * Extract required/optional fields from context text
 */
function extractFieldsFromContext(context: string): {
  requiredFields: string[];
  optionalFields: string[];
} {
  const requiredFields: string[] = [];
  const optionalFields: string[] = [];

  // Pattern: "required" or "optional" followed by field name
  const requiredPattern = /required[:\s]+[`"]?(\w+)[`"]?/gi;
  const optionalPattern = /optional[:\s]+[`"]?(\w+)[`"]?/gi;

  // Pattern: Field name followed by (required) or (optional)
  const fieldRequiredPattern = /[`"]?(\w+)[`"]?\s*\(required\)/gi;
  const fieldOptionalPattern = /[`"]?(\w+)[`"]?\s*\(optional\)/gi;

  let match;
  while ((match = requiredPattern.exec(context)) !== null) {
    requiredFields.push(match[1]);
  }
  while ((match = optionalPattern.exec(context)) !== null) {
    optionalFields.push(match[1]);
  }
  while ((match = fieldRequiredPattern.exec(context)) !== null) {
    requiredFields.push(match[1]);
  }
  while ((match = fieldOptionalPattern.exec(context)) !== null) {
    optionalFields.push(match[1]);
  }

  return {
    requiredFields: [...new Set(requiredFields)],
    optionalFields: [...new Set(optionalFields)],
  };
}

/**
 * Extract description from context
 */
function extractDescription(context: string): string {
  // Look for a sentence near the endpoint definition
  const sentences = context.split(/[.!?]/).filter((s) => s.trim().length > 20);
  return sentences[0]?.trim().slice(0, 200) || '';
}

/**
 * Extract API version from markdown
 */
function extractVersion(markdown: string): string | null {
  const versionPattern = /\bv(\d+(?:\.\d+)?)\b/i;
  const match = versionPattern.exec(markdown);
  return match ? `v${match[1]}` : null;
}

/**
 * Deduplicate endpoints by path+method
 */
function deduplicateEndpoints(endpoints: EndpointSpec[]): EndpointSpec[] {
  const seen = new Map<string, EndpointSpec>();

  for (const endpoint of endpoints) {
    const key = `${endpoint.method}:${endpoint.path}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, endpoint);
    } else {
      // Merge: keep the one with more info
      if (
        endpoint.description.length > existing.description.length ||
        endpoint.required_fields.length > existing.required_fields.length
      ) {
        seen.set(key, {
          ...existing,
          description: endpoint.description || existing.description,
          required_fields: [
            ...new Set([...existing.required_fields, ...endpoint.required_fields]),
          ],
          optional_fields: [
            ...new Set([...existing.optional_fields, ...endpoint.optional_fields]),
          ],
        });
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Deduplicate schemas by name
 */
function deduplicateSchemas(schemas: SchemaSpec[]): SchemaSpec[] {
  const seen = new Map<string, SchemaSpec>();

  for (const schema of schemas) {
    // Use field signature as key since names are auto-generated
    const fieldKey = schema.fields.map((f) => f.name).sort().join(',');
    if (!seen.has(fieldKey)) {
      seen.set(fieldKey, schema);
    }
  }

  return Array.from(seen.values());
}

/**
 * Try to fetch OpenAPI spec directly if available
 */
export async function fetchOpenAPISpec(apiId: string): Promise<CrawledAPISpec | null> {
  const registry = getRegistryEntry(apiId);
  if (!registry?.openapi_url) {
    return null;
  }

  try {
    console.log(`[Crawler] Fetching OpenAPI spec from ${registry.openapi_url}`);

    const response = await fetch(registry.openapi_url);
    if (!response.ok) {
      console.warn(`[Crawler] OpenAPI fetch failed: ${response.status}`);
      return null;
    }

    const spec = await response.json();

    // Parse OpenAPI spec into our format
    const endpoints: EndpointSpec[] = [];

    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, details] of Object.entries(methods as Record<string, unknown>)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
            const methodDetails = details as Record<string, unknown>;
            endpoints.push({
              method: method.toUpperCase() as EndpointSpec['method'],
              path,
              description: (methodDetails.summary as string) || (methodDetails.description as string) || '',
              request_body: null,
              response_schema: null,
              required_fields: [],
              optional_fields: [],
              deprecated: (methodDetails.deprecated as boolean) || false,
            });
          }
        }
      }
    }

    return {
      api_id: apiId,
      version: spec.info?.version || null,
      crawled_at: new Date().toISOString(),
      endpoints,
      schemas: [],
      authentication: null,
      rate_limits: null,
      raw_markdown: JSON.stringify(spec, null, 2),
      source_urls: [registry.openapi_url],
    };
  } catch (error) {
    console.warn(`[Crawler] OpenAPI parsing failed:`, error);
    return null;
  }
}
