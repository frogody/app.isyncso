import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Error Boundary component to catch JavaScript errors in child components
 * Provides a fallback UI and option to retry
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Could also send to error tracking service here
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Call onRetry callback if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { title, description, showDetails } = this.props;

      return (
        <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-red-500/5 border border-red-500/20 min-h-[200px]">
          <div className="p-3 rounded-full bg-red-500/10 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {title || 'Something went wrong'}
          </h3>
          <p className="text-white/60 text-sm text-center mb-4 max-w-md">
            {description || 'An error occurred while loading this content. Please try again.'}
          </p>

          {showDetails && this.state.error && (
            <details className="mb-4 text-xs text-white/40 max-w-md">
              <summary className="cursor-pointer hover:text-white/60">Error details</summary>
              <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                {this.state.error.toString()}
              </pre>
            </details>
          )}

          <Button
            onClick={this.handleRetry}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for easier use with hooks
 */
export function withErrorBoundary(Component, options = {}) {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Smaller inline error boundary for specific sections
 */
export function ErrorFallback({ error, resetErrorBoundary, title }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-red-500/5 border border-red-500/20">
      <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
      <p className="text-white/60 text-xs text-center mb-2">
        {title || 'Failed to load this section'}
      </p>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="text-xs text-red-400 hover:text-red-300 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorBoundary;
