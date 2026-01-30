import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Unplug, 
  RefreshCw,
  ExternalLink,
  Zap,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const INTEGRATION_ICONS = {
  hubspot: 'https://logo.clearbit.com/hubspot.com',
  salesforce: 'https://logo.clearbit.com/salesforce.com',
  jira: 'https://logo.clearbit.com/atlassian.com',
  zendesk: 'https://logo.clearbit.com/zendesk.com',
  asana: 'https://logo.clearbit.com/asana.com',
  linear: 'https://logo.clearbit.com/linear.app',
  notion: 'https://logo.clearbit.com/notion.so',
  github: 'https://logo.clearbit.com/github.com',
  gmail: 'https://logo.clearbit.com/gmail.com',
  outlook: 'https://logo.clearbit.com/outlook.com',
  slack: 'https://logo.clearbit.com/slack.com',
  dropbox: 'https://logo.clearbit.com/dropbox.com',
  box: 'https://logo.clearbit.com/box.com',
  quickbooks: 'https://logo.clearbit.com/quickbooks.intuit.com',
  xero: 'https://logo.clearbit.com/xero.com',
  bamboohr: 'https://logo.clearbit.com/bamboohr.com',
  workday: 'https://logo.clearbit.com/workday.com',
  greenhouse: 'https://logo.clearbit.com/greenhouse.io',
  lever: 'https://logo.clearbit.com/lever.co'
};

const CATEGORY_CONFIG = {
  crm: {
    gradient: 'from-cyan-700/80 to-blue-700/80',
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-300/80',
    border: 'border-cyan-800/40',
    glow: 'shadow-cyan-900/20'
  },
  ticketing: {
    gradient: 'from-cyan-700/80 to-blue-700/80',
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-300/80',
    border: 'border-cyan-800/40',
    glow: 'shadow-cyan-900/20'
  },
  hris: {
    gradient: 'from-cyan-700/80 to-blue-700/80',
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-300/80',
    border: 'border-cyan-800/40',
    glow: 'shadow-cyan-900/20'
  },
  ats: {
    gradient: 'from-cyan-700/80 to-blue-700/80',
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-300/80',
    border: 'border-cyan-800/40',
    glow: 'shadow-cyan-900/20'
  },
  accounting: {
    gradient: 'from-cyan-700/80 to-blue-700/80',
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-300/80',
    border: 'border-cyan-800/40',
    glow: 'shadow-cyan-900/20'
  },
  filestorage: {
    gradient: 'from-cyan-700/80 to-blue-700/80',
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-300/80',
    border: 'border-cyan-800/40',
    glow: 'shadow-cyan-900/20'
  }
};

export default function IntegrationCard({ 
  integration, 
  onDisconnect, 
  onUseAction,
  isDisconnecting,
  index = 0
}) {
  const config = CATEGORY_CONFIG[integration.category] || CATEGORY_CONFIG.crm;
  const slug = integration.integration_slug?.toLowerCase() || '';
  const iconUrl = INTEGRATION_ICONS[slug] || `https://logo.clearbit.com/${slug}.com`;

  const formatLastSynced = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const diff = Date.now() - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}

      className={cn(
        'bg-zinc-900/60 backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300',
        config.border,
        `hover:shadow-lg ${config.glow}`
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br', config.gradient)}>
            <img 
              src={iconUrl} 
              alt={integration.integration_name}
              className="w-9 h-9 object-contain bg-white rounded-lg p-1"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `<span class="text-white font-bold text-xl">${integration.integration_name?.charAt(0) || '?'}</span>`;
              }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">{integration.integration_name}</h3>
            <Badge className={cn(config.bg, config.text, config.border, 'text-xs capitalize mt-1')}>
              {integration.category}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {integration.status === 'active' ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs text-cyan-400 font-medium">Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10">
              <XCircle className="w-3 h-3 text-red-400" />
              <span className="text-xs text-red-400 font-medium">Inactive</span>
            </div>
          )}
        </div>
      </div>

      {integration.last_synced && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
          <Clock className="w-3 h-3" />
          <span>Last synced: {formatLastSynced(integration.last_synced)}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onUseAction(integration)}
          disabled={integration.status !== 'active'}
          className={cn('flex-1 bg-gradient-to-r text-white font-medium', config.gradient, 'hover:opacity-90')}
        >
          <Zap className="w-4 h-4 mr-1.5" />
          Execute
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDisconnect(integration.id)}
          disabled={isDisconnecting || integration.status !== 'active'}
          className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
        >
          {isDisconnecting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Unplug className="w-4 h-4" />
          )}
        </Button>
      </div>
    </motion.div>
  );
}