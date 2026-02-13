import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Calendar, Clock, Zap, Target, Monitor, TrendingUp,
  RefreshCw, Loader2, Sparkles, ChevronRight, Activity, Brain,
  FileText, CheckCircle2, LightbulbIcon, CalendarDays, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SyncViewSelector } from '@/components/sync/ui';
import InfoCard from '@/components/shared/InfoCard';
import { createPageUrl } from "@/utils";

export default function DailyJournal() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [journals, setJournals] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [generatingJournal, setGeneratingJournal] = useState(false);
  const [dayLogs, setDayLogs] = useState({ commitments: [], categories: {} });

  useEffect(() => {
    loadData();
  }, []);

  // Fetch activity logs when a journal is selected to get commitments & categories
  useEffect(() => {
    if (!selectedJournal?.journal_date || !user?.id) {
      setDayLogs({ commitments: [], categories: {} });
      return;
    }
    const fetchDayLogs = async () => {
      try {
        const { data: logs } = await db.from('desktop_activity_logs')
          .select('commitments, semantic_category, total_minutes, app_breakdown')
          .eq('user_id', user.id)
          .gte('hour_start', `${selectedJournal.journal_date}T00:00:00`)
          .lt('hour_start', `${selectedJournal.journal_date}T23:59:59`);

        if (!logs || logs.length === 0) {
          setDayLogs({ commitments: [], categories: {} });
          return;
        }

        // Extract and deduplicate commitments
        const allCommitments = [];
        const seen = new Set();
        logs.forEach(log => {
          if (!log.commitments) return;
          try {
            const parsed = typeof log.commitments === 'string' ? JSON.parse(log.commitments) : log.commitments;
            const items = Array.isArray(parsed) ? parsed : [parsed];
            items.forEach(c => {
              const key = c.description || c.title || c.text || (typeof c === 'string' ? c : '');
              if (key && !seen.has(key)) {
                seen.add(key);
                allCommitments.push({ ...c, _display: key });
              }
            });
          } catch {}
        });

        // Derive categories from app_breakdown (most reliable), fallback to semantic_category
        const categories = {};
        logs.forEach(log => {
          if (log.app_breakdown && Array.isArray(log.app_breakdown) && log.app_breakdown.length > 0) {
            log.app_breakdown.forEach(item => {
              const cat = item.category || 'Other';
              const mins = item.minutes || 0;
              if (mins > 0) {
                categories[cat] = (categories[cat] || 0) + mins;
              }
            });
          } else if (log.semantic_category && log.semantic_category !== 'other') {
            try {
              const parsed = JSON.parse(log.semantic_category);
              if (typeof parsed === 'object' && parsed !== null) {
                Object.entries(parsed).forEach(([cat, mins]) => {
                  categories[cat] = (categories[cat] || 0) + (mins || 0);
                });
              } else {
                categories[log.semantic_category] = (categories[log.semantic_category] || 0) + (log.total_minutes || 1);
              }
            } catch {
              categories[log.semantic_category] = (categories[log.semantic_category] || 0) + (log.total_minutes || 1);
            }
          }
        });

        setDayLogs({ commitments: allCommitments, categories });
      } catch (err) {
        console.error('Failed to fetch day logs:', err);
      }
    };
    fetchDayLogs();
  }, [selectedJournal?.journal_date, user?.id]);

  const loadData = async () => {
    try {
      const userData = await db.auth.me();
      setUser(userData);

      // Fetch last 30 days of journals
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      const { data: journalData, error: journalError } = await db.from('daily_journals')
        .select('*')
        .eq('user_id', userData.id)
        .gte('journal_date', startDate.toISOString().split('T')[0])
        .lte('journal_date', endDate.toISOString().split('T')[0])
        .order('journal_date', { ascending: false });

      if (journalError) throw journalError;
      setJournals(journalData || []);

      // Auto-select today's or most recent journal
      if (journalData && journalData.length > 0) {
        setSelectedJournal(journalData[0]);
      }

    } catch (error) {
      console.error('Failed to load journals:', error);
      toast.error('Failed to load journals');
    } finally {
      setLoading(false);
    }
  };

  const generateJournal = async (date = new Date()) => {
    if (!user?.id) {
      toast.error('Please log in to generate journals');
      return;
    }

    setGeneratingJournal(true);
    try {
      // Use hardcoded URL to avoid environment variable issues
      const supabaseUrl = 'https://sfxpmzicgpaxfntqleig.supabase.co';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-daily-journal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            company_id: user.company_id,
            date: date.toISOString(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'No activity data for this date') {
          toast.error('No activity data available for this date. The desktop app needs to sync some hourly data first.');
        } else {
          toast.error(result.error || 'Failed to generate journal');
        }
        return;
      }

      toast.success(`Journal generated for ${result.date}${result.ai_generated ? ' with AI insights' : ''}`);

      // Immediately update UI with the returned journal
      if (result.journal) {
        setJournals(prev => {
          // Remove existing journal for same date if exists
          const filtered = prev.filter(j => j.journal_date !== result.journal.journal_date);
          // Add new journal at the beginning
          return [result.journal, ...filtered];
        });
        // Select the new journal immediately
        setSelectedJournal(result.journal);
      }

      // Also do a full refresh to ensure sync
      await loadData();
    } catch (error) {
      console.error('Error generating journal:', error);
      toast.error('Failed to generate journal');
    } finally {
      setGeneratingJournal(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const formatJournalDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const isToday = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="h-[calc(100dvh-3.5rem)] bg-black p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full bg-zinc-800 rounded-xl" />
          <div className="flex gap-4">
            <Skeleton className="h-[400px] w-64 bg-zinc-800 rounded-xl" />
            <Skeleton className="h-[400px] flex-1 bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] bg-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-900/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-cyan-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 h-[calc(100dvh-3.5rem)] flex flex-col px-4 lg:px-6 py-3">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/20">
                <BookOpen className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Daily Journals</h1>
                <p className="text-zinc-500 text-xs">AI-generated daily activity reports</p>
              </div>
            </div>
            <SyncViewSelector />
          </div>
        </motion.div>

        {/* Privacy Notice */}
        <div className="shrink-0">
          <InfoCard
            title="Your activity is private"
            icon={Shield}
            learnMoreUrl={createPageUrl('PrivacyAIAct')}
            className="bg-emerald-500/10 border-emerald-500/20"
          >
            Your employer cannot see your activity data. This is your personal productivity tool, protected by design and by law.
          </InfoCard>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Sidebar - Journal History */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-72 flex-shrink-0 flex flex-col rounded-xl bg-zinc-900/50 border border-zinc-800/60 overflow-hidden"
          >
            <div className="p-3 border-b border-zinc-800/60">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Journal History
              </h3>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {journals.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">No journals yet</p>
                    <p className="text-xs text-zinc-600 mt-1">Generate your first journal below</p>
                  </div>
                ) : (
                  journals.map((journal) => (
                    <button
                      key={journal.id}
                      onClick={() => setSelectedJournal(journal)}
                      className={`w-full text-left p-2 rounded-lg transition-all ${
                        selectedJournal?.id === journal.id
                          ? 'bg-cyan-500/10 border border-cyan-500/30'
                          : 'hover:bg-zinc-800/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${
                          selectedJournal?.id === journal.id ? 'text-cyan-300' : 'text-zinc-200'
                        }`}>
                          {formatJournalDate(journal.journal_date)}
                        </span>
                        {isToday(journal.journal_date) && (
                          <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-[10px] px-1">
                            Today
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>{formatDuration(journal.total_active_minutes)}</span>
                        <span className="flex items-center gap-1">
                          <Target className="w-2.5 h-2.5" />
                          {Math.round((journal.productivity_score || 0) * 100)}%
                        </span>
                        {journal.ai_generated && (
                          <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Generate Button */}
            <div className="p-3 border-t border-zinc-800/60">
              <Button
                onClick={() => generateJournal(new Date())}
                disabled={generatingJournal}
                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20"
              >
                {generatingJournal ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Today's Journal
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Main Journal Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto rounded-xl bg-zinc-900/50 border border-zinc-800/60"
          >
            {selectedJournal ? (
              <div className="p-6">
                {/* Journal Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100">
                      {formatFullDate(selectedJournal.journal_date)}
                    </h2>
                    <div className="flex items-center gap-3 mt-2 text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {formatDuration(selectedJournal.total_active_minutes)} active
                      </span>
                      {selectedJournal.ai_generated && (
                        <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Enhanced
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-zinc-100">
                      {Math.round((selectedJournal.productivity_score || 0) * 100)}%
                    </div>
                    <div className="text-xs text-zinc-500">Productivity</div>
                  </div>
                </div>

                {/* Overview */}
                {selectedJournal.overview && (
                  <div className="mb-6">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {selectedJournal.overview}
                    </p>
                  </div>
                )}

                {/* Weekly Context */}
                {selectedJournal.weekly_context && (
                  <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-medium text-blue-300">Weekly Context</span>
                    </div>
                    <p className="text-xs text-blue-200/80">{selectedJournal.weekly_context}</p>
                  </div>
                )}

                {/* Summary Points */}
                {selectedJournal.summary_points && selectedJournal.summary_points.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Summary Points
                    </h3>
                    <ul className="space-y-2">
                      {selectedJournal.summary_points.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                          <span className="text-green-400 mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timeline Narrative */}
                {selectedJournal.timeline_narrative && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      Timeline of the Day
                    </h3>
                    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {selectedJournal.timeline_narrative}
                      </p>
                    </div>
                  </div>
                )}

                {/* Communications */}
                {selectedJournal.communications && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      Communications
                    </h3>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-blue-200/90 leading-relaxed whitespace-pre-wrap">
                        {selectedJournal.communications}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {selectedJournal.action_items && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      Action Items & Follow-ups
                    </h3>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-200/90 leading-relaxed whitespace-pre-wrap">
                        {selectedJournal.action_items}
                      </p>
                    </div>
                  </div>
                )}

                {/* Observations */}
                {selectedJournal.personal_notes && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                      <LightbulbIcon className="w-4 h-4 text-zinc-400" />
                      Observations
                    </h3>
                    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {selectedJournal.personal_notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Commitments Detected */}
                {dayLogs.commitments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-400" />
                      Commitments Detected
                      <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[10px] ml-1">
                        {dayLogs.commitments.length}
                      </Badge>
                    </h3>
                    <div className="space-y-2">
                      {dayLogs.commitments.map((c, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                          <p className="text-xs text-amber-200/90">{c._display}</p>
                          {(c.status || c.due_date) && (
                            <div className="flex items-center gap-2 mt-1.5">
                              {c.status && (
                                <Badge className="bg-zinc-800/50 text-zinc-400 border-zinc-700/50 text-[10px]">
                                  {c.status}
                                </Badge>
                              )}
                              {c.due_date && (
                                <span className="text-[10px] text-zinc-500">Due: {c.due_date}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Semantic Categories */}
                {Object.keys(dayLogs.categories).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-cyan-400" />
                      Work Categories
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(dayLogs.categories)
                        .sort(([,a], [,b]) => b - a)
                        .filter(([cat]) => cat !== 'other')
                        .map(([category, mins]) => {
                          const label = category.charAt(0).toUpperCase() + category.slice(1);
                          const h = Math.floor(mins / 60);
                          const m = Math.round(mins % 60);
                          const dur = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
                          return (
                            <Badge key={category} className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 text-xs">
                              {label} ({dur})
                            </Badge>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Highlights */}
                  {selectedJournal.highlights && selectedJournal.highlights.length > 0 && (
                    <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                      <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Highlights
                      </h4>
                      <ul className="space-y-1.5">
                        {selectedJournal.highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                            <span className="text-amber-400 mt-0.5">•</span>
                            {typeof highlight === 'string' ? highlight : highlight.description || highlight.type}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Top Apps */}
                  {selectedJournal.top_apps && selectedJournal.top_apps.length > 0 && (
                    <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                      <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5 text-blue-400" />
                        Top Apps
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJournal.top_apps.map((app, idx) => (
                          <Badge
                            key={idx}
                            className="bg-zinc-700/50 text-zinc-300 border-zinc-600/50 text-[10px] px-1.5 py-0.5"
                          >
                            {typeof app === 'string' ? app : app.name || app.app}
                            {typeof app === 'object' && app.minutes && (
                              <span className="ml-1 text-zinc-500">{app.minutes}m</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Focus Areas */}
                  {selectedJournal.focus_areas && selectedJournal.focus_areas.length > 0 && (
                    <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30 md:col-span-2">
                      <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-green-400" />
                        Focus Areas
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJournal.focus_areas.map((area, idx) => (
                          <Badge
                            key={idx}
                            className="bg-cyan-500/10 text-cyan-300/80 border-cyan-500/25 text-[10px] px-1.5 py-0.5"
                          >
                            {typeof area === 'string'
                              ? area
                              : `${area.category || area.name || 'Unknown'}: ${area.percentage || 0}%`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-200 mb-2">No Journal Selected</h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    Select a journal from the sidebar or generate today's journal to see your productivity insights.
                  </p>
                  <Button
                    onClick={() => generateJournal(new Date())}
                    disabled={generatingJournal}
                    className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20"
                  >
                    {generatingJournal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Today's Journal
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
