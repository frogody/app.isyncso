/**
 * AdminRoadmap Page — v3 Journey Road
 * Visual journey map inspired by Candy Crush level roads.
 * Each completed feature is a node along a winding path.
 *
 * Views: Journey (default) | List | Kanban
 * All CRUD, realtime, comments, subtasks, etc. preserved.
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
  Route, Star, Lock, Zap, Trophy, Flag, TreePine, Activity, Heart,
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
import TreeRoadmap from '@/components/admin/TreeRoadmap';
import AdminCommander from '@/pages/admin/AdminCommander';
import AdminAgentDashboard from '@/pages/admin/AdminAgentDashboard';
import AdminHealthDashboard from '@/pages/admin/AdminHealthDashboard';

// ─── Config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  requested:   { label: 'Requested',   icon: Circle,      color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',   dot: 'bg-zinc-400',   node: '#71717a', glow: '#71717a40' },
  planned:     { label: 'Planned',     icon: Clock,       color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   dot: 'bg-blue-400',   node: '#60a5fa', glow: '#60a5fa40' },
  in_progress: { label: 'In Progress', icon: Loader2,     color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400', node: '#facc15', glow: '#facc1550' },
  review:      { label: 'Review',      icon: Eye,         color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-400', node: '#60a5fa', glow: '#60a5fa40' },
  done:        { label: 'Done',        icon: CheckCircle, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', dot: 'bg-cyan-400',  node: '#22d3ee', glow: '#22d3ee50' },
  cancelled:   { label: 'Cancelled',   icon: XCircle,     color: 'bg-red-500/20 text-red-400 border-red-500/30',      dot: 'bg-red-400',    node: '#f87171', glow: '#f8717140' },
};

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', order: 3 },
  medium:   { label: 'Medium',   color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', order: 2 },
  high:     { label: 'High',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', order: 1 },
  critical: { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30', order: 0 },
};

const EFFORT_CONFIG = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL' };

const CATEGORIES = [
  'talent', 'crm', 'finance', 'growth', 'products', 'sync-agent',
  'learn', 'create', 'sentinel', 'admin', 'platform', 'integrations',
  'infrastructure', 'marketplace', 'other',
];

const CATEGORY_COLORS = {
  platform: '#60a5fa',
  crm: '#a78bfa',
  finance: '#34d399',
  products: '#fb923c',
  'sync-agent': '#22d3ee',
  talent: '#f87171',
  growth: '#818cf8',
  marketplace: '#f472b6',
  admin: '#fbbf24',
  sentinel: '#2dd4bf',
  integrations: '#c084fc',
  infrastructure: '#94a3b8',
  learn: '#38bdf8',
  create: '#e879f9',
  other: '#71717a',
};

const MODULE_LABELS = {
  platform: 'Platform Core', crm: 'CRM', finance: 'Finance', products: 'Products',
  'sync-agent': 'SYNC Agent', talent: 'Talent', growth: 'Growth',
  marketplace: 'Marketplace', admin: 'Admin Panel', sentinel: 'Sentinel',
  integrations: 'Integrations', infrastructure: 'Infrastructure', learn: 'Learn',
  create: 'Create', other: 'Other',
};

const AGENTS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'unassigned'];

const SUGGESTED_TAGS = [
  'bug', 'enhancement', 'ux', 'backend', 'frontend', 'database',
  'edge-function', 'ai', 'design', 'performance', 'security', 'docs',
];

const STALE_DAYS = 7;

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
  return { low: 'medium', medium: 'high', high: 'critical' }[item.priority] || null;
}

// ─── Markdown Renderer ──────────────────────────────────────────────
function Md({ children }) {
  if (!children) return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{children}</a>,
      code: ({ inline, children }) => inline
        ? <code className="bg-zinc-800 px-1 py-0.5 rounded text-[11px] text-cyan-400">{children}</code>
        : <pre className="bg-zinc-800 rounded p-2 text-[11px] text-zinc-300 overflow-x-auto my-1"><code>{children}</code></pre>,
      ul: ({ children }) => <ul className="list-disc list-inside ml-2 my-1">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-inside ml-2 my-1">{children}</ol>,
      li: ({ children }) => <li className="mb-0.5">{children}</li>,
      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    }}>{children}</ReactMarkdown>
  );
}

// ─── Tag Input ──────────────────────────────────────────────────────
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = SUGGESTED_TAGS.filter(t => !tags.includes(t) && t.includes(input.toLowerCase()));
  const addTag = (tag) => { const t = tag.toLowerCase().trim(); if (t && !tags.includes(t)) onChange([...tags, t]); setInput(''); setShowSuggestions(false); };
  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));
  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 mb-1">
        {tags.map(t => (
          <Badge key={t} className="text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30 gap-1 pr-1">
            {t}<button onClick={() => removeTag(t)} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
          </Badge>
        ))}
      </div>
      <Input value={input} onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) { e.preventDefault(); addTag(input); } if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1]); }}
        placeholder="Add tags..." className="bg-zinc-800/50 border-zinc-700 text-xs text-white h-7" />
      {showSuggestions && suggestions.length > 0 && input && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-32 overflow-y-auto">
          {suggestions.map(s => (<button key={s} onClick={() => addTag(s)} className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white">{s}</button>))}
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
      <div className="flex items-center gap-2 mb-2"><History className="w-3.5 h-3.5 text-zinc-500" /><span className="text-xs font-medium text-zinc-400">Activity ({history.length})</span></div>
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {history.slice().reverse().slice(0, 10).map((h, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span className="shrink-0">{new Date(h.at).toLocaleString()}</span><span className="text-zinc-600">—</span>
            <span>{h.actor === 'claude' ? 'Claude' : 'User'}</span><span className="text-zinc-400">{h.action}</span>
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
    setSending(true); await onAddComment(itemId, newComment.trim(), 'user'); setNewComment(''); setSending(false);
  };
  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <div className="flex items-center gap-2 mb-2"><MessageSquare className="w-3.5 h-3.5 text-zinc-500" /><span className="text-xs font-medium text-zinc-400">Conversation ({comments.length})</span></div>
      <ScrollArea className="max-h-64">
        <div className="space-y-2 mb-2 pr-2">
          {comments.map((c, i) => (
            <div key={i} className={cn('flex gap-2 text-xs', c.author === 'claude' ? 'flex-row' : 'flex-row-reverse')}>
              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5', c.author === 'claude' ? 'bg-blue-500/20' : 'bg-cyan-500/20')}>
                {c.author === 'claude' ? <Bot className="w-3 h-3 text-blue-400" /> : <User className="w-3 h-3 text-cyan-400" />}
              </div>
              <div className={cn('rounded-lg px-3 py-2 max-w-[80%]', c.author === 'claude' ? 'bg-blue-500/10 border border-blue-500/20 text-zinc-300' : 'bg-cyan-500/10 border border-cyan-500/20 text-zinc-300')}>
                <div className="whitespace-pre-wrap"><Md>{c.content}</Md></div>
                <span className="text-[10px] text-zinc-500 mt-1 block">{c.author === 'claude' ? 'Claude Code' : 'You'} · {new Date(c.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>
      <div className="flex gap-2">
        <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Reply... (supports **markdown**)"
          className="bg-zinc-800/50 border-zinc-700 text-sm text-white min-h-[36px] max-h-24"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
        <Button size="sm" onClick={handleSend} disabled={!newComment.trim() || sending}
          className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 self-end"><Send className="w-3.5 h-3.5" /></Button>
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
        <div className="flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5 text-zinc-500" /><span className="text-xs font-medium text-zinc-400">Subtasks ({done}/{subtasks.length})</span></div>
        {subtasks.length > 0 && (<div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${subtasks.length ? (done / subtasks.length * 100) : 0}%` }} /></div>)}
      </div>
      <div className="space-y-1 mb-2">
        {subtasks.map((st, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <Checkbox checked={st.done} onCheckedChange={() => onToggle(i)} className="border-zinc-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500" />
            <span className={cn('text-xs flex-1', st.done ? 'text-zinc-500 line-through' : 'text-zinc-300')}>{st.text}</span>
            <button onClick={() => onRemove(i)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"><XCircle className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add subtask..." className="bg-zinc-800/50 border-zinc-700 text-xs text-white h-7"
          onKeyDown={(e) => { if (e.key === 'Enter' && newTask.trim()) { onAdd(newTask.trim()); setNewTask(''); } }} />
        <Button size="sm" variant="ghost" onClick={() => { if (newTask.trim()) { onAdd(newTask.trim()); setNewTask(''); } }} className="h-7 px-2 text-zinc-400 hover:text-white"><Plus className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}

// ─── Dependency Picker ──────────────────────────────────────────────
function DependencyPicker({ selected, onChange, allItems, currentId }) {
  const available = allItems.filter(i => i.id !== currentId);
  const [open, setOpen] = useState(false);
  const toggle = (id) => { if (selected.includes(id)) onChange(selected.filter(d => d !== id)); else onChange([...selected, id]); };
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full text-left bg-zinc-800/50 border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600">
        {selected.length ? `${selected.length} dependenc${selected.length === 1 ? 'y' : 'ies'} selected` : 'Select dependencies...'}
      </button>
      {open && (
        <div className="mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {available.length === 0 && <p className="px-3 py-2 text-xs text-zinc-500">No other items</p>}
          {available.map(item => (
            <label key={item.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-700 cursor-pointer">
              <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => toggle(item.id)} className="border-zinc-600 data-[state=checked]:bg-blue-500" />
              <span className="text-xs text-zinc-300 flex-1 truncate">{item.title}</span>
              <Badge className={cn('text-[9px] px-1 py-0', STATUS_CONFIG[item.status]?.color)}>{STATUS_CONFIG[item.status]?.label}</Badge>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add/Edit Modal — Module-first creation flow ────────────────────
function RoadmapItemModal({ open, onClose, onSave, editItem, allItems, preselectedCategory }) {
  const [step, setStep] = useState(editItem ? 'form' : 'module'); // 'module' | 'priority' | 'form'
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', category: 'other', status: 'requested', assignee: 'unassigned', effort: '', target_date: '', files_affected: '', depends_on: [], orchestra_task_id: '', tags: [], auto_queued: false, requires_human: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setStep('form');
      setForm({ title: editItem.title || '', description: editItem.description || '', priority: editItem.priority || 'medium', category: editItem.category || 'other', status: editItem.status || 'requested', assignee: editItem.assignee || 'unassigned', effort: editItem.effort || '', target_date: editItem.target_date || '', files_affected: (editItem.files_affected || []).join('\n'), depends_on: editItem.depends_on || [], orchestra_task_id: editItem.orchestra_task_id || '', tags: editItem.tags || [], auto_queued: editItem.auto_queued || false, requires_human: editItem.requires_human || false });
    } else {
      setStep(preselectedCategory ? 'priority' : 'module');
      setForm({ title: '', description: '', priority: 'medium', category: preselectedCategory || 'other', status: 'requested', assignee: 'unassigned', effort: '', target_date: '', files_affected: '', depends_on: [], orchestra_task_id: '', tags: [], auto_queued: false, requires_human: false });
    }
  }, [editItem, open, preselectedCategory]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const files = form.files_affected.split('\n').map(f => f.trim()).filter(Boolean);
    await onSave({ ...form, id: editItem?.id, files_affected: files, effort: form.effort || null, target_date: form.target_date || null, assignee: form.assignee || null, orchestra_task_id: form.orchestra_task_id || null, requires_human: form.requires_human || false });
    setSaving(false); onClose();
  };

  const catCounts = useMemo(() => {
    const counts = {};
    allItems.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return counts;
  }, [allItems]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Step 1: Pick Module */}
        {step === 'module' && (
          <>
            <DialogHeader><DialogTitle className="text-white">Add Feature — Pick Module</DialogTitle></DialogHeader>
            <p className="text-xs text-zinc-500 -mt-2">Which part of iSyncSO does this belong to?</p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {CATEGORIES.map(cat => {
                const color = CATEGORY_COLORS[cat] || '#71717a';
                const label = MODULE_LABELS[cat] || cat;
                return (
                  <button key={cat} onClick={() => { setForm(f => ({ ...f, category: cat })); setStep('priority'); }}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all text-left group hover:bg-white/[0.02]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20', border: `1px solid ${color}30` }}>
                      <span className="text-xs font-black" style={{ color }}>{(catCounts[cat] || 0)}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-300 group-hover:text-white">{label}</p>
                      <p className="text-[9px] text-zinc-600">{catCounts[cat] || 0} features</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Step 2: Pick Priority */}
        {step === 'priority' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[form.category] }} />
                {MODULE_LABELS[form.category] || form.category} — Set Priority
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-zinc-500 -mt-2">How urgent is this?</p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[
                { key: 'critical', label: 'Critical', desc: 'Blocking everything, do now', emoji: '🔴', border: 'border-red-500/40 hover:border-red-500' },
                { key: 'high', label: 'High', desc: 'Important, do this week', emoji: '🟠', border: 'border-orange-500/40 hover:border-orange-500' },
                { key: 'medium', label: 'Medium', desc: 'Normal priority', emoji: '🔵', border: 'border-blue-500/40 hover:border-blue-500' },
                { key: 'low', label: 'Low', desc: 'Nice to have, whenever', emoji: '⚪', border: 'border-zinc-600/40 hover:border-zinc-500' },
              ].map(p => (
                <button key={p.key} onClick={() => { setForm(f => ({ ...f, priority: p.key })); setStep('form'); }}
                  className={cn('flex items-center gap-3 p-4 rounded-xl border transition-all text-left hover:bg-white/[0.02]', p.border,
                    form.priority === p.key && 'ring-1 ring-white/20')}>
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{p.label}</p>
                    <p className="text-[10px] text-zinc-500">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-start mt-1">
              <Button variant="ghost" size="sm" onClick={() => setStep('module')} className="text-zinc-500 text-xs">← Back to modules</Button>
            </div>
          </>
        )}

        {/* Step 3: Details Form */}
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                {!editItem && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[form.category] }} />}
                {editItem ? 'Edit Feature' : `New ${MODULE_LABELS[form.category] || form.category} Feature`}
                {!editItem && <Badge className={cn('text-[9px] px-1.5 py-0 ml-1', PRIORITY_CONFIG[form.priority]?.color)}>{form.priority}</Badge>}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-zinc-400 text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Add bulk SMS outreach" className="bg-zinc-800/50 border-zinc-700 text-white mt-1" autoFocus /></div>
              <div><Label className="text-zinc-400 text-xs">Description (markdown)</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What should be built? Be specific..." className="bg-zinc-800/50 border-zinc-700 text-white mt-1 min-h-[80px]" /></div>
              {editItem && (
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-zinc-400 text-xs">Priority</Label><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}><SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PRIORITY_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}</SelectContent></Select></div>
                  <div><Label className="text-zinc-400 text-xs">Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => (<SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>))}</SelectContent></Select></div>
                  <div><Label className="text-zinc-400 text-xs">Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}</SelectContent></Select></div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-zinc-400 text-xs">Effort</Label><Select value={form.effort || 'none'} onValueChange={(v) => setForm({ ...form, effort: v === 'none' ? '' : v })}><SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1"><SelectValue placeholder="–" /></SelectTrigger><SelectContent><SelectItem value="none">–</SelectItem>{Object.entries(EFFORT_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent></Select></div>
                <div><Label className="text-zinc-400 text-xs">Assignee</Label><Select value={form.assignee} onValueChange={(v) => setForm({ ...form, assignee: v })}><SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger><SelectContent>{AGENTS.map(a => (<SelectItem key={a} value={a}>{a}</SelectItem>))}</SelectContent></Select></div>
                <div><Label className="text-zinc-400 text-xs">Target Date</Label><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className="bg-zinc-800/50 border-zinc-700 text-white mt-1" /></div>
              </div>
              <div><Label className="text-zinc-400 text-xs">Tags</Label><div className="mt-1"><TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} /></div></div>
              <div><Label className="text-zinc-400 text-xs">Files Affected (one per line)</Label><Textarea value={form.files_affected} onChange={(e) => setForm({ ...form, files_affected: e.target.value })} placeholder="src/components/foo.jsx" className="bg-zinc-800/50 border-zinc-700 text-white mt-1 font-mono text-xs min-h-[50px]" /></div>
              <div><Label className="text-zinc-400 text-xs">Dependencies</Label><div className="mt-1"><DependencyPicker selected={form.depends_on} onChange={(deps) => setForm({ ...form, depends_on: deps })} allItems={allItems} currentId={editItem?.id} /></div></div>

              {/* Auto-build toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <button onClick={() => setForm(f => ({ ...f, auto_queued: !f.auto_queued }))}
                  className={cn('w-10 h-5 rounded-full transition-all relative', form.auto_queued ? 'bg-cyan-500' : 'bg-zinc-700')}>
                  <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow', form.auto_queued ? 'left-[22px]' : 'left-0.5')} />
                </button>
                <div>
                  <p className="text-xs font-medium text-white">Queue for Auto-Build</p>
                  <p className="text-[9px] text-zinc-500">Claude Code picks this up automatically and builds it</p>
                </div>
                {form.auto_queued && <Bot className="w-4 h-4 text-cyan-400 ml-auto" />}
              </div>

              {/* Requires Human toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <button onClick={() => setForm(f => ({ ...f, requires_human: !f.requires_human }))}
                  className={cn('w-10 h-5 rounded-full transition-all relative', form.requires_human ? 'bg-amber-500' : 'bg-zinc-700')}>
                  <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow', form.requires_human ? 'left-[22px]' : 'left-0.5')} />
                </button>
                <div>
                  <p className="text-xs font-medium text-white">Requires Human Action</p>
                  <p className="text-[9px] text-zinc-500">Manual step needed — decision, configuration, or external action</p>
                </div>
                {form.requires_human && <Users className="w-4 h-4 text-amber-400 ml-auto" />}
              </div>
            </div>
            <DialogFooter className="flex justify-between items-center">
              <div>{!editItem && <Button variant="ghost" size="sm" onClick={() => setStep('priority')} className="text-zinc-500 text-xs">← Back</Button>}</div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {form.auto_queued ? 'Create & Queue' : (editItem ? 'Update' : 'Create')}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Journey Detail Drawer ──────────────────────────────────────────
function JourneyDetailDrawer({ item, onClose, allItems, onAddComment, onToggleSubtask, onAddSubtask, onRemoveSubtask, onEdit, onStatusChange, onToggleAutoQueue }) {
  if (!item) return null;
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.requested;
  const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
  const catColor = CATEGORY_COLORS[item.category] || '#71717a';
  const comments = item.comments || [];
  const subtasks = item.subtasks || [];

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 w-[420px] bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catColor }} />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{item.category}</span>
            <Badge className={cn('text-[10px] px-1.5 py-px', status.color)}>{status.label}</Badge>
            <Badge className={cn('text-[10px] px-1.5 py-px', priority.color)}>{priority.label}</Badge>
          </div>
          <h2 className="text-lg font-bold text-white">{item.title}</h2>
          <p className="text-[10px] text-zinc-500 mt-1">{new Date(item.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="h-7 w-7 p-0 text-zinc-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 text-zinc-400 hover:text-white"><X className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status + Auto-queue */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500">Status:</span>
          <Select value={item.status} onValueChange={(v) => onStatusChange(item.id, v)}>
            <SelectTrigger className="h-7 w-32 text-[10px] bg-zinc-800/50 border-zinc-700"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(STATUS_CONFIG).map(([key, cfg]) => (<SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>))}</SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => onToggleAutoQueue(item.id, !item.auto_queued)}
            className={cn('h-7 text-[10px] gap-1.5 ml-auto',
              item.auto_queued
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
            )}
          >
            <Bot className="w-3 h-3" />
            {item.auto_queued ? 'Queued for Claude' : 'Queue for Claude'}
          </Button>
        </div>

        {/* Description */}
        {item.description && (
          <div className="text-sm text-zinc-300"><Md>{item.description}</Md></div>
        )}

        {/* Tags */}
        {(item.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map(t => (<Badge key={t} className="text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{t}</Badge>))}
          </div>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {item.effort && <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800"><span className="text-zinc-500">Effort</span><p className="text-white font-medium">{EFFORT_CONFIG[item.effort]}</p></div>}
          {item.assignee && item.assignee !== 'unassigned' && <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800"><span className="text-zinc-500">Assignee</span><p className="text-white font-medium">{item.assignee}</p></div>}
          {item.target_date && <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800"><span className="text-zinc-500">Target</span><p className="text-white font-medium">{new Date(item.target_date).toLocaleDateString()}</p></div>}
          {item.orchestra_task_id && <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800"><span className="text-zinc-500">Task</span><p className="text-white font-medium font-mono">{item.orchestra_task_id}</p></div>}
        </div>

        {/* Requires Human */}
        {item.requires_human && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-medium text-amber-400">Requires human action</span>
          </div>
        )}

        {/* Dependencies */}
        {(item.depends_on || []).length > 0 && (
          <div>
            <span className="text-xs text-zinc-500 flex items-center gap-1 mb-1"><GitBranch className="w-3 h-3" />Dependencies</span>
            <div className="space-y-1">
              {item.depends_on.map(depId => {
                const dep = allItems.find(i => i.id === depId);
                if (!dep) return null;
                const depStatus = STATUS_CONFIG[dep.status] || STATUS_CONFIG.requested;
                return (
                  <div key={depId} className="flex items-center gap-2 bg-zinc-900/50 rounded-lg px-2.5 py-1.5 border border-zinc-800">
                    <div className={cn('w-2 h-2 rounded-full', depStatus.dot)} />
                    <span className="text-[11px] text-zinc-300 flex-1 truncate">{dep.title}</span>
                    <Badge className={cn('text-[9px] px-1 py-0', depStatus.color)}>{depStatus.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Files */}
        {item.files_affected?.length > 0 && (
          <div>
            <span className="text-xs text-zinc-500 flex items-center gap-1 mb-1"><FileCode className="w-3 h-3" />Files affected</span>
            <div className="flex flex-wrap gap-1">{item.files_affected.map((f, i) => (<Badge key={i} className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700 font-mono">{f}</Badge>))}</div>
          </div>
        )}

        {/* Subtasks */}
        <SubtaskList subtasks={subtasks} onToggle={(i) => onToggleSubtask(item.id, i)} onAdd={(text) => onAddSubtask(item.id, text)} onRemove={(i) => onRemoveSubtask(item.id, i)} />

        {/* History */}
        <HistoryPanel history={item.history} />

        {/* Comments */}
        <CommentThread itemId={item.id} comments={comments} onAddComment={onAddComment} />
      </div>
    </motion.div>
  );
}

// ============================================================
// JOURNEY ROAD — Module-based winding path
// Big nodes = app modules (expandable), sub-features branch off.
// ============================================================

const ACHIEVEMENTS = [
  { at: 10, label: '10 Features!', icon: '🔥' },
  { at: 25, label: '25 Features!', icon: '⚡' },
  { at: 50, label: '50 Club!', icon: '🏆' },
];

function JourneyRoad({ items, onNodeClick, selectedId }) {
  const scrollRef = useRef(null);
  const [expandedMods, setExpandedMods] = useState(new Set());

  const toggleModule = (cat) => {
    setExpandedMods(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Group items into modules (chronological by first feature)
  const modules = useMemo(() => {
    const sorted = [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const catOrder = [];
    const catMap = {};
    sorted.forEach(item => {
      if (!catMap[item.category]) { catMap[item.category] = []; catOrder.push(item.category); }
      catMap[item.category].push(item);
    });
    return catOrder.map(cat => ({
      category: cat,
      label: MODULE_LABELS[cat] || cat,
      color: CATEGORY_COLORS[cat] || '#71717a',
      items: catMap[cat],
      done: catMap[cat].filter(i => i.status === 'done').length,
      total: catMap[cat].length,
    }));
  }, [items]);

  // Layout: compute positions for modules and their expanded features
  const { layout, pathD, totalHeight } = useMemo(() => {
    const W = 960, CENTER = W / 2, AMP = 200;
    const MOD_H = 100; // collapsed module height
    const FEAT_ROW = 44; // each feature row height
    const GAP = 30;
    let y = 80;
    const lyt = [];
    let featureRunning = 0;

    modules.forEach((mod, i) => {
      const x = CENTER + Math.sin(i * 0.65) * AMP;
      const isExp = expandedMods.has(mod.category);
      const featH = isExp ? mod.items.length * FEAT_ROW + 16 : 0;
      lyt.push({ ...mod, x, y: y + MOD_H / 2, top: y, expanded: isExp, featH, index: i });
      y += MOD_H + featH + GAP;
      featureRunning += mod.total;

      // Insert achievement markers
      ACHIEVEMENTS.forEach(ach => {
        if (featureRunning >= ach.at && featureRunning - mod.total < ach.at) {
          lyt.push({ isAchievement: true, ...ach, y: y - GAP / 2, x: CENTER });
          y += 40;
        }
      });
    });

    // SVG path through module centers
    const modNodes = lyt.filter(l => !l.isAchievement);
    let d = '';
    if (modNodes.length >= 1) {
      d = `M ${modNodes[0].x} ${modNodes[0].y}`;
      for (let j = 1; j < modNodes.length; j++) {
        const p = modNodes[j - 1], c = modNodes[j], midY = (p.y + c.y) / 2;
        d += ` C ${p.x} ${midY}, ${c.x} ${midY}, ${c.x} ${c.y}`;
      }
    }
    return { layout: lyt, pathD: d, totalHeight: y + 80 };
  }, [modules, expandedMods]);

  const totalDone = items.filter(i => i.status === 'done').length;
  const totalAll = items.length;
  const level = modules.length;
  const currentMod = modules.find(m => m.done < m.total) || modules[modules.length - 1];

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Map className="w-12 h-12 text-zinc-700" />
        <p className="text-zinc-500">No features yet. Start building!</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Hero stats bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
              <span className="text-sm font-black text-cyan-400">{level}</span>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Level</p>
              <p className="text-xs font-semibold text-white">{modules.length} Modules</p>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Features Shipped</p>
            <p className="text-xs font-semibold text-white">{totalDone}<span className="text-zinc-600">/{totalAll}</span></p>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="w-32">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Overall Progress</p>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-green-400"
                initial={{ width: 0 }} animate={{ width: `${totalAll ? (totalDone / totalAll * 100) : 0}%` }}
                transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentMod && (
            <Badge className="text-[10px] px-2 py-0.5" style={{ backgroundColor: currentMod.color + '20', color: currentMod.color, borderColor: currentMod.color + '30' }}>
              <Zap className="w-3 h-3 mr-1" />Building: {MODULE_LABELS[currentMod.category] || currentMod.category}
            </Badge>
          )}
        </div>
      </div>

      {/* The Road */}
      <div ref={scrollRef} className="relative overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 420px)' }}>
        <div className="relative mx-auto" style={{ height: totalHeight, width: 960 }}>
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.012]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px',
          }} />

          {/* SVG road */}
          <svg className="absolute inset-0" width="960" height={totalHeight} style={{ pointerEvents: 'none' }}>
            <defs>
              <linearGradient id="roadGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.06" />
                <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#f87171" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <path d={pathD} fill="none" stroke="url(#roadGlow)" strokeWidth="80" strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="#27272a" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 10" opacity="0.6" />
          </svg>

          {/* Render modules + achievements */}
          {layout.map((item, i) => {
            if (item.isAchievement) {
              return (
                <div key={`ach-${item.at}`} className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: item.y - 16 }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs font-bold text-yellow-400">{item.label}</span>
                  </motion.div>
                </div>
              );
            }

            const mod = item;
            const pct = mod.total ? Math.round(mod.done / mod.total * 100) : 0;
            const allDone = mod.done === mod.total;
            const side = mod.x > 480 ? 'left' : 'right'; // features expand opposite side
            const NODE_SIZE = 68;

            return (
              <div key={mod.category} className="absolute" style={{ left: 0, right: 0, top: mod.top }}>
                {/* Module node */}
                <motion.button
                  onClick={() => toggleModule(mod.category)}
                  className="absolute group z-10"
                  style={{ left: mod.x - NODE_SIZE / 2, top: 0, width: NODE_SIZE, height: NODE_SIZE }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {/* Progress ring (SVG) */}
                  <svg className="absolute inset-[-6px]" width={NODE_SIZE + 12} height={NODE_SIZE + 12} viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="#27272a" strokeWidth="3" />
                    <circle cx="40" cy="40" r="36" fill="none" stroke={mod.color} strokeWidth="3"
                      strokeDasharray={`${pct * 2.26} ${226 - pct * 2.26}`}
                      strokeDashoffset="56.5" strokeLinecap="round" opacity="0.7" />
                  </svg>

                  {/* Node body */}
                  <div className={cn('w-full h-full rounded-2xl flex flex-col items-center justify-center border-2 transition-all relative',
                    mod.expanded && 'ring-2 ring-white/10 ring-offset-2 ring-offset-zinc-950'
                  )} style={{
                    borderColor: allDone ? mod.color : mod.color + '50',
                    background: allDone
                      ? `radial-gradient(circle at 30% 30%, ${mod.color}25, ${mod.color}08)`
                      : `radial-gradient(circle at 30% 30%, ${mod.color}10, rgba(9,9,11,0.95))`,
                    boxShadow: allDone ? `0 0 30px ${mod.color}20` : 'none',
                  }}>
                    <span className="text-lg font-black" style={{ color: mod.color }}>{mod.done}</span>
                    <span className="text-[8px] text-zinc-500 font-medium">/{mod.total}</span>
                    {allDone && <Star className="absolute -top-1.5 -right-1.5 w-4 h-4 fill-yellow-400 text-yellow-400" />}
                  </div>

                  {/* Label below */}
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-center whitespace-nowrap pointer-events-none">
                    <p className={cn('text-[11px] font-bold', allDone ? 'text-zinc-200' : 'text-zinc-400')} style={{ color: allDone ? mod.color : undefined }}>
                      {mod.label}
                    </p>
                    <p className="text-[9px] text-zinc-600">{pct}% complete</p>
                  </div>

                  {/* Expand hint */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                    <motion.div animate={{ rotate: mod.expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-3 h-3 text-zinc-600" />
                    </motion.div>
                  </div>
                </motion.button>

                {/* Expanded features list */}
                <AnimatePresence>
                  {mod.expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="absolute z-20"
                      style={{
                        [side]: side === 'right' ? mod.x + NODE_SIZE / 2 + 24 : undefined,
                        left: side === 'left' ? mod.x - NODE_SIZE / 2 - 320 : undefined,
                        top: 6,
                        width: 296,
                      }}
                    >
                      {/* Connector line from node to list */}
                      <div className="absolute top-8" style={{
                        [side === 'right' ? 'left' : 'right']: -16,
                        width: 16, height: 2, background: mod.color + '40',
                      }} />

                      <div className="bg-zinc-900/95 border rounded-xl overflow-hidden backdrop-blur-sm" style={{ borderColor: mod.color + '25' }}>
                        {/* List header */}
                        <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: mod.color + '15', background: mod.color + '08' }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.color }} />
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mod.color }}>{mod.label}</span>
                          <span className="text-[9px] text-zinc-600 ml-auto">{mod.done}/{mod.total} shipped</span>
                        </div>
                        {/* Feature rows */}
                        <div className="max-h-[280px] overflow-y-auto">
                          {mod.items.map((feat) => {
                            const isDone = feat.status === 'done';
                            const isActive = feat.status === 'in_progress';
                            const isSelected = selectedId === feat.id;
                            return (
                              <button
                                key={feat.id}
                                onClick={(e) => { e.stopPropagation(); onNodeClick(feat); }}
                                className={cn(
                                  'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-white/[0.03]',
                                  isSelected && 'bg-white/[0.05]'
                                )}
                              >
                                {isDone ? (
                                  <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: mod.color }} />
                                ) : isActive ? (
                                  <Loader2 className="w-3.5 h-3.5 shrink-0 text-yellow-400 animate-spin" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
                                )}
                                <span className={cn('text-[11px] truncate flex-1', isDone ? 'text-zinc-300' : 'text-zinc-500')}>
                                  {feat.title}
                                </span>
                                {(feat.tags || []).length > 0 && (
                                  <span className="text-[8px] text-zinc-600 shrink-0">{feat.tags.length} tags</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* End marker */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: totalHeight - 60 }}>
            <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-5 py-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm font-bold text-white">{totalDone} shipped across {modules.length} modules</p>
                <p className="text-[10px] text-zinc-500">{totalAll - totalDone} in pipeline &middot; keep building</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban components (kept for kanban view) ───────────────────────
function DraggableKanbanCard({ item, onEdit, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
  const tags = item.tags || [];
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={cn('bg-zinc-900/80 border-zinc-800 hover:border-zinc-600 transition-all')}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              <Badge className={cn('text-[9px] px-1 py-0', priority.color)}>{priority.label}</Badge>
              {item.category && <Badge className="text-[9px] px-1 py-0 bg-zinc-800 text-zinc-500 border-zinc-700">{item.category}</Badge>}
            </div>
            <button {...listeners} className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing p-0.5"><GripVertical className="w-3.5 h-3.5" /></button>
          </div>
          <button onClick={onClick} className="text-left w-full">
            <h4 className="text-xs font-medium text-white mb-1 line-clamp-2">{item.title}</h4>
          </button>
          {tags.length > 0 && <div className="flex flex-wrap gap-0.5 mt-1">{tags.slice(0, 3).map(t => (<Badge key={t} className="text-[8px] px-1 py-0 bg-cyan-500/10 text-cyan-400/70 border-cyan-500/20">{t}</Badge>))}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableKanbanColumn({ status, items, onEdit, onItemClick }) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={cn('flex-1 min-w-[220px] transition-all rounded-xl p-2', isOver && 'bg-zinc-800/30 ring-1 ring-zinc-600')}>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('w-2 h-2 rounded-full', config.dot)} /><span className="text-xs font-semibold text-zinc-300">{config.label}</span>
        <Badge className="text-[9px] px-1 py-0 bg-zinc-800 text-zinc-500 border-zinc-700">{items.length}</Badge>
      </div>
      <div className="space-y-2 min-h-[100px]">
        {items.map(item => (<DraggableKanbanCard key={item.id} item={item} onEdit={onEdit} onClick={() => onItemClick(item)} />))}
        {items.length === 0 && (<div className={cn('text-center py-8 text-xs rounded-lg border border-dashed transition-colors', isOver ? 'border-zinc-500 text-zinc-400' : 'border-zinc-800 text-zinc-600')}>{isOver ? 'Drop here' : 'No items'}</div>)}
      </div>
    </div>
  );
}

// ─── Export Helpers ──────────────────────────────────────────────────
function exportCSV(items) {
  const headers = ['Title', 'Status', 'Priority', 'Category', 'Assignee', 'Effort', 'Target Date', 'Tags', 'Created'];
  const rows = items.map(i => [`"${(i.title || '').replace(/"/g, '""')}"`, i.status, i.priority, i.category || '', i.assignee || '', i.effort || '', i.target_date || '', `"${(i.tags || []).join(', ')}"`, new Date(i.created_at).toLocaleDateString()]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `roadmap-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
}
function exportJSON(items) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `roadmap-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function AdminRoadmap() {
  const { adminRole } = useAdmin();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [viewMode, setViewMode] = useState('journey'); // default to journey
  const [activeTab, setActiveTab] = useState('roadmap'); // roadmap | commander | agents | health
  const [expandedId, setExpandedId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // for journey drawer
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [preselectedCategory, setPreselectedCategory] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  // ─── Fetch ──────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('roadmap_items').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) { setItems([]); setLoading(false); return; }
      toast.error('Failed to load roadmap');
    } else { setItems(data || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ─── Realtime ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel('roadmap-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roadmap_items' }, (payload) => {
        if (payload.eventType === 'INSERT') { setItems(prev => [payload.new, ...prev]); toast.info(`New: ${payload.new.title}`); }
        else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
          if (selectedItem?.id === payload.new.id) setSelectedItem(payload.new);
        }
        else if (payload.eventType === 'DELETE') { setItems(prev => prev.filter(i => i.id !== payload.old.id)); }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedItem?.id]);

  // ─── History Helper ───────────────────────────────────────
  const addHistory = useCallback(async (itemId, action, actor = 'user') => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const updated = [...(item.history || []), { action, actor, at: new Date().toISOString() }];
    await supabase.from('roadmap_items').update({ history: updated }).eq('id', itemId);
  }, [items]);

  // ─── CRUD ─────────────────────────────────────────────────────
  const handleSave = async (form) => {
    const payload = { title: form.title, description: form.description, priority: form.priority, category: form.category, status: form.status, assignee: form.assignee === 'unassigned' ? null : form.assignee, effort: form.effort, target_date: form.target_date, files_affected: form.files_affected, depends_on: form.depends_on, orchestra_task_id: form.orchestra_task_id, tags: form.tags, auto_queued: form.auto_queued || false, requires_human: form.requires_human || false };
    if (form.id) {
      const oldItem = items.find(i => i.id === form.id);
      const { error } = await supabase.from('roadmap_items').update(payload).eq('id', form.id);
      if (error) { toast.error('Update failed'); return; }
      const changes = [];
      if (oldItem?.status !== form.status) changes.push(`status: ${oldItem?.status} → ${form.status}`);
      if (oldItem?.priority !== form.priority) changes.push(`priority: ${oldItem?.priority} → ${form.priority}`);
      if (changes.length) await addHistory(form.id, changes.join(', '));
      toast.success('Updated');
    } else {
      const { error } = await supabase.from('roadmap_items').insert({ ...payload, comments: [], subtasks: [], history: [{ action: 'Created', actor: 'user', at: new Date().toISOString() }] });
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
    if (selectedItem?.id === id) setSelectedItem(prev => ({ ...prev, status: newStatus }));
    await addHistory(id, `Status: ${oldItem?.status} → ${newStatus}`);
  };

  const handleToggleAutoQueue = async (id, queued) => {
    const { error } = await supabase.from('roadmap_items').update({ auto_queued: queued }).eq('id', id);
    if (error) { toast.error('Failed to update queue'); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, auto_queued: queued } : i));
    if (selectedItem?.id === id) setSelectedItem(prev => ({ ...prev, auto_queued: queued }));
    await addHistory(id, queued ? 'Queued for auto-build' : 'Removed from auto-build queue');
    toast.success(queued ? 'Queued for Claude auto-build' : 'Removed from queue');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('roadmap_items').delete().eq('id', deleteTarget.id);
    if (error) { toast.error('Delete failed'); return; }
    setDeleteTarget(null); fetchItems();
  };

  const handleAddComment = async (itemId, content, author) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const updated = [...(item.comments || []), { content, author, created_at: new Date().toISOString() }];
    const { error } = await supabase.from('roadmap_items').update({ comments: updated }).eq('id', itemId);
    if (error) { toast.error('Comment failed'); return; }
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, comments: updated } : i));
    if (selectedItem?.id === itemId) setSelectedItem(prev => ({ ...prev, comments: updated }));
    await addHistory(itemId, `Comment by ${author}`);
    if (author === 'claude') {
      try { await supabase.from('user_notifications').insert({ type: 'roadmap_reply', title: `Claude replied on "${item.title}"`, message: content.slice(0, 200), action_url: '/admin/roadmap', read: false, metadata: { roadmap_item_id: itemId } }); } catch (_) {}
    }
  };

  const handleToggleSubtask = async (itemId, index) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const updated = [...(item.subtasks || [])];
    updated[index] = { ...updated[index], done: !updated[index].done, completed_at: !updated[index].done ? new Date().toISOString() : null };
    const { error } = await supabase.from('roadmap_items').update({ subtasks: updated }).eq('id', itemId);
    if (!error) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, subtasks: updated } : i));
      if (selectedItem?.id === itemId) setSelectedItem(prev => ({ ...prev, subtasks: updated }));
    }
  };

  const handleAddSubtask = async (itemId, text) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const updated = [...(item.subtasks || []), { text, done: false, added_by: 'user', completed_at: null }];
    const { error } = await supabase.from('roadmap_items').update({ subtasks: updated }).eq('id', itemId);
    if (!error) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, subtasks: updated } : i));
      if (selectedItem?.id === itemId) setSelectedItem(prev => ({ ...prev, subtasks: updated }));
    }
  };

  const handleRemoveSubtask = async (itemId, index) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const updated = (item.subtasks || []).filter((_, i) => i !== index);
    const { error } = await supabase.from('roadmap_items').update({ subtasks: updated }).eq('id', itemId);
    if (!error) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, subtasks: updated } : i));
      if (selectedItem?.id === itemId) setSelectedItem(prev => ({ ...prev, subtasks: updated }));
    }
  };

  // ─── DnD ──────────────────────────────────────────────────
  const handleDragEnd = (event) => {
    const { active, over } = event; setActiveId(null); if (!over) return;
    const draggedItem = items.find(i => i.id === active.id); if (!draggedItem) return;
    const newStatus = over.id;
    if (Object.keys(STATUS_CONFIG).includes(newStatus) && draggedItem.status !== newStatus) handleStatusChange(draggedItem.id, newStatus);
  };

  // ─── Batch Actions ────────────────────────────────────────
  const toggleSelected = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(i => i.id)));
  };
  const handleBatchStatus = async (newStatus) => {
    const ids = [...selectedIds];
    for (const id of ids) await handleStatusChange(id, newStatus);
    setSelectedIds(new Set());
    toast.success(`${ids.length} items updated to ${STATUS_CONFIG[newStatus]?.label}`);
  };
  const handleBatchDelete = async () => {
    const ids = [...selectedIds];
    for (const id of ids) {
      await supabase.from('roadmap_items').delete().eq('id', id);
    }
    setSelectedIds(new Set());
    fetchItems();
    toast.success(`${ids.length} items deleted`);
  };

  // ─── Filter / Sort ────────────────────────────────────────
  const filtered = useMemo(() => items
    .filter(i => {
      if (filterStatus !== 'all' && i.status !== filterStatus) return false;
      if (filterCategory !== 'all' && i.category !== filterCategory) return false;
      if (search) { const q = search.toLowerCase(); return i.title.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || (i.tags || []).some(t => t.includes(q)); }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return (PRIORITY_CONFIG[a.priority]?.order ?? 9) - (PRIORITY_CONFIG[b.priority]?.order ?? 9);
      if (sortBy === 'status') return ({ in_progress: 0, review: 1, planned: 2, requested: 3, done: 4, cancelled: 5 }[a.status] ?? 9) - ({ in_progress: 0, review: 1, planned: 2, requested: 3, done: 4, cancelled: 5 }[b.status] ?? 9);
      return new Date(b.created_at) - new Date(a.created_at);
    }), [items, filterStatus, filterCategory, search, sortBy]);

  // ─── Stats ────────────────────────────────────────────────
  const stats = {
    total: items.length,
    requested: items.filter(i => i.status === 'requested').length,
    in_progress: items.filter(i => i.status === 'in_progress').length,
    done: items.filter(i => i.status === 'done').length,
    unread: items.filter(i => (i.comments || []).length > 0 && i.comments[i.comments.length - 1]?.author === 'claude').length,
    stale: items.filter(isStale).length,
    queued: items.filter(i => i.auto_queued).length,
  };

  // ─── Human tasks ─────────────────────────────────────────
  const humanTasks = useMemo(() => items.filter(i => i.requires_human && i.status !== 'done' && i.status !== 'cancelled'), [items]);

  // ─── Kanban groups ────────────────────────────────────────
  const kanbanStatuses = ['requested', 'planned', 'in_progress', 'review', 'done'];
  const kanbanGroups = useMemo(() => {
    const groups = {}; kanbanStatuses.forEach(s => { groups[s] = []; }); filtered.forEach(item => { if (groups[item.status]) groups[item.status].push(item); }); return groups;
  }, [filtered]);
  const draggedItem = activeId ? items.find(i => i.id === activeId) : null;

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6 relative p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center"><Map className="w-5 h-5 text-cyan-400" /></div>
            Roadmap
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Your build journey. <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-cyan-400">roadmap mode</code> and Claude builds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'roadmap' && stats.queued > 0 && <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse"><Bot className="w-3 h-3 mr-1" />{stats.queued} queued for auto-build</Badge>}
          {activeTab === 'roadmap' && stats.unread > 0 && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse"><Bot className="w-3 h-3 mr-1" />{stats.unread} awaiting reply</Badge>}
          {activeTab === 'roadmap' && (
            <>
              <div className="flex bg-zinc-800/50 rounded-lg p-0.5 border border-zinc-700">
                <Button variant="ghost" size="sm" onClick={() => setViewMode('journey')} className={cn('h-7 px-2', viewMode === 'journey' ? 'bg-zinc-700 text-white' : 'text-zinc-400')}><Route className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className={cn('h-7 px-2', viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400')}><LayoutList className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setViewMode('kanban')} className={cn('h-7 px-2', viewMode === 'kanban' ? 'bg-zinc-700 text-white' : 'text-zinc-400')}><Columns3 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setViewMode('tree')} className={cn('h-7 px-2', viewMode === 'tree' ? 'bg-zinc-700 text-white' : 'text-zinc-400')}><TreePine className="w-3.5 h-3.5" /></Button>
              </div>
              <Select value="" onValueChange={(v) => { if (v === 'csv') exportCSV(filtered); if (v === 'json') exportJSON(filtered); }}>
                <SelectTrigger className="h-8 w-8 p-0 bg-zinc-800/50 border-zinc-700 text-zinc-400 [&>svg:last-child]:hidden"><Download className="w-3.5 h-3.5" /></SelectTrigger>
                <SelectContent><SelectItem value="csv">Export CSV</SelectItem><SelectItem value="json">Export JSON</SelectItem></SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={fetchItems} className="text-zinc-400 hover:text-white"><RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /></Button>
              <Button onClick={() => { setEditItem(null); setPreselectedCategory(null); setModalOpen(true); }} className="bg-cyan-600 hover:bg-cyan-700 text-white"><Plus className="w-4 h-4 mr-2" />New Feature</Button>
            </>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-zinc-800 pb-0">
        {[
          { id: 'roadmap', label: 'Roadmap', icon: Map },
          { id: 'commander', label: 'Commander', icon: MessageSquare },
          { id: 'agents', label: 'Agents', icon: Bot },
          { id: 'health', label: 'Health', icon: Heart },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                isActive
                  ? 'text-red-400 border-red-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'commander' ? (
        <AdminCommander embedded />
      ) : activeTab === 'agents' ? (
        <AdminAgentDashboard embedded />
      ) : activeTab === 'health' ? (
        <AdminHealthDashboard embedded />
      ) : (
      <>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Requested', value: stats.requested, color: 'text-zinc-400' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-yellow-400' },
          { label: 'Done', value: stats.done, color: 'text-green-400' },
          { label: 'Awaiting Reply', value: stats.unread, color: 'text-purple-400' },
          { label: 'Queued', value: stats.queued, color: 'text-cyan-400' },
          { label: 'Stale', value: stats.stale, color: 'text-orange-400' },
        ].map(s => (
          <Card key={s.label} className="bg-zinc-900/50 border-zinc-800"><CardContent className="p-3 text-center"><p className="text-[10px] text-zinc-500">{s.label}</p><p className={cn('text-xl font-bold', s.color)}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      {/* Human Tasks */}
      {humanTasks.length > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-400">Human Tasks</h3>
              <Badge className="text-[10px] px-1.5 py-px bg-amber-500/20 text-amber-400 border-amber-500/30">{humanTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {humanTasks.map(task => {
                const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.requested;
                return (
                  <div key={task.id} className="flex items-center justify-between gap-3 bg-zinc-900/50 rounded-lg px-3 py-2.5 border border-zinc-800">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{task.title}</p>
                        {task.description && <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{task.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn('text-[10px] px-1.5 py-px', priority.color)}>{priority.label}</Badge>
                      <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                        <SelectTrigger className="h-7 w-24 text-[10px] bg-zinc-800/50 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUS_CONFIG).map(([key, cfg]) => (<SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters (hidden in journey view for cleaner look, shown for list/kanban) */}
      {viewMode !== 'journey' && viewMode !== 'tree' && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 bg-zinc-900/50 border-zinc-800 text-white" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36 bg-zinc-900/50 border-zinc-800 text-white text-xs"><Filter className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{Object.entries(STATUS_CONFIG).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}</SelectContent></Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-36 bg-zinc-900/50 border-zinc-800 text-white text-xs"><Filter className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map(c => (<SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>))}</SelectContent></Select>
          {viewMode === 'list' && (<Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="w-32 bg-zinc-900/50 border-zinc-800 text-white text-xs"><ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="priority">Priority</SelectItem><SelectItem value="newest">Newest</SelectItem><SelectItem value="status">Status</SelectItem></SelectContent></Select>)}
        </div>
      )}

      {/* Journey filter bar (minimal) */}
      {viewMode === 'journey' && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the journey..." className="pl-9 bg-zinc-900/50 border-zinc-800 text-white" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-36 bg-zinc-900/50 border-zinc-800 text-white text-xs"><Filter className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map(c => (<SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>))}</SelectContent></Select>
          {/* Legend */}
          <div className="flex items-center gap-3 ml-auto text-[10px]">
            {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'cancelled').map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.node }} />
                <span className="text-zinc-500">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'tree' ? (
        <div className="bg-zinc-950/50 rounded-2xl border border-zinc-800/50 overflow-hidden">
          <TreeRoadmap
            items={filtered}
            onSelectItem={(item) => setSelectedItem(prev => prev?.id === item.id ? null : item)}
          />
        </div>
      ) : viewMode === 'journey' ? (
        <div className="bg-zinc-950/50 rounded-2xl border border-zinc-800/50 overflow-hidden">
          <JourneyRoad
            items={filtered}
            onNodeClick={(item) => setSelectedItem(prev => prev?.id === item.id ? null : item)}
            selectedId={selectedItem?.id}
          />
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {/* Batch action bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="flex items-center gap-3 px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                  <Checkbox checked={selectedIds.size === filtered.length} onCheckedChange={toggleSelectAll} className="border-cyan-500 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500" />
                  <span className="text-xs font-medium text-cyan-400">{selectedIds.size} selected</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[10px] text-zinc-500 mr-1">Move to:</span>
                    {['planned', 'in_progress', 'done', 'cancelled'].map(s => (
                      <Button key={s} variant="ghost" size="sm" onClick={() => handleBatchStatus(s)}
                        className={cn('h-7 px-2.5 text-[10px]', STATUS_CONFIG[s]?.color)}>
                        {STATUS_CONFIG[s]?.label}
                      </Button>
                    ))}
                    <div className="w-px h-5 bg-zinc-700 mx-1" />
                    <Button variant="ghost" size="sm" onClick={handleBatchDelete}
                      className="h-7 px-2.5 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="w-3 h-3 mr-1" />Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}
                      className="h-7 px-2 text-[10px] text-zinc-500">Clear</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Select all header */}
          {filtered.length > 0 && selectedIds.size === 0 && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox checked={false} onCheckedChange={toggleSelectAll} className="border-zinc-600" />
              <span className="text-[10px] text-zinc-600">Select all ({filtered.length})</span>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {filtered.map(item => {
              const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.requested;
              const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
              const StatusIcon = status.icon;
              const comments = item.comments || [];
              const subtasks = item.subtasks || [];
              const hasUnreadClaude = comments.length > 0 && comments[comments.length - 1]?.author === 'claude';
              const stale = isStale(item);
              const tags = item.tags || [];
              const expanded = expandedId === item.id;
              const isChecked = selectedIds.has(item.id);
              return (
                <motion.div key={item.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <Card className={cn('bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all', item.status === 'in_progress' && 'border-l-2 border-l-yellow-500', item.status === 'done' && 'border-l-2 border-l-green-500', hasUnreadClaude && 'ring-1 ring-purple-500/30', isChecked && 'ring-1 ring-cyan-500/30 bg-cyan-500/[0.03]')}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <Checkbox checked={isChecked} onCheckedChange={() => toggleSelected(item.id)} className="mt-1 border-zinc-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                            <Badge className={cn('text-[10px] px-1.5 py-px', status.color)}><StatusIcon className={cn('w-3 h-3 mr-1', item.status === 'in_progress' && 'animate-spin')} />{status.label}</Badge>
                            <Badge className={cn('text-[10px] px-1.5 py-px', priority.color)}>{priority.label}</Badge>
                            {stale && <Badge className="text-[10px] px-1.5 py-px bg-orange-500/20 text-orange-400 border-orange-500/30"><AlertTriangle className="w-2.5 h-2.5 mr-1" />Stale</Badge>}
                            {item.category && <Badge className="text-[10px] px-1.5 py-px bg-zinc-800 text-zinc-400 border-zinc-700">{item.category}</Badge>}
                            {item.auto_queued && <Badge className="text-[10px] px-1.5 py-px bg-cyan-500/20 text-cyan-400 border-cyan-500/30"><Bot className="w-2.5 h-2.5 mr-1" />Queued</Badge>}
                            {item.requires_human && <Badge className="text-[10px] px-1.5 py-px bg-amber-500/20 text-amber-400 border-amber-500/30"><Users className="w-2.5 h-2.5 mr-1" />Human</Badge>}
                          </div>
                          {tags.length > 0 && <div className="flex flex-wrap gap-1 mb-1">{tags.map(t => (<Badge key={t} className="text-[9px] px-1 py-0 bg-cyan-500/10 text-cyan-400/80 border-cyan-500/20">{t}</Badge>))}</div>}
                          <div className="text-xs text-zinc-400 line-clamp-2"><Md>{item.description}</Md></div>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500 flex-wrap">
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            {item.assignee && item.assignee !== 'unassigned' && (
                              <span className="flex items-center gap-1 text-zinc-400"><Users className="w-3 h-3" />{item.assignee}</span>
                            )}
                            {item.effort && (
                              <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{EFFORT_CONFIG[item.effort]}</span>
                            )}
                            {item.target_date && (
                              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{new Date(item.target_date).toLocaleDateString()}</span>
                            )}
                            {comments.length > 0 && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{comments.length}</span>}
                            {subtasks.length > 0 && <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" />{subtasks.filter(s => s.done).length}/{subtasks.length}</span>}
                            {(item.depends_on || []).length > 0 && <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{item.depends_on.length} dep{item.depends_on.length !== 1 ? 's' : ''}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v)}>
                            <SelectTrigger className="h-7 w-28 text-[10px] bg-zinc-800/50 border-zinc-700"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(STATUS_CONFIG).map(([key, cfg]) => (<SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>))}</SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => { setEditItem(item); setModalOpen(true); }} className="h-7 w-7 p-0 text-zinc-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)} className="h-7 w-7 p-0 text-zinc-400 hover:text-white">
                            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                      <AnimatePresence>
                        {expanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <SubtaskList subtasks={subtasks} onToggle={(i) => handleToggleSubtask(item.id, i)} onAdd={(text) => handleAddSubtask(item.id, text)} onRemove={(i) => handleRemoveSubtask(item.id, i)} />
                            <HistoryPanel history={item.history} />
                            <CommentThread itemId={item.id} comments={comments} onAddComment={handleAddComment} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {!loading && filtered.length === 0 && (
            <Card className="bg-zinc-900/50 border-zinc-800"><CardContent className="p-12 text-center">
              <Sparkles className="w-10 h-10 text-zinc-600 mx-auto mb-3" /><h3 className="text-white font-semibold mb-1">No feature requests yet</h3>
              <Button onClick={() => { setEditItem(null); setModalOpen(true); }} className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 mt-3"><Plus className="w-4 h-4 mr-2" />Add First Request</Button>
            </CardContent></Card>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanStatuses.map(status => (<DroppableKanbanColumn key={status} status={status} items={kanbanGroups[status] || []} onEdit={(i) => { setEditItem(i); setModalOpen(true); }} onItemClick={(i) => { setSelectedItem(i); }} />))}
          </div>
          <DragOverlay>{draggedItem ? (<Card className="bg-zinc-900 border-zinc-600 shadow-2xl w-[220px]"><CardContent className="p-3"><h4 className="text-xs font-medium text-white line-clamp-2">{draggedItem.title}</h4></CardContent></Card>) : null}</DragOverlay>
        </DndContext>
      )}

      </>
      )}

      {/* Journey Detail Drawer */}
      <AnimatePresence>
        {selectedItem && (
          <JourneyDetailDrawer
            item={items.find(i => i.id === selectedItem.id) || selectedItem}
            onClose={() => setSelectedItem(null)}
            allItems={items}
            onAddComment={handleAddComment}
            onToggleSubtask={handleToggleSubtask}
            onAddSubtask={handleAddSubtask}
            onRemoveSubtask={handleRemoveSubtask}
            onEdit={(i) => { setEditItem(i); setModalOpen(true); }}
            onStatusChange={handleStatusChange}
            onToggleAutoQueue={handleToggleAutoQueue}
          />
        )}
      </AnimatePresence>

      {/* Modal + Delete Dialog */}
      <RoadmapItemModal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); setPreselectedCategory(null); }} onSave={handleSave} editItem={editItem} allItems={items} preselectedCategory={preselectedCategory} />
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Delete Feature Request</AlertDialogTitle><AlertDialogDescription className="text-zinc-400">Delete "{deleteTarget?.title}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="bg-zinc-800 text-zinc-400 border-zinc-700">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500/20 text-red-400 border border-red-500/30">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
