/**
 * API Diagnostics Type Definitions
 *
 * Core interfaces for the API diagnostics tool that crawls documentation,
 * scans implementations, detects mismatches, and generates fixes.
 */

// ============================================================================
// API Registry Types
// ============================================================================

export interface APIRegistryEntry {
  id: string;
  name: string;                    // 'explorium', 'together', etc.
  display_name: string;            // 'Explorium.ai'
  base_urls: string[];             // Can have multiple
  docs_url: string | null;         // Primary docs URL for crawling
  openapi_url: string | null;      // OpenAPI spec URL if available
  last_crawl_at: string | null;
  last_crawl_status: 'success' | 'partial' | 'failed' | 'never';
  environment_key: string;         // 'EXPLORIUM_API_KEY'
  files: string[];                 // Edge function files using this API
  active: boolean;
}

// ============================================================================
// Crawled API Specification Types
// ============================================================================

export interface CrawledAPISpec {
  api_id: string;
  version: string | null;
  crawled_at: string;
  endpoints: EndpointSpec[];
  schemas: SchemaSpec[];
  authentication: AuthSpec | null;
  rate_limits: RateLimitSpec | null;
  raw_markdown: string;
  source_urls: string[];
}

export interface EndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;                    // '/v1/prospects/match'
  description: string;
  request_body: SchemaRef | null;
  response_schema: SchemaRef | null;
  required_fields: string[];
  optional_fields: string[];
  deprecated: boolean;
  successor_path?: string;         // If deprecated, what replaces it
}

export interface SchemaSpec {
  name: string;                    // 'ProspectMatchRequest'
  fields: FieldSpec[];
}

export interface FieldSpec {
  name: string;                    // 'linkedin'
  type: string;                    // 'string', 'array', 'object'
  required: boolean;
  description: string;
  example: unknown;
  deprecated: boolean;
  successor_name?: string;         // If deprecated, what replaces it
}

export interface SchemaRef {
  schema_name: string;
  inline_schema?: SchemaSpec;
}

export interface AuthSpec {
  type: 'bearer' | 'api_key' | 'query_param' | 'basic';
  header_name?: string;            // 'API_KEY', 'Authorization'
  param_name?: string;             // 'key' for query params
}

export interface RateLimitSpec {
  requests_per_second?: number;
  requests_per_minute?: number;
  requests_per_day?: number;
}

// ============================================================================
// Implementation Scanner Types
// ============================================================================

export interface ImplementationUsage {
  file_path: string;
  function_name: string;
  line_number: number;
  api_id: string;
  endpoint_path: string;
  method: string;
  used_fields: string[];
  headers: Record<string, string>;
  raw_code: string;
}

// ============================================================================
// Mismatch Detection Types
// ============================================================================

export type MismatchType =
  | 'endpoint_not_found'       // 404 - endpoint path changed
  | 'endpoint_deprecated'      // Still works but will be removed
  | 'field_renamed'            // linkedin_url -> linkedin
  | 'field_removed'            // Field no longer accepted
  | 'field_required_changed'   // Optional became required
  | 'type_mismatch'            // String vs array
  | 'auth_header_changed'      // API_KEY vs api_key
  | 'base_url_changed';        // api.example.com/v1 -> api.example.com/v2

export type MismatchSeverity = 'critical' | 'warning' | 'info';

export interface APIMismatch {
  id: string;
  api_id: string;
  severity: MismatchSeverity;
  type: MismatchType;
  description: string;
  implementation: ImplementationUsage;
  expected: EndpointSpec | FieldSpec | null;
  detected_at: string;
  auto_fixable: boolean;
  suggested_fix: CodeFix | null;
  status: 'open' | 'fixed' | 'ignored' | 'false_positive';
}

// ============================================================================
// Auto-Fix Types
// ============================================================================

export interface CodeFix {
  file_path: string;
  line_start: number;
  line_end: number;
  original_code: string;
  fixed_code: string;
  diff: string;                    // Unified diff format
  confidence: number;              // 0-1
  requires_manual_review: boolean;
  description: string;
}

// ============================================================================
// Health Check Types
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface APIHealthCheck {
  api_id: string;
  checked_at: string;
  status: HealthStatus;
  latency_ms: number;
  auth_valid: boolean;
  endpoints_checked: number;
  endpoints_passed: number;
  error_message: string | null;
  details?: Record<string, unknown>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface DiagnosticsRequest {
  action:
    | 'healthCheck'
    | 'healthCheckAll'
    | 'crawl'
    | 'scan'
    | 'detect'
    | 'generateFix'
    | 'applyFix'
    | 'status';
  apiId?: string;
  mismatchId?: string;
  options?: {
    force?: boolean;           // Force re-crawl even if recent
    maxPages?: number;         // Limit pages to crawl
    includeDeprecated?: boolean;
  };
}

export interface DiagnosticsResponse {
  success: boolean;
  action: string;
  data?: {
    healthChecks?: APIHealthCheck[];
    crawledSpec?: CrawledAPISpec;
    implementations?: ImplementationUsage[];
    mismatches?: APIMismatch[];
    fix?: CodeFix;
    summary?: DiagnosticsSummary;
  };
  error?: string;
  timestamp: string;
}

export interface DiagnosticsSummary {
  apis_registered: number;
  apis_healthy: number;
  apis_degraded: number;
  apis_down: number;
  total_mismatches: number;
  critical_mismatches: number;
  auto_fixable: number;
  last_full_scan: string | null;
}

// ============================================================================
// Firecrawl Types
// ============================================================================

export interface FirecrawlCrawlRequest {
  url: string;
  limit?: number;
  scrapeOptions?: {
    formats?: ('markdown' | 'html' | 'text')[];
    includeTags?: string[];
    excludeTags?: string[];
    waitFor?: number;
  };
  includePaths?: string[];
  excludePaths?: string[];
}

export interface FirecrawlPage {
  url: string;
  markdown: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export interface FirecrawlCrawlResponse {
  id: string;
  status: 'pending' | 'scraping' | 'completed' | 'failed';
  data?: FirecrawlPage[];
  error?: string;
}
