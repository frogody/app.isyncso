/**
 * SyncBriefing - Main Morning Briefing View
 *
 * Beautiful morning briefing card with staggered reveal animations.
 * Sections: Schedule, Priority Messages, Tasks Due, Sync Insights, Pre-Meeting Context.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MessageSquare, CheckSquare, Sparkles,
  Users, RefreshCw, Settings, Clock,
  MapPin, AlertTriangle, ArrowRight, Zap,
  CircleDot, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { useSyncBriefing } from './useSyncBriefing';
import BriefingCard from './BriefingCard';
import BriefingSettings from './BriefingSettings';

// Greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Format date nicely
function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Urgency badge component
function UrgencyBadge({ level }) {
  const config = {
    high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'Urgent' },
    medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Important' },
    normal: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-600/30', label: 'Normal' },
  };
  const c = config[level] || config.normal;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
}

// Priority badge for tasks
function PriorityBadge({ priority }) {
  const config = {
    high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    low: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  };
  const c = config[priority] || config.medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize border ${c.bg} ${c.text} ${c.border}`}>
      {priority}
    </span>
  );
}

// Insight type icon mapping
function InsightIcon({ type }) {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'alert':
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case 'positive':
      return <Zap className="w-4 h-4 text-green-400" />;
    default:
      return <Sparkles className="w-4 h-4 text-purple-400" />;
  }
}

export default function SyncBriefing() {
  const { user } = useUser();
  const {
    briefing,
    loading,
    generating,
    preferences,
    lastBriefingAt,
    generateBriefing,
    configureBriefing,
  } = useSyncBriefing();

  const [showSettings, setShowSettings] = useState(false);

  const firstName = useMemo(() => {
    if (!user?.full_name) return '';
    return user.full_name.split(' ')[0];
  }, [user?.full_name]);

  const greeting = getGreeting();
  const dateStr = formatDate();

  // Handle generate
  const handleGenerate = () => {
    if (user?.id) {
      generateBriefing(user.id);
    }
  };

  // Format last briefing time
  const lastGeneratedLabel = useMemo(() => {
    if (!lastBriefingAt) return null;
    const d = new Date(lastBriefingAt);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [lastBriefingAt]);

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        >
          <RefreshCw className="w-6 h-6 text-cyan-400/60" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Header - Morning greeting with warm gradient */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-zinc-700/50"
        >
          {/* Sunrise gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/5" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

          <div className="relative px-6 py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Sync avatar placeholder */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {greeting}, {firstName || 'there'}
                  </h1>
                  <p className="text-sm text-zinc-400 mt-0.5">{dateStr}</p>
                  {lastGeneratedLabel && (
                    <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last updated at {lastGeneratedLabel}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-colors"
                  title="Briefing settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    generating
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Generating...' : 'Regenerate'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Settings panel (collapsible) */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <BriefingSettings
                preferences={preferences}
                onSave={(prefs) => {
                  configureBriefing(prefs);
                  setShowSettings(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!briefing && !generating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-8 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-amber-400/60" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">No briefing yet</h3>
            <p className="text-sm text-zinc-500 mb-5 max-w-sm mx-auto">
              Generate your morning briefing to get a summary of your day including schedule, priority messages, and tasks.
            </p>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Generate Briefing
            </button>
          </motion.div>
        )}

        {/* Briefing sections */}
        {briefing && (
          <div className="space-y-4">
            {/* TODAY'S SCHEDULE */}
            {preferences.sections?.schedule !== false && (
              <BriefingCard
                icon={Calendar}
                title="Today's Schedule"
                count={briefing.schedule.length}
                sectionKey="schedule"
                delay={0.1}
              >
                {briefing.schedule.length > 0 ? (
                  <div className="space-y-1">
                    {briefing.schedule.map((event, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 py-2.5 group"
                      >
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center mt-0.5">
                          <CircleDot className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          {idx < briefing.schedule.length - 1 && (
                            <div className="w-[1px] h-8 bg-zinc-700/60 mt-1" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-200 truncate">
                              {event.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-cyan-400 font-mono">
                              {event.time}
                              {event.endTime && ` - ${event.endTime}`}
                            </span>
                            {event.attendees?.length > 0 && (
                              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {event.attendees.length}
                              </span>
                            )}
                            {event.location && (
                              <span className="text-[11px] text-zinc-500 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 py-2">No events scheduled for today.</p>
                )}
              </BriefingCard>
            )}

            {/* PRIORITY MESSAGES */}
            {preferences.sections?.messages !== false && (
              <BriefingCard
                icon={MessageSquare}
                title="Priority Messages"
                count={briefing.priorityMessages.length}
                sectionKey="messages"
                delay={0.2}
                defaultOpen={briefing.priorityMessages.length > 0}
              >
                {briefing.priorityMessages.length > 0 ? (
                  <div className="space-y-2">
                    {briefing.priorityMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-300">
                              {msg.sender}
                            </span>
                            <span className="text-[10px] text-zinc-600">in #{msg.channel}</span>
                          </div>
                          <UrgencyBadge level={msg.urgency} />
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2">{msg.preview}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 py-2">No priority messages. All caught up.</p>
                )}
              </BriefingCard>
            )}

            {/* TASKS DUE TODAY */}
            {preferences.sections?.tasks !== false && (
              <BriefingCard
                icon={CheckSquare}
                title="Tasks Due Today"
                count={briefing.tasksDue.length}
                sectionKey="tasks"
                delay={0.3}
                defaultOpen={briefing.tasksDue.length > 0}
              >
                {briefing.tasksDue.length > 0 ? (
                  <div className="space-y-2">
                    {briefing.tasksDue.map((task, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 py-2 group"
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                          task.overdue
                            ? 'border-red-500/60 bg-red-500/10'
                            : 'border-cyan-500/40 bg-cyan-500/5'
                        }`}>
                          {task.overdue ? (
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-cyan-400/40" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${
                              task.overdue ? 'text-red-300' : 'text-zinc-200'
                            } truncate`}>
                              {task.title}
                            </span>
                            <PriorityBadge priority={task.priority} />
                          </div>
                          {task.project && (
                            <span className="text-[10px] text-zinc-500">{task.project}</span>
                          )}
                        </div>

                        {task.overdue && (
                          <span className="text-[10px] text-red-400 font-medium flex-shrink-0">
                            Overdue
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 py-2">No tasks due today. Clear schedule ahead.</p>
                )}
              </BriefingCard>
            )}

            {/* SYNC INSIGHTS */}
            {preferences.sections?.insights !== false && briefing.insights.length > 0 && (
              <BriefingCard
                icon={Sparkles}
                title="Sync Insights"
                count={briefing.insights.length}
                sectionKey="insights"
                delay={0.4}
              >
                <div className="space-y-2">
                  {briefing.insights.map((insight, idx) => {
                    const bgColor = {
                      warning: 'from-amber-500/5 to-amber-600/5 border-amber-500/20',
                      alert: 'from-red-500/5 to-red-600/5 border-red-500/20',
                      positive: 'from-green-500/5 to-green-600/5 border-green-500/20',
                    }[insight.type] || 'from-purple-500/5 to-indigo-500/5 border-purple-500/20';

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl bg-gradient-to-r ${bgColor} border transition-colors hover:brightness-110`}
                      >
                        <div className="flex items-start gap-3">
                          <InsightIcon type={insight.type} />
                          <div className="flex-1">
                            <p className="text-sm text-zinc-200">{insight.text}</p>
                            {insight.actionable && (
                              <button className="mt-2 text-[11px] text-cyan-400 font-medium flex items-center gap-1 hover:text-cyan-300 transition-colors">
                                Take action <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </BriefingCard>
            )}

            {/* PRE-MEETING CONTEXT */}
            {preferences.sections?.preMeeting !== false && briefing.preMeetingContext.length > 0 && (
              <BriefingCard
                icon={Users}
                title="Pre-Meeting Context"
                count={briefing.preMeetingContext.length}
                sectionKey="preMeeting"
                delay={0.5}
                defaultOpen={false}
              >
                <div className="space-y-2">
                  {briefing.preMeetingContext.map((ctx, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40"
                    >
                      <div className="text-sm font-medium text-zinc-200 mb-1">
                        {ctx.meetingTitle}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {ctx.attendeeInsights}
                      </div>
                      {ctx.openItems?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {ctx.openItems.map((item, i) => (
                            <div key={i} className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                              <ArrowRight className="w-3 h-3 text-indigo-400" />
                              {item}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </BriefingCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
