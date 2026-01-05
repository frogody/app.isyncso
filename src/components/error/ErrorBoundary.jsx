import React from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Error codes and their user-friendly messages
 */
const ERROR_MESSAGES = {
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  TIMEOUT: "The request took too long. Please try again.",
  AUTH_ERROR: "Your session has expired. Please log in again.",
  NOT_FOUND: "The requested resource was not found.",
  SERVER_ERROR: "Something went wrong on our end. We're working on it.",
  DEFAULT: "Something unexpected happened. Please try again.",
};

/**
 * Determine error type from error object
 */
function getErrorType(error) {
  if (!error) return "DEFAULT";

  const message = error.message?.toLowerCase() || "";
  const status = error.status || error.statusCode;

  if (message.includes("network") || message.includes("fetch")) {
    return "NETWORK_ERROR";
  }
  if (message.includes("timeout") || status === 408) {
    return "TIMEOUT";
  }
  if (status === 401 || status === 403) {
    return "AUTH_ERROR";
  }
  if (status === 404) {
    return "NOT_FOUND";
  }
  if (status >= 500) {
    return "SERVER_ERROR";
  }

  return "DEFAULT";
}

/**
 * ErrorBoundary - Catches React render errors and provides recovery options
 *
 * Features:
 * - Catches synchronous render errors
 * - Listens for async errors via custom events
 * - Provides user-friendly error messages
 * - Offers recovery options (retry, go back, go home)
 * - Shows technical details in development mode
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: "DEFAULT",
    };
    this.handleAsyncError = this.handleAsyncError.bind(this);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorType: getErrorType(error),
    };
  }

  componentDidMount() {
    // Listen for async errors (from query client, promises, etc.)
    window.addEventListener("query:error", this.handleAsyncError);
    window.addEventListener("mutation:error", this.handleAsyncError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("query:error", this.handleAsyncError);
    window.removeEventListener("mutation:error", this.handleAsyncError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  handleUnhandledRejection = (event) => {
    // Only catch unhandled rejections that are actual errors
    if (event.reason instanceof Error) {
      console.error("Unhandled promise rejection:", event.reason);
      // Don't show UI for minor errors, just log them
    }
  };

  handleAsyncError(event) {
    const error = event.detail?.error;

    // Only show error UI for critical errors
    if (error && this.isCriticalError(error)) {
      this.setState({
        hasError: true,
        error,
        errorType: getErrorType(error),
      });
    }
  }

  isCriticalError(error) {
    // Auth errors and server errors are critical
    const status = error?.status || error?.statusCode;
    return status === 401 || status === 403 || status >= 500;
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
      errorType: getErrorType(error),
    });

    // Report to error tracking service (if configured)
    if (typeof window !== "undefined" && window.reportError) {
      window.reportError({
        error,
        componentStack: errorInfo?.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: "DEFAULT",
    });

    // Try to recover by re-rendering
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoBack = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: "DEFAULT",
    });

    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: "DEFAULT",
    });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const { errorType, error, errorInfo } = this.state;
      const userMessage = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.DEFAULT;
      const isDevMode = import.meta.env?.DEV || process.env.NODE_ENV === "development";

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error,
          errorInfo,
          resetError: this.handleReset,
        });
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8">
          <Card className="glass-card border-0 max-w-2xl w-full">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {errorType === "AUTH_ERROR"
                    ? "Session Expired"
                    : errorType === "NETWORK_ERROR"
                    ? "Connection Lost"
                    : "Something went wrong"}
                </h1>
                <p className="text-gray-400">{userMessage}</p>
              </div>

              {isDevMode && error && (
                <div className="text-left p-4 bg-red-950/20 border border-red-500/20 rounded-lg max-h-64 overflow-auto">
                  <p className="text-sm text-red-400 font-mono mb-2">
                    {error.toString()}
                  </p>
                  {errorInfo && (
                    <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  className="btn-primary"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>

                <Button
                  onClick={this.handleGoBack}
                  variant="outline"
                  className="btn-outline"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="btn-outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {errorType === "AUTH_ERROR" && (
                <p className="text-sm text-gray-500">
                  You may need to{" "}
                  <button
                    onClick={() => window.location.href = "/login"}
                    className="text-cyan-400 hover:text-cyan-300 underline"
                  >
                    log in again
                  </button>
                  .
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to trigger error boundary from functional components
 */
export function useErrorHandler() {
  return React.useCallback((error, errorInfo) => {
    // Dispatch event that ErrorBoundary listens to
    window.dispatchEvent(
      new CustomEvent("query:error", {
        detail: { error, errorInfo, timestamp: new Date().toISOString() },
      })
    );
  }, []);
}

/**
 * Wrapper for async operations with error handling
 */
export async function withErrorHandling(asyncFn, fallbackValue = null) {
  try {
    return await asyncFn();
  } catch (error) {
    console.error("Async operation failed:", error);
    window.dispatchEvent(
      new CustomEvent("query:error", {
        detail: { error, timestamp: new Date().toISOString() },
      })
    );
    return fallbackValue;
  }
}

export default ErrorBoundary;
