import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, Sparkles, Loader2, Check, Calendar,
  ChevronRight, FileText, Wand2, Copy,
} from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export default function JournalToPostModal({ open, onClose, onInsert }) {
  const { ct } = useTheme();
  const { user } = useUser();

  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedJournals, setSelectedJournals] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState(null);
  const [editedDrafts, setEditedDrafts] = useState({});

  useEffect(() => {
    if (open && user?.id) {
      loadJournals();
    }
    if (!open) {
      setSelectedJournals([]);
      setGeneratedDrafts(null);
      setEditedDrafts({});
    }
  }, [open, user?.id]);

  const loadJournals = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 14);

      const { data, error } = await supabase
        .from('daily_journals')
        .select('*')
        .eq('user_id', user.id)
        .gte('journal_date', startDate.toISOString().split('T')[0])
        .lte('journal_date', endDate.toISOString().split('T')[0])
        .order('journal_date', { ascending: false });

      if (error) throw error;
      setJournals(data || []);
    } catch (error) {
      console.error('Failed to load journals:', error);
      toast.error('Failed to load journals');
    } finally {
      setLoading(false);
    }
  };

  const toggleJournal = (journal) => {
    setSelectedJournals((prev) => {
      const exists = prev.find((j) => j.id === journal.id);
      if (exists) return prev.filter((j) => j.id !== journal.id);
      return [...prev, journal];
    });
  };

  const handleGenerate = async () => {
    if (selectedJournals.length === 0) {
      toast.error('Select at least one journal entry');
      return;
    }

    setGenerating(true);
    try {
      // Mock AI generation since edge function doesn't exist yet
      // Combine journal content for a mock post
      const journalContent = selectedJournals.map((j) => {
        const overview = j.overview || j.daily_summary || '';
        const highlights = Array.isArray(j.highlights) ? j.highlights.join('. ') : '';
        return `${j.journal_date}: ${overview} ${highlights}`.trim();
      }).join('\n\n');

      // Simulate a short delay for realism
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockLinkedIn = `Reflecting on the past ${selectedJournals.length === 1 ? 'day' : 'few days'}, I wanted to share some insights from my journey.\n\n${journalContent}\n\nWhat are your thoughts on this? I'd love to hear from my network.`;

      const mockTwitter = journalContent.length > 250
        ? journalContent.substring(0, 240) + '...'
        : journalContent;

      setGeneratedDrafts({
        linkedin: mockLinkedIn,
        twitter: mockTwitter,
      });
      setEditedDrafts({
        linkedin: mockLinkedIn,
        twitter: mockTwitter,
      });
    } catch (error) {
      console.error('Failed to generate:', error);
      toast.error('Failed to generate post drafts');
    } finally {
      setGenerating(false);
    }
  };

  const handleUse = (platform) => {
    const text = editedDrafts[platform] || generatedDrafts?.[platform] || '';
    onInsert?.(text, platform);
    onClose();
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl mx-4 rounded-[20px] ${ct(
              'bg-white border-slate-200',
              'bg-zinc-900 border-zinc-800/60'
            )} border overflow-hidden`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${ct('border-slate-100', 'border-zinc-800/60')}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h2 className={`text-base font-semibold ${ct('text-slate-900', 'text-white')}`}>
                    Journal to Post
                  </h2>
                  <p className={`text-xs ${ct('text-slate-500', 'text-zinc-500')}`}>
                    Turn your daily reflections into social content
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${ct('text-slate-400 hover:bg-slate-100', 'text-zinc-500 hover:bg-zinc-800')} transition-colors`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {!generatedDrafts ? (
                <>
                  {/* Journal selection */}
                  <div className="space-y-2">
                    <label className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider`}>
                      Select journal entries (last 14 days)
                    </label>

                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                      </div>
                    ) : journals.length === 0 ? (
                      <div className={`text-center py-8 rounded-xl border border-dashed ${ct('border-slate-200', 'border-zinc-800/40')}`}>
                        <BookOpen className={`w-8 h-8 mx-auto mb-2 ${ct('text-slate-300', 'text-zinc-600')}`} />
                        <p className={`text-sm ${ct('text-slate-500', 'text-zinc-500')}`}>
                          No journal entries found in the last 14 days
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {journals.map((journal) => {
                          const isSelected = selectedJournals.find((j) => j.id === journal.id);
                          const overview = journal.overview || journal.daily_summary || 'No summary';
                          const highlights = Array.isArray(journal.highlights) ? journal.highlights : [];

                          return (
                            <button
                              key={journal.id}
                              onClick={() => toggleJournal(journal)}
                              className={`w-full text-left p-3 rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-yellow-500/5 border-yellow-500/30'
                                  : ct(
                                      'bg-slate-50 border-slate-200 hover:border-slate-300',
                                      'bg-zinc-800/30 border-zinc-800/40 hover:border-zinc-700'
                                    )
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  isSelected
                                    ? 'bg-yellow-400 border-yellow-400'
                                    : ct('border-slate-300', 'border-zinc-600')
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-black" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Calendar className={`w-3 h-3 ${ct('text-slate-400', 'text-zinc-500')}`} />
                                    <span className={`text-xs font-medium ${ct('text-slate-600', 'text-zinc-300')}`}>
                                      {formatDate(journal.journal_date)}
                                    </span>
                                  </div>
                                  <p className={`text-sm ${ct('text-slate-700', 'text-zinc-300')} line-clamp-2`}>
                                    {overview}
                                  </p>
                                  {highlights.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {highlights.slice(0, 3).map((h, i) => (
                                        <span
                                          key={i}
                                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${ct(
                                            'bg-slate-100 text-slate-500',
                                            'bg-zinc-800 text-zinc-500'
                                          )}`}
                                        >
                                          {typeof h === 'string' ? h.substring(0, 40) : ''}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Generated drafts */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <span className={`text-sm font-medium ${ct('text-slate-700', 'text-white')}`}>
                        Generated Drafts
                      </span>
                    </div>

                    {/* LinkedIn draft */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-medium text-blue-400`}>LinkedIn</label>
                        <button
                          onClick={() => handleUse('linkedin')}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          Use This
                        </button>
                      </div>
                      <textarea
                        value={editedDrafts.linkedin || ''}
                        onChange={(e) => setEditedDrafts({ ...editedDrafts, linkedin: e.target.value })}
                        rows={5}
                        className={`w-full px-4 py-3 text-sm rounded-xl border resize-none ${ct(
                          'bg-slate-50 border-slate-200 text-slate-900',
                          'bg-zinc-800/40 border-zinc-700/40 text-white'
                        )} focus:outline-none focus:border-blue-500/50 transition-colors`}
                      />
                    </div>

                    {/* Twitter draft */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-medium text-zinc-400`}>X (Twitter)</label>
                        <button
                          onClick={() => handleUse('twitter')}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-300 hover:bg-zinc-500/20 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          Use This
                        </button>
                      </div>
                      <textarea
                        value={editedDrafts.twitter || ''}
                        onChange={(e) => setEditedDrafts({ ...editedDrafts, twitter: e.target.value })}
                        rows={3}
                        className={`w-full px-4 py-3 text-sm rounded-xl border resize-none ${ct(
                          'bg-slate-50 border-slate-200 text-slate-900',
                          'bg-zinc-800/40 border-zinc-700/40 text-white'
                        )} focus:outline-none focus:border-zinc-500/50 transition-colors`}
                      />
                    </div>

                    <button
                      onClick={() => {
                        setGeneratedDrafts(null);
                        setEditedDrafts({});
                      }}
                      className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} hover:text-yellow-400 transition-colors`}
                    >
                      Back to journal selection
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!generatedDrafts && (
              <div className={`flex items-center justify-end px-6 py-4 border-t ${ct('border-slate-100', 'border-zinc-800/60')}`}>
                <button
                  onClick={handleGenerate}
                  disabled={generating || selectedJournals.length === 0}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-yellow-400 hover:bg-yellow-300 text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Generate Post{selectedJournals.length > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
