/**
 * SyncCallAssistant - Real-time AI assistant panel during video calls.
 *
 * SYNC joins the call, listens via Groq Whisper transcription, and shows:
 *   - Live transcript with timestamps
 *   - Real-time action items, decisions, questions
 *   - Current topic and sentiment
 *
 * Features:
 *   - Collapsible with edge notch handle (click to expand/collapse)
 *   - Stretches full height of the video call area
 *   - Glass morphism dark theme
 */

import React, { memo, useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Mic,
  MicOff,
  CheckSquare,
  Lightbulb,
  HelpCircle,
  Hash,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Activity,
} from 'lucide-react';
import useRealtimeTranscription from './useRealtimeTranscription';

// ---------------------------------------------------------------------------
// Transcript entry
// ---------------------------------------------------------------------------
const TranscriptEntry = memo(function TranscriptEntry({ segment }) {
  const time = new Date(segment.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex gap-2 py-1.5 group"
    >
      <span className="text-[10px] text-zinc-600 font-mono mt-0.5 flex-shrink-0 w-14 group-hover:text-zinc-500 transition-colors">
        {time}
      </span>
      <p className="text-[12px] text-zinc-300 leading-relaxed">{segment.text}</p>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Analysis section
// ---------------------------------------------------------------------------
const AnalysisSection = memo(function AnalysisSection({
  icon: Icon,
  title,
  items,
  color,
  defaultOpen = true,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!items || items.length === 0) return null;

  const colorMap = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className="rounded-xl bg-white/[0.02] border border-zinc-800/40 overflow-hidden">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${colorMap[color] || colorMap.cyan}`}>
            <Icon className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-semibold text-zinc-200">{title}</span>
          <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-3 h-3 text-zinc-600" />
        ) : (
          <ChevronDown className="w-3 h-3 text-zinc-600" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 space-y-1">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1.5 text-[11px] text-zinc-400"
                >
                  <span className="text-zinc-600 mt-0.5 flex-shrink-0">{'>'}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Edge notch toggle handle
// ---------------------------------------------------------------------------
const EdgeNotch = memo(function EdgeNotch({ isCollapsed, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        absolute top-1/2 -translate-y-1/2 z-30
        ${isCollapsed ? '-right-5' : '-right-3'}
        w-6 h-16 flex items-center justify-center
        bg-zinc-800/90 backdrop-blur-sm
        border border-zinc-700/50
        rounded-r-xl
        text-zinc-400 hover:text-cyan-400
        hover:bg-zinc-700/90 hover:border-cyan-500/30
        transition-colors cursor-pointer
        shadow-lg shadow-black/30
      `}
      title={isCollapsed ? 'Show SYNC Assistant' : 'Hide SYNC Assistant'}
    >
      {isCollapsed ? (
        <ChevronRight className="w-3.5 h-3.5" />
      ) : (
        <ChevronLeft className="w-3.5 h-3.5" />
      )}
    </motion.button>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const SyncCallAssistant = forwardRef(function SyncCallAssistant({
  localStream,
  remoteStreams = [],
  callId,
  isVisible = true,
  onClose,
  onCollapsedChange,
}, ref) {
  const {
    isListening,
    transcript,
    analysis,
    error,
    startListening,
    stopListening,
    getFullTranscript,
  } = useRealtimeTranscription();

  // Expose getFullTranscript to parent via ref
  useImperativeHandle(ref, () => ({
    getFullTranscript,
  }), [getFullTranscript]);

  const [activeTab, setActiveTab] = useState('transcript');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const transcriptEndRef = useRef(null);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptEndRef.current && activeTab === 'transcript') {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, activeTab]);

  // Toggle SYNC listening
  const handleToggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else if (localStream) {
      const remoteArray = Array.isArray(remoteStreams)
        ? remoteStreams
        : Object.values(remoteStreams || {});
      startListening(localStream, remoteArray);
    }
  }, [isListening, localStream, remoteStreams, startListening, stopListening]);

  // Auto-start listening when localStream becomes available
  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (localStream && !hasStartedRef.current && isVisible) {
      // Convert remoteStreams object to array of MediaStreams
      const remoteArray = Array.isArray(remoteStreams)
        ? remoteStreams
        : Object.values(remoteStreams || {});
      hasStartedRef.current = true;
      startListening(localStream, remoteArray);
    }
  }, [localStream, isVisible, remoteStreams, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
      hasStartedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of collapsed state changes
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      onCollapsedChange?.(next);
      return next;
    });
  }, [onCollapsedChange]);

  const sentimentEmoji =
    analysis?.sentiment === 'positive' ? '😊' :
    analysis?.sentiment === 'negative' ? '😟' :
    analysis?.sentiment === 'mixed' ? '🤔' : '😐';

  if (!isVisible) return null;

  // Collapsed state — show just the notch
  if (isCollapsed) {
    return (
      <div className="relative w-0 h-full flex-shrink-0">
        <EdgeNotch isCollapsed onClick={handleToggleCollapse} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="relative h-full flex-shrink-0 flex flex-col bg-zinc-900/80 backdrop-blur-xl border-r border-zinc-700/40 z-20 overflow-hidden"
      style={{ width: 320 }}
    >
      {/* Edge notch */}
      <EdgeNotch isCollapsed={false} onClick={handleToggleCollapse} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          {/* SYNC brain icon */}
          <div className={`
            relative w-9 h-9 rounded-xl flex items-center justify-center
            ${isListening
              ? 'bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30'
              : 'bg-zinc-800/60 border border-zinc-700/40'
            }
          `}>
            <Brain className={`w-4.5 h-4.5 ${isListening ? 'text-violet-400' : 'text-zinc-600'}`} />
            {isListening && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-900">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">SYNC</h3>
              {isListening && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <Activity className="w-2 h-2 text-emerald-400" />
                  <span className="text-[9px] font-semibold text-emerald-400 tracking-wider">LIVE</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {isListening ? 'Listening & analyzing...' : 'Call assistant paused'}
            </p>
          </div>
        </div>

        {/* Toggle listening */}
        <button
          onClick={handleToggleListening}
          className={`p-2 rounded-lg transition-colors ${
            isListening
              ? 'text-emerald-400 hover:bg-emerald-500/10'
              : 'text-zinc-500 hover:bg-zinc-800'
          }`}
          title={isListening ? 'Pause SYNC' : 'Start SYNC'}
        >
          {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Current topic + sentiment */}
      {analysis && (
        <div className="px-4 py-2 border-b border-zinc-800/30 flex items-center justify-between">
          {analysis.current_topic && (
            <div className="flex items-center gap-1.5">
              <Hash className="w-3 h-3 text-cyan-400" />
              <span className="text-[11px] text-zinc-300 font-medium truncate max-w-[180px]">
                {analysis.current_topic}
              </span>
            </div>
          )}
          <span className="text-sm" title={`Sentiment: ${analysis.sentiment}`}>
            {sentimentEmoji}
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800/30">
        {[
          { id: 'transcript', label: 'Transcript', icon: Mic },
          { id: 'insights', label: 'Insights', icon: Sparkles },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                isActive
                  ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
              }`}
            >
              <TabIcon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area — fills remaining space */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {/* Transcript tab */}
          {activeTab === 'transcript' && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-3"
            >
              {transcript.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800/30 border border-zinc-700/30 flex items-center justify-center mb-4">
                    <Mic className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400 mb-1.5">
                    {isListening ? 'Listening...' : 'SYNC is paused'}
                  </p>
                  <p className="text-[11px] text-zinc-600 max-w-[200px] leading-relaxed">
                    {isListening
                      ? 'Transcription will appear here as people speak'
                      : 'Click the microphone to start SYNC listening'}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 mb-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-0.5">
                {transcript.map((segment) => (
                  <TranscriptEntry key={segment.id} segment={segment} />
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </motion.div>
          )}

          {/* Insights tab */}
          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-3 space-y-2"
            >
              {!analysis && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800/30 border border-zinc-700/30 flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400 mb-1.5">No insights yet</p>
                  <p className="text-[11px] text-zinc-600 max-w-[200px] leading-relaxed">
                    SYNC will surface action items, decisions, and questions as the conversation progresses
                  </p>
                </div>
              )}

              {analysis && (
                <>
                  <AnalysisSection
                    icon={CheckSquare}
                    title="Action Items"
                    items={analysis.action_items}
                    color="cyan"
                  />
                  <AnalysisSection
                    icon={Lightbulb}
                    title="Decisions"
                    items={analysis.decisions}
                    color="amber"
                  />
                  <AnalysisSection
                    icon={HelpCircle}
                    title="Questions"
                    items={analysis.questions}
                    color="violet"
                  />
                  <AnalysisSection
                    icon={Sparkles}
                    title="Key Points"
                    items={analysis.key_points}
                    color="emerald"
                    defaultOpen={false}
                  />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2.5 border-t border-zinc-800/30 flex items-center justify-between bg-zinc-900/50">
        <span className="text-[10px] text-zinc-600">
          {transcript.length} segment{transcript.length !== 1 ? 's' : ''} transcribed
        </span>
        {isListening && (
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Recording
          </span>
        )}
      </div>
    </motion.div>
  );
});

export default SyncCallAssistant;
