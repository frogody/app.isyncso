import React from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Twitter, Heart, MessageCircle, Repeat2, Share, ThumbsUp, Send } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { useUser } from '@/components/context/UserContext';

function LinkedInPreview({ body, mediaUrls, hashtags, user, company }) {
  const { ct } = useTheme();
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Your Name';
  const companyName = company?.name || 'Your Company';
  const hashtagText = hashtags?.length > 0
    ? '\n\n' + hashtags.map(t => `#${t.replace(/^#/, '')}`).join(' ')
    : '';

  return (
    <div className={`rounded-xl border overflow-hidden ${ct('bg-white border-slate-200', 'bg-zinc-900/70 border-zinc-800/60')}`}>
      {/* Header */}
      <div className="p-3 flex items-start gap-2.5">
        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${ct('bg-blue-100 text-blue-600', 'bg-blue-500/20 text-blue-400')}`}>
          <span className="text-sm font-bold">{displayName.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${ct('text-slate-900', 'text-white')} leading-tight`}>{displayName}</p>
          <p className={`text-[11px] ${ct('text-slate-500', 'text-zinc-500')} leading-tight`}>{companyName}</p>
          <p className={`text-[10px] ${ct('text-slate-400', 'text-zinc-600')}`}>Just now</p>
        </div>
      </div>

      {/* Body */}
      <div className={`px-3 pb-2 text-sm ${ct('text-slate-700', 'text-zinc-300')} whitespace-pre-wrap leading-relaxed`}>
        {body || 'Your post content will appear here...'}
        {hashtagText && (
          <span className="text-blue-400">{hashtagText}</span>
        )}
      </div>

      {/* Media */}
      {mediaUrls?.length > 0 && (
        <div className={`border-t ${ct('border-slate-100', 'border-zinc-800/40')}`}>
          <img
            src={mediaUrls[0]}
            alt="Post media"
            className="w-full h-40 object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center justify-around py-2 border-t ${ct('border-slate-100', 'border-zinc-800/40')}`}>
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageCircle, label: 'Comment' },
          { icon: Repeat2, label: 'Repost' },
          { icon: Send, label: 'Send' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className={`flex items-center gap-1 text-[11px] ${ct('text-slate-500', 'text-zinc-500')}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function TwitterPreview({ body, mediaUrls, hashtags, user }) {
  const { ct } = useTheme();
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Your Name';
  const handle = '@' + (displayName.toLowerCase().replace(/\s+/g, '') || 'handle');
  const hashtagText = hashtags?.length > 0
    ? ' ' + hashtags.map(t => `#${t.replace(/^#/, '')}`).join(' ')
    : '';

  return (
    <div className={`rounded-xl border overflow-hidden ${ct('bg-white border-slate-200', 'bg-zinc-900/70 border-zinc-800/60')}`}>
      {/* Header */}
      <div className="p-3 flex items-start gap-2.5">
        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${ct('bg-zinc-200 text-zinc-600', 'bg-zinc-700 text-zinc-300')}`}>
          <span className="text-sm font-bold">{displayName.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold ${ct('text-slate-900', 'text-white')}`}>{displayName}</span>
            <span className={`text-sm ${ct('text-slate-500', 'text-zinc-500')}`}>{handle}</span>
          </div>
          <p className={`text-sm ${ct('text-slate-700', 'text-zinc-300')} mt-0.5 whitespace-pre-wrap leading-relaxed`}>
            {body || 'Your tweet will appear here...'}
            {hashtagText && (
              <span className="text-blue-400">{hashtagText}</span>
            )}
          </p>

          {/* Media */}
          {mediaUrls?.length > 0 && (
            <div className="mt-2 rounded-xl overflow-hidden">
              <img
                src={mediaUrls[0]}
                alt="Tweet media"
                className="w-full h-36 object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className={`flex items-center gap-6 mt-2 ${ct('text-slate-400', 'text-zinc-600')}`}>
            {[MessageCircle, Repeat2, Heart, Share].map((Icon, i) => (
              <Icon key={i} className="w-3.5 h-3.5" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PostPreview({ body, platforms = [], mediaUrls = [], hashtags = [] }) {
  const { ct } = useTheme();
  const { user, company } = useUser();

  const showLinkedIn = platforms.includes('linkedin');
  const showTwitter = platforms.includes('twitter');

  if (!showLinkedIn && !showTwitter) {
    return (
      <div className={`text-center py-6 text-sm ${ct('text-slate-400', 'text-zinc-500')}`}>
        Select a platform to see a preview
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider`}>
        Preview
      </label>
      <div className="space-y-3">
        {showLinkedIn && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Linkedin className="w-3.5 h-3.5 text-blue-400" />
              <span className={`text-[11px] font-medium ${ct('text-slate-500', 'text-zinc-500')}`}>LinkedIn</span>
            </div>
            <LinkedInPreview body={body} mediaUrls={mediaUrls} hashtags={hashtags} user={user} company={company} />
          </motion.div>
        )}
        {showTwitter && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: showLinkedIn ? 0.1 : 0 }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Twitter className="w-3.5 h-3.5 text-zinc-400" />
              <span className={`text-[11px] font-medium ${ct('text-slate-500', 'text-zinc-500')}`}>X (Twitter)</span>
            </div>
            <TwitterPreview body={body} mediaUrls={mediaUrls} hashtags={hashtags} user={user} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
