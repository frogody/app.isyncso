import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Calendar, Loader2, Search,
  Linkedin, Twitter, Instagram, Facebook,
  Sun, Moon, BookOpen, Filter, RefreshCw,
} from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { CreatePageTransition } from '@/components/create/ui';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

import { CalendarGrid, CalendarNav, PostComposer, JournalToPostModal } from '@/components/create/calendar';

const PLATFORM_FILTERS = [
  { value: 'all', label: 'All Platforms', icon: null },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-400' },
  { value: 'twitter', label: 'X', icon: Twitter, color: 'text-zinc-300' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-400' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-indigo-400' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
];

export default function ContentCalendar() {
  const { theme, toggleTheme, ct } = useTheme();
  const { user } = useUser();
  const navigate = useNavigate();

  // State
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);

  // Compute date range for the current month view
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    return { start, end };
  }, [currentDate]);

  // Load posts
  const loadPosts = useCallback(async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_calendar_posts')
        .select('*')
        .eq('company_id', user.company_id)
        .gte('scheduled_at', dateRange.start.toISOString())
        .lte('scheduled_at', dateRange.end.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load calendar posts');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, dateRange]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    let result = posts;

    if (filterPlatform !== 'all') {
      result = result.filter(
        (p) => Array.isArray(p.platforms) && p.platforms.includes(filterPlatform)
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }

    return result;
  }, [posts, filterPlatform, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: posts.length,
      draft: posts.filter((p) => p.status === 'draft').length,
      scheduled: posts.filter((p) => p.status === 'scheduled').length,
      published: posts.filter((p) => p.status === 'published').length,
    };
  }, [posts]);

  // Navigation
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Interactions
  const handleDayClick = (date) => {
    setSelectedPost(null);
    setSelectedDate(date);
    setComposerOpen(true);
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setSelectedDate(null);
    setComposerOpen(true);
  };

  const handleComposerSave = (result) => {
    if (result === null) {
      // Deleted
      setPosts((prev) => prev.filter((p) => p.id !== selectedPost?.id));
    } else if (selectedPost) {
      // Updated
      setPosts((prev) => prev.map((p) => (p.id === result.id ? result : p)));
    } else {
      // Created - check if in current month range
      const scheduledAt = new Date(result.scheduled_at);
      if (
        scheduledAt >= dateRange.start &&
        scheduledAt <= dateRange.end
      ) {
        setPosts((prev) => [...prev, result]);
      }
    }
  };

  const handleJournalInsert = (text, platform) => {
    setSelectedPost(null);
    setSelectedDate(new Date());
    // We'll open the composer with pre-filled content
    // Use a small delay so the journal modal closes first
    setTimeout(() => {
      setComposerOpen(true);
    }, 100);
    toast.success('Journal content ready - paste into your new post');
  };

  return (
    <CreatePageTransition>
      <div className={`min-h-screen ${ct('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">

          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(createPageUrl('Create'))}
                className={`flex items-center gap-1.5 text-sm ${ct('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4" />
                Create Studio
              </button>
              <div className={`w-px h-5 ${ct('bg-slate-200', 'bg-zinc-800')}`} />
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <Calendar className="w-4 h-4 text-yellow-400" />
                </div>
                <h1 className={`text-lg font-semibold ${ct('text-slate-900', 'text-white')}`}>
                  Content Calendar
                </h1>
                {!loading && (
                  <span className="px-2 py-0.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                    {stats.total} posts
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Journal to Post button */}
              <button
                onClick={() => setJournalModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full border transition-colors ${ct(
                  'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
                  'bg-zinc-900/50 border-zinc-800/60 text-zinc-300 hover:border-zinc-700'
                )}`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">From Journal</span>
              </button>

              {/* Refresh */}
              <button
                onClick={loadPosts}
                className={`p-2 rounded-full ${ct(
                  'text-slate-500 hover:bg-slate-100',
                  'text-zinc-400 hover:bg-zinc-800'
                )} transition-colors`}
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className={ct(
                  'p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200',
                  'p-2 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                )}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {/* New Post button */}
              <button
                onClick={() => {
                  setSelectedPost(null);
                  setSelectedDate(new Date());
                  setComposerOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full bg-yellow-400 hover:bg-yellow-300 text-black transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Post
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-3">
            {[
              { label: 'Drafts', value: stats.draft, color: ct('text-slate-600', 'text-zinc-400') },
              { label: 'Scheduled', value: stats.scheduled, color: 'text-yellow-400' },
              { label: 'Published', value: stats.published, color: 'text-green-400' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${ct(
                  'bg-white border-slate-200',
                  'bg-zinc-900/50 border-zinc-800/60'
                )} border`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  label === 'Drafts'
                    ? ct('bg-slate-400', 'bg-zinc-500')
                    : label === 'Scheduled'
                    ? 'bg-yellow-400'
                    : 'bg-green-400'
                }`} />
                <span className={ct('text-slate-500', 'text-zinc-500')}>{label}</span>
                <span className={color}>{value}</span>
              </div>
            ))}
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Platform filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {PLATFORM_FILTERS.map((filter) => {
                const isActive = filterPlatform === filter.value;
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.value}
                    onClick={() => setFilterPlatform(filter.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      isActive
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        : ct(
                            'bg-white border-slate-200 text-slate-500 hover:text-slate-600 hover:border-slate-300',
                            'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
                          )
                    }`}
                  >
                    {Icon && <Icon className={`w-3 h-3 ${isActive ? 'text-yellow-400' : (filter.color || '')}`} />}
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className={`hidden sm:block w-px h-5 ${ct('bg-slate-200', 'bg-zinc-800')}`} />

            {/* Status filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_FILTERS.map((filter) => {
                const isActive = filterStatus === filter.value;
                return (
                  <button
                    key={filter.value}
                    onClick={() => setFilterStatus(filter.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      isActive
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        : ct(
                            'bg-white border-slate-200 text-slate-500 hover:text-slate-600 hover:border-slate-300',
                            'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
                          )
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Navigation */}
          <CalendarNav
            currentDate={currentDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
            view={view}
            onViewChange={setView}
          />

          {/* Calendar Content */}
          <div className={`rounded-[20px] ${ct('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border p-4`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-yellow-400 animate-spin mb-3" />
                <p className={`text-sm ${ct('text-slate-500', 'text-zinc-500')}`}>Loading calendar...</p>
              </div>
            ) : view === 'month' ? (
              <CalendarGrid
                posts={filteredPosts}
                currentDate={currentDate}
                onDayClick={handleDayClick}
                onPostClick={handlePostClick}
              />
            ) : (
              /* Week view - simplified list for now */
              <WeekView
                posts={filteredPosts}
                currentDate={currentDate}
                onDayClick={handleDayClick}
                onPostClick={handlePostClick}
                ct={ct}
              />
            )}
          </div>
        </div>

        {/* Post Composer Modal */}
        <PostComposer
          open={composerOpen}
          onClose={() => {
            setComposerOpen(false);
            setSelectedPost(null);
            setSelectedDate(null);
          }}
          post={selectedPost}
          defaultDate={selectedDate}
          onSave={handleComposerSave}
        />

        {/* Journal to Post Modal */}
        <JournalToPostModal
          open={journalModalOpen}
          onClose={() => setJournalModalOpen(false)}
          onInsert={handleJournalInsert}
        />
      </div>
    </CreatePageTransition>
  );
}

// Week view component (renders 7 days starting from Monday of the current week)
function WeekView({ posts, currentDate, onDayClick, onPostClick, ct }) {
  const today = new Date();

  // Get Monday of the current week
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

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const getPostsForDay = (date) => {
    return posts.filter((p) => {
      if (!p.scheduled_at) return false;
      return isSameDay(new Date(p.scheduled_at), date);
    });
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-2">
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
            className={`flex items-start gap-4 p-3 rounded-xl border cursor-pointer transition-all ${
              isToday
                ? ct('bg-yellow-50/50 border-yellow-200', 'bg-yellow-500/5 border-yellow-500/20')
                : ct(
                    'bg-slate-50/50 border-slate-100 hover:border-slate-200',
                    'bg-zinc-900/30 border-zinc-800/30 hover:border-zinc-700/50'
                  )
            }`}
          >
            {/* Day label */}
            <div className="w-16 flex-shrink-0 text-center">
              <div className={`text-[11px] font-medium ${ct('text-slate-500', 'text-zinc-500')}`}>
                {dayNames[i]}
              </div>
              <div
                className={`text-lg font-bold mt-0.5 ${
                  isToday
                    ? 'text-yellow-400'
                    : ct('text-slate-700', 'text-zinc-300')
                }`}
              >
                {date.getDate()}
              </div>
            </div>

            {/* Posts for the day */}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onPostClick(post);
                        }}
                        className={`w-full text-left flex items-center gap-3 p-2 rounded-lg border transition-all ${ct(
                          'bg-white border-slate-200 hover:border-slate-300',
                          'bg-zinc-800/30 border-zinc-800/40 hover:border-zinc-700'
                        )}`}
                      >
                        <span className={`text-[11px] font-mono ${ct('text-slate-400', 'text-zinc-500')} w-14 flex-shrink-0`}>
                          {time}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${ct('text-slate-700', 'text-zinc-200')} truncate`}>
                            {post.title || 'Untitled'}
                          </p>
                          <p className={`text-xs ${ct('text-slate-400', 'text-zinc-500')} truncate`}>
                            {post.body?.substring(0, 60)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.isArray(post.platforms) && post.platforms.map((p) => {
                            const icons = { linkedin: Linkedin, twitter: Twitter, instagram: Instagram, facebook: Facebook };
                            const colors = { linkedin: 'text-blue-400', twitter: 'text-zinc-400', instagram: 'text-pink-400', facebook: 'text-indigo-400' };
                            const Icon = icons[p];
                            if (!Icon) return null;
                            return <Icon key={p} className={`w-3 h-3 ${colors[p]}`} />;
                          })}
                        </div>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          post.status === 'published' ? 'bg-green-400' :
                          post.status === 'scheduled' ? 'bg-yellow-400' :
                          post.status === 'failed' ? 'bg-red-400' :
                          ct('bg-slate-300', 'bg-zinc-600')
                        }`} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={`py-2 text-xs ${ct('text-slate-400', 'text-zinc-600')}`}>
                  No posts scheduled
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
