import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Scale, Check, CheckCircle2, Users, ThumbsUp } from 'lucide-react';

function SupporterAvatars({ supporters = [], max = 3 }) {
  if (!supporters.length) return null;
  const visible = supporters.slice(0, max);
  const remaining = supporters.length - max;

  return (
    <div className="flex items-center -space-x-1.5 ml-2">
      {visible.map((uid, i) => (
        <div
          key={uid || i}
          className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-300"
        >
          {(uid || '?').charAt(0).toUpperCase()}
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-800 flex items-center justify-center text-[8px] font-medium text-zinc-400">
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default function DecisionMessage({ messageId, decision, currentUserId, onSupport, onDecide }) {
  const isDecided = decision.status === 'decided';

  const statusConfig = useMemo(() => {
    if (isDecided) {
      return {
        label: 'Decided',
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/20',
      };
    }
    return {
      label: 'Open',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20',
    };
  }, [isDecided]);

  const handleSupport = (optionId) => {
    if (isDecided) return;
    onSupport?.(messageId, optionId);
  };

  const handleDecide = (optionId) => {
    if (isDecided) return;
    onDecide?.(messageId, optionId);
  };

  const hasSupported = (option) => {
    return option.supporters?.includes(currentUserId);
  };

  return (
    <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-4 max-w-md">
      {/* Header */}
      <div className="flex items-start gap-2 mb-1">
        <Scale className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{decision.title}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {decision.description && (
        <p className="text-xs text-zinc-400 mb-3 ml-6 leading-relaxed">{decision.description}</p>
      )}

      {/* Options */}
      <div className="space-y-2 ml-6">
        {decision.options.map((option) => {
          const isChosen = isDecided && decision.decidedOption === option.id;
          const isNotChosen = isDecided && decision.decidedOption !== option.id;
          const supported = hasSupported(option);
          const supporterCount = option.supporters?.length || 0;

          return (
            <motion.div
              key={option.id}
              layout
              className={`rounded-lg border px-3 py-2.5 transition-all ${
                isChosen
                  ? 'border-green-500/40 bg-green-500/5'
                  : isNotChosen
                    ? 'border-zinc-700/30 bg-zinc-800/30 opacity-60'
                    : supported
                      ? 'border-cyan-500/30 bg-cyan-500/5'
                      : 'border-zinc-700/40 bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Status icon */}
                {isChosen ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <div className={`w-4 h-4 rounded-full border flex-shrink-0 ${
                    supported ? 'border-cyan-400' : 'border-zinc-600'
                  }`} />
                )}

                {/* Option text */}
                <span className={`text-sm flex-1 ${
                  isChosen ? 'text-green-300 font-medium' : isNotChosen ? 'text-zinc-500 line-through' : 'text-zinc-200'
                }`}>
                  {option.text}
                </span>

                {/* Support count + avatars */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {supporterCount > 0 && (
                    <>
                      <SupporterAvatars supporters={option.supporters || []} />
                      <span className="text-xs text-zinc-500">{supporterCount}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {!isDecided && (
                <div className="flex items-center gap-2 mt-2 ml-6">
                  <button
                    onClick={() => handleSupport(option.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      supported
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                        : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 border border-zinc-700/50'
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    {supported ? 'Supported' : 'Support'}
                  </button>
                  <button
                    onClick={() => handleDecide(option.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-700/50 text-zinc-400 hover:bg-green-500/15 hover:text-green-400 border border-zinc-700/50 hover:border-green-500/25 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Decide
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Decided footer */}
      {isDecided && decision.decidedAt && (
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-zinc-700/30 ml-6">
          <CheckCircle2 className="w-3 h-3 text-green-400" />
          <span className="text-xs text-zinc-500">
            Decided {new Date(decision.decidedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}
    </div>
  );
}
