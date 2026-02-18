import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Loader2,
  Image, Video, LayoutGrid, Type, Upload, X, Clock,
  RefreshCw, AlertTriangle, Check, Instagram, Facebook,
  Linkedin, Twitter, Music2, Globe, Youtube,
  BarChart3, FileText,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { SOCIAL_PLATFORMS, POST_STATUSES } from '@/lib/reach-constants';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Platform icon resolver
// ---------------------------------------------------------------------------
const PLATFORM_ICON_MAP = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  tiktok: Music2,
  google_analytics: BarChart3,
  youtube: Youtube,
};

const PLATFORM_COLOR_MAP = {
  instagram: 'text-pink-400',
  facebook: 'text-blue-400',
  linkedin: 'text-sky-400',
  twitter: 'text-zinc-300',
  tiktok: 'text-cyan-300',
  google_analytics: 'text-yellow-400',
  youtube: 'text-red-400',
};

function PlatformIcon({ platform, className = 'w-3.5 h-3.5' }) {
  const Icon = PLATFORM_ICON_MAP[platform] || Globe;
  const color = PLATFORM_COLOR_MAP[platform] || 'text-zinc-400';
  return <Icon className={`${className} ${color}`} />;
}

// ---------------------------------------------------------------------------
// Status dot color mapping
// ---------------------------------------------------------------------------
const STATUS_DOT_CLASS = {
  draft: 'bg-zinc-500',
  scheduled: 'bg-blue-400',
  publishing: 'bg-cyan-400',
  published: 'bg-green-400',
  partial: 'bg-amber-400',
  failed: 'bg-red-400',
};

const STATUS_BG_CLASS = {
  draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  publishing: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  published: 'bg-green-500/10 text-green-400 border-green-500/20',
  partial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  // 0 = Sunday
  return new Date(year, month, 1).getDay();
}

// Character limit per platform (first matched)
function getCharLimitForPlatforms(platforms) {
  if (!platforms || platforms.length === 0) return 2200;
  const limits = {
    twitter: 280,
    linkedin: 3000,
    instagram: 2200,
    facebook: 63206,
    tiktok: 2200,
    youtube: 5000,
  };
  for (const p of platforms) {
    if (limits[p]) return limits[p];
  }
  return 2200;
}

