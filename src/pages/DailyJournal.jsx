import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Calendar, Clock, Zap, Target, Monitor, TrendingUp,
  RefreshCw, Loader2, Sparkles, ChevronRight, Activity, Brain,
  FileText, CheckCircle2, LightbulbIcon, CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DailyJournal() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [journals, setJournals] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [generatingJournal, setGeneratingJournal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-daily-journal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full bg-zinc-800 rounded-2xl" />
          <div className="flex gap-6">
            <Skeleton className="h-[600px] w-64 bg-zinc-800 rounded-2xl" />
            <Skeleton className="h-[600px] flex-1 bg-zinc-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-900/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-cyan-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 h-screen flex flex-col p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/20">
                <BookOpen className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">Daily Journals</h1>
                <p className="text-zinc-500 mt-1">AI-powered reflections on your productivity</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Sidebar - Journal History */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-72 flex-shrink-0 flex flex-col rounded-2xl bg-zinc-900/50 border border-zinc-800/60 overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800/60">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Journal History
              </h3>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {journals.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">No journals yet</p>
                    <p className="text-xs text-zinc-600 mt-1">Generate your first journal below</p>
                  </div>
                ) : (
                  journals.map((journal) => (
                    <button
                      key={journal.id}
                      onClick={() => setSelectedJournal(journal)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        selectedJournal?.id === journal.id
                          ? 'bg-cyan-500/10 border border-cyan-500/30'
                          : 'hover:bg-zinc-800/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${
                          selectedJournal?.id === journal.id ? 'text-cyan-300' : 'text-zinc-200'
                        }`}>
                          {formatJournalDate(journal.journal_date)}
                        </span>
                        {isToday(journal.journal_date) && (
                          <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-xs px-1.5">
                            Today
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>{formatDuration(journal.total_active_minutes)}</span>
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {Math.round((journal.productivity_score || 0) * 100)}%
                        </span>
                        {journal.ai_generated && (
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Generate Button */}
            <div className="p-4 border-t border-zinc-800/60">
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
            className="flex-1 overflow-y-auto rounded-2xl bg-zinc-900/50 border border-zinc-800/60"
          >
            {selectedJournal ? (
              <div className="p-8">
                {/* Journal Header */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-100">
                      {formatFullDate(selectedJournal.journal_date)}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-zinc-400">
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
                    <div className="text-3xl font-bold text-zinc-100">
                      {Math.round((selectedJournal.productivity_score || 0) * 100)}%
                    </div>
                    <div className="text-sm text-zinc-500">Productivity</div>
                  </div>
                </div>

                {/* Overview */}
                {selectedJournal.overview && (
                  <div className="mb-8">
                    <p className="text-lg text-zinc-300 leading-relaxed">
                      {selectedJournal.overview}
                    </p>
                  </div>
                )}

                {/* Weekly Context */}
                {selectedJournal.weekly_context && (
                  <div className="mb-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-300">Weekly Context</span>
                    </div>
                    <p className="text-sm text-blue-200/80">{selectedJournal.weekly_context}</p>
                  </div>
                )}

                {/* Summary Points */}
                {selectedJournal.summary_points && selectedJournal.summary_points.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      Summary Points
                    </h3>
                    <ul className="space-y-3">
                      {selectedJournal.summary_points.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-zinc-300">
                          <span className="text-green-400 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timeline Narrative */}
                {selectedJournal.timeline_narrative && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      Timeline of the Day
                    </h3>
                    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                      <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {selectedJournal.timeline_narrative}
                      </p>
                    </div>
                  </div>
                )}

                {/* Personal Notes */}
                {selectedJournal.personal_notes && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                      <LightbulbIcon className="w-5 h-5 text-amber-400" />
                      Personal Notes
                    </h3>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-amber-200/90 leading-relaxed">
                        {selectedJournal.personal_notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Highlights */}
                  {selectedJournal.highlights && selectedJournal.highlights.length > 0 && (
                    <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
                      <h4 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Highlights
                      </h4>
                      <ul className="space-y-2">
                        {selectedJournal.highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                            <span className="text-amber-400 mt-0.5">•</span>
                            {typeof highlight === 'string' ? highlight : highlight.description || highlight.type}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Top Apps */}
                  {selectedJournal.top_apps && selectedJournal.top_apps.length > 0 && (
                    <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
                      <h4 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-blue-400" />
                        Top Apps
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedJournal.top_apps.map((app, idx) => (
                          <Badge
                            key={idx}
                            className="bg-zinc-700/50 text-zinc-300 border-zinc-600/50"
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
                    <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 md:col-span-2">
                      <h4 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-400" />
                        Focus Areas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedJournal.focus_areas.map((area, idx) => (
                          <Badge
                            key={idx}
                            className="bg-cyan-500/10 text-cyan-300/80 border-cyan-500/25"
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
                  <BookOpen className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-zinc-200 mb-2">No Journal Selected</h3>
                  <p className="text-zinc-500 mb-6">
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
