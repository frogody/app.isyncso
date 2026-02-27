import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Sparkles, Loader2, Monitor, Users, Zap,
  Briefcase, Star, CheckCircle2, XCircle,
  Brain, Heart, Clock, Upload, Activity,
  Eye, Search, PlusCircle, RefreshCw, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useUser } from '@/components/context/UserContext';

// ─── Chapter definitions ───────────────────────────────────────────
const CHAPTERS = [
  { id: 'overview',     label: 'Overview',             icon: User },
  { id: 'superpowers',  label: 'Superpowers',          icon: Zap },
  { id: 'work-dna',     label: 'Work DNA',             icon: Briefcase },
  { id: 'social',       label: 'Social Circle',        icon: Users },
  { id: 'digital',      label: 'Digital Life',         icon: Monitor },
  { id: 'clients',      label: 'Client World',         icon: Star },
  { id: 'interests',    label: 'Interests & Passions', icon: Heart },
  { id: 'rhythms',      label: 'Daily Rhythms',        icon: Clock },
  { id: 'assumptions',  label: "SYNC's Assumptions",   icon: Brain },
  { id: 'memory',       label: 'Memory Import',        icon: Upload },
  { id: 'activity',     label: 'Activity Log',         icon: Activity },
];

const CHAPTER_TRANSITION = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.2, ease: 'easeInOut' },
};

// ─── Helpers ───────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-zinc-500" />
      </div>
      <p className="text-sm font-medium text-zinc-400 mb-1">{title}</p>
      {description && <p className="text-xs text-zinc-500 max-w-xs">{description}</p>}
    </div>
  );
}

