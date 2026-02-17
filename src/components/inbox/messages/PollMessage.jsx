import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Check, Users } from 'lucide-react';

function VoterAvatars({ voters = [], max = 3 }) {
  if (!voters.length) return null;
  const visible = voters.slice(0, max);
  const remaining = voters.length - max;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((voter, i) => (
        <div
          key={voter.userId || i}
          className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-300"
          title={voter.name || voter.userId}
        >
          {voter.avatar ? (
            <img src={voter.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            (voter.name || voter.userId || '?').charAt(0).toUpperCase()
          )}
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

export default function PollMessage({ messageId, poll, currentUserId, onVote }) {
  const [animatingOption, setAnimatingOption] = useState(null);

  const isClosed = useMemo(() => {
    if (!poll.deadline) return false;
    return new Date(poll.deadline) < new Date();
  }, [poll.deadline]);

  const totalVotes = useMemo(() => {
    return poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  }, [poll.options]);

  const deadlineText = useMemo(() => {
    if (!poll.deadline) return null;
    const deadline = new Date(poll.deadline);
    const now = new Date();
    if (deadline < now) return 'Poll closed';

    const diff = deadline - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h left`;
    }
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  }, [poll.deadline]);

  const handleVote = (optionId) => {
    if (isClosed) return;
    setAnimatingOption(optionId);
    onVote?.(messageId, optionId);
    setTimeout(() => setAnimatingOption(null), 500);
  };

  const hasVoted = (option) => {
    return option.votes?.includes(currentUserId);
  };

  return (
    <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-4 max-w-md">
      {/* Header */}
      <div className="flex items-start gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white leading-snug">{poll.question}</p>
          {poll.multiSelect && (
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Multiple selections allowed</span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const voteCount = option.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const voted = hasVoted(option);

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isClosed}
              className={`w-full relative rounded-lg overflow-hidden text-left transition-all ${
                isClosed
                  ? 'cursor-default'
                  : 'cursor-pointer hover:border-cyan-500/40'
              } ${
                voted
                  ? 'border border-cyan-500/30 bg-zinc-800/80'
                  : 'border border-zinc-700/40 bg-zinc-800/40'
              }`}
            >
              {/* Bar fill */}
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/10"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />

              {/* Content */}
              <div className="relative flex items-center gap-2 px-3 py-2">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                  voted
                    ? 'border-cyan-400 bg-cyan-500/20'
                    : 'border-zinc-600'
                }`}>
                  {voted && <Check className="w-2.5 h-2.5 text-cyan-400" />}
                </div>
                <span className={`text-sm flex-1 truncate ${voted ? 'text-white font-medium' : 'text-zinc-300'}`}>
                  {option.text}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <VoterAvatars voters={option.votes?.map(uid => ({ userId: uid })) || []} />
                  <span className="text-xs text-zinc-400 font-medium tabular-nums min-w-[2.5rem] text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-700/30">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Users className="w-3 h-3" />
          <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        </div>
        {deadlineText && (
          <div className={`flex items-center gap-1 text-xs ${isClosed ? 'text-zinc-500' : 'text-amber-400/80'}`}>
            <Clock className="w-3 h-3" />
            <span>{deadlineText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
