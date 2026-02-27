/**
 * SyncStory - Story page
 * Merges SyncProfile biography chapters with DesktopActivity data.
 * Route: /sync/story
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Sparkles, Loader2, Monitor, Users, Zap,
  Briefcase, Star, CheckCircle2, XCircle,
  Brain, Heart, Clock, Upload, Download,
  RefreshCw, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useUser } from '@/components/context/UserContext';
import { cn } from '@/lib/utils';

// ─── Chapter definitions ────────────────────────────────────────

const CHAPTERS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'superpowers',  label: 'Superpowers' },
  { id: 'work-dna',     label: 'Work DNA' },
  { id: 'network',      label: 'Network' },
  { id: 'digital',      label: 'Digital Life' },
  { id: 'clients',      label: 'Clients' },
  { id: 'passions',     label: 'Passions' },
  { id: 'rhythms',      label: 'Rhythms' },
  { id: 'assumptions',  label: 'Assumptions' },
];

// ─── Helpers ────────────────────────────────────────────────────

function EmptyState({ title, description }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-zinc-500 mb-1">{title}</p>
      {description && <p className="text-xs text-zinc-600 max-w-xs mx-auto">{description}</p>}
    </div>
  );
}

function SectionLabel({ children }) {
  return <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-4">{children}</h3>;
}

function TagGroup({ items, color = 'cyan' }) {
  const colors = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={cn('px-3 py-1.5 text-sm rounded-full border', colors[color] || colors.cyan)}>
          {typeof item === 'string' ? item : item.name || item.label || JSON.stringify(item)}
        </span>
      ))}
    </div>
  );
}

// ─── Chapter: Overview ──────────────────────────────────────────

function OverviewChapter({ biography, user, company }) {
  const displayName = user?.full_name || user?.name || user?.email || 'User';
  return (
    <div className="space-y-6">
      {biography?.tagline && (
        <p className="text-sm text-cyan-400 italic">"{biography.tagline}"</p>
      )}
      {biography?.biography && (
        <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
          {biography.biography.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
      {biography?.created_at && (
        <p className="text-xs text-zinc-600">
          Last updated {formatDistanceToNow(new Date(biography.updated_at || biography.created_at), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}

// ─── Chapter: Superpowers ───────────────────────────────────────

function SuperpowersChapter({ biography }) {
  const skills = biography?.skills || [];
  if (skills.length === 0) return <EmptyState title="No superpowers discovered yet" description="Generate your profile to reveal your skills" />;
  const skillNames = skills.map(s => typeof s === 'string' ? s : s.name || s.label || '').filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
        <p>
          SYNC has identified <span className="text-cyan-400 font-medium">{skills.length} core competencies</span>.
          {skillNames.length >= 2 && <> Your strongest signals: <span className="text-zinc-200 font-medium">{skillNames[0]}</span> and <span className="text-zinc-200 font-medium">{skillNames[1]}</span>.</>}
        </p>
        {biography?.superpowers_summary && biography.superpowers_summary.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="bg-zinc-900/40 rounded-lg p-4">
        <SectionLabel>Skill Map</SectionLabel>
        <TagGroup items={skills} color="cyan" />
      </div>
    </div>
  );
}

// ─── Chapter: Work DNA ──────────────────────────────────────────

function WorkDNAChapter({ biography }) {
  const workStyle = biography?.work_style || [];
  if (workStyle.length === 0) return <EmptyState title="No work DNA yet" description="SYNC needs more activity data" />;

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
        <p>
          Your work DNA reveals <span className="text-blue-400 font-medium">{workStyle.length} defining traits</span>.
        </p>
        {biography?.work_dna_summary && biography.work_dna_summary.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="bg-zinc-900/40 rounded-lg p-4">
        <SectionLabel>Work Traits</SectionLabel>
        <TagGroup items={workStyle} color="blue" />
      </div>
    </div>
  );
}

// ─── Chapter: Network ───────────────────────────────────────────

function NetworkChapter({ biography }) {
  const coworkers = biography?.top_coworkers || [];
  if (coworkers.length === 0) return <EmptyState title="No network data yet" description="Interact more to build your network map" />;
  const totalInteractions = coworkers.reduce((sum, cw) => sum + (cw.interaction_count || cw.interactions || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
        <p>
          <span className="text-purple-400 font-medium">{coworkers.length} key relationships</span>, {totalInteractions} total interactions.
        </p>
        {biography?.social_circle_summary && biography.social_circle_summary.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="bg-zinc-900/40 rounded-lg p-4 space-y-2">
        <SectionLabel>Network</SectionLabel>
        {coworkers.map((cw, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800/20 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-purple-400">{(cw.name || cw.full_name || '?')[0].toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm text-zinc-200">{cw.name || cw.full_name || 'Unknown'}</p>
                {cw.context && <p className="text-xs text-zinc-500">{cw.context}</p>}
              </div>
            </div>
            <span className="text-xs text-zinc-500">{cw.interaction_count || cw.interactions || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chapter: Digital Life ──────────────────────────────────────

function DigitalLifeChapter({ biography }) {
  const apps = biography?.top_apps || [];
  if (apps.length === 0) return <EmptyState title="No app data yet" description="SYNC will track your most-used tools" />;
  const maxMins = Math.max(...apps.map(a => a.avg_daily_minutes || a.daily_minutes || 0), 1);

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
        <p>
          <span className="text-cyan-400 font-medium">{apps.length} applications</span> in your daily toolkit.
        </p>
        {biography?.digital_life_summary && biography.digital_life_summary.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="bg-zinc-900/40 rounded-lg p-4 space-y-3">
        <SectionLabel>Daily Usage</SectionLabel>
        {apps.map((app, i) => {
          const mins = app.avg_daily_minutes || app.daily_minutes || 0;
          const pct = Math.round((mins / maxMins) * 100);
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-200">{app.name || app.app_name || 'Unknown'}</span>
                <span className="text-xs text-zinc-500">{mins} min/day</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/50 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chapter: Clients ───────────────────────────────────────────

function ClientsChapter({ biography }) {
  const clients = biography?.top_clients || [];
  if (clients.length === 0) return <EmptyState title="No client data yet" description="SYNC will learn about your key clients" />;

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
        <p>
          <span className="text-cyan-400 font-medium">{clients.length} client accounts</span> tracked.
        </p>
        {biography?.client_world_summary && biography.client_world_summary.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="bg-zinc-900/40 rounded-lg p-4 space-y-2">
        <SectionLabel>Client Accounts</SectionLabel>
        {clients.map((client, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800/20 last:border-0">
            <div>
              <p className="text-sm text-zinc-200">{client.name || client.client_name || 'Unknown'}</p>
              {client.context && <p className="text-xs text-zinc-500">{client.context}</p>}
            </div>
            <span className="text-xs text-zinc-500">{client.interaction_count || client.interactions || 0} touches</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chapter: Passions ──────────────────────────────────────────

function PassionsChapter({ biography }) {
  const interests = biography?.interests || [];
  if (interests.length === 0) return <EmptyState title="No interests discovered" description="SYNC will learn what you're passionate about" />;

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
        <p>
          <span className="text-pink-400 font-medium">{interests.length} areas of interest</span> detected.
        </p>
        {biography?.interests_summary && biography.interests_summary.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="bg-zinc-900/40 rounded-lg p-4">
        <SectionLabel>Passion Tags</SectionLabel>
        <TagGroup items={interests} color="pink" />
      </div>
    </div>
  );
}

// ─── Chapter: Rhythms ───────────────────────────────────────────

function RhythmsChapter({ biography }) {
  const rhythms = biography?.daily_rhythms;
  if (!rhythms || (Array.isArray(rhythms) && rhythms.length === 0))
    return <EmptyState title="No rhythm data yet" description="SYNC needs more activity data" />;

  const hours = Array.isArray(rhythms)
    ? rhythms
    : typeof rhythms === 'object'
      ? Object.entries(rhythms).map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
      : [];

  if (hours.length === 0) return <EmptyState title="No rhythm data yet" />;
  const maxVal = Math.max(...hours.map(h => h.activity_count || h.count || 0), 1);
  const sorted = [...hours].sort((a, b) => a.hour - b.hour);
  const peakHour = sorted.reduce((max, h) => (h.activity_count || h.count || 0) > (max.activity_count || max.count || 0) ? h : max, sorted[0]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
        <p>
          Peak productivity: <span className="text-cyan-400 font-medium">{peakHour.hour}:00</span>.
        </p>
        {biography?.daily_rhythms_summary && biography.daily_rhythms_summary.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="bg-zinc-900/40 rounded-lg p-4">
        <SectionLabel>Activity by Hour</SectionLabel>
        <div className="flex items-end gap-1 h-32">
          {sorted.map((h, i) => {
            const val = h.activity_count || h.count || 0;
            const height = Math.max((val / maxVal) * 100, 4);
            const isPeak = h.hour === peakHour.hour;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${h.hour}:00 — ${val} actions`}>
                <div className={cn('w-full rounded-t', isPeak ? 'bg-cyan-400' : 'bg-cyan-500/30')} style={{ height: `${height}%` }} />
                {i % 3 === 0 && <span className="text-[10px] text-zinc-600">{h.hour}h</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Chapter: Assumptions ───────────────────────────────────────

function AssumptionsChapter({ assumptions, onConfirm, onReject }) {
  const active = assumptions.filter(a => a.status === 'active' || !a.status);

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-300 leading-relaxed">
        <p>
          SYNC forms assumptions based on your behavior. Confirm or correct them.
          {active.length > 0
            ? <> <span className="text-cyan-400 font-medium">{active.length} pending</span>.</>
            : <> All caught up.</>
          }
        </p>
      </div>
      <AnimatePresence mode="popLayout">
        {active.map(a => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-zinc-900/40 rounded-lg p-4 border border-zinc-800/30"
          >
            <p className="text-sm text-zinc-200 mb-2">"{a.assumption}"</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {(a.category || 'general').replace('_', ' ')} · {Math.round((a.confidence || 0) * 100)}%
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => onConfirm(a)} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Yes
                </button>
                <button onClick={() => onReject(a)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> No
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {active.length === 0 && <EmptyState title="All caught up!" description="New assumptions will appear as SYNC learns more" />}
    </div>
  );
}

// ─── Memory Import Modal ────────────────────────────────────────

const PROVIDERS = [
  { id: 'chatgpt', name: 'ChatGPT', desc: 'Upload your ChatGPT data export', accept: '.zip,.json' },
  { id: 'claude', name: 'Claude', desc: 'Upload your Claude data export', accept: '.zip,.json' },
  { id: 'generic', name: 'Other', desc: 'Paste or upload any text/JSON', accept: '.json,.txt,.zip' },
];

function MemoryImportModal({ open, onClose, userId, companyId }) {
  const [uploads, setUploads] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open && userId) fetchUploads();
  }, [open, userId]);

  async function fetchUploads() {
    const { data } = await db.from('user_memory_imports').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setUploads(data);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedProvider) return;
    setUploading(true);
    try {
      const path = `memory-imports/${userId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await db.storage.from('attachments').upload(path, file);
      if (uploadErr) throw uploadErr;
      await db.from('user_memory_imports').insert({
        user_id: userId, company_id: companyId, provider: selectedProvider,
        file_path: path, file_name: file.name, file_size: file.size, status: 'pending',
      });
      toast.success('Upload complete — processing will start shortly');
      fetchUploads();
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      setSelectedProvider(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-200">Import Memory</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-zinc-400">Upload conversation exports to help SYNC understand you better.</p>
          <div className="space-y-2">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedProvider(p.id); fileRef.current?.click(); }}
                disabled={uploading}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  selectedProvider === p.id
                    ? 'border-cyan-500/30 bg-cyan-500/5'
                    : 'border-zinc-800/30 hover:border-zinc-700/50 bg-zinc-900/40'
                )}
              >
                <p className="text-sm text-zinc-200 font-medium">{p.name}</p>
                <p className="text-xs text-zinc-500">{p.desc}</p>
              </button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept={PROVIDERS.find(p => p.id === selectedProvider)?.accept || '*'} onChange={handleUpload} className="hidden" />
          {uploads.length > 0 && (
            <div>
              <SectionLabel>Recent Imports</SectionLabel>
              <div className="space-y-1">
                {uploads.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-zinc-400 truncate">{u.file_name}</span>
                    <span className={cn('capitalize', u.status === 'completed' ? 'text-cyan-400' : 'text-zinc-500')}>{u.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function SyncStory() {
  const { user, company } = useUser();
  const [biography, setBiography] = useState(null);
  const [assumptions, setAssumptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeChapter, setActiveChapter] = useState('overview');
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({ open: false, assumption: null });
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [bioRes, assumpRes] = await Promise.all([
        db.from('user_profile_biography').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('user_profile_assumptions').select('*').eq('user_id', user.id).order('confidence', { ascending: false }),
      ]);
      if (bioRes.data) setBiography(bioRes.data);
      if (assumpRes.data) setAssumptions(assumpRes.data);
    } catch {} finally { setLoading(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co'}/functions/v1/generate-user-profile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ userId: user.id, companyId: user.company_id }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate profile');
      }
      toast.success('Profile generated');
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to generate profile');
    } finally { setGenerating(false); }
  }

  const handleConfirm = useCallback(async (a) => {
    const { error } = await db.from('user_profile_assumptions')
      .update({ status: 'confirmed', reviewed_at: new Date().toISOString() }).eq('id', a.id);
    if (error) { toast.error('Failed'); return; }
    setAssumptions(prev => prev.filter(x => x.id !== a.id));
    toast.success('Confirmed');
  }, []);

  const handleOpenReject = useCallback((a) => {
    setFeedbackModal({ open: true, assumption: a });
    setFeedbackText('');
  }, []);

  async function handleReject() {
    const a = feedbackModal.assumption;
    if (!a) return;
    const { error } = await db.from('user_profile_assumptions')
      .update({ status: 'rejected', user_feedback: feedbackText, reviewed_at: new Date().toISOString() }).eq('id', a.id);
    if (error) { toast.error('Failed'); return; }
    setAssumptions(prev => prev.filter(x => x.id !== a.id));
    setFeedbackModal({ open: false, assumption: null });
    toast.success('Correction submitted');
  }

  function renderChapter() {
    switch (activeChapter) {
      case 'overview':     return <OverviewChapter biography={biography} user={user} company={company} />;
      case 'superpowers':  return <SuperpowersChapter biography={biography} />;
      case 'work-dna':     return <WorkDNAChapter biography={biography} />;
      case 'network':      return <NetworkChapter biography={biography} />;
      case 'digital':      return <DigitalLifeChapter biography={biography} />;
      case 'clients':      return <ClientsChapter biography={biography} />;
      case 'passions':     return <PassionsChapter biography={biography} />;
      case 'rhythms':      return <RhythmsChapter biography={biography} />;
      case 'assumptions':  return <AssumptionsChapter assumptions={assumptions} onConfirm={handleConfirm} onReject={handleOpenReject} />;
      default:             return <OverviewChapter biography={biography} user={user} company={company} />;
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 py-8">
        <div className="mx-auto max-w-5xl grid lg:grid-cols-[200px_1fr] gap-8">
          <Skeleton className="h-80 rounded-lg bg-zinc-800/30 hidden lg:block" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-48 rounded bg-zinc-800/30" />
            <Skeleton className="h-64 rounded-lg bg-zinc-800/30" />
          </div>
        </div>
      </div>
    );
  }

  // No biography yet
  if (!biography) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-6 max-w-sm">
          <h2 className="text-lg font-medium text-zinc-200">SYNC hasn't built your story yet</h2>
          <p className="text-sm text-zinc-500">Generate your first profile to see how SYNC understands you.</p>
          <Button onClick={handleGenerate} disabled={generating} className="bg-cyan-600 hover:bg-cyan-500 text-white">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate My Story</>}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="min-h-screen bg-black text-zinc-200">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-lg font-medium text-zinc-200">My Story</h1>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-sm text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {generating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>

        <div className="grid lg:grid-cols-[200px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              <nav className="space-y-0.5">
                {CHAPTERS.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChapter(ch.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm transition-all border-l-2',
                      activeChapter === ch.id
                        ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700'
                    )}
                  >
                    {ch.label}
                  </button>
                ))}
              </nav>

              {/* Actions */}
              <div className="space-y-1 pt-4 border-t border-zinc-800/30">
                <button
                  onClick={() => setMemoryModalOpen(true)}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" /> Import Memory
                </button>
                <a
                  href="/DownloadApp"
                  className="w-full text-left px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" /> Desktop App
                </a>
              </div>
            </div>
          </aside>

          {/* Mobile chapter selector */}
          <div className="lg:hidden mb-4">
            <select
              value={activeChapter}
              onChange={e => setActiveChapter(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800/30 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
            >
              {CHAPTERS.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.label}</option>
              ))}
            </select>
          </div>

          {/* Content */}
          <main className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeChapter}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                {renderChapter()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Memory Import Modal */}
      <MemoryImportModal
        open={memoryModalOpen}
        onClose={() => setMemoryModalOpen(false)}
        userId={user?.id}
        companyId={user?.company_id}
      />

      {/* Rejection Feedback Modal */}
      <Dialog open={feedbackModal.open} onOpenChange={() => setFeedbackModal({ open: false, assumption: null })}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">Correct Assumption</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {feedbackModal.assumption && (
              <p className="text-sm text-zinc-400 italic">"{feedbackModal.assumption.assumption}"</p>
            )}
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="What should SYNC know instead? (optional)"
              rows={3}
              className="w-full bg-zinc-900/60 border border-zinc-800/30 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFeedbackModal({ open: false, assumption: null })} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-500 text-white">Submit Correction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
