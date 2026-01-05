import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Mail, Users, Calendar, Ticket, Building2, FileText, MessageSquare,
  CheckCircle, XCircle, Clock, Loader2, Play, Pause, RotateCcw, Trash2,
  ChevronRight, Sparkles, Bot, Zap, ArrowRight
} from 'lucide-react';

const ACTION_ICONS = {
  send_email: Mail,
  create_contact: Users,
  update_contact: Users,
  create_deal: Building2,
  update_deal: Building2,
  create_task: FileText,
  create_ticket: Ticket,
  update_ticket: Ticket,
  schedule_meeting: Calendar,
  add_note: FileText,
  create_lead: Users,
  sync_data: Zap,
  send_message: MessageSquare,
  create_event: Calendar,
  other: Zap
};

const STATUS_CONFIG = {
  queued: { 
    icon: Clock, 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/30',
    label: 'Queued'
  },
  in_progress: { 
    icon: Loader2, 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/30',
    label: 'In Progress',
    spin: true
  },
  success: { 
    icon: CheckCircle, 
    color: 'text-green-400', 
    bg: 'bg-green-500/10', 
    border: 'border-green-500/30',
    label: 'Completed'
  },
  failed: { 
    icon: XCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30',
    label: 'Failed'
  },
  cancelled: { 
    icon: XCircle, 
    color: 'text-zinc-400', 
    bg: 'bg-zinc-500/10', 
    border: 'border-zinc-500/30',
    label: 'Cancelled'
  }
};

const PRIORITY_CONFIG = {
  urgent: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  normal: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', border: 'border-zinc-500/30' },
  low: { color: 'text-zinc-500', bg: 'bg-zinc-600/20', border: 'border-zinc-600/30' }
};

const SOURCE_CONFIG = {
  manual: { icon: Zap, label: 'Manual' },
  ai_agent: { icon: Bot, label: 'AI Agent' },
  automation: { icon: Sparkles, label: 'Automation' },
  workflow: { icon: ArrowRight, label: 'Workflow' },
  sync: { icon: Zap, label: 'Sync' }
};

export default function ActionQueueCard({ 
  action, 
  onExecute, 
  onCancel, 
  onRetry, 
  onDelete,
  index = 0,
  compact = false 
}) {
  const statusConfig = STATUS_CONFIG[action.status] || STATUS_CONFIG.queued;
  const priorityConfig = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.normal;
  const sourceConfig = SOURCE_CONFIG[action.source] || SOURCE_CONFIG.manual;
  const ActionIcon = ACTION_ICONS[action.action_type] || Zap;
  const StatusIcon = statusConfig.icon;
  const SourceIcon = sourceConfig.icon;

  const formatTime = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const canExecute = action.status === 'queued';
  const canRetry = action.status === 'failed';
  const canCancel = action.status === 'queued' || action.status === 'in_progress';

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02 }}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border transition-all',
          statusConfig.border,
          statusConfig.bg,
          'hover:scale-[1.01]'
        )}
      >
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', statusConfig.bg)}>
          <ActionIcon className={cn('w-4 h-4', statusConfig.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{action.title}</p>
          <p className="text-xs text-zinc-500">{action.platform} • {formatTime(action.created_date)}</p>
        </div>
        <StatusIcon className={cn('w-4 h-4', statusConfig.color, statusConfig.spin && 'animate-spin')} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'rounded-2xl border p-5 transition-all duration-200',
        statusConfig.border,
        'bg-zinc-900/60 hover:bg-zinc-900/80'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            action.status === 'success' ? 'bg-green-500/20' : 
            action.status === 'failed' ? 'bg-red-500/20' : 'bg-orange-500/20'
          )}>
            <ActionIcon className={cn(
              'w-6 h-6',
              action.status === 'success' ? 'text-green-400' : 
              action.status === 'failed' ? 'text-red-400' : 'text-orange-400'
            )} />
          </div>
          <div>
            <h4 className="font-semibold text-white">{action.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn(statusConfig.bg, statusConfig.color, statusConfig.border, 'text-xs')}>
                <StatusIcon className={cn('w-3 h-3 mr-1', statusConfig.spin && 'animate-spin')} />
                {statusConfig.label}
              </Badge>
              {action.priority && action.priority !== 'normal' && (
                <Badge className={cn(priorityConfig.bg, priorityConfig.color, priorityConfig.border, 'text-xs capitalize')}>
                  {action.priority}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-xs">
            <SourceIcon className="w-3 h-3 mr-1" />
            {sourceConfig.label}
          </Badge>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 mb-4">
        {action.description && (
          <p className="text-sm text-zinc-400">{action.description}</p>
        )}
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
          {action.platform && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              {action.platform}
            </span>
          )}
          {action.target_entity && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {action.target_entity}
            </span>
          )}
          {action.scheduled_for && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Scheduled: {formatTime(action.scheduled_for)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(action.created_date)}
          </span>
        </div>

        {action.error_message && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-400">{action.error_message}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          {canExecute && onExecute && (
            <Button size="sm" onClick={() => onExecute(action)} className="bg-orange-500 hover:bg-orange-400 text-white h-8 px-3">
              <Play className="w-3 h-3 mr-1" /> Execute Now
            </Button>
          )}
          {canRetry && onRetry && (
            <Button size="sm" variant="outline" onClick={() => onRetry(action)} className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-8 px-3">
              <RotateCcw className="w-3 h-3 mr-1" /> Retry
            </Button>
          )}
          {canCancel && onCancel && (
            <Button size="sm" variant="outline" onClick={() => onCancel(action)} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 h-8 px-3">
              <Pause className="w-3 h-3 mr-1" /> Cancel
            </Button>
          )}
        </div>
        
        {onDelete && action.status !== 'in_progress' && (
          <Button size="sm" variant="ghost" onClick={() => onDelete(action)} className="text-zinc-500 hover:text-red-400 h-8 px-2">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}