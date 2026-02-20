import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

class FinanceErrorWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Finance module error:', error, errorInfo?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <Card className="max-w-md w-full border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
              <p className="text-sm text-zinc-400">
                An error occurred in the Finance module. Please try again.
              </p>
              {import.meta.env?.DEV && this.state.error && (
                <p className="text-xs text-red-400 font-mono bg-red-950/20 p-2 rounded">{this.state.error.toString()}</p>
              )}
              <div className="flex gap-2 justify-center pt-2">
                <Button onClick={this.handleRetry} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
                  <Home className="w-4 h-4 mr-1.5" /> Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export default FinanceErrorWrapper;