function humanizeEventName(raw) {
  if (!raw) return 'Unknown action';
  return raw
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Chapter: Overview ─────────────────────────────────────────────
function OverviewChapter({ biography, user, company }) {
  const displayName = user?.full_name || user?.name || user?.email || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6">
        <div className="flex items-start gap-5 mb-6">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={displayName} className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/30" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-500/30 flex items-center justify-center">
              <span className="text-xl font-bold text-cyan-400">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white">{displayName}</h2>
            {biography?.tagline && <p className="text-sm text-cyan-400 mt-0.5 italic">"{biography.tagline}"</p>}
            <p className="text-xs text-zinc-500 mt-1">
              {company?.name || 'Your company'}
              {biography?.created_at && (
                <> &middot; Generated {formatDistanceToNow(new Date(biography.updated_at || biography.created_at), { addSuffix: true })}</>
              )}
            </p>
          </div>
        </div>
        {biography?.biography && (
          <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
            {biography.biography.split('\n').filter(Boolean).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Monitor, label: 'Active Apps', value: biography?.top_apps?.length || 0 },
          { icon: Users, label: 'Top Clients', value: biography?.top_clients?.length || 0 },
          { icon: Zap, label: 'Skills', value: biography?.skills?.length || 0 },
          { icon: Heart, label: 'Interests', value: biography?.interests?.length || 0 },
        ].map((s, i) => (
          <div key={i} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chapter: Superpowers ──────────────────────────────────────────
function SuperpowersChapter({ biography }) {
  const skills = biography?.skills || [];
  if (skills.length === 0) return <EmptyState icon={Zap} title="No superpowers discovered yet" description="Generate your profile to reveal your skills" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Your top skills and competencies as observed by SYNC.</p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, i) => {
          const name = typeof skill === 'string' ? skill : skill.name || skill.label || JSON.stringify(skill);
          const level = typeof skill === 'object' ? skill.level : null;
          return (
            <span key={i} className="px-3 py-1.5 text-sm font-medium rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {name}{level ? ` · ${level}` : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chapter: Work DNA ─────────────────────────────────────────────
function WorkDNAChapter({ biography }) {
  const workStyle = biography?.work_style || [];
  if (workStyle.length === 0) return <EmptyState icon={Briefcase} title="No work DNA yet" description="SYNC needs more activity data" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">How you work — your patterns, preferences, and style.</p>
      <div className="flex flex-wrap gap-2">
        {workStyle.map((item, i) => (
          <span key={i} className="px-3 py-1.5 text-sm font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {typeof item === 'string' ? item : item.label || item.name || JSON.stringify(item)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Chapter: Social Circle ────────────────────────────────────────
function SocialCircleChapter({ biography }) {
  const coworkers = biography?.top_coworkers || [];
  if (coworkers.length === 0) return <EmptyState icon={Users} title="No social circle data" description="Interact more to build your network map" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">The people you interact with most.</p>
      <div className="space-y-3">
        {coworkers.map((cw, i) => (
          <div key={i} className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-3">
            <div className="min-w-0">
              <p className="text-sm text-white truncate">{cw.name || cw.full_name || 'Unknown'}</p>
              {cw.context && <p className="text-xs text-zinc-500 truncate">{cw.context}</p>}
            </div>
            <span className="text-xs text-zinc-400 whitespace-nowrap ml-3">{cw.interaction_count || cw.interactions || 0} interactions</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chapter: Digital Life ─────────────────────────────────────────
function DigitalLifeChapter({ biography }) {
  const apps = biography?.top_apps || [];
  if (apps.length === 0) return <EmptyState icon={Monitor} title="No app data yet" description="SYNC will track your most-used tools" />;
  const maxMins = Math.max(...apps.map(a => a.avg_daily_minutes || a.daily_minutes || 0), 1);
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Your most-used applications and daily screen time.</p>
      <div className="space-y-3">
        {apps.map((app, i) => {
          const mins = app.avg_daily_minutes || app.daily_minutes || 0;
          const pct = Math.round((mins / maxMins) * 100);
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-white truncate">{app.name || app.app_name || 'Unknown'}</p>
                <span className="text-xs text-zinc-400 whitespace-nowrap ml-3">{mins} min/day</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chapter: Client World ─────────────────────────────────────────
function ClientWorldChapter({ biography }) {
  const clients = biography?.top_clients || [];
  if (clients.length === 0) return <EmptyState icon={Star} title="No client data yet" description="SYNC will learn about your key clients" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Your most-engaged clients and accounts.</p>
      <div className="space-y-3">
        {clients.map((client, i) => (
          <div key={i} className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-3">
            <div className="min-w-0">
              <p className="text-sm text-white truncate">{client.name || client.client_name || 'Unknown'}</p>
              {client.context && <p className="text-xs text-zinc-500 truncate">{client.context}</p>}
            </div>
            <span className="text-xs text-zinc-400 whitespace-nowrap ml-3">{client.interaction_count || client.interactions || 0} touches</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chapter: Interests ────────────────────────────────────────────
function InterestsChapter({ biography }) {
  const interests = biography?.interests || [];
  if (interests.length === 0) return <EmptyState icon={Heart} title="No interests discovered" description="SYNC will learn what you're passionate about" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Topics and hobbies you gravitate towards.</p>
      <div className="flex flex-wrap gap-2">
        {interests.map((item, i) => (
          <span key={i} className="px-3 py-1.5 text-sm font-medium rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
            {typeof item === 'string' ? item : item.name || JSON.stringify(item)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Chapter: Daily Rhythms ────────────────────────────────────────
function DailyRhythmsChapter({ biography }) {
  const rhythms = biography?.daily_rhythms;
  if (!rhythms || (Array.isArray(rhythms) && rhythms.length === 0))
    return <EmptyState icon={Clock} title="No rhythm data yet" description="SYNC needs more activity data to map your daily patterns" />;

  const hours = Array.isArray(rhythms)
    ? rhythms
    : typeof rhythms === 'object'
      ? Object.entries(rhythms).map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
      : [];

  if (hours.length === 0) return <EmptyState icon={Clock} title="No rhythm data yet" />;
  const maxVal = Math.max(...hours.map(h => h.activity_count || h.count || 0), 1);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Your activity patterns throughout the day.</p>
      <div className="flex items-end gap-1 h-32">
        {hours.sort((a, b) => a.hour - b.hour).map((h, i) => {
          const val = h.activity_count || h.count || 0;
          const height = Math.max((val / maxVal) * 100, 4);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${h.hour}:00 — ${val} actions`}>
              <div className="w-full bg-cyan-500/40 rounded-t" style={{ height: `${height}%` }} />
              {i % 4 === 0 && <span className="text-[10px] text-zinc-600">{h.hour}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chapter: Assumptions ──────────────────────────────────────────
function AssumptionsChapter({ assumptions, onConfirm, onReject }) {
  const active = assumptions.filter(a => a.status === 'active' || !a.status);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Review what SYNC believes about you.</p>
        <span className="text-xs text-zinc-500">{active.length} remaining</span>
      </div>
      <AnimatePresence mode="popLayout">
        {active.map(a => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-b border-zinc-800/30 pb-4 mb-4 last:border-0"
          >
            <p className="text-sm text-white mb-1">"{a.assumption}"</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {(a.category || 'general').replace('_', ' ')} &middot; {Math.round((a.confidence || 0) * 100)}% confidence
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 hover:bg-green-500/10" onClick={() => onConfirm(a)}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Yes
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:bg-red-500/10" onClick={() => onReject(a)}>
                  <XCircle className="w-3 h-3 mr-1" /> No
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {active.length === 0 && (
        <EmptyState icon={Brain} title="All caught up!" description="You've reviewed all of SYNC's assumptions" />
      )}
    </div>
  );
}

// ─── Chapter: Memory Import ────────────────────────────────────────
const PROVIDERS = [
  { id: 'chatgpt', name: 'ChatGPT', desc: 'Upload your ChatGPT data export ZIP', accept: '.zip,.json' },
  { id: 'claude', name: 'Claude', desc: 'Upload your Claude data export ZIP', accept: '.zip,.json' },
  { id: 'generic', name: 'Other', desc: 'Paste or upload any text/JSON', accept: '.json,.txt,.zip' },
];

function MemoryImportChapter({ userId, companyId }) {
  const [imports, setImports] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (userId) fetchImports();
  }, [userId]);

  async function fetchImports() {
    const { data } = await db.from('user_memory_imports').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setImports(data);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedProvider) return;
    setUploading(true);
    try {
      const path = `memory-imports/${userId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await db.storage.from('attachments').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: record, error: insertErr } = await db.from('user_memory_imports').insert({
        user_id: userId,
        company_id: companyId,
        provider: selectedProvider,
        original_filename: file.name,
        storage_path: path,
        status: 'pending',
      }).select().single();
      if (insertErr) throw insertErr;

      toast.success('File uploaded — processing started');

      // Trigger processing
      fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co'}/functions/v1/process-memory-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ importId: record.id, userId, companyId }),
      }).catch(() => {});

      setSelectedProvider(null);
      // Poll for completion
      const interval = setInterval(async () => {
        const { data: updated } = await db.from('user_memory_imports').select('*').eq('id', record.id).single();
        if (updated && updated.status !== 'pending' && updated.status !== 'processing') {
          clearInterval(interval);
          fetchImports();
          if (updated.status === 'completed') toast.success('Memory import completed!');
          else if (updated.status === 'failed') toast.error(updated.error_message || 'Import failed');
        }
      }, 3000);
      setTimeout(() => clearInterval(interval), 120000);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        Import your AI conversation history to instantly boost SYNC's understanding of you.
      </p>
      {/* Provider cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => { setSelectedProvider(p.id); fileRef.current?.click(); }}
            disabled={uploading}
            className={`text-left p-4 rounded-xl border transition-all ${
              selectedProvider === p.id
                ? 'border-cyan-500/40 bg-cyan-500/10'
                : 'border-zinc-800/50 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            <p className="text-sm font-medium text-white mb-1">{p.name}</p>
            <p className="text-xs text-zinc-500">{p.desc}</p>
          </button>
        ))}
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={PROVIDERS.find(p => p.id === selectedProvider)?.accept || '.zip,.json,.txt'}
        onChange={handleUpload}
      />
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-cyan-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Uploading and processing...
        </div>
      )}
      {/* Previous imports */}
      {imports.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Previous Imports</h4>
          {imports.map(imp => (
            <div key={imp.id} className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-white">{imp.original_filename || imp.provider}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  imp.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                  imp.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                  'bg-yellow-500/10 text-yellow-400'
                }`}>{imp.status}</span>
              </div>
              {imp.status === 'completed' && (
                <p className="text-xs text-zinc-500">
                  {imp.topics?.length || 0} topics &middot; {imp.key_facts?.length || 0} facts &middot; {imp.conversation_count || 0} conversations
                </p>
              )}
              {imp.status === 'failed' && imp.error_message && (
                <p className="text-xs text-red-400/70 mt-1">{imp.error_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chapter: Activity Log ─────────────────────────────────────────
const EVENT_ICONS = {
  page_view: Eye,
  action: Zap,
  search: Search,
  create: PlusCircle,
  update: RefreshCw,
};

function ActivityLogChapter({ userId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await db
        .from('user_activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setEvents(data);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading activity...</div>;
  if (events.length === 0) return <EmptyState icon={Activity} title="No activity logged yet" description="Browse the app to start building your activity timeline" />;

  // Group by date
  const grouped = {};
  events.forEach(ev => {
    const d = new Date(ev.created_at);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d, yyyy');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">Your recent activity within iSyncSO.</p>
      {Object.entries(grouped).map(([dateLabel, evts]) => (
        <div key={dateLabel}>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">{dateLabel}</h4>
          <div className="space-y-2">
            {evts.map(event => {
              const Icon = EVENT_ICONS[event.event_type] || Activity;
              return (
                <div key={event.id} className="flex items-center gap-3 py-2">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800/60 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{humanizeEventName(event.event_name || event.event_type)}</p>
                    {event.page_path && <p className="text-xs text-zinc-500 truncate">{event.page_path}</p>}
                  </div>
                  <span className="text-xs text-zinc-600 whitespace-nowrap">{format(new Date(event.created_at), 'HH:mm')}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function SyncProfile() {
  const { user, company } = useUser();
  const [biography, setBiography] = useState(null);
  const [assumptions, setAssumptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeChapter, setActiveChapter] = useState('overview');
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
    } catch (err) {
      // No data yet is fine
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co'}/functions/v1/generate-user-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ userId: user.id, companyId: user.company_id }),
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate profile');
      }
      toast.success('Profile generated successfully');
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to generate profile');
    } finally {
      setGenerating(false);
    }
  }

  const handleConfirmAssumption = useCallback(async (assumption) => {
    const { error } = await db
      .from('user_profile_assumptions')
      .update({ status: 'confirmed', reviewed_at: new Date().toISOString() })
      .eq('id', assumption.id);
    if (error) { toast.error('Failed to confirm'); return; }
    setAssumptions(prev => prev.filter(a => a.id !== assumption.id));
    toast.success('Assumption confirmed');
  }, []);

  const handleOpenReject = useCallback((assumption) => {
    setFeedbackModal({ open: true, assumption });
    setFeedbackText('');
  }, []);

  async function handleRejectAssumption() {
    const assumption = feedbackModal.assumption;
    if (!assumption) return;
    const { error } = await db
      .from('user_profile_assumptions')
      .update({ status: 'rejected', user_feedback: feedbackText, reviewed_at: new Date().toISOString() })
      .eq('id', assumption.id);
    if (error) { toast.error('Failed to submit correction'); return; }
    setAssumptions(prev => prev.filter(a => a.id !== assumption.id));
    setFeedbackModal({ open: false, assumption: null });
    setFeedbackText('');
    toast.success('Correction submitted');
  }

  // ─── Render ────────────────────────────────────────────────────
  const displayName = user?.full_name || user?.name || user?.email || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-[240px_1fr] gap-8">
            <Skeleton className="h-96 rounded-2xl bg-zinc-800/50 hidden lg:block" />
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-2xl bg-zinc-800/50" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-zinc-800/50" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!biography) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-24">
            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-12 max-w-md text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <User className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">SYNC hasn't built your profile yet</h2>
                <p className="text-sm text-zinc-400">Generate your first biography to see how SYNC understands you.</p>
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate My Profile</>}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  function renderChapter() {
    switch (activeChapter) {
      case 'overview':    return <OverviewChapter biography={biography} user={user} company={company} />;
      case 'superpowers': return <SuperpowersChapter biography={biography} />;
      case 'work-dna':    return <WorkDNAChapter biography={biography} />;
      case 'social':      return <SocialCircleChapter biography={biography} />;
      case 'digital':     return <DigitalLifeChapter biography={biography} />;
      case 'clients':     return <ClientWorldChapter biography={biography} />;
      case 'interests':   return <InterestsChapter biography={biography} />;
      case 'rhythms':     return <DailyRhythmsChapter biography={biography} />;
      case 'assumptions': return <AssumptionsChapter assumptions={assumptions} onConfirm={handleConfirmAssumption} onReject={handleOpenReject} />;
      case 'memory':      return <MemoryImportChapter userId={user?.id} companyId={user?.company_id} />;
      case 'activity':    return <ActivityLogChapter userId={user?.id} />;
      default:            return <OverviewChapter biography={biography} user={user} company={company} />;
    }
  }

  const currentChapter = CHAPTERS.find(c => c.id === activeChapter) || CHAPTERS[0];

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* ─── Sidebar ─────────────────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              {/* Mini profile */}
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-cyan-500/30" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                      <span className="text-sm font-bold text-cyan-400">{initials}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{displayName}</p>
                    {biography?.tagline && (
                      <p className="text-xs text-zinc-500 truncate italic">"{biography.tagline}"</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Chapter nav */}
              <nav className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-2 space-y-0.5">
                {CHAPTERS.map((ch, idx) => {
                  const isActive = activeChapter === ch.id;
                  const ChIcon = ch.icon;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChapter(ch.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all text-sm ${
                        isActive
                          ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border-l-2 border-transparent'
                      }`}
                    >
                      <span className="text-[10px] text-zinc-600 w-4 text-right">{idx + 1}</span>
                      <ChIcon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-zinc-600'}`} />
                      <span className="truncate">{ch.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Regenerate */}
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Regenerate Profile</>}
              </Button>
            </div>
          </aside>

          {/* ─── Mobile chapter bar ──────────────────────────── */}
          <div className="lg:hidden mb-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2">
              {CHAPTERS.map(ch => {
                const isActive = activeChapter === ch.id;
                const ChIcon = ch.icon;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChapter(ch.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'text-zinc-500 border-zinc-800/50 hover:text-zinc-300'
                    }`}
                  >
                    <ChIcon className="w-3 h-3" />
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Content area ────────────────────────────────── */}
          <main>
            {/* Chapter header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <currentChapter.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">{currentChapter.label}</h1>
                <p className="text-xs text-zinc-500">Chapter {CHAPTERS.findIndex(c => c.id === activeChapter) + 1} of {CHAPTERS.length}</p>
              </div>
              {/* Mobile regenerate */}
              <div className="lg:hidden ml-auto">
                <Button size="sm" onClick={handleGenerate} disabled={generating} className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs">
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeChapter} {...CHAPTER_TRANSITION}>
                {renderChapter()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* ─── Feedback Modal ────────────────────────────────── */}
      <Dialog open={feedbackModal.open} onOpenChange={open => setFeedbackModal({ open, assumption: open ? feedbackModal.assumption : null })}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Why is this wrong?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">"{feedbackModal.assumption?.assumption}"</p>
          <textarea
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            rows={4}
            placeholder="Explain why this assumption is incorrect..."
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFeedbackModal({ open: false, assumption: null })}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleRejectAssumption}>Submit Correction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
