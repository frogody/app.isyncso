import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Send,
  SendHorizonal,
  MessageSquare,
  RefreshCw,
  Loader2,
  AlertCircle,
  Linkedin,
  Phone,
} from "lucide-react";

export default function OutreachQueueTab({ campaign, tasks, onRefresh, onSendTask, onSendAll, onCancelTask }) {
  const [filter, setFilter] = useState('all');
  const [sending, setSending] = useState(null);
  const [sendingAll, setSendingAll] = useState(false);

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const statusColors = {
    draft: 'bg-zinc-500/20 text-zinc-400',
    pending: 'bg-zinc-500/20 text-zinc-400',
    approved_ready: 'bg-red-500/30 text-red-300',
    sent: 'bg-blue-500/20 text-blue-400',
    replied: 'bg-emerald-500/20 text-emerald-400',
    completed: 'bg-emerald-600/20 text-emerald-300',
    failed: 'bg-red-600/30 text-red-400',
    cancelled: 'bg-zinc-500/20 text-zinc-500',
  };

  const channelIcons = {
    linkedin: Linkedin,
    email: Mail,
    sms: Phone,
  };

  const handleSend = async (task) => {
    setSending(task.id);
    try {
      await onSendTask(task.id);
    } finally {
      setSending(null);
    }
  };

  const handleSendAll = async () => {
    if (!onSendAll) return;
    setSendingAll(true);
    try {
      await onSendAll();
    } finally {
      setSendingAll(false);
    }
  };

  const taskCounts = {
    all: tasks.length,
    approved_ready: tasks.filter(t => t.status === 'approved_ready').length,
    sent: tasks.filter(t => t.status === 'sent').length,
    replied: tasks.filter(t => t.status === 'replied').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'approved_ready', label: 'Ready' },
            { key: 'sent', label: 'Sent' },
            { key: 'replied', label: 'Replied' },
            { key: 'failed', label: 'Failed' },
          ].map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? 'default' : 'ghost'}
              onClick={() => setFilter(key)}
              className={filter === key ? 'bg-red-500 hover:bg-red-600' : 'text-zinc-400 hover:text-white'}
            >
              {label}
              <Badge className="ml-2 bg-zinc-700/50 text-zinc-300">
                {taskCounts[key] || 0}
              </Badge>
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {taskCounts.approved_ready > 0 && onSendAll && (
            <Button
              size="sm"
              onClick={handleSendAll}
              disabled={sendingAll}
              className="bg-red-500 hover:bg-red-600"
            >
              {sendingAll ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <SendHorizonal className="w-4 h-4 mr-1" />
              )}
              Send All ({taskCounts.approved_ready})
            </Button>
          )}
          <Button variant="ghost" onClick={onRefresh} className="text-zinc-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const ChannelIcon = channelIcons[task.channel || task.task_type] || Mail;
            return (
              <GlassCard key={task.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(task.candidate_name || task.candidate?.first_name || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">
                        {task.candidate_name || `${task.candidate?.first_name || ''} ${task.candidate?.last_name || ''}`.trim() || 'Unknown'}
                      </p>
                      <p className="text-sm text-zinc-400 truncate">
                        {task.candidate?.job_title}
                        {task.candidate?.company_name && ` at ${task.candidate.company_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ChannelIcon className="w-4 h-4 text-zinc-500" />
                    <Badge className={statusColors[task.status] || statusColors.pending}>
                      {task.status?.replace(/_/g, ' ')}
                    </Badge>
                    {task.metadata?.match_score && (
                      <Badge className="bg-red-500/20 text-red-400">
                        {task.metadata.match_score}% match
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Message Preview */}
                <div className="mt-3 p-3 rounded-lg bg-zinc-800/50">
                  {(task.subject || task.metadata?.subject) && (
                    <p className="text-xs text-zinc-500 mb-1">
                      <span className="font-medium">Subject:</span> {task.subject || task.metadata.subject}
                    </p>
                  )}
                  <p className="text-sm text-zinc-300 line-clamp-2">
                    {task.message_content || task.content || task.generated_message || task.metadata?.message}
                  </p>
                </div>

                {/* Error Display for Failed Tasks */}
                {task.status === 'failed' && task.send_error && (
                  <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-300">{task.send_error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    Created {new Date(task.created_at).toLocaleDateString()}
                    {task.sent_at && ` · Sent ${new Date(task.sent_at).toLocaleDateString()}`}
                  </p>
                  <div className="flex gap-2">
                    {task.status === 'approved_ready' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCancelTask(task.id)}
                          className="border-zinc-700 text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSend(task)}
                          disabled={sending === task.id}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          {sending === task.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1" />
                              Send
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {task.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          // Reset to approved_ready to allow retry
                          await onSendTask(task.id);
                        }}
                        disabled={sending === task.id}
                        className="border-red-700 text-red-400 hover:text-red-300"
                      >
                        {sending === task.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Retry
                          </>
                        )}
                      </Button>
                    )}
                    {task.status === 'sent' && (
                      <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        View Thread
                      </Button>
                    )}
                    {task.status === 'replied' && (
                      <Button size="sm" className="bg-red-500 hover:bg-red-600">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Respond
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard className="p-8 text-center">
          <Send className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No outreach tasks yet</p>
          <p className="text-sm text-zinc-500 mt-1">
            Generate and approve outreach messages to see them here
          </p>
        </GlassCard>
      )}

      {/* Summary Stats */}
      {tasks.length > 0 && (
        <GlassCard className="p-4">
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{taskCounts.all}</p>
              <p className="text-xs text-zinc-500">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-300">{taskCounts.approved_ready}</p>
              <p className="text-xs text-zinc-500">Ready</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{taskCounts.sent}</p>
              <p className="text-xs text-zinc-500">Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{taskCounts.replied}</p>
              <p className="text-xs text-zinc-500">Replied</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{taskCounts.failed}</p>
              <p className="text-xs text-zinc-500">Failed</p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
