import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';

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
  const { st } = useSentinelTheme();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className={cn('p-4 rounded-full mb-4', st('bg-red-100', 'bg-red-500/10'))}>
        <AlertTriangle className={cn('w-8 h-8', st('text-red-500', 'text-red-400'))} />
      </div>
      <h3 className={cn('text-lg font-medium mb-1', st('text-slate-900', 'text-white'))}>{title}</h3>
      <p className={cn('text-sm text-center max-w-md mb-4', st('text-slate-500', 'text-zinc-400'))}>
        {message || error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'inline-flex items-center gap-2 h-10 px-6 text-sm font-medium text-white rounded-full transition-colors duration-200',
            st('bg-emerald-500 hover:bg-emerald-600', 'bg-emerald-400 hover:bg-emerald-500'),
          )}
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
  const { st } = useSentinelTheme();
  const resolvedAction = action || (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : null);

  // Render icon: if it's a component type (function), instantiate it; otherwise render as ReactNode
  let iconElement: ReactNode = null;
  if (icon) {
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon && 'render' in (icon as any))) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      iconElement = <IconComponent className={cn('w-8 h-8', st('text-emerald-500', 'text-emerald-400'))} />;
    } else {
      iconElement = icon;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {iconElement && <div className={cn('p-4 rounded-full mb-4', st('bg-slate-100', 'bg-zinc-800/50'))}>{iconElement}</div>}
      <h3 className={cn('text-lg font-medium mb-1', st('text-slate-900', 'text-white'))}>{title}</h3>
      <p className={cn('text-sm text-center max-w-md mb-4', st('text-slate-500', 'text-zinc-400'))}>{message}</p>
      {resolvedAction && (
        <button
          onClick={resolvedAction.onClick}
          className={cn(
            'inline-flex items-center gap-2 h-10 px-6 text-sm font-medium text-white rounded-full transition-colors duration-200',
            st('bg-emerald-500 hover:bg-emerald-600', 'bg-emerald-400 hover:bg-emerald-500'),
          )}
        >
          {resolvedAction.label}
        </button>
      )}
    </div>
  );
}
