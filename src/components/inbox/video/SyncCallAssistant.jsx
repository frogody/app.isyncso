/**
 * SyncCallAssistant - Real-time AI assistant panel during video calls.
 *
 * SYNC joins the call, listens via Groq Whisper transcription, and shows:
 *   - Live transcript with timestamps
 *   - Real-time action items, decisions, questions
 *   - Current topic and sentiment
 *   - SYNC avatar as "participant" indicator
 *
 * Dark theme, glass morphism, slides in from the left.
 */

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
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
  X,
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2 py-1.5"
    >
      <span className="text-[10px] text-zinc-600 font-mono mt-0.5 flex-shrink-0 w-14">
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
    cyan: 'bg-cyan-500/10 text-cyan-400',
    amber: 'bg-amber-500/10 text-amber-400',
    violet: 'bg-violet-500/10 text-violet-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
  };

  return (
    <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/50 overflow-hidden">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${colorMap[color] || colorMap.cyan}`}>
            <Icon className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-semibold text-zinc-200">{title}</span>
          <span className="text-[10px] text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded-full">
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
                  <span className="text-zinc-600 mt-0.5">{'>'}</span>
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
// SYNC Avatar indicator
// ---------------------------------------------------------------------------
const SyncAvatar = memo(function SyncAvatar({ isListening }) {
  return (
    <div className="relative">
      <div className={`
        w-8 h-8 rounded-xl flex items-center justify-center
        ${isListening
          ? 'bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30'
          : 'bg-zinc-800/60 border border-zinc-700/40'
        }
      `}>
        <Brain className={`w-4 h-4 ${isListening ? 'text-violet-400' : 'text-zinc-600'}`} />
      </div>
      {isListening && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        </span>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SyncCallAssistant({
  localStream,
  remoteStreams = [],
  callId,
  isVisible = true,
  onClose,
}) {
  const {
    isListening,
    transcript,
    analysis,
    error,
    startListening,
    stopListening,
    getFullTranscript,
  } = useRealtimeTranscription();

  const [activeTab, setActiveTab] = useState('transcript');
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
      startListening(localStream, remoteStreams);
    }
  }, [isListening, localStream, remoteStreams, startListening, stopListening]);

  // Auto-start listening when stream becomes available
  useEffect(() => {
    if (localStream && !isListening && isVisible) {
      startListening(localStream, remoteStreams);
    }
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, []); // Only on mount

  const sentimentEmoji =
    analysis?.sentiment === 'positive' ? '😊' :
    analysis?.sentiment === 'negative' ? '😟' :
    analysis?.sentiment === 'mixed' ? '🤔' : '😐';

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ x: -380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -380, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute left-0 top-0 bottom-0 w-[340px] bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-700/50 flex flex-col z-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-zinc-700/50">
        <div className="flex items-center gap-2.5">
          <SyncAvatar isListening={isListening} />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white">SYNC</h3>
              {isListening && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <Activity className="w-2 h-2 text-emerald-400" />
                  <span className="text-[9px] font-medium text-emerald-400">LIVE</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500">
              {isListening ? 'Listening & analyzing...' : 'Call assistant paused'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle listening */}
          <button
            onClick={handleToggleListening}
            className={`p-1.5 rounded-lg transition-colors ${
              isListening
                ? 'text-emerald-400 hover:bg-emerald-500/10'
                : 'text-zinc-500 hover:bg-zinc-800'
            }`}
            title={isListening ? 'Pause SYNC' : 'Start SYNC'}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Current topic + sentiment */}
      {analysis && (
        <div className="px-3.5 py-2 border-b border-zinc-800/50 flex items-center justify-between">
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
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-zinc-800/40">
        {[
          { id: 'transcript', label: 'Transcript', icon: Mic },
          { id: 'insights', label: 'Insights', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {/* Transcript tab */}
          {activeTab === 'transcript' && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3.5 py-2"
            >
              {transcript.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/40 flex items-center justify-center mb-3">
                    <Mic className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400 mb-1">
                    {isListening ? 'Listening...' : 'SYNC is paused'}
                  </p>
                  <p className="text-[11px] text-zinc-600 max-w-[220px]">
                    {isListening
                      ? 'Transcription will appear here as people speak'
                      : 'Click the microphone to start SYNC listening'}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 mb-2">
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
              className="px-3.5 py-3 space-y-2"
            >
              {!analysis && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/40 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400 mb-1">No insights yet</p>
                  <p className="text-[11px] text-zinc-600 max-w-[220px]">
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
      <div className="px-3.5 py-2 border-t border-zinc-800/40 flex items-center justify-between">
        <span className="text-[10px] text-zinc-600">
          {transcript.length} segment{transcript.length !== 1 ? 's' : ''} transcribed
        </span>
        {isListening && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Recording
          </span>
        )}
      </div>
    </motion.div>
  );
}
