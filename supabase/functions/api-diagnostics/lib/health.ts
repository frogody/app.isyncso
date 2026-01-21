/**
 * API Health Check Module
 *
 * Tests connectivity and authentication for all registered external APIs.
 * Provides detailed health status and latency metrics.
 */

import type { APIHealthCheck, APIRegistryEntry, HealthStatus } from './types.ts';
import { API_REGISTRY, getRegistryEntry } from './registry.ts';

/**
 * Run health checks for all active APIs
 */
export async function checkAllAPIs(): Promise<APIHealthCheck[]> {
  const results: APIHealthCheck[] = [];

  for (const api of API_REGISTRY) {
    if (!api.active) continue;

    try {
      const result = await checkAPI(api.id);
      results.push(result);
    } catch (error) {
      results.push({
        api_id: api.id,
        checked_at: new Date().toISOString(),
        status: 'down',
        latency_ms: 0,
        auth_valid: false,
        endpoints_checked: 0,
        endpoints_passed: 0,
        error_message: error.message,
      });
    }
  }

  return results;
}

/**
 * Run health check for a specific API
 */
export async function checkAPI(apiId: string): Promise<APIHealthCheck> {
  const registry = getRegistryEntry(apiId);
  if (!registry) {
    throw new Error(`Unknown API: ${apiId}`);
  }

  const apiKey = Deno.env.get(registry.environment_key);
  if (!apiKey) {
    return {
      api_id: apiId,
      checked_at: new Date().toISOString(),
      status: 'down',
      latency_ms: 0,
      auth_valid: false,
      endpoints_checked: 0,
      endpoints_passed: 0,
      error_message: `Missing API key: ${registry.environment_key}`,
    };
  }

  const startTime = Date.now();

  try {
    const result = await testAPIConnectivity(registry, apiKey);
    const latency = Date.now() - startTime;

    return {
      api_id: apiId,
      checked_at: new Date().toISOString(),
      status: determineStatus(result),
      latency_ms: latency,
      auth_valid: result.authValid,
      endpoints_checked: result.endpointsChecked,
      endpoints_passed: result.endpointsPassed,
      error_message: result.error || null,
      details: result.details,
    };
  } catch (error) {
    return {
      api_id: apiId,
      checked_at: new Date().toISOString(),
      status: 'down',
      latency_ms: Date.now() - startTime,
      auth_valid: false,
      endpoints_checked: 0,
      endpoints_passed: 0,
      error_message: error.message,
    };
  }
}

interface ConnectivityResult {
  success: boolean;
  authValid: boolean;
  endpointsChecked: number;
  endpointsPassed: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Test API connectivity with a minimal request
 */
async function testAPIConnectivity(
  api: APIRegistryEntry,
  apiKey: string
): Promise<ConnectivityResult> {
  switch (api.name) {
    case 'explorium':
      return testExploriumConnectivity(apiKey);

    case 'together':
      return testTogetherConnectivity(apiKey);

    case 'google':
      return testGoogleConnectivity(apiKey);

    case 'groq':
      return testGroqConnectivity(apiKey);

    case 'tavily':
      return testTavilyConnectivity(apiKey);

    case 'composio':
      return testComposioConnectivity(apiKey);

    default:
      return {
        success: false,
        authValid: false,
        endpointsChecked: 0,
        endpointsPassed: 0,
        error: 'No health check implemented for this API',
      };
  }
}

/**
 * Test Explorium API
 */
async function testExploriumConnectivity(apiKey: string): Promise<ConnectivityResult> {
  try {
    // Test with a minimal prospect match call
    const response = await fetch('https://api.explorium.ai/v1/prospects/match', {
      method: 'POST',
      headers: {
        'API_KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prospects_to_match: [{ email: 'healthcheck@example.com' }],
        request_context: {},
      }),
    });

    // 200 or 400 (validation) = healthy
    // 401 = auth failed
    // 404 = endpoint changed
    const authValid = response.status !== 401 && response.status !== 403;
    const endpointValid = response.status !== 404;

    return {
      success: authValid && endpointValid,
      authValid,
      endpointsChecked: 1,
      endpointsPassed: endpointValid ? 1 : 0,
      error: !authValid
        ? 'Authentication failed'
        : !endpointValid
        ? 'Endpoint not found - API may have changed'
        : undefined,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      success: false,
      authValid: false,
      endpointsChecked: 1,
      endpointsPassed: 0,
      error: `Network error: ${error.message}`,
    };
  }
}

/**
 * Test Together.ai API
 */
