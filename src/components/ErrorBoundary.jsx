import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    
    // Only log in development
    if (import.meta.env.VITE_ENVIRONMENT === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    // In production, send to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
          <style jsx>{`
            :root {
              --bg: #151A1F;
              --surface: #1A2026;
              --txt: #E9F0F1;
              --muted: #B5C0C4;
              --accent: #EF4444;
            }
          `}</style>
          <Card className="glass-card max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16" style={{ color: 'var(--accent)' }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--txt)' }}>
                Oops! Something went wrong
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                The application encountered an unexpected error. Please try refreshing the page.
              </p>
              
              {import.meta.env.VITE_ENVIRONMENT === 'development' && this.state.error && (
                <div className="text-left mb-4 p-4 rounded bg-red-500/10 border border-red-500/30">
                  <p className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
                    {this.state.error.toString()}
                  </p>
                </div>
              )}
              
              <Button onClick={this.handleReset} className="btn-primary w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;