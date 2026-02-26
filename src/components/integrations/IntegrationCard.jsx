/**
 * IntegrationCard Component
 * Displays a single integration with connection status and actions
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle,
  Loader2,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { formatConnectionStatus } from '@/lib/composio';

// Integration icons — renders official logo from Simple Icons CDN, falls back to letter avatar
const IntegrationIcon = ({ integration, className = '' }) => {
  const { name, color, logoUrl } = integration;
  const [imgError, setImgError] = React.useState(false);

  if (logoUrl && !imgError) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-white/[0.06] ${className}`}>
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="w-5 h-5 object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-xl ${className}`}
      style={{ backgroundColor: color + '20' }}
    >
      <span className="font-semibold text-sm" style={{ color }}>
        {name.substring(0, 2).toUpperCase()}
      </span>
    </div>
  );
};

export function IntegrationCard({
  integration,
  connection,
  onConnect,
  onDisconnect,
  onRefresh,
  isLoading = false,
  isConnecting = false,
}) {
  const { slug, name, description, color, category } = integration;
  const isConnected = connection?.status === 'ACTIVE';
  const statusInfo = connection ? formatConnectionStatus(connection.status) : null;

  const handleConnect = () => {
    if (onConnect) {
      onConnect(integration);
    }
  };

  const handleDisconnect = () => {
    if (onDisconnect && connection) {
      onDisconnect(connection);
    }
  };

  const handleRefresh = () => {
    if (onRefresh && connection) {
      onRefresh(connection);
    }
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg dark:hover:shadow-cyan-500/10 border-white/[0.06] bg-zinc-900/60 backdrop-blur-xl rounded-xl">
      {/* Status indicator bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
        style={{
          backgroundColor: isConnected ? '#22d3ee' : 'transparent',
        }}
      />

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <IntegrationIcon
            integration={integration}
            className="w-10 h-10 flex-shrink-0"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{name}</h3>
              {isConnected && (
                <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              )}
            </div>

            <p className="text-sm text-slate-400 line-clamp-2 mt-0.5">
              {description}
            </p>

            {/* Category badge */}
            <Badge
              variant="outline"
              className="mt-2 text-xs border-slate-700 text-slate-400"
            >
              {category}
            </Badge>
          </div>
        </div>

        {/* Connection status and actions */}
        <div className="mt-4 flex items-center justify-between">
          {/* Status */}
          {statusInfo && connection?.status !== 'ACTIVE' && (
            <Badge
              variant="outline"
              className={`text-xs ${
                statusInfo.color === 'red'
                  ? 'border-red-500/50 text-red-400'
                  : statusInfo.color === 'yellow'
                  ? 'border-yellow-500/50 text-yellow-400'
                  : statusInfo.color === 'blue'
                  ? 'border-blue-500/50 text-blue-400'
                  : 'border-slate-700 text-slate-400'
              }`}
            >
              {statusInfo.label}
            </Badge>
          )}

          {!connection && <div />}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={handleRefresh}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh connection</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  <Unlink className="w-4 h-4 mr-1" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={handleConnect}
                disabled={isLoading || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-1" />
                    Connect
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Connected timestamp */}
        {isConnected && connection?.connected_at && (
          <p className="mt-2 text-xs text-slate-500">
            Connected {new Date(connection.connected_at).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for lists
export function IntegrationCardCompact({
  integration,
  isConnected = false,
  onConnect,
  isLoading = false,
}) {
  const { name, color } = integration;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-zinc-900/40 hover:bg-zinc-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <IntegrationIcon integration={integration} className="w-8 h-8" />
        <span className="font-medium text-white">{name}</span>
        {isConnected && (
          <CheckCircle className="w-4 h-4 text-cyan-400" />
        )}
      </div>

      {!isConnected && (
        <Button
          variant="ghost"
          size="sm"
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
          onClick={() => onConnect?.(integration)}
          disabled={isLoading}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Connect
        </Button>
      )}
    </div>
  );
}

export default IntegrationCard;
