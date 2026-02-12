import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Clock, Hash, ImagePlus, Trash2, Save, Send,
  Loader2, FileText, AlertCircle, Sparkles,
} from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import PlatformSelector from './PlatformSelector';
import PostPreview from './PostPreview';

const CHAR_LIMITS = {
  linkedin: 3000,
  twitter: 280,
  instagram: 2200,
  facebook: 63206,
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'text-zinc-400' },
  { value: 'scheduled', label: 'Scheduled', color: 'text-yellow-400' },
  { value: 'published', label: 'Published', color: 'text-green-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-zinc-500' },
];

function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date) {
  if (!date) return '09:00';
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function PostComposer({ open, onClose, post, defaultDate, onSave }) {
  const { ct } = useTheme();
  const { user } = useUser();
  const textareaRef = useRef(null);

  const isEditing = !!post;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [platforms, setPlatforms] = useState(['linkedin']);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [mediaUrls, setMediaUrls] = useState([]);
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form from post or defaults
  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setBody(post.body || '');
      setPlatforms(post.platforms || ['linkedin']);
      setScheduledDate(formatDateForInput(post.scheduled_at));
      setScheduledTime(formatTimeForInput(post.scheduled_at));
      setHashtags(post.hashtags || []);
      setMediaUrls(post.media_urls || []);
      setStatus(post.status || 'draft');
    } else {
      setTitle('');
      setBody('');
      setPlatforms(['linkedin']);
      setScheduledDate(formatDateForInput(defaultDate || new Date()));
      setScheduledTime('09:00');
      setHashtags([]);
      setMediaUrls([]);
      setStatus('draft');
    }
  }, [post, defaultDate, open]);

  // Focus textarea on open
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [open]);

  const charLimit = Math.min(
    ...platforms.map(p => CHAR_LIMITS[p] || 3000)
  );

  const charCount = body.length;
  const isOverLimit = charCount > charLimit;

  const addHashtag = useCallback(() => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
    setHashtagInput('');
  }, [hashtagInput, hashtags]);

  const removeHashtag = (tag) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  const handleHashtagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addHashtag();
    }
    if (e.key === 'Backspace' && !hashtagInput && hashtags.length > 0) {
      setHashtags(hashtags.slice(0, -1));
    }
  };

  const buildScheduledAt = () => {
    if (!scheduledDate) return null;
    const dateTime = `${scheduledDate}T${scheduledTime || '09:00'}:00`;
    return new Date(dateTime).toISOString();
  };

  const handleSave = async (targetStatus) => {
    if (!user?.company_id) {
      toast.error('No company context');
      return;
    }

    if (!body.trim() && targetStatus !== 'draft') {
      toast.error('Post body cannot be empty');
      return;
    }

    if (platforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }

    if (isOverLimit) {
      toast.error(`Post exceeds character limit (${charCount}/${charLimit})`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim() || null,
        body: body.trim(),
        platforms,
        scheduled_at: buildScheduledAt(),
        hashtags,
        media_urls: mediaUrls,
        status: targetStatus,
        company_id: user.company_id,
        created_by: user.id,
      };

      let result;
      if (isEditing) {
        const { data, error } = await supabase
          .from('content_calendar_posts')
          .update(payload)
          .eq('id', post.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
        toast.success('Post updated');
      } else {
        const { data, error } = await supabase
          .from('content_calendar_posts')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        result = data;
        toast.success(
          targetStatus === 'draft' ? 'Draft saved' :
          targetStatus === 'scheduled' ? 'Post scheduled' :
          'Post saved'
        );
      }

      onSave?.(result);
      onClose();
    } catch (error) {
      console.error('Failed to save post:', error);
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('content_calendar_posts')
        .delete()
        .eq('id', post.id);
      if (error) throw error;
      toast.success('Post deleted');
      onSave?.(null);
      onClose();
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl mx-4 rounded-[20px] ${ct(
              'bg-white border-slate-200',
              'bg-zinc-900 border-zinc-800/60'
            )} border overflow-hidden`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${ct('border-slate-100', 'border-zinc-800/60')}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <FileText className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h2 className={`text-base font-semibold ${ct('text-slate-900', 'text-white')}`}>
                    {isEditing ? 'Edit Post' : 'New Post'}
                  </h2>
                  {isEditing && (
                    <span className={`text-xs ${STATUS_OPTIONS.find(s => s.value === post.status)?.color || 'text-zinc-500'}`}>
                      {STATUS_OPTIONS.find(s => s.value === post.status)?.label || post.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    showPreview
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                      : ct(
                          'bg-white border-slate-200 text-slate-500 hover:text-slate-600',
                          'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:text-zinc-300'
                        )
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg ${ct('text-slate-400 hover:bg-slate-100', 'text-zinc-500 hover:bg-zinc-800')} transition-colors`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex">
              {/* Editor side */}
              <div className={`flex-1 p-6 space-y-5 ${showPreview ? 'border-r ' + ct('border-slate-100', 'border-zinc-800/60') : ''}`}>
                {/* Title */}
                <div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Post title (optional)"
                    className={`w-full px-0 py-1 text-lg font-semibold bg-transparent border-none outline-none placeholder-opacity-40 ${ct(
                      'text-slate-900 placeholder:text-slate-300',
                      'text-white placeholder:text-zinc-600'
                    )}`}
                  />
                </div>

                {/* Platform selector */}
                <PlatformSelector
                  selected={platforms}
                  onChange={setPlatforms}
                />

                {/* Body */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider`}>
                      Content
                    </label>
                    <span className={`text-xs font-medium ${
                      isOverLimit ? 'text-red-400' : charCount > charLimit * 0.9 ? 'text-yellow-400' : ct('text-slate-400', 'text-zinc-600')
                    }`}>
                      {charCount} / {charLimit}
                    </span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="What do you want to share?"
                    rows={6}
                    className={`w-full px-4 py-3 text-sm rounded-xl border resize-none ${ct(
                      'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400',
                      'bg-zinc-800/40 border-zinc-700/40 text-white placeholder:text-zinc-500'
                    )} focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-colors`}
                  />
                  {isOverLimit && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Exceeds {platforms.find(p => CHAR_LIMITS[p] === charLimit)} character limit
                    </div>
                  )}
                </div>

                {/* Hashtags */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider flex items-center gap-1.5`}>
                    <Hash className="w-3 h-3" />
                    Hashtags
                  </label>
                  <div className={`flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl border min-h-[40px] ${ct(
                    'bg-slate-50 border-slate-200',
                    'bg-zinc-800/40 border-zinc-700/40'
                  )} focus-within:border-yellow-500/50 focus-within:ring-1 focus-within:ring-yellow-500/20 transition-colors`}>
                    {hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium"
                      >
                        #{tag}
                        <button onClick={() => removeHashtag(tag)} className="hover:text-yellow-300">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyDown={handleHashtagKeyDown}
                      onBlur={addHashtag}
                      placeholder={hashtags.length === 0 ? 'Type and press Enter...' : ''}
                      className={`flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm ${ct(
                        'text-slate-900 placeholder:text-slate-400',
                        'text-white placeholder:text-zinc-500'
                      )}`}
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider flex items-center gap-1.5`}>
                    <Calendar className="w-3 h-3" />
                    Schedule
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className={`flex-1 px-3 py-2 text-sm rounded-xl border ${ct(
                        'bg-slate-50 border-slate-200 text-slate-900',
                        'bg-zinc-800/40 border-zinc-700/40 text-white'
                      )} focus:outline-none focus:border-yellow-500/50 transition-colors [color-scheme:dark]`}
                    />
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-3.5 h-3.5 ${ct('text-slate-400', 'text-zinc-500')}`} />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className={`w-28 px-3 py-2 text-sm rounded-xl border ${ct(
                          'bg-slate-50 border-slate-200 text-slate-900',
                          'bg-zinc-800/40 border-zinc-700/40 text-white'
                        )} focus:outline-none focus:border-yellow-500/50 transition-colors [color-scheme:dark]`}
                      />
                    </div>
                  </div>
                  <p className={`text-[11px] ${ct('text-slate-400', 'text-zinc-600')}`}>
                    Times shown in your local timezone
                  </p>
                </div>

                {/* Media */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider flex items-center gap-1.5`}>
                    <ImagePlus className="w-3 h-3" />
                    Media
                  </label>
                  {mediaUrls.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {mediaUrls.map((url, i) => (
                        <div key={i} className="relative group/media w-20 h-20 rounded-xl overflow-hidden">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setMediaUrls(mediaUrls.filter((_, idx) => idx !== i))}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/media:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`flex items-center justify-center py-6 rounded-xl border border-dashed ${ct(
                      'border-slate-200 text-slate-400',
                      'border-zinc-700/40 text-zinc-600'
                    )}`}>
                      <div className="text-center">
                        <ImagePlus className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-xs">Drag & drop or browse from library</p>
                        <p className={`text-[10px] mt-0.5 ${ct('text-slate-300', 'text-zinc-700')}`}>
                          Coming soon
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview side */}
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 380 }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="w-[380px] p-6 overflow-y-auto max-h-[600px]">
                      <PostPreview
                        body={body}
                        platforms={platforms}
                        mediaUrls={mediaUrls}
                        hashtags={hashtags}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            <div className={`flex items-center justify-between px-6 py-4 border-t ${ct('border-slate-100', 'border-zinc-800/60')}`}>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border border-red-900/30 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border transition-colors disabled:opacity-50 ${ct(
                    'border-slate-200 text-slate-600 hover:bg-slate-50',
                    'border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/50'
                  )}`}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave('scheduled')}
                  disabled={saving || isOverLimit || !scheduledDate}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-full bg-yellow-400 hover:bg-yellow-300 text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Schedule
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