async function testTogetherConnectivity(apiKey: string): Promise<ConnectivityResult> {
  try {
    // Test with models list endpoint (lightweight)
    const response = await fetch('https://api.together.xyz/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const authValid = response.status !== 401 && response.status !== 403;

    return {
      success: response.ok,
      authValid,
      endpointsChecked: 1,
      endpointsPassed: response.ok ? 1 : 0,
      error: !authValid ? 'Authentication failed' : undefined,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      success: false,
      authValid: false,
      endpointsChecked: 1,
      endpointsPassed: 0,
      error: `Network error: ${error.message}`,
    };
  }
}

/**
 * Test Google Gemini API
 * Uses the models list endpoint for a lightweight health check
 */
async function testGoogleConnectivity(apiKey: string): Promise<ConnectivityResult> {
  try {
    // Use models list endpoint - lightweight and doesn't consume tokens
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // 200 = success, 400 = invalid key format, 401/403 = unauthorized
    const authValid = response.status !== 401 && response.status !== 403;
    const keyFormatValid = response.status !== 400;

    let errorMsg: string | undefined;
    if (!authValid) {
      errorMsg = 'Authentication failed - invalid or expired API key';
    } else if (!keyFormatValid) {
      errorMsg = 'Invalid API key format';
    } else if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
    }

    return {
      success: response.ok,
      authValid: authValid && keyFormatValid,
      endpointsChecked: 1,
      endpointsPassed: response.ok ? 1 : 0,
      error: errorMsg,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      success: false,
      authValid: false,
      endpointsChecked: 1,
      endpointsPassed: 0,
      error: `Network error: ${error.message}`,
    };
  }
}

/**
 * Test Groq API
 */
async function testGroqConnectivity(apiKey: string): Promise<ConnectivityResult> {
  try {
    // Test with models list endpoint
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const authValid = response.status !== 401 && response.status !== 403;

    return {
      success: response.ok,
      authValid,
      endpointsChecked: 1,
      endpointsPassed: response.ok ? 1 : 0,
      error: !authValid ? 'Authentication failed' : undefined,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      success: false,
      authValid: false,
      endpointsChecked: 1,
      endpointsPassed: 0,
      error: `Network error: ${error.message}`,
    };
  }
}

/**
 * Test Tavily API
 */
async function testTavilyConnectivity(apiKey: string): Promise<ConnectivityResult> {
  try {
    // Tavily requires a search request, use minimal query
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: 'test',
        search_depth: 'basic',
        max_results: 1,
      }),
    });

    const authValid = response.status !== 401 && response.status !== 403;

    return {
      success: response.ok,
      authValid,
      endpointsChecked: 1,
      endpointsPassed: response.ok ? 1 : 0,
      error: !authValid ? 'Authentication failed' : undefined,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      success: false,
      authValid: false,
      endpointsChecked: 1,
      endpointsPassed: 0,
      error: `Network error: ${error.message}`,
    };
  }
}

/**
 * Test Composio API
 * Uses correct 'x-api-key' header format per Composio API docs
 */
async function testComposioConnectivity(apiKey: string): Promise<ConnectivityResult> {
  try {
    // Test with apps list endpoint using correct header format
    const response = await fetch('https://backend.composio.dev/api/v1/apps', {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const authValid = response.status !== 401 && response.status !== 403;

    let errorMsg: string | undefined;
    if (!authValid) {
      errorMsg = 'Authentication failed - check COMPOSIO_API_KEY';
    } else if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      errorMsg = errorData?.message || errorData?.error || `HTTP ${response.status}`;
    }

    return {
      success: response.ok,
      authValid,
      endpointsChecked: 1,
      endpointsPassed: response.ok ? 1 : 0,
      error: errorMsg,
      details: { status: response.status },
    };
  } catch (error) {
    return {
      success: false,
      authValid: false,
      endpointsChecked: 1,
      endpointsPassed: 0,
      error: `Network error: ${error.message}`,
    };
  }
}

/**
 * Determine overall health status
 */
function determineStatus(result: ConnectivityResult): HealthStatus {
  if (!result.success) return 'down';
  if (!result.authValid) return 'down';
  if (result.endpointsPassed < result.endpointsChecked) return 'degraded';
  return 'healthy';
}

/**
 * Format health check results into a readable report
 */
export function formatHealthReport(results: APIHealthCheck[]): string {
  let report = `\n🏥 API Health Report\n${'='.repeat(50)}\n\n`;

  const healthy = results.filter((r) => r.status === 'healthy');
  const degraded = results.filter((r) => r.status === 'degraded');
  const down = results.filter((r) => r.status === 'down');

  report += `Summary: ${healthy.length} healthy, ${degraded.length} degraded, ${down.length} down\n\n`;

  for (const result of results) {
    const icon =
      result.status === 'healthy' ? '✅' : result.status === 'degraded' ? '⚠️' : '❌';

    const registry = getRegistryEntry(result.api_id);
    const displayName = registry?.display_name || result.api_id;

    report += `${icon} ${displayName}\n`;
    report += `   Status: ${result.status.toUpperCase()}\n`;
    report += `   Latency: ${result.latency_ms}ms\n`;
    report += `   Auth: ${result.auth_valid ? 'Valid' : 'Invalid'}\n`;
    report += `   Endpoints: ${result.endpoints_passed}/${result.endpoints_checked} passed\n`;

    if (result.error_message) {
      report += `   Error: ${result.error_message}\n`;
    }

    report += '\n';
  }

  return report;
}

/**
 * Get health summary for quick status check
 */
export function getHealthSummary(results: APIHealthCheck[]): {
  total: number;
  healthy: number;
  degraded: number;
  down: number;
  allHealthy: boolean;
} {
  const healthy = results.filter((r) => r.status === 'healthy').length;
  const degraded = results.filter((r) => r.status === 'degraded').length;
  const down = results.filter((r) => r.status === 'down').length;

  return {
    total: results.length,
    healthy,
    degraded,
    down,
    allHealthy: degraded === 0 && down === 0,
  };
}