// ---------------------------------------------------------------------------
// Media type options
// ---------------------------------------------------------------------------
const MEDIA_TYPES = [
  { value: 'image', label: 'Image', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'carousel', label: 'Carousel', icon: LayoutGrid },
  { value: 'text_only', label: 'Text Only', icon: Type },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ReachCalendar() {
  const { user } = useUser();
  const companyId = user?.company_id;

  // State
  const [posts, setPosts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month' | 'week'
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [prefillDate, setPrefillDate] = useState(null);

  // ---------- Date range for data fetching ----------
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    // Extend range to cover calendar grid overflow (prev/next month days)
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month + 2, 0, 23, 59, 59);
    return { start, end };
  }, [currentDate]);

  // ---------- Fetch posts ----------
  const loadPosts = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reach_scheduled_posts')
        .select('*')
        .eq('company_id', companyId)
        .gte('scheduled_at', dateRange.start.toISOString())
        .lte('scheduled_at', dateRange.end.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
      toast.error('Failed to load scheduled posts');
    } finally {
      setLoading(false);
    }
  }, [companyId, dateRange]);

  // ---------- Fetch connections ----------
  const loadConnections = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('reach_social_connections')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;
      setConnections(data || []);
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  }, [companyId]);

  useEffect(() => {
    loadPosts();
    loadConnections();
  }, [loadPosts, loadConnections]);

  // ---------- Stats ----------
  const stats = useMemo(() => ({
    total: posts.length,
    draft: posts.filter((p) => p.status === 'draft').length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
    failed: posts.filter((p) => p.status === 'failed').length,
  }), [posts]);

  // ---------- Navigation ----------
  const handlePrevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };
  const handleToday = () => setCurrentDate(new Date());

  // ---------- Interactions ----------
  const handleDayClick = (date) => {
    setEditingPost(null);
    setPrefillDate(date);
    setEditorOpen(true);
  };

  const handlePostClick = (post, e) => {
    if (e) e.stopPropagation();
    setEditingPost(post);
    setPrefillDate(null);
    setEditorOpen(true);
  };

  const handleNewPost = () => {
    setEditingPost(null);
    setPrefillDate(new Date());
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingPost(null);
    setPrefillDate(null);
  };

  const handlePostSaved = (savedPost, deleted) => {
    if (deleted) {
      setPosts((prev) => prev.filter((p) => p.id !== savedPost.id));
    } else if (editingPost) {
      setPosts((prev) => prev.map((p) => (p.id === savedPost.id ? savedPost : p)));
    } else {
      setPosts((prev) => [...prev, savedPost].sort(
        (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
      ));
    }
  };

  const handleRetry = async (post, e) => {
    if (e) e.stopPropagation();
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const resp = await fetch(`${supabaseUrl}/functions/v1/reach-publish-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ post_id: post.id }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Publish failed');

      toast.success('Post re-published successfully');
      loadPosts();
    } catch (err) {
      toast.error(err.message || 'Failed to retry publish');
    }
  };

  // ======================================================================
  // RENDER
  // ======================================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 space-y-5"
    >
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <Calendar className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Content Calendar</h1>
            <p className="text-sm text-zinc-400">
              Plan and schedule your content across platforms
            </p>
          </div>
          {!loading && (
            <span className="px-2.5 py-0.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
              {stats.total} post{stats.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPosts}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleNewPost}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full bg-cyan-500 hover:bg-cyan-400 text-black transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      {/* ---- Stats bar ---- */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: 'Draft', value: stats.draft, dot: 'bg-zinc-500' },
          { label: 'Scheduled', value: stats.scheduled, dot: 'bg-blue-400' },
          { label: 'Published', value: stats.published, dot: 'bg-green-400' },
          { label: 'Failed', value: stats.failed, dot: 'bg-red-400' },
        ].map(({ label, value, dot }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-900/50 border border-zinc-800/60"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            <span className="text-zinc-500">{label}</span>
            <span className="text-zinc-300">{value}</span>
          </div>
        ))}
      </div>

      {/* ---- Calendar navigation ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-white min-w-[200px] text-center">
            {formatMonthYear(currentDate)}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="ml-2 px-3 py-1 text-xs font-medium text-zinc-400 border border-zinc-800 rounded-full hover:text-white hover:border-zinc-600 transition-colors"
          >
            Today
          </button>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-zinc-900/60 border border-zinc-800/60 rounded-full p-0.5">
          {['month', 'week'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors capitalize ${
                view === v
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              {v === 'month' ? 'Month' : 'Week'}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Calendar body ---- */}
      <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/60 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
            <p className="text-sm text-zinc-500">Loading calendar...</p>
          </div>
        ) : posts.length === 0 && view === 'month' ? (
          <EmptyState onNewPost={handleNewPost} />
        ) : view === 'month' ? (
          <MonthView
            posts={posts}
            currentDate={currentDate}
            onDayClick={handleDayClick}
            onPostClick={handlePostClick}
            onRetry={handleRetry}
          />
        ) : (
          <WeekView
            posts={posts}
            currentDate={currentDate}
            onDayClick={handleDayClick}
            onPostClick={handlePostClick}
            onRetry={handleRetry}
          />
        )}
      </div>

      {/* ---- Post Editor Dialog ---- */}
      <PostEditorDialog
        open={editorOpen}
        onClose={handleEditorClose}
        post={editingPost}
        prefillDate={prefillDate}
        connections={connections}
        companyId={companyId}
        userId={user?.id}
        onSaved={handlePostSaved}
      />
    </motion.div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================
function EmptyState({ onNewPost }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div className="p-4 rounded-2xl bg-zinc-800/40 mb-4">
        <Calendar className="w-12 h-12 text-zinc-600" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-300 mb-1">No posts scheduled</h3>
      <p className="text-sm text-zinc-500 mb-5 text-center max-w-sm">
        Start planning your content by creating your first post.
        Click any day on the calendar or use the button below.
      </p>
      <button
        onClick={onNewPost}
        className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-full bg-cyan-500 hover:bg-cyan-400 text-black transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create your first post
      </button>
    </div>
  );
}

// ============================================================================
// MONTH VIEW
// ============================================================================
function MonthView({ posts, currentDate, onDayClick, onPostClick, onRetry }) {
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // Build 6-row grid
  const prevMonthDays = getDaysInMonth(year, month - 1);
  const cells = [];

  // Previous month overflow
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, inMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: new Date(year, month, d) });
  }
  // Next month overflow
  const remaining = 42 - cells.length; // 6 rows x 7
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
  }

  // Group posts by date string
  const postsByDate = useMemo(() => {
    const map = {};
    posts.forEach((p) => {
      if (!p.scheduled_at) return;
      const key = new Date(p.scheduled_at).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [posts]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-zinc-800/60">
        {dayNames.map((name) => (
          <div key={name} className="py-2.5 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const isToday = isSameDay(cell.date, today);
          const dayPosts = postsByDate[cell.date.toDateString()] || [];
          const row = Math.floor(idx / 7);
          const isLastRow = row === 5;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay: idx * 0.004 }}
              onClick={() => onDayClick(cell.date)}
              className={`
                group relative min-h-[100px] p-1.5 border-b border-r border-zinc-800/40 cursor-pointer
                transition-colors hover:bg-zinc-800/30
                ${!cell.inMonth ? 'bg-zinc-900/20' : ''}
                ${isToday ? 'ring-1 ring-inset ring-cyan-500/40 bg-cyan-500/5' : ''}
                ${idx % 7 === 0 ? 'border-l-0' : ''}
                ${isLastRow ? 'border-b-0' : ''}
              `}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`
                    text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-cyan-500 text-black' : cell.inMonth ? 'text-zinc-300' : 'text-zinc-600'}
                  `}
                >
                  {cell.day}
                </span>
                {dayPosts.length > 0 && (
                  <span className="text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {dayPosts.length} post{dayPosts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Post indicators */}
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <button
                    key={post.id}
                    onClick={(e) => onPostClick(post, e)}
                    className={`
                      w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate
                      transition-colors hover:brightness-125
                      ${STATUS_BG_CLASS[post.status] || 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'}
                      border
                    `}
                    title={post.caption ? post.caption.substring(0, 80) : 'Untitled post'}
                  >
                    {post.platforms?.length > 0 && (
                      <PlatformIcon platform={post.platforms[0]} className="w-2.5 h-2.5 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {post.caption ? post.caption.substring(0, 25) : 'Untitled'}
                    </span>
                    {post.status === 'failed' && (
                      <AlertTriangle className="w-2.5 h-2.5 text-red-400 flex-shrink-0 ml-auto" />
                    )}
                  </button>
                ))}
                {dayPosts.length > 3 && (
                  <div className="text-[10px] text-zinc-500 pl-1.5">
                    +{dayPosts.length - 3} more
                  </div>
                )}
              </div>

              {/* Status dots row */}
              {dayPosts.length > 0 && (
                <div className="flex items-center gap-0.5 mt-1">
                  {dayPosts.map((p) => (
                    <span
                      key={p.id}
                      className={`w-1 h-1 rounded-full ${STATUS_DOT_CLASS[p.status] || 'bg-zinc-600'}`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// WEEK VIEW
// ============================================================================
function WeekView({ posts, currentDate, onDayClick, onPostClick, onRetry }) {
  const today = new Date();

  // Get Monday of current week
  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const monday = getMonday(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getPostsForDay = (date) =>
    posts.filter((p) => p.scheduled_at && isSameDay(new Date(p.scheduled_at), date));

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-4 space-y-2">
      {weekDays.map((date, i) => {
        const dayPosts = getPostsForDay(date);
        const isToday = isSameDay(date, today);

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: i * 0.03 }}
            onClick={() => onDayClick(date)}
            className={`
              flex items-start gap-4 p-3 rounded-xl border cursor-pointer transition-all
              ${isToday
                ? 'bg-cyan-500/5 border-cyan-500/20'
                : 'bg-zinc-900/30 border-zinc-800/30 hover:border-zinc-700/50'
              }
            `}
          >
            {/* Day label */}
            <div className="w-16 flex-shrink-0 text-center">
              <div className="text-[11px] font-medium text-zinc-500">{dayNames[i]}</div>
              <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-cyan-400' : 'text-zinc-300'}`}>
                {date.getDate()}
              </div>
            </div>

            {/* Posts */}
            <div className="flex-1 min-w-0">
              {dayPosts.length > 0 ? (
                <div className="space-y-1.5">
                  {dayPosts.map((post) => {
                    const time = post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <button
                        key={post.id}
                        onClick={(e) => onPostClick(post, e)}
                        className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg border bg-zinc-800/30 border-zinc-800/40 hover:border-zinc-700 transition-all"
                      >
                        <span className="text-[11px] font-mono text-zinc-500 w-14 flex-shrink-0">
                          {time}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">
                            {post.caption ? post.caption.substring(0, 60) : 'Untitled'}
                          </p>
                          {post.media_type && post.media_type !== 'text_only' && (
                            <span className="text-[10px] text-zinc-500 capitalize">{post.media_type}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {post.platforms?.map((p) => (
                            <PlatformIcon key={p} platform={p} className="w-3 h-3" />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT_CLASS[post.status] || 'bg-zinc-600'}`} />
                          {post.status === 'failed' && (
                            <button
                              onClick={(e) => onRetry(post, e)}
                              className="text-[10px] text-red-400 hover:text-red-300 underline"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-2 text-xs text-zinc-600">No posts scheduled</div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================================
// POST EDITOR DIALOG
// ============================================================================
function PostEditorDialog({
  open, onClose, post, prefillDate, connections, companyId, userId, onSaved,
}) {
  const [caption, setCaption] = useState('');
  const [mediaUrls, setMediaUrls] = useState([]);
  const [mediaType, setMediaType] = useState('text_only');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const isEditing = !!post;

  // Initialize form when opening
  useEffect(() => {
    if (open) {
      if (post) {
        setCaption(post.caption || '');
        setMediaUrls(post.media_urls || []);
        setMediaType(post.media_type || 'text_only');
        setSelectedPlatforms(post.platforms || []);
        setStatus(post.status || 'draft');
        if (post.scheduled_at) {
          const d = new Date(post.scheduled_at);
          setScheduledDate(d.toISOString().split('T')[0]);
          setScheduledTime(d.toTimeString().substring(0, 5));
        }
      } else {
        setCaption('');
        setMediaUrls([]);
        setMediaType('text_only');
        setSelectedPlatforms([]);
        setStatus('draft');
        if (prefillDate) {
          setScheduledDate(prefillDate.toISOString().split('T')[0]);
          setScheduledTime('12:00');
        } else {
          setScheduledDate(new Date().toISOString().split('T')[0]);
          setScheduledTime('12:00');
        }
      }
    }
  }, [open, post, prefillDate]);

  const charLimit = getCharLimitForPlatforms(selectedPlatforms);
  const charCount = caption.length;
  const charOver = charCount > charLimit;

  // Available platforms from active connections
  const availablePlatforms = useMemo(() => {
    const unique = [...new Set(connections.map((c) => c.platform))];
    return unique.filter((p) => SOCIAL_PLATFORMS[p]);
  }, [connections]);

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  // Media upload
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newUrls = [];
      for (const file of files) {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `reach/${companyId}/${Date.now()}_${sanitizedName}`;
        const { data, error } = await supabase.storage
          .from('generated-content')
          .upload(path, file, { upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('generated-content')
          .getPublicUrl(path);

        newUrls.push(publicUrl);
      }
      setMediaUrls((prev) => [...prev, ...newUrls]);

      // Auto-detect media type
      if (files[0].type.startsWith('video/')) {
        setMediaType('video');
      } else if (files.length > 1 || mediaUrls.length > 0) {
        setMediaType('carousel');
      } else {
        setMediaType('image');
      }

      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeMedia = (index) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
    if (mediaUrls.length <= 1) {
      setMediaType('text_only');
    }
  };

  // Save post
  const handleSave = async (saveStatus) => {
    if (!caption.trim()) {
      toast.error('Caption is required');
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }
    if (!scheduledDate) {
      toast.error('Select a date');
      return;
    }

    setSaving(true);
    const finalStatus = saveStatus || status;

    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

      const payload = {
        company_id: companyId,
        created_by: userId,
        caption: caption.trim(),
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        media_type: mediaType,
        platforms: selectedPlatforms,
        scheduled_at: scheduledAt,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (isEditing) {
        const { data, error } = await supabase
          .from('reach_scheduled_posts')
          .update(payload)
          .eq('id', post.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
        toast.success('Post updated');
      } else {
        const { data, error } = await supabase
          .from('reach_scheduled_posts')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        result = data;
        toast.success(finalStatus === 'scheduled' ? 'Post scheduled' : 'Draft saved');
      }

      onSaved(result, false);
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      toast.error(err.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  // Delete post
  const handleDelete = async () => {
    if (!isEditing) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('reach_scheduled_posts')
        .delete()
        .eq('id', post.id);
      if (error) throw error;

      toast.success('Post deleted');
      onSaved(post, true);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Edit Post' : 'New Post'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
          {/* Caption */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your post caption..."
              rows={4}
              className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <span className={`text-[11px] ${charOver ? 'text-red-400' : 'text-zinc-500'}`}>
                {charCount} / {charLimit}
              </span>
              {selectedPlatforms.length > 0 && (
                <span className="text-[11px] text-zinc-600">
                  (limit for {selectedPlatforms[0]})
                </span>
              )}
            </div>
          </div>

          {/* Media upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Media</label>

            {/* Preview existing media */}
            {mediaUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-zinc-700">
                    {url.match(/\.(mp4|mov|webm)/i) ? (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <Video className="w-6 h-6 text-zinc-500" />
                      </div>
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => removeMedia(i)}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 w-full rounded-lg border border-dashed border-zinc-700 text-sm text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Uploading...' : 'Upload Media'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Media type */}
            <div className="flex gap-1.5">
              {MEDIA_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setMediaType(value)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                    mediaType === value
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                      : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform multi-select */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Platforms</label>
            {availablePlatforms.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {availablePlatforms.map((platform) => {
                  const meta = SOCIAL_PLATFORMS[platform];
                  const selected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        selected
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                          : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                      }`}
                    >
                      <PlatformIcon platform={platform} className="w-3.5 h-3.5" />
                      {meta?.name || platform}
                      {selected && <Check className="w-3 h-3 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-zinc-800/60 bg-zinc-900/30">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-300">No connected accounts</p>
                  <p className="text-[11px] text-zinc-500">
                    Connect accounts in{' '}
                    <span className="text-cyan-400 cursor-pointer hover:underline">
                      Reach Settings
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Schedule</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
                />
              </div>
              <div className="w-32">
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Status</label>
            <div className="flex gap-2">
              {['draft', 'scheduled'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors capitalize ${
                    status === s
                      ? s === 'scheduled'
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                        : 'bg-zinc-700/30 border-zinc-600 text-zinc-300'
                      : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_CLASS[s]}`} />
                  {POST_STATUSES[s]?.label || s}
                </button>
              ))}
            </div>
          </div>

          {/* Error log (for failed posts) */}
          {isEditing && post.status === 'failed' && post.error_log && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-medium text-red-400">Publish Error</span>
              </div>
              <p className="text-[11px] text-red-300/80 break-all">
                {typeof post.error_log === 'string'
                  ? post.error_log
                  : JSON.stringify(post.error_log, null, 2)}
              </p>
            </div>
          )}

          {/* Platform statuses (for published/partial posts) */}
          {isEditing && post.platform_statuses && Object.keys(post.platform_statuses).length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Platform Results</label>
              <div className="space-y-1">
                {Object.entries(post.platform_statuses).map(([platform, result]) => (
                  <div key={platform} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={platform} className="w-4 h-4" />
                      <span className="text-xs text-zinc-300">{SOCIAL_PLATFORMS[platform]?.name || platform}</span>
                    </div>
                    <span className={`text-[11px] font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                      {result.success ? 'Published' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
          <div>
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors flex items-center gap-1.5"
            >
              {saving && status === 'draft' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
              Save Draft
            </button>
            <button
              onClick={() => handleSave('scheduled')}
              disabled={saving || charOver}
              className="px-4 py-2 text-xs font-medium rounded-full bg-cyan-500 hover:bg-cyan-400 text-black transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && status === 'scheduled' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
              Schedule
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
