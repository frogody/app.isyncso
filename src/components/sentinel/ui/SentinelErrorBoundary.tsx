import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SentinelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SENTINEL] Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <SentinelErrorState
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface SentinelErrorStateProps {
  error?: Error | null;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function SentinelErrorState({
  error,
  title = 'Something went wrong',
  message,
  onRetry,
}: SentinelErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="p-4 bg-red-500/10 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-zinc-400 text-center max-w-md mb-4">
        {message || error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 h-10 px-6 text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 rounded-full transition-colors duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      )}
    </div>
  );
}

interface SentinelEmptyStateProps {
  icon?: React.ComponentType<{ className?: string }> | ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionLabel?: string;
  onAction?: () => void;
}

export function SentinelEmptyState({ icon, title, message, action, actionLabel, onAction }: SentinelEmptyStateProps) {
  const resolvedAction = action || (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : null);

  // Render icon: if it's a component type (function), instantiate it; otherwise render as ReactNode
  let iconElement: ReactNode = null;
  if (icon) {
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon && 'render' in (icon as any))) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      iconElement = <IconComponent className="w-8 h-8 text-sky-400" />;
    } else {
      iconElement = icon;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {iconElement && <div className="p-4 bg-zinc-800/50 rounded-full mb-4">{iconElement}</div>}
      <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-zinc-400 text-center max-w-md mb-4">{message}</p>
      {resolvedAction && (
        <button
          onClick={resolvedAction.onClick}
          className="inline-flex items-center gap-2 h-10 px-6 text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 rounded-full transition-colors duration-200"
        >
          {resolvedAction.label}
        </button>
      )}
    </div>
  );
}
