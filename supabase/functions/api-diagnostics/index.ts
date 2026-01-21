/**
 * API Diagnostics Edge Function
 *
 * Main orchestrator for API health checks, documentation crawling,
 * mismatch detection, and auto-fix generation.
 *
 * Actions:
 * - healthCheck: Test single API connectivity
 * - healthCheckAll: Test all registered APIs
 * - crawl: Fetch and parse API documentation via Firecrawl
 * - scan: Extract API calls from edge functions
 * - detect: Compare specs vs implementation
 * - generateFix: Create code patches for mismatches
 * - status: Get current diagnostics status
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type {
  DiagnosticsRequest,
  DiagnosticsResponse,
  APIMismatch,
  CrawledAPISpec,
} from './lib/types.ts';
import { API_REGISTRY, getRegistryEntry } from './lib/registry.ts';
import { checkAllAPIs, checkAPI, formatHealthReport, getHealthSummary } from './lib/health.ts';
import { crawlAPIDocumentation, fetchOpenAPISpec } from './lib/crawler.ts';
import { scanAllEdgeFunctions, scanAPIFiles, formatUsagesReport } from './lib/scanner.ts';
import { detectMismatches, formatMismatchReport } from './lib/detector.ts';
import {
  generateFix,
  generateFixes,
  previewFixes,
  generateFixSummary,
} from './lib/fixer.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Main request handler
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: DiagnosticsRequest = await req.json();
    const { action, apiId, mismatchId, options } = body;

    console.log(`[API Diagnostics] Action: ${action}, API: ${apiId || 'all'}`);

    const supabase = getSupabaseClient();
    let response: DiagnosticsResponse;

    switch (action) {
      case 'healthCheck':
        response = await handleHealthCheck(apiId);
        break;

      case 'healthCheckAll':
        response = await handleHealthCheckAll();
        break;

      case 'crawl':
        response = await handleCrawl(supabase, apiId, options);
        break;

      case 'scan':
        response = await handleScan(apiId);
        break;

      case 'detect':
        response = await handleDetect(supabase, apiId);
        break;

      case 'generateFix':
        response = await handleGenerateFix(supabase, mismatchId);
        break;

      case 'status':
        response = await handleStatus(supabase, apiId);
        break;

      default:
        response = {
          success: false,
          message: `Unknown action: ${action}`,
          data: null,
        };
    }

    return new Response(JSON.stringify(response), {
      status: response.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API Diagnostics] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Handle single API health check
 */
