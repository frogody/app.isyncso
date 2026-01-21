/**
 * Shared API Client Utility
 *
 * Provides standardized HTTP request handling with:
 * - Automatic retries on 5xx errors
 * - Timeout handling
 * - Structured error responses
 * - Logging for debugging
 */

export interface APICallOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  retries?: number;
  timeout?: number;
  apiName?: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: unknown;
  };
  latency_ms?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryOnStatusCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 10000,
  retryOnStatusCodes: [500, 502, 503, 504, 429],
};

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Create a timeout promise that rejects after the specified time
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
}

/**
 * Make an API call with automatic retries and timeout handling
 */
export async function apiCall<T = unknown>(
  options: APICallOptions,
  retryConfig: Partial<RetryConfig> = {}
): Promise<APIResponse<T>> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const apiName = options.apiName ?? 'API';

  let lastError: Error | null = null;
  let lastStatusCode = 0;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      // Log attempt
      if (attempt > 0) {
        console.log(`[${apiName}] Retry attempt ${attempt}/${config.maxRetries}`);
      }

      // Prepare request options
      const fetchOptions: RequestInit = {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      };

      if (options.body && options.method !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }

      // Make request with timeout
      const response = await Promise.race([
        fetch(options.url, fetchOptions),
        createTimeout(timeout),
      ]);

      const latency = Date.now() - startTime;
      lastStatusCode = response.status;

      // Parse response
      let data: T | undefined;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          // Response body is empty or not valid JSON
        }
      }

      // Check for success
      if (response.ok) {
        return {
          success: true,
          data,
          latency_ms: latency,
        };
      }

      // Check if we should retry
      if (
        config.retryOnStatusCodes.includes(response.status) &&
        attempt < config.maxRetries
      ) {
        const delay = calculateBackoff(attempt, config.baseDelay, config.maxDelay);
        console.warn(
          `[${apiName}] Request failed with ${response.status}, retrying in ${delay}ms`
        );
        await sleep(delay);
        continue;
      }

      // Extract error message
      const errorMessage =
        (data as Record<string, unknown>)?.message ||
        (data as Record<string, unknown>)?.error ||
        (data as Record<string, unknown>)?.error?.message ||
        `HTTP ${response.status}: ${response.statusText}`;

      return {
        success: false,
        error: {
          code: response.status,
          message: String(errorMessage),
          details: data,
        },
        latency_ms: latency,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const latency = Date.now() - startTime;

      // Check if it's a timeout or network error that we should retry
      const isRetryable =
        lastError.message.includes('timeout') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ECONNREFUSED') ||
        lastError.message.includes('fetch failed');

      if (isRetryable && attempt < config.maxRetries) {
        const delay = calculateBackoff(attempt, config.baseDelay, config.maxDelay);
        console.warn(
          `[${apiName}] Network error: ${lastError.message}, retrying in ${delay}ms`
        );
        await sleep(delay);
        continue;
      }

      console.error(`[${apiName}] Request failed:`, lastError.message);

      return {
        success: false,
        error: {
          code: lastStatusCode || 0,
          message: lastError.message,
        },
        latency_ms: latency,
      };
    }
  }

  // This shouldn't happen, but just in case
  return {
    success: false,
    error: {
      code: lastStatusCode || 0,
      message: lastError?.message || 'Max retries exceeded',
    },
  };
}

/**
 * Convenience function for GET requests
 */
export function apiGet<T = unknown>(
  url: string,
  headers?: Record<string, string>,
  options?: Partial<APICallOptions>
): Promise<APIResponse<T>> {
  return apiCall<T>({
    url,
    method: 'GET',
    headers,
    ...options,
  });
}

/**
 * Convenience function for POST requests
 */
export function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
  options?: Partial<APICallOptions>
): Promise<APIResponse<T>> {
  return apiCall<T>({
    url,
    method: 'POST',
    body,
    headers,
    ...options,
  });
}

/**
 * Convenience function for PUT requests
 */
