import React from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getErrorCode, formatErrorMessage, logError, ERROR_CODES } from "@/components/utils/errorHandler";

// Map error codes to user-friendly types for display
const getErrorType = (error) => {
  const code = getErrorCode(error);
  switch (code) {
    case ERROR_CODES.NETWORK: return "NETWORK_ERROR";
    case ERROR_CODES.TIMEOUT: return "TIMEOUT";
    case ERROR_CODES.AUTH: return "AUTH_ERROR";
    case ERROR_CODES.NOT_FOUND: return "NOT_FOUND";
    case ERROR_CODES.SERVER: return "SERVER_ERROR";
    default: return "DEFAULT";
  }
};

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
    // Use centralized error logging
    logError("ErrorBoundary", error, {
      componentStack: errorInfo?.componentStack,
    });

    this.setState({
      error,
      errorInfo,
      errorType: getErrorType(error),
    });
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
      const userMessage = formatErrorMessage(error);
      const isDevMode = import.meta.env?.DEV || false;

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