async function handleHealthCheck(apiId?: string): Promise<DiagnosticsResponse> {
  if (!apiId) {
    return {
      success: false,
      message: 'apiId is required for healthCheck action',
      data: null,
    };
  }

  const registry = getRegistryEntry(apiId);
  if (!registry) {
    return {
      success: false,
      message: `Unknown API: ${apiId}`,
      data: null,
    };
  }

  try {
    const result = await checkAPI(apiId);
    const report = formatHealthReport([result]);

    return {
      success: true,
      message: `Health check completed for ${registry.display_name}`,
      data: {
        healthCheck: result,
        report,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Health check failed: ${error.message}`,
      data: null,
    };
  }
}

/**
 * Handle health check for all APIs
 */
async function handleHealthCheckAll(): Promise<DiagnosticsResponse> {
  try {
    const results = await checkAllAPIs();
    const summary = getHealthSummary(results);
    const report = formatHealthReport(results);

    return {
      success: true,
      message: `Health check completed: ${summary.healthy}/${summary.total} healthy`,
      data: {
        healthChecks: results,
        summary,
        report,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Health check failed: ${error.message}`,
      data: null,
    };
  }
}

/**
 * Handle API documentation crawling
 */
async function handleCrawl(
  supabase: SupabaseClient,
  apiId?: string,
  options?: { maxPages?: number; force?: boolean }
): Promise<DiagnosticsResponse> {
  if (!apiId) {
    return {
      success: false,
      message: 'apiId is required for crawl action',
      data: null,
    };
  }

  const registry = getRegistryEntry(apiId);
  if (!registry) {
    return {
      success: false,
      message: `Unknown API: ${apiId}`,
      data: null,
    };
  }

  const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlApiKey) {
    return {
      success: false,
      message: 'FIRECRAWL_API_KEY not configured',
      data: null,
    };
  }

  try {
    // Try OpenAPI spec first (faster and more accurate)
    let spec = await fetchOpenAPISpec(apiId);

    // Fall back to Firecrawl if no OpenAPI spec
    if (!spec) {
      spec = await crawlAPIDocumentation(apiId, firecrawlApiKey, options);
    }

    // Store the crawled spec
    const { error: storeError } = await supabase
      .from('api_crawled_specs')
      .upsert(
        {
          api_id: apiId,
          version: spec.version,
          endpoints: spec.endpoints,
          schemas: spec.schemas,
          authentication: spec.authentication,
          rate_limits: spec.rate_limits,
          raw_markdown: spec.raw_markdown,
          source_urls: spec.source_urls,
          crawled_at: spec.crawled_at,
        },
        { onConflict: 'api_id' }
      );

    if (storeError) {
      console.warn('[Crawler] Failed to store spec:', storeError);
    }

    return {
      success: true,
      message: `Crawled ${registry.display_name}: ${spec.endpoints.length} endpoints, ${spec.schemas.length} schemas`,
      data: {
        spec: {
          api_id: spec.api_id,
          version: spec.version,
          crawled_at: spec.crawled_at,
          endpoints_count: spec.endpoints.length,
          schemas_count: spec.schemas.length,
          source_urls: spec.source_urls,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Crawl failed: ${error.message}`,
      data: null,
    };
  }
}

/**
 * Handle codebase scanning
 */
async function handleScan(apiId?: string): Promise<DiagnosticsResponse> {
  try {
    const usages = apiId ? await scanAPIFiles(apiId) : await scanAllEdgeFunctions();

    const report = formatUsagesReport(usages);

    return {
      success: true,
      message: `Scan completed: ${usages.length} API calls found`,
      data: {
        usages,
        report,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Scan failed: ${error.message}`,
      data: null,
    };
  }
}

/**
 * Handle mismatch detection
 */
async function handleDetect(
  supabase: SupabaseClient,
  apiId?: string
): Promise<DiagnosticsResponse> {
  try {
    // Scan implementations
    const usages = apiId ? await scanAPIFiles(apiId) : await scanAllEdgeFunctions();

    if (usages.length === 0) {
      return {
        success: true,
        message: 'No API usages found to check',
        data: { mismatches: [], report: 'No API calls detected.' },
      };
    }

    // Get crawled specs from database
    const crawledSpecs = new Map<string, CrawledAPISpec>();

    const apisToCheck = apiId ? [apiId] : API_REGISTRY.filter((a) => a.active).map((a) => a.id);

    for (const id of apisToCheck) {
      const { data: specData } = await supabase
        .from('api_crawled_specs')
        .select('*')
        .eq('api_id', id)
        .single();

      if (specData) {
        crawledSpecs.set(id, {
          api_id: specData.api_id,
          version: specData.version,
          crawled_at: specData.crawled_at,
          endpoints: specData.endpoints || [],
          schemas: specData.schemas || [],
          authentication: specData.authentication,
          rate_limits: specData.rate_limits,
          raw_markdown: specData.raw_markdown,
          source_urls: specData.source_urls || [],
        });
      }
    }

    // Detect mismatches
    const mismatches = detectMismatches(crawledSpecs, usages);

    // Store mismatches in database
    if (mismatches.length > 0) {
      const toStore = mismatches.map((m) => ({
        id: m.id,
        api_id: m.api_id,
        severity: m.severity,
        type: m.type,
        description: m.description,
        file_path: m.implementation.file_path,
        line_number: m.implementation.line_number,
        implementation: m.implementation,
        expected: m.expected,
        auto_fixable: m.auto_fixable,
        suggested_fix: m.suggested_fix,
        status: m.status,
        detected_at: m.detected_at,
      }));

      const { error: storeError } = await supabase
        .from('api_mismatches')
        .upsert(toStore, { onConflict: 'id' });

      if (storeError) {
        console.warn('[Detector] Failed to store mismatches:', storeError);
      }
    }

    const report = formatMismatchReport(mismatches);
    const fixPreview = previewFixes(mismatches);

    return {
      success: true,
      message: `Detection complete: ${mismatches.length} issues found`,
      data: {
        mismatches,
        report,
        fixPreview,
        summary: {
          total: mismatches.length,
          critical: mismatches.filter((m) => m.severity === 'critical').length,
          warning: mismatches.filter((m) => m.severity === 'warning').length,
          info: mismatches.filter((m) => m.severity === 'info').length,
          auto_fixable: mismatches.filter((m) => m.auto_fixable).length,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Detection failed: ${error.message}`,
      data: null,
    };
  }
}

/**
 * Handle fix generation
 */
async function handleGenerateFix(
  supabase: SupabaseClient,
  mismatchId?: string
): Promise<DiagnosticsResponse> {
  if (!mismatchId) {
    return {
      success: false,
      message: 'mismatchId is required for generateFix action',
      data: null,
    };
  }

  try {
    // Get the mismatch from database
    const { data: mismatch, error: fetchError } = await supabase
      .from('api_mismatches')
      .select('*')
      .eq('id', mismatchId)
      .single();

    if (fetchError || !mismatch) {
      return {
        success: false,
        message: `Mismatch not found: ${mismatchId}`,
        data: null,
      };
    }

    // Convert to APIMismatch type
    const mismatchData: APIMismatch = {
      id: mismatch.id,
      api_id: mismatch.api_id,
      severity: mismatch.severity,
      type: mismatch.type,
      description: mismatch.description,
      implementation: mismatch.implementation,
      expected: mismatch.expected,
      detected_at: mismatch.detected_at,
      auto_fixable: mismatch.auto_fixable,
      suggested_fix: mismatch.suggested_fix,
      status: mismatch.status,
    };

    // Generate fix (use LLM if available for complex fixes)
    const togetherApiKey = Deno.env.get('TOGETHER_API_KEY');
    const fix = await generateFix(mismatchData, togetherApiKey);

    if (!fix) {
      return {
        success: false,
        message: 'Could not generate fix for this mismatch',
        data: null,
      };
    }

    // Update mismatch with generated fix
    await supabase
      .from('api_mismatches')
      .update({
        suggested_fix: fix,
        status: 'fix_generated',
      })
      .eq('id', mismatchId);

    return {
      success: true,
      message: `Fix generated with ${(fix.confidence * 100).toFixed(0)}% confidence`,
      data: {
        fix,
        requiresReview: fix.requires_manual_review,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Fix generation failed: ${error.message}`,
      data: null,
    };
  }
}

/**
 * Handle status request
 */
async function handleStatus(
  supabase: SupabaseClient,
  apiId?: string
): Promise<DiagnosticsResponse> {
  try {
    // Get registered APIs
    const registeredAPIs = apiId
      ? API_REGISTRY.filter((a) => a.id === apiId)
      : API_REGISTRY.filter((a) => a.active);

    // Get latest health checks
    const { data: healthChecks } = await supabase
      .from('api_health_checks')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(registeredAPIs.length * 2);

    // Get latest crawl timestamps
    const { data: crawledSpecs } = await supabase
      .from('api_crawled_specs')
      .select('api_id, crawled_at, version');

    // Get open mismatches
    const { data: openMismatches } = await supabase
      .from('api_mismatches')
      .select('*')
      .in('status', ['open', 'fix_generated']);

    const status = {
      registered_apis: registeredAPIs.map((api) => ({
        id: api.id,
        name: api.display_name,
        active: api.active,
        docs_url: api.docs_url,
        files_count: api.files.length,
      })),
      health_checks: healthChecks || [],
      crawled_specs: crawledSpecs || [],
      open_mismatches: openMismatches?.length || 0,
      mismatches_by_severity: {
        critical: openMismatches?.filter((m) => m.severity === 'critical').length || 0,
        warning: openMismatches?.filter((m) => m.severity === 'warning').length || 0,
        info: openMismatches?.filter((m) => m.severity === 'info').length || 0,
      },
    };

    return {
      success: true,
      message: 'Status retrieved',
      data: status,
    };
  } catch (error) {
    return {
      success: false,
      message: `Status fetch failed: ${error.message}`,
      data: null,
    };
  }
}
