/**
 * Centralized error handling utilities
 * Provides consistent error handling, logging, and user messaging
 */

/**
 * Error codes for categorization
 */
export const ERROR_CODES = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  UNKNOWN: 'UNKNOWN_ERROR',
};

/**
 * User-friendly error messages by code
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK]: 'Unable to connect. Please check your internet connection.',
  [ERROR_CODES.TIMEOUT]: 'The request took too long. Please try again.',
  [ERROR_CODES.AUTH]: 'Your session has expired. Please log in again.',
  [ERROR_CODES.VALIDATION]: 'Please check your input and try again.',
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.SERVER]: 'Something went wrong on our end. Please try again later.',
  [ERROR_CODES.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
  [ERROR_CODES.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

/**
 * Determine error code from error object
 */
export function getErrorCode(error) {
  if (!error) return ERROR_CODES.UNKNOWN;

  const message = (error.message || '').toLowerCase();
  const status = error.status || error.statusCode || error.response?.status;

  // Network errors
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    error.code === 'ECONNABORTED' ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    return ERROR_CODES.NETWORK;
  }

  // Timeout
  if (message.includes('timeout') || status === 408) {
    return ERROR_CODES.TIMEOUT;
  }

  // Auth errors
  if (status === 401 || status === 403) {
    return ERROR_CODES.AUTH;
  }

  // Validation errors
  if (status === 400 || error.code === 'VALIDATION_ERROR') {
    return ERROR_CODES.VALIDATION;
  }

  // Not found
  if (status === 404) {
    return ERROR_CODES.NOT_FOUND;
  }

  // Rate limiting
  if (status === 429) {
    return ERROR_CODES.RATE_LIMIT;
  }

  // Server errors
  if (status >= 500) {
    return ERROR_CODES.SERVER;
  }

  return ERROR_CODES.UNKNOWN;
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error) {
  if (!error) return ERROR_MESSAGES[ERROR_CODES.UNKNOWN];

  if (typeof error === 'string') return error;

  // Check for custom error message from API
  const apiMessage =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.data?.message ||
    error.data?.error;

  if (apiMessage && typeof apiMessage === 'string') {
    return apiMessage;
  }

  // Use friendly message based on error code
  const code = getErrorCode(error);
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN];
}

/**
 * Create a structured error object
 */
export function createError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  error.timestamp = new Date().toISOString();
  return error;
}

/**
 * Log error for debugging
 */
export function logError(context, error, additionalData = {}) {
  const errorCode = getErrorCode(error);
  const timestamp = new Date().toISOString();

  const logData = {
    context,
    code: errorCode,
    message: error?.message,
    status: error?.status || error?.statusCode,
    timestamp,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    ...additionalData,
  };

  // Always log to console in development
  console.error(`[${context}]`, logData);

  // In production, send to error tracking service
  if (typeof window !== 'undefined' && import.meta.env?.PROD) {
    // Report to error tracking (if configured)
    if (window.reportError) {
      window.reportError(logData);
    }

    // Dispatch event for analytics
    window.dispatchEvent(
      new CustomEvent('app:error', { detail: logData })
    );
  }

  return logData;
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error) {
  return getErrorCode(error) === ERROR_CODES.NETWORK;
}

/**
 * Check if error is recoverable (can retry)
 */
export function isRecoverableError(error) {
  const code = getErrorCode(error);
  return [
    ERROR_CODES.NETWORK,
    ERROR_CODES.TIMEOUT,
    ERROR_CODES.SERVER,
    ERROR_CODES.RATE_LIMIT,
  ].includes(code);
}

/**
 * Check if user should be redirected to login
 */
export function shouldRedirectToLogin(error) {
  return getErrorCode(error) === ERROR_CODES.AUTH;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(
  fn,
  options = {}
) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry = null,
    shouldRetry = isRecoverableError,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry non-recoverable errors
      if (!shouldRetry(error)) {
        throw error;
      }

      if (attempt < maxRetries) {
        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
        const delay = Math.round(baseDelay + jitter);

        if (onRetry) {
          onRetry(attempt + 1, maxRetries, delay, error);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandler(fn, context = 'Unknown') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(context, error);
      throw error;
    }
  };
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Create a timeout promise
 */
export function withTimeout(promise, timeoutMs, timeoutMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(timeoutMessage);
        error.code = ERROR_CODES.TIMEOUT;
        reject(error);
      }, timeoutMs);
    }),
  ]);
}

/**
 * Debounced error reporter to avoid flooding
 */
const errorReportQueue = new Map();
const REPORT_DEBOUNCE_MS = 1000;

export function debouncedErrorReport(error, context) {
  const key = `${context}:${error.message}`;

  if (errorReportQueue.has(key)) {
    return;
  }

  errorReportQueue.set(key, true);
  logError(context, error);

  setTimeout(() => {
    errorReportQueue.delete(key);
  }, REPORT_DEBOUNCE_MS);
}

export default {
  ERROR_CODES,
  getErrorCode,
  formatErrorMessage,
  createError,
  logError,
  isNetworkError,
  isRecoverableError,
  shouldRedirectToLogin,
  retryWithBackoff,
  withErrorHandler,
  safeJsonParse,
  withTimeout,
  debouncedErrorReport,
};
