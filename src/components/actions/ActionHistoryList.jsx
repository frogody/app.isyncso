import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/utils/dateUtils';

const STATUS_CONFIG = {
  success: { 
    icon: CheckCircle, 
    color: 'text-green-400', 
    bg: 'bg-green-500/10', 
    border: 'border-green-500/20',
    gradient: 'from-green-500/20 to-emerald-500/10'
  },
  failed: { 
    icon: XCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/20',
    gradient: 'from-red-500/20 to-orange-500/10'
  },
  pending: { 
    icon: Clock, 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/20',
    gradient: 'from-amber-500/20 to-yellow-500/10'
  }
};

export default function ActionHistoryList({ actions, loading }) {
  const [expandedId, setExpandedId] = React.useState(null);

  // Using centralized formatTimeAgo from @/utils/dateUtils

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-zinc-800/30 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-zinc-600" />
        </div>
        <h4 className="text-lg font-semibold text-white mb-2">No Actions Yet</h4>
        <p className="text-zinc-500 text-sm">Actions you execute will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
      <AnimatePresence>
        {actions.map((action, index) => {
          const config = STATUS_CONFIG[action.status] || STATUS_CONFIG.pending;
          const StatusIcon = config.icon;
          const isExpanded = expandedId === action.id;

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                'rounded-xl border p-4 cursor-pointer transition-all duration-200',
                config.border,
                `bg-gradient-to-r ${config.gradient}`,
              )}
              onClick={() => setExpandedId(isExpanded ? null : action.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.bg)}>
                    <StatusIcon className={cn('w-5 h-5', config.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white capitalize">
                        {action.action_type.replace(/_/g, ' ')}
                      </span>
                      <Badge className="bg-zinc-800/80 text-zinc-300 border-zinc-700 text-xs">
                        {action.platform || action.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(action.created_date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={cn(config.bg, config.color, config.border, 'capitalize font-medium')}>
                    {action.status}
                  </Badge>
                  <div className="w-6 h-6 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    {action.request_payload && Object.keys(action.request_payload).length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Request</p>
                        <div className="p-3 bg-zinc-900/80 rounded-xl text-xs text-zinc-300 overflow-auto max-h-32 border border-zinc-800">
                          <pre className="whitespace-pre-wrap font-mono">
                            {JSON.stringify(action.request_payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {action.response_data && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Response</p>
                        <div className="p-3 bg-zinc-900/80 rounded-xl text-xs text-zinc-300 overflow-auto max-h-32 border border-zinc-800">
                          <pre className="whitespace-pre-wrap font-mono">
                            {JSON.stringify(action.response_data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {action.error_message && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          Error
                        </p>
                        <div className="p-3 bg-red-500/10 rounded-xl text-xs text-red-300 border border-red-500/20">
                          {action.error_message}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}