export function apiPut<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
  options?: Partial<APICallOptions>
): Promise<APIResponse<T>> {
  return apiCall<T>({
    url,
    method: 'PUT',
    body,
    headers,
    ...options,
  });
}

/**
 * Convenience function for PATCH requests
 */
export function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
  options?: Partial<APICallOptions>
): Promise<APIResponse<T>> {
  return apiCall<T>({
    url,
    method: 'PATCH',
    body,
    headers,
    ...options,
  });
}

/**
 * Convenience function for DELETE requests
 */
export function apiDelete<T = unknown>(
  url: string,
  headers?: Record<string, string>,
  options?: Partial<APICallOptions>
): Promise<APIResponse<T>> {
  return apiCall<T>({
    url,
    method: 'DELETE',
    headers,
    ...options,
  });
}

/**
 * API Client class for creating reusable API clients with preset configuration
 */
export class APIClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private apiName: string;
  private retryConfig: RetryConfig;
  private timeout: number;

  constructor(options: {
    baseUrl: string;
    headers?: Record<string, string>;
    apiName?: string;
    retryConfig?: Partial<RetryConfig>;
    timeout?: number;
  }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = options.headers ?? {};
    this.apiName = options.apiName ?? 'API';
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    return `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }

  async get<T = unknown>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<APIResponse<T>> {
    return apiCall<T>(
      {
        url: this.buildUrl(endpoint),
        method: 'GET',
        headers: { ...this.defaultHeaders, ...headers },
        apiName: this.apiName,
        timeout: this.timeout,
      },
      this.retryConfig
    );
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<APIResponse<T>> {
    return apiCall<T>(
      {
        url: this.buildUrl(endpoint),
        method: 'POST',
        body,
        headers: { ...this.defaultHeaders, ...headers },
        apiName: this.apiName,
        timeout: this.timeout,
      },
      this.retryConfig
    );
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<APIResponse<T>> {
    return apiCall<T>(
      {
        url: this.buildUrl(endpoint),
        method: 'PUT',
        body,
        headers: { ...this.defaultHeaders, ...headers },
        apiName: this.apiName,
        timeout: this.timeout,
      },
      this.retryConfig
    );
  }

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<APIResponse<T>> {
    return apiCall<T>(
      {
        url: this.buildUrl(endpoint),
        method: 'PATCH',
        body,
        headers: { ...this.defaultHeaders, ...headers },
        apiName: this.apiName,
        timeout: this.timeout,
      },
      this.retryConfig
    );
  }

  async delete<T = unknown>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<APIResponse<T>> {
    return apiCall<T>(
      {
        url: this.buildUrl(endpoint),
        method: 'DELETE',
        headers: { ...this.defaultHeaders, ...headers },
        apiName: this.apiName,
        timeout: this.timeout,
      },
      this.retryConfig
    );
  }
}

/**
 * Pre-configured API clients for common services
 */
export function createExploriumClient(apiKey: string): APIClient {
  return new APIClient({
    baseUrl: 'https://api.explorium.ai/v1',
    headers: {
      'API_KEY': apiKey,
    },
    apiName: 'Explorium',
  });
}

export function createTogetherClient(apiKey: string): APIClient {
  return new APIClient({
    baseUrl: 'https://api.together.xyz/v1',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    apiName: 'Together.ai',
  });
}

export function createGroqClient(apiKey: string): APIClient {
  return new APIClient({
    baseUrl: 'https://api.groq.com/openai/v1',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    apiName: 'Groq',
  });
}

export function createTavilyClient(apiKey: string): APIClient {
  return new APIClient({
    baseUrl: 'https://api.tavily.com',
    headers: {},
    apiName: 'Tavily',
  });
}

export function createComposioClient(apiKey: string): APIClient {
  return new APIClient({
    baseUrl: 'https://backend.composio.dev/api/v1',
    headers: {
      'x-api-key': apiKey,
    },
    apiName: 'Composio',
  });
}

export function createGoogleClient(apiKey: string): APIClient {
  return new APIClient({
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    headers: {},
    apiName: 'Google',
    // Google API key is passed as query parameter, not header
  });
}
