import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, BarChart3, Clock, Eye, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

function PollPreview({ question, options, multiSelect, deadline }) {
  return (
    <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-4">
      <div className="flex items-start gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-white">{question || 'Your question here'}</p>
          {multiSelect && <span className="text-[10px] text-zinc-500">Multiple selections allowed</span>}
        </div>
      </div>
      <div className="space-y-2">
        {options.filter(o => o.trim()).map((opt, i) => (
          <div key={i} className="rounded-lg border border-zinc-700/40 bg-zinc-800/40 px-3 py-2 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border border-zinc-600 flex-shrink-0" />
            <span className="text-sm text-zinc-300">{opt}</span>
            <span className="text-xs text-zinc-500 ml-auto">0%</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-700/30 text-xs text-zinc-500">
        <span>0 votes</span>
        {deadline && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Ends {new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CreatePollModal({ isOpen, onClose, onSubmit }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiSelect, setMultiSelect] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const canSubmit = useMemo(() => {
    return question.trim().length > 0 && options.filter(o => o.trim()).length >= 2;
  }, [question, options]);

  const addOption = () => {
    if (options.length >= 10) {
      toast.error('Maximum 10 options allowed');
      return;
    }
    setOptions([...options, '']);
  };

  const removeOption = (index) => {
    if (options.length <= 2) {
      toast.error('Minimum 2 options required');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const pollData = {
      type: 'poll',
      question: question.trim(),
      options: options
        .filter(o => o.trim())
        .map((text, i) => ({
          id: `opt_${Date.now()}_${i}`,
          text: text.trim(),
          votes: [],
        })),
      multiSelect,
      deadline: deadline || null,
    };

    onSubmit?.(pollData);
    resetForm();
    onClose?.();
  };

  const resetForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setMultiSelect(false);
    setDeadline('');
    setShowPreview(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="w-full max-w-lg bg-zinc-900/95 border border-zinc-700/60 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">Create Poll</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showPreview
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-zinc-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={() => { resetForm(); onClose?.(); }}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-4">
            {showPreview ? (
              <div>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Preview</p>
                <PollPreview
                  question={question}
                  options={options}
                  multiSelect={multiSelect}
                  deadline={deadline}
                />
              </div>
            ) : (
              <>
                {/* Question */}
                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1.5">Question</label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What would you like to ask?"
                    className="w-full px-3 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                {/* Options */}
                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1.5">
                    Options ({options.filter(o => o.trim()).length} of {options.length})
                  </label>
                  <div className="space-y-2">
                    {options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 w-5 text-center flex-shrink-0">{i + 1}</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 px-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                        />
                        <button
                          onClick={() => removeOption(i)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors flex-shrink-0"
                          disabled={options.length <= 2}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {options.length < 10 && (
                    <button
                      onClick={addOption}
                      className="flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-cyan-400 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add option
                    </button>
                  )}
                </div>

                {/* Settings */}
                <div className="flex items-center gap-6 pt-2 border-t border-zinc-800/60">
                  {/* Multi-select */}
                  <button
                    onClick={() => setMultiSelect(!multiSelect)}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    {multiSelect ? (
                      <ToggleRight className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                    <span className="text-xs">Multi-select</span>
                  </button>

                  {/* Deadline */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="text-xs bg-transparent border-none text-zinc-400 focus:outline-none focus:text-white"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-800/60">
            <button
              onClick={() => { resetForm(); onClose?.(); }}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Create Poll
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
