/**
 * AdminRoadmap Page — v2
 * Persistent feature request board with two-way conversation between user and Claude Code.
 *
 * Features:
 * - List view + Kanban board (drag-and-drop between columns)
 * - Supabase Realtime subscription (live updates)
 * - Subtask checklists per item
 * - Comment thread with markdown rendering
 * - Dependency picker (multi-select in modal)
 * - Multi-tag labels system
 * - Activity history tracking (status changes, comments, etc.)
 * - Priority auto-escalation (visual stale indicator)
 * - Export (CSV / JSON)
 * - Notification integration (user_notifications)
 *
 * Status flow: requested -> planned -> in_progress -> review -> done | cancelled
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useAdmin } from '@/components/admin/AdminGuard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragOverlay, useDroppable,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Map, Plus, Search, RefreshCw, MessageSquare, Send,
  ChevronDown, ChevronUp, Clock, CheckCircle, Circle,
  Loader2, Eye, Pencil, Trash2, Save, Filter,
  ArrowUpDown, Sparkles, Bot, User, LayoutList,
  Columns3, CalendarDays, Link2, FileCode, Users,
  CheckSquare, XCircle, Gauge, Tag, GitBranch,
  Download, AlertTriangle, History, X, GripVertical,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  requested:   { label: 'Requested',   icon: Circle,      color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',   dot: 'bg-zinc-400' },
  planned:     { label: 'Planned',     icon: Clock,       color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   dot: 'bg-blue-400' },
  in_progress: { label: 'In Progress', icon: Loader2,     color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  review:      { label: 'Review',      icon: Eye,         color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  done:        { label: 'Done',        icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  cancelled:   { label: 'Cancelled',   icon: XCircle,     color: 'bg-red-500/20 text-red-400 border-red-500/30',      dot: 'bg-red-400' },
};

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', order: 3 },
  medium:   { label: 'Medium',   color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', order: 2 },
  high:     { label: 'High',     color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', order: 1 },
  critical: { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30', order: 0 },
};

const EFFORT_CONFIG = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL' };

const CATEGORIES = [
  'talent', 'crm', 'finance', 'growth', 'products', 'sync-agent',
  'learn', 'create', 'sentinel', 'admin', 'platform', 'integrations', 'other',
];

const AGENTS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'unassigned'];

const SUGGESTED_TAGS = [
  'bug', 'enhancement', 'ux', 'backend', 'frontend', 'database',
  'edge-function', 'ai', 'design', 'performance', 'security', 'docs',
];

const STALE_DAYS = 7; // days before an item is considered stale

// ─── Helpers ────────────────────────────────────────────────────────
function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function isStale(item) {
  return item.status === 'requested' && daysSince(item.created_at) >= STALE_DAYS;
}

function escalatedPriority(item) {
  if (!isStale(item)) return null;
  const order = { low: 'medium', medium: 'high', high: 'critical' };
  return order[item.priority] || null;
}

// ─── Markdown Renderer ──────────────────────────────────────────────
function Md({ children }) {
  if (!children) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{children}</a>,
        code: ({ inline, children }) => inline
          ? <code className="bg-zinc-800 px-1 py-0.5 rounded text-[11px] text-red-400">{children}</code>
          : <pre className="bg-zinc-800 rounded p-2 text-[11px] text-zinc-300 overflow-x-auto my-1"><code>{children}</code></pre>,
        ul: ({ children }) => <ul className="list-disc list-inside ml-2 my-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside ml-2 my-1">{children}</ol>,
        li: ({ children }) => <li className="mb-0.5">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        h1: ({ children }) => <h1 className="text-sm font-bold text-white mt-2 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xs font-bold text-white mt-2 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-semibold text-zinc-300 mt-1 mb-0.5">{children}</h3>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

// ─── Tag Input ──────────────────────────────────────────────────────
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = SUGGESTED_TAGS.filter(t => !tags.includes(t) && t.includes(input.toLowerCase()));

  const addTag = (tag) => {
    const t = tag.toLowerCase().trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 mb-1">
        {tags.map(t => (
          <Badge key={t} className="text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30 gap-1 pr-1">
            {t}
            <button onClick={() => removeTag(t)} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && input.trim()) { e.preventDefault(); addTag(input); }
          if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1]);
        }}
        placeholder="Add tags..."
        className="bg-zinc-800/50 border-zinc-700 text-xs text-white h-7"
      />
      {showSuggestions && suggestions.length > 0 && input && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-32 overflow-y-auto">
          {suggestions.map(s => (
            <button key={s} onClick={() => addTag(s)}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity History Panel ─────────────────────────────────────────
function HistoryPanel({ history }) {
  if (!history?.length) return null;
  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <div className="flex items-center gap-2 mb-2">
        <History className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-400">Activity ({history.length})</span>
      </div>
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {history.slice().reverse().slice(0, 10).map((h, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span className="shrink-0">{new Date(h.at).toLocaleString()}</span>
            <span className="text-zinc-600">—</span>
            <span>{h.actor === 'claude' ? 'Claude' : 'User'}</span>
            <span className="text-zinc-400">{h.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Comment Thread ─────────────────────────────────────────────────
function CommentThread({ itemId, comments, onAddComment }) {
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const handleSend = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    await onAddComment(itemId, newComment.trim(), 'user');
    setNewComment('');
    setSending(false);
  };

  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-400">Conversation ({comments.length})</span>
      </div>

      <ScrollArea className="max-h-64">
        <div className="space-y-2 mb-2 pr-2">
          {comments.map((c, i) => (
            <div key={i} className={cn('flex gap-2 text-xs', c.author === 'claude' ? 'flex-row' : 'flex-row-reverse')}>
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                c.author === 'claude' ? 'bg-purple-500/20' : 'bg-red-500/20'
              )}>
                {c.author === 'claude' ? <Bot className="w-3 h-3 text-purple-400" /> : <User className="w-3 h-3 text-red-400" />}
              </div>
              <div className={cn(
                'rounded-lg px-3 py-2 max-w-[80%]',
                c.author === 'claude'
                  ? 'bg-purple-500/10 border border-purple-500/20 text-zinc-300'
                  : 'bg-red-500/10 border border-red-500/20 text-zinc-300'
              )}>
                <div className="whitespace-pre-wrap"><Md>{c.content}</Md></div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  {c.author === 'claude' ? 'Claude Code' : 'You'} · {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Reply... (supports **markdown**)"
          className="bg-zinc-800/50 border-zinc-700 text-sm text-white min-h-[36px] max-h-24"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button size="sm" onClick={handleSend} disabled={!newComment.trim() || sending}
          className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 self-end">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Subtask Checklist ──────────────────────────────────────────────
function SubtaskList({ subtasks, onToggle, onAdd, onRemove }) {
  const [newTask, setNewTask] = useState('');
  const done = subtasks.filter(s => s.done).length;

  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-400">Subtasks ({done}/{subtasks.length})</span>
        </div>
        {subtasks.length > 0 && (
          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${subtasks.length ? (done / subtasks.length * 100) : 0}%` }} />
          </div>
        )}
      </div>

      <div className="space-y-1 mb-2">
        {subtasks.map((st, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <Checkbox checked={st.done} onCheckedChange={() => onToggle(i)}
              className="border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
            <span className={cn('text-xs flex-1', st.done ? 'text-zinc-500 line-through' : 'text-zinc-300')}>
              {st.text}
            </span>
            <button onClick={() => onRemove(i)}
              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity">
              <XCircle className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input value={newTask} onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add subtask..." className="bg-zinc-800/50 border-zinc-700 text-xs text-white h-7"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTask.trim()) { onAdd(newTask.trim()); setNewTask(''); }
          }} />
        <Button size="sm" variant="ghost" onClick={() => { if (newTask.trim()) { onAdd(newTask.trim()); setNewTask(''); } }}
          className="h-7 px-2 text-zinc-400 hover:text-white">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Roadmap Card (List View) ───────────────────────────────────────
function RoadmapCard({ item, allItems, onStatusChange, onEdit, onDelete, onAddComment,
  onToggleSubtask, onAddSubtask, onRemoveSubtask, expanded, onToggleExpand }) {
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.requested;
  const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
  const StatusIcon = status.icon;
  const comments = item.comments || [];
  const subtasks = item.subtasks || [];
  const subtasksDone = subtasks.filter(s => s.done).length;
  const hasUnreadClaude = comments.length > 0 && comments[comments.length - 1]?.author === 'claude';
  const stale = isStale(item);
  const escalated = escalatedPriority(item);
  const tags = item.tags || [];

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <Card className={cn(
        'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all',
        item.status === 'in_progress' && 'border-l-2 border-l-yellow-500',
        item.status === 'done' && 'border-l-2 border-l-green-500',
        hasUnreadClaude && 'ring-1 ring-purple-500/30',
        stale && 'ring-1 ring-orange-500/20',
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Title + Badges */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <Badge className={cn('text-[10px] px-1.5 py-px', status.color)}>
                  <StatusIcon className={cn('w-3 h-3 mr-1', item.status === 'in_progress' && 'animate-spin')} />
                  {status.label}
                </Badge>
                <Badge className={cn('text-[10px] px-1.5 py-px', priority.color)}>{priority.label}</Badge>
                {stale && (
                  <Badge className="text-[10px] px-1.5 py-px bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse">
                    <AlertTriangle className="w-2.5 h-2.5 mr-1" />Stale {daysSince(item.created_at)}d
                    {escalated && <span className="ml-1">→ {escalated}</span>}
                  </Badge>
                )}
                {item.category && (
                  <Badge className="text-[10px] px-1.5 py-px bg-zinc-800 text-zinc-400 border-zinc-700">
                    <Tag className="w-2.5 h-2.5 mr-1" />{item.category}
                  </Badge>
                )}
                {item.effort && (
                  <Badge className="text-[10px] px-1.5 py-px bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    <Gauge className="w-2.5 h-2.5 mr-1" />{EFFORT_CONFIG[item.effort]}
                  </Badge>
                )}
                {item.assignee && item.assignee !== 'unassigned' && (
                  <Badge className="text-[10px] px-1.5 py-px bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                    <Users className="w-2.5 h-2.5 mr-1" />{item.assignee}
                  </Badge>
                )}
                {hasUnreadClaude && (
                  <Badge className="text-[10px] px-1.5 py-px bg-purple-500/20 text-purple-400 border-purple-500/30 animate-pulse">
                    <Bot className="w-2.5 h-2.5 mr-1" />Claude replied
                  </Badge>
                )}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {tags.map(t => (
                    <Badge key={t} className="text-[9px] px-1 py-0 bg-cyan-500/10 text-cyan-400/80 border-cyan-500/20">{t}</Badge>
                  ))}
                </div>
              )}

              {/* Description with markdown */}
              <div className="text-xs text-zinc-400 line-clamp-2"><Md>{item.description}</Md></div>

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500 flex-wrap">
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                {item.target_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {new Date(item.target_date).toLocaleDateString()}
                  </span>
                )}
                {comments.length > 0 && (
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{comments.length}</span>
                )}
                {subtasks.length > 0 && (
                  <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" />{subtasksDone}/{subtasks.length}</span>
                )}
                {item.files_affected?.length > 0 && (
                  <span className="flex items-center gap-1"><FileCode className="w-3 h-3" />{item.files_affected.length} files</span>
                )}
                {item.orchestra_task_id && (
                  <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{item.orchestra_task_id}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Select value={item.status} onValueChange={(v) => onStatusChange(item.id, v)}>
                <SelectTrigger className="h-7 w-28 text-[10px] bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="h-7 w-7 p-0 text-zinc-400 hover:text-white">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(item)} className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onToggleExpand(item.id)} className="h-7 w-7 p-0 text-zinc-400 hover:text-white">
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Expanded panel */}
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>

                {/* File references */}
                {item.files_affected?.length > 0 && (
                  <div className="mt-3 border-t border-zinc-800 pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-xs font-medium text-zinc-400">Files affected</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.files_affected.map((f, i) => (
                        <Badge key={i} className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700 font-mono">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependencies */}
                {(item.depends_on?.length > 0 || item.blocks?.length > 0) && (
                  <div className="mt-3 border-t border-zinc-800 pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Link2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-xs font-medium text-zinc-400">Dependencies</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      {item.depends_on?.map(depId => {
                        const dep = allItems.find(i => i.id === depId);
                        return dep ? (
                          <div key={depId} className="text-zinc-500">
                            Depends on: <span className="text-zinc-300">{dep.title}</span>
                            <Badge className={cn('ml-2 text-[9px] px-1 py-0', STATUS_CONFIG[dep.status]?.color)}>
                              {STATUS_CONFIG[dep.status]?.label}
                            </Badge>
                          </div>
                        ) : null;
                      })}
                      {item.blocks?.map(blockId => {
                        const blocked = allItems.find(i => i.id === blockId);
                        return blocked ? (
                          <div key={blockId} className="text-zinc-500">
                            Blocks: <span className="text-zinc-300">{blocked.title}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Subtasks */}
                <SubtaskList
                  subtasks={subtasks}
                  onToggle={(i) => onToggleSubtask(item.id, i)}
                  onAdd={(text) => onAddSubtask(item.id, text)}
                  onRemove={(i) => onRemoveSubtask(item.id, i)}
                />

                {/* Activity History */}
                <HistoryPanel history={item.history} />

                {/* Comments */}
                <CommentThread itemId={item.id} comments={comments} onAddComment={onAddComment} />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Draggable Kanban Card ──────────────────────────────────────────
function DraggableKanbanCard({ item, onEdit, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
  const subtasks = item.subtasks || [];
  const done = subtasks.filter(s => s.done).length;
  const comments = item.comments || [];
  const hasUnreadClaude = comments.length > 0 && comments[comments.length - 1]?.author === 'claude';
  const stale = isStale(item);
  const tags = item.tags || [];

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={cn(
        'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600 transition-all',
        hasUnreadClaude && 'ring-1 ring-purple-500/30',
        stale && 'ring-1 ring-orange-500/20',
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              <Badge className={cn('text-[9px] px-1 py-0', priority.color)}>{priority.label}</Badge>
              {item.category && (
                <Badge className="text-[9px] px-1 py-0 bg-zinc-800 text-zinc-500 border-zinc-700">{item.category}</Badge>
              )}
              {item.effort && (
                <Badge className="text-[9px] px-1 py-0 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  {EFFORT_CONFIG[item.effort]}
                </Badge>
              )}
              {stale && (
                <Badge className="text-[9px] px-1 py-0 bg-orange-500/20 text-orange-400 border-orange-500/30">
                  <AlertTriangle className="w-2 h-2 mr-0.5" />{daysSince(item.created_at)}d
                </Badge>
              )}
            </div>
            <button {...listeners} className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing p-0.5">
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          <button onClick={onClick} className="text-left w-full">
            <h4 className="text-xs font-medium text-white mb-1 line-clamp-2">{item.title}</h4>
            {item.description && (
              <p className="text-[10px] text-zinc-500 line-clamp-2 mb-1">{item.description}</p>
            )}
          </button>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mb-1">
              {tags.slice(0, 3).map(t => (
                <Badge key={t} className="text-[8px] px-1 py-0 bg-cyan-500/10 text-cyan-400/70 border-cyan-500/20">{t}</Badge>
              ))}
              {tags.length > 3 && <span className="text-[8px] text-zinc-500">+{tags.length - 3}</span>}
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            {item.assignee && item.assignee !== 'unassigned' && (
              <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{item.assignee}</span>
            )}
            {subtasks.length > 0 && (
              <span className="flex items-center gap-0.5"><CheckSquare className="w-2.5 h-2.5" />{done}/{subtasks.length}</span>
            )}
            {comments.length > 0 && (
              <span className={cn('flex items-center gap-0.5', hasUnreadClaude && 'text-purple-400')}>
                <MessageSquare className="w-2.5 h-2.5" />{comments.length}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Droppable Kanban Column ────────────────────────────────────────
function DroppableKanbanColumn({ status, items, onEdit, onItemClick }) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className={cn('flex-1 min-w-[220px] transition-all rounded-xl p-2', isOver && 'bg-zinc-800/30 ring-1 ring-zinc-600')}>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('w-2 h-2 rounded-full', config.dot)} />
        <span className="text-xs font-semibold text-zinc-300">{config.label}</span>
        <Badge className="text-[9px] px-1 py-0 bg-zinc-800 text-zinc-500 border-zinc-700">{items.length}</Badge>
      </div>
      <div className="space-y-2 min-h-[100px]">
        {items.map(item => (
          <DraggableKanbanCard key={item.id} item={item} onEdit={onEdit} onClick={() => onItemClick(item)} />
        ))}
        {items.length === 0 && (
          <div className={cn('text-center py-8 text-xs rounded-lg border border-dashed transition-colors',
            isOver ? 'border-zinc-500 text-zinc-400' : 'border-zinc-800 text-zinc-600')}>
            {isOver ? 'Drop here' : 'No items'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dependency Picker ──────────────────────────────────────────────
function DependencyPicker({ selected, onChange, allItems, currentId }) {
  const available = allItems.filter(i => i.id !== currentId);
  const [open, setOpen] = useState(false);

  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(d => d !== id));
    else onChange([...selected, id]);
  };

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full text-left bg-zinc-800/50 border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600">
        {selected.length ? `${selected.length} dependenc${selected.length === 1 ? 'y' : 'ies'} selected` : 'Select dependencies...'}
      </button>
      {open && (
        <div className="mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {available.length === 0 && <p className="px-3 py-2 text-xs text-zinc-500">No other items to depend on</p>}
          {available.map(item => (
            <label key={item.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-700 cursor-pointer">
              <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => toggle(item.id)}
                className="border-zinc-600 data-[state=checked]:bg-blue-500" />
              <span className="text-xs text-zinc-300 flex-1 truncate">{item.title}</span>
              <Badge className={cn('text-[9px] px-1 py-0', STATUS_CONFIG[item.status]?.color)}>
                {STATUS_CONFIG[item.status]?.label}
              </Badge>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add/Edit Modal ─────────────────────────────────────────────────
function RoadmapItemModal({ open, onClose, onSave, editItem, allItems }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', category: 'other',
    status: 'requested', assignee: 'unassigned', effort: '',
    target_date: '', files_affected: '', depends_on: [], orchestra_task_id: '',
    tags: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        title: editItem.title || '',
        description: editItem.description || '',
        priority: editItem.priority || 'medium',
        category: editItem.category || 'other',
        status: editItem.status || 'requested',
        assignee: editItem.assignee || 'unassigned',
        effort: editItem.effort || '',
        target_date: editItem.target_date || '',
        files_affected: (editItem.files_affected || []).join('\n'),
        depends_on: editItem.depends_on || [],
        orchestra_task_id: editItem.orchestra_task_id || '',
        tags: editItem.tags || [],
      });
    } else {
      setForm({
        title: '', description: '', priority: 'medium', category: 'other',
        status: 'requested', assignee: 'unassigned', effort: '',
        target_date: '', files_affected: '', depends_on: [], orchestra_task_id: '',
        tags: [],
      });
    }
  }, [editItem, open]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const files = form.files_affected.split('\n').map(f => f.trim()).filter(Boolean);
    await onSave({
      ...form,
      id: editItem?.id,
      files_affected: files,
      effort: form.effort || null,
      target_date: form.target_date || null,
      assignee: form.assignee || null,
      orchestra_task_id: form.orchestra_task_id || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {editItem ? 'Edit Feature Request' : 'New Feature Request'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-zinc-400 text-xs">Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Add bulk SMS outreach to Talent campaigns"
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1" />
          </div>

          <div>
            <Label className="text-zinc-400 text-xs">Description (supports markdown)</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the feature, why it's needed, acceptance criteria..."
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1 min-h-[100px]" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (<SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Assignee</Label>
              <Select value={form.assignee} onValueChange={(v) => setForm({ ...form, assignee: v })}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGENTS.map(a => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Effort</Label>
              <Select value={form.effort || 'none'} onValueChange={(v) => setForm({ ...form, effort: v === 'none' ? '' : v })}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1"><SelectValue placeholder="–" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">–</SelectItem>
                  {Object.entries(EFFORT_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Target Date</Label>
              <Input type="date" value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 text-white mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-zinc-400 text-xs">Tags</Label>
            <div className="mt-1">
              <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
            </div>
          </div>

          <div>
            <Label className="text-zinc-400 text-xs">Dependencies (blocks this item until selected items are done)</Label>
            <div className="mt-1">
              <DependencyPicker
                selected={form.depends_on}
                onChange={(deps) => setForm({ ...form, depends_on: deps })}
                allItems={allItems}
                currentId={editItem?.id}
              />
            </div>
          </div>

          <div>
            <Label className="text-zinc-400 text-xs">Orchestra Task ID</Label>
            <Input value={form.orchestra_task_id}
              onChange={(e) => setForm({ ...form, orchestra_task_id: e.target.value })}
              placeholder="e.g., T015"
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1" />
          </div>

          <div>
            <Label className="text-zinc-400 text-xs">Files Affected (one per line)</Label>
            <Textarea value={form.files_affected}
              onChange={(e) => setForm({ ...form, files_affected: e.target.value })}
              placeholder="src/components/talent/OutreachPipeline.jsx&#10;supabase/functions/sync/tools/talent.ts"
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1 font-mono text-xs min-h-[60px]" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancel</Button>
          <Button onClick={handleSave} disabled={saving}
            className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {editItem ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Export Helpers ──────────────────────────────────────────────────
function exportCSV(items) {
  const headers = ['Title', 'Status', 'Priority', 'Category', 'Assignee', 'Effort', 'Target Date', 'Tags', 'Subtasks', 'Comments', 'Created'];
  const rows = items.map(i => [
    `"${(i.title || '').replace(/"/g, '""')}"`,
    i.status,
    i.priority,
    i.category || '',
    i.assignee || '',
    i.effort || '',
    i.target_date || '',
    `"${(i.tags || []).join(', ')}"`,
    `${(i.subtasks || []).filter(s => s.done).length}/${(i.subtasks || []).length}`,
    (i.comments || []).length,
    new Date(i.created_at).toLocaleDateString(),
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `roadmap-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function exportJSON(items) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `roadmap-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function AdminRoadmap() {
  const { adminRole } = useAdmin();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [viewMode, setViewMode] = useState('list');
  const [expandedId, setExpandedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeId, setActiveId] = useState(null); // drag overlay

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // ─── Fetch ──────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setItems([]); setLoading(false); return;
      }
      toast.error('Failed to load roadmap');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ─── Realtime Subscription ────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('roadmap-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roadmap_items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => [payload.new, ...prev]);
          toast.info(`New: ${payload.new.title}`);
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── History Helper ───────────────────────────────────────
  const addHistory = useCallback(async (itemId, action, actor = 'user') => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const entry = { action, actor, at: new Date().toISOString() };
    const updated = [...(item.history || []), entry];
    await supabase.from('roadmap_items').update({ history: updated }).eq('id', itemId);
  }, [items]);

  // ─── CRUD ───────────────────────────────────────────────────
  const handleSave = async (form) => {
    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      category: form.category,
      status: form.status,
      assignee: form.assignee === 'unassigned' ? null : form.assignee,
      effort: form.effort,
      target_date: form.target_date,
      files_affected: form.files_affected,
      depends_on: form.depends_on,
      orchestra_task_id: form.orchestra_task_id,
      tags: form.tags,
    };

    if (form.id) {
      const oldItem = items.find(i => i.id === form.id);
      const { error } = await supabase.from('roadmap_items').update(payload).eq('id', form.id);
      if (error) { toast.error('Update failed'); return; }
      // Track changes in history
      const changes = [];
      if (oldItem?.status !== form.status) changes.push(`status: ${oldItem?.status} → ${form.status}`);
      if (oldItem?.priority !== form.priority) changes.push(`priority: ${oldItem?.priority} → ${form.priority}`);
      if (oldItem?.assignee !== (form.assignee === 'unassigned' ? null : form.assignee)) changes.push(`assignee changed`);
      if (changes.length) await addHistory(form.id, changes.join(', '));
      toast.success('Updated');
    } else {
      const { error } = await supabase.from('roadmap_items').insert({
        ...payload,
        comments: [],
        subtasks: [],
        history: [{ action: 'Created', actor: 'user', at: new Date().toISOString() }],
      });
      if (error) { toast.error('Create failed'); return; }
      toast.success('Feature request added');
    }
    fetchItems();
  };

  const handleStatusChange = async (id, newStatus) => {
    const oldItem = items.find(i => i.id === id);
    const { error } = await supabase.from('roadmap_items').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error('Status update failed'); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
    await addHistory(id, `Status: ${oldItem?.status} → ${newStatus}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('roadmap_items').delete().eq('id', deleteTarget.id);
    if (error) { toast.error('Delete failed'); return; }
    setDeleteTarget(null);
    fetchItems();
  };

  const handleAddComment = async (itemId, content, author) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const updated = [...(item.comments || []), { content, author, created_at: new Date().toISOString() }];
    const { error } = await supabase.from('roadmap_items').update({ comments: updated }).eq('id', itemId);
    if (error) { toast.error('Comment failed'); return; }
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, comments: updated } : i));
    await addHistory(itemId, `Comment by ${author}`);

    // Create notification for admin when Claude comments
    if (author === 'claude') {
      try {
        await supabase.from('user_notifications').insert({
          type: 'roadmap_reply',
          title: `Claude replied on "${item.title}"`,
          message: content.slice(0, 200),
          action_url: '/admin/roadmap',
          read: false,
          metadata: { roadmap_item_id: itemId },
        });
      } catch (_) { /* non-critical */ }
    }
  };

  // ─── Subtask handlers ──────────────────────────────────────
  const handleToggleSubtask = async (itemId, index) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const updated = [...(item.subtasks || [])];
    updated[index] = { ...updated[index], done: !updated[index].done, completed_at: !updated[index].done ? new Date().toISOString() : null };
    const { error } = await supabase.from('roadmap_items').update({ subtasks: updated }).eq('id', itemId);
    if (!error) setItems(prev => prev.map(i => i.id === itemId ? { ...i, subtasks: updated } : i));
  };

  const handleAddSubtask = async (itemId, text) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const updated = [...(item.subtasks || []), { text, done: false, added_by: 'user', completed_at: null }];
    const { error } = await supabase.from('roadmap_items').update({ subtasks: updated }).eq('id', itemId);
    if (!error) setItems(prev => prev.map(i => i.id === itemId ? { ...i, subtasks: updated } : i));
  };

  const handleRemoveSubtask = async (itemId, index) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const updated = (item.subtasks || []).filter((_, i) => i !== index);
    const { error } = await supabase.from('roadmap_items').update({ subtasks: updated }).eq('id', itemId);
    if (!error) setItems(prev => prev.map(i => i.id === itemId ? { ...i, subtasks: updated } : i));
  };

  // ─── DnD Handler ──────────────────────────────────────────
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const draggedItem = items.find(i => i.id === active.id);
    if (!draggedItem) return;

    // `over.id` is the column status (e.g. 'planned', 'in_progress')
    const newStatus = over.id;
    if (Object.keys(STATUS_CONFIG).includes(newStatus) && draggedItem.status !== newStatus) {
      handleStatusChange(draggedItem.id, newStatus);
    }
  };

  // ─── Filter / Sort ──────────────────────────────────────────
  const statusOrder = { in_progress: 0, review: 1, planned: 2, requested: 3, done: 4, cancelled: 5 };

  const filtered = useMemo(() => items
    .filter(i => {
      if (filterStatus !== 'all' && i.status !== filterStatus) return false;
      if (filterCategory !== 'all' && i.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return i.title.toLowerCase().includes(q)
          || i.description?.toLowerCase().includes(q)
          || (i.tags || []).some(t => t.includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return (PRIORITY_CONFIG[a.priority]?.order ?? 9) - (PRIORITY_CONFIG[b.priority]?.order ?? 9);
      if (sortBy === 'status') return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      return new Date(b.created_at) - new Date(a.created_at);
    }), [items, filterStatus, filterCategory, search, sortBy]);

  // ─── Stats ──────────────────────────────────────────────────
  const stats = {
    total: items.length,
    requested: items.filter(i => i.status === 'requested').length,
    in_progress: items.filter(i => i.status === 'in_progress').length,
    done: items.filter(i => i.status === 'done').length,
    unread: items.filter(i => (i.comments || []).length > 0 && i.comments[i.comments.length - 1]?.author === 'claude').length,
    stale: items.filter(isStale).length,
  };

  // ─── Kanban groups ──────────────────────────────────────────
  const kanbanStatuses = ['requested', 'planned', 'in_progress', 'review', 'done'];
  const kanbanGroups = useMemo(() => {
    const groups = {};
    kanbanStatuses.forEach(s => { groups[s] = []; });
    filtered.forEach(item => {
      if (groups[item.status]) groups[item.status].push(item);
    });
    return groups;
  }, [filtered]);

  const draggedItem = activeId ? items.find(i => i.id === activeId) : null;

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Map className="w-5 h-5 text-red-400" />
            </div>
            Roadmap
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Add features here. Say <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-red-400">roadmap mode</code> and Claude Code builds them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.unread > 0 && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 animate-pulse">
              <Bot className="w-3 h-3 mr-1" />{stats.unread} awaiting reply
            </Badge>
          )}
          {stats.stale > 0 && (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              <AlertTriangle className="w-3 h-3 mr-1" />{stats.stale} stale
            </Badge>
          )}
          <div className="flex bg-zinc-800/50 rounded-lg p-0.5 border border-zinc-700">
            <Button variant="ghost" size="sm" onClick={() => setViewMode('list')}
              className={cn('h-7 px-2', viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400')}>
              <LayoutList className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMode('kanban')}
              className={cn('h-7 px-2', viewMode === 'kanban' ? 'bg-zinc-700 text-white' : 'text-zinc-400')}>
              <Columns3 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Export dropdown */}
          <Select value="" onValueChange={(v) => { if (v === 'csv') exportCSV(filtered); if (v === 'json') exportJSON(filtered); }}>
            <SelectTrigger className="h-8 w-8 p-0 bg-zinc-800/50 border-zinc-700 text-zinc-400 [&>svg:last-child]:hidden">
              <Download className="w-3.5 h-3.5" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">Export CSV</SelectItem>
              <SelectItem value="json">Export JSON</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={fetchItems} className="text-zinc-400 hover:text-white">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => { setEditItem(null); setModalOpen(true); }}
            className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">
            <Plus className="w-4 h-4 mr-2" />New Request
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Requested', value: stats.requested, color: 'text-zinc-400' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-yellow-400' },
          { label: 'Done', value: stats.done, color: 'text-green-400' },
          { label: 'Awaiting Reply', value: stats.unread, color: 'text-purple-400' },
          { label: 'Stale', value: stats.stale, color: 'text-orange-400' },
        ].map(s => (
          <Card key={s.label} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-zinc-500">{s.label}</p>
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles, descriptions, tags..." className="pl-9 bg-zinc-900/50 border-zinc-800 text-white" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-zinc-900/50 border-zinc-800 text-white text-xs">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36 bg-zinc-900/50 border-zinc-800 text-white text-xs">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (<SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>))}
          </SelectContent>
        </Select>
        {viewMode === 'list' && (
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 bg-zinc-900/50 border-zinc-800 text-white text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(item => (
              <RoadmapCard key={item.id} item={item} allItems={items}
                onStatusChange={handleStatusChange}
                onEdit={(i) => { setEditItem(i); setModalOpen(true); }}
                onDelete={setDeleteTarget}
                onAddComment={handleAddComment}
                onToggleSubtask={handleToggleSubtask}
                onAddSubtask={handleAddSubtask}
                onRemoveSubtask={handleRemoveSubtask}
                expanded={expandedId === item.id}
                onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)} />
            ))}
          </AnimatePresence>
          {!loading && filtered.length === 0 && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-12 text-center">
                <Sparkles className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">No feature requests yet</h3>
                <p className="text-sm text-zinc-400 mb-4">Add your first request and Claude Code will build it.</p>
                <Button onClick={() => { setEditItem(null); setModalOpen(true); }}
                  className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">
                  <Plus className="w-4 h-4 mr-2" />Add First Request
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanStatuses.map(status => (
              <DroppableKanbanColumn key={status} status={status}
                items={kanbanGroups[status] || []}
                onEdit={(i) => { setEditItem(i); setModalOpen(true); }}
                onItemClick={(i) => { setViewMode('list'); setExpandedId(i.id); }} />
            ))}
          </div>
          <DragOverlay>
            {draggedItem ? (
              <Card className="bg-zinc-900 border-zinc-600 shadow-2xl w-[220px]">
                <CardContent className="p-3">
                  <h4 className="text-xs font-medium text-white line-clamp-2">{draggedItem.title}</h4>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal + Delete Dialog */}
      <RoadmapItemModal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSave={handleSave} editItem={editItem} allItems={items} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Feature Request</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Delete "{deleteTarget?.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-zinc-400 border-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500/20 text-red-400 border border-red-500/30">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
