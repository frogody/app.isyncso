/**
 * SchedulingRecommendationsWidget — Phase 4 (A-1)
 *
 * Displays LLM-generated scheduling recommendations:
 * - Deep work blocks as colored time slots
 * - Meeting windows
 * - Break reminders
 * - Productivity tips
 * - Burnout/overwork warnings
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock, Brain, Users, Coffee, AlertTriangle, Sparkles,
  RefreshCw, Loader2, Laptop, Zap, Sun, Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSchedulingRecommendations } from '@/hooks/useSchedulingRecommendations';

const SLIDE_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
};

function formatHour(h) {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function TimeSlot({ start, end, label, reason, color = 'cyan', icon: Icon = Clock }) {
  const width = ((end - start) / 24) * 100;
  const left = (start / 24) * 100;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-3.5 h-3.5 text-${color}-400`} />
        <span className="text-xs font-medium text-white">{label}</span>
        <span className="text-[10px] text-zinc-500 ml-auto">{formatHour(start)} - {formatHour(end)}</span>
      </div>
      <div className="relative h-6 bg-zinc-800/60 rounded-lg overflow-hidden">
        {/* Hour markers */}
        {[6, 9, 12, 15, 18, 21].map(h => (
          <div
            key={h}
            className="absolute top-0 bottom-0 w-px bg-zinc-700/40"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}
        {/* Block */}
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-md bg-${color}-500/30 border border-${color}-500/40`}
          style={{ left: `${left}%`, width: `${width}%` }}
        />
      </div>
      {reason && <p className="text-[10px] text-zinc-500 mt-1">{reason}</p>}
    </div>
  );
}

function TipCard({ tip, category }) {
  const categoryIcons = {
    time_blocking: Clock,
    batching: Zap,
    focus: Brain,
    breaks: Coffee,
    general: Sparkles,
  };
  const Icon = categoryIcons[category] || Sparkles;

  return (
    <div className="flex gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-zinc-800/40">
      <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
        <Icon className="w-3.5 h-3.5 text-cyan-400" />
      </div>
      <p className="text-xs text-zinc-300 leading-relaxed">{tip}</p>
    </div>
  );
}

function WarningCard({ warning }) {
  const severityColors = {
    high: 'red',
    medium: 'amber',
    low: 'zinc',
  };
  const color = severityColors[warning.severity] || 'amber';

  return (
    <div className={`flex gap-2.5 p-2.5 rounded-xl bg-${color}-500/5 border border-${color}-500/20`}>
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-${color}-500/10 border border-${color}-500/20`}>
        <AlertTriangle className={`w-3.5 h-3.5 text-${color}-400`} />
      </div>
      <div>
        <p className={`text-xs font-medium text-${color}-400`}>{warning.message}</p>
        {warning.recommendation && (
          <p className="text-[10px] text-zinc-500 mt-0.5">{warning.recommendation}</p>
        )}
      </div>
    </div>
  );
}

export default function SchedulingRecommendationsWidget() {
  const { recommendations, loading, error, refresh, generatedAt } = useSchedulingRecommendations();

  if (loading && !recommendations) {
    return (
      <motion.div {...SLIDE_UP}>
        <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            <span className="text-sm text-zinc-400">Generating scheduling recommendations...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!recommendations) {
    return (
      <motion.div {...SLIDE_UP}>
        <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-8 text-center">
          <Laptop className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-sm font-medium mb-1">No Scheduling Data</p>
          <p className="text-xs text-zinc-600 max-w-sm mx-auto mb-4">
            Connect and use SYNC Desktop to track your work patterns. After a few days,
            personalized scheduling recommendations will appear here.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-400 hover:text-white hover:border-cyan-500/40"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Check Again
          </Button>
        </div>
      </motion.div>
    );
  }

  const { deep_work_blocks = [], meeting_windows = [], break_reminders = [], warnings = [], productivity_tips = [] } = recommendations;

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div {...SLIDE_UP}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Your Optimal Schedule</h3>
          </div>
          <div className="flex items-center gap-2">
            {generatedAt && (
              <span className="text-[10px] text-zinc-600">
                Updated {new Date(generatedAt).toLocaleDateString()}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-white/[0.04] transition-colors"
              title="Refresh recommendations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Deep Work & Meeting Time Slots */}
      {(deep_work_blocks.length > 0 || meeting_windows.length > 0) && (
        <motion.div {...SLIDE_UP}>
          <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5">
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Time Blocks</h4>

            {/* Hour labels */}
            <div className="flex justify-between text-[9px] text-zinc-600 mb-2 px-0.5">
              {[0, 6, 9, 12, 15, 18, 21, 24].map(h => (
                <span key={h}>{h === 24 ? '' : formatHour(h)}</span>
              ))}
            </div>

            {deep_work_blocks.map((block, i) => (
              <TimeSlot
                key={`dw-${i}`}
                start={block.start_hour}
                end={block.end_hour}
                label={block.label}
                reason={block.reason}
                color="cyan"
                icon={Brain}
              />
            ))}

            {meeting_windows.map((block, i) => (
              <TimeSlot
                key={`mw-${i}`}
                start={block.start_hour}
                end={block.end_hour}
                label={block.label}
                reason={block.reason}
                color="blue"
                icon={Users}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <motion.div {...SLIDE_UP}>
          <div className="space-y-2">
            {warnings.map((warning, i) => (
              <WarningCard key={i} warning={warning} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Break Reminders */}
      {break_reminders.length > 0 && (
        <motion.div {...SLIDE_UP}>
          <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-4">
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Coffee className="w-3 h-3" /> Break Schedule
            </h4>
            <div className="space-y-2">
              {break_reminders.map((br, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="text-cyan-400 font-medium whitespace-nowrap">Every {br.after_minutes}min</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-300">{br.activity} ({br.duration_minutes}min)</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tips */}
      {productivity_tips.length > 0 && (
        <motion.div {...SLIDE_UP}>
          <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-4">
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Personalized Tips
            </h4>
            <div className="space-y-2">
              {productivity_tips.map((t, i) => (
                <TipCard key={i} tip={t.tip} category={t.category} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
