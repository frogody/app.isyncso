/**
 * Sub-step 1: Voice Configuration.
 * Quick tone/formality/audience inputs before LLM generation.
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Plus, X } from 'lucide-react';
import { TONE_WORDS, TONE_WORD_DESCRIPTIONS } from '../../../lib/verbal-engine/index.js';

export default function VoiceConfig({ brandDna, onChange }) {
  const strategy = brandDna?.strategy;
  const personality = brandDna?.personality_description || '';
  const values = strategy?.values?.slice(0, 2) || [];

  const toneWords = brandDna?._voiceToneWords || [];
  const formality = brandDna?._formalityLevel ?? 50;
  const humor = brandDna?._humorLevel ?? 30;
  const audiences = brandDna?._targetAudiences || [];

  const [newAudience, setNewAudience] = useState('');

  const toggleWord = useCallback((word) => {
    const current = toneWords.includes(word)
      ? toneWords.filter(w => w !== word)
      : toneWords.length < 5 ? [...toneWords, word] : toneWords;
    onChange({ _voiceToneWords: current });
  }, [toneWords, onChange]);

  const addAudience = useCallback(() => {
    const trimmed = newAudience.trim();
    if (!trimmed || audiences.length >= 4) return;
    onChange({ _targetAudiences: [...audiences, trimmed] });
    setNewAudience('');
  }, [newAudience, audiences, onChange]);

  const removeAudience = useCallback((idx) => {
    onChange({ _targetAudiences: audiences.filter((_, i) => i !== idx) });
  }, [audiences, onChange]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Define Your Brand Voice</h2>
        <p className="text-sm text-zinc-400">
          Set the tone and personality for all your brand communications.
        </p>
      </div>

      {/* Brand Context Summary */}
      <div className="rounded-[20px] bg-white/[0.03] border border-white/10 p-6 space-y-3">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Brand Context</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-zinc-500">Company</span>
            <p className="text-sm text-white">{brandDna?.company_name || 'Unnamed'}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500">Industry</span>
            <p className="text-sm text-white">{brandDna?.industry?.primary || 'General'}</p>
          </div>
        </div>
        {personality && (
          <div>
            <span className="text-xs text-zinc-500">Personality</span>
            <p className="text-sm text-zinc-300 line-clamp-2">{personality}</p>
          </div>
        )}
        {values.length > 0 && (
          <div>
            <span className="text-xs text-zinc-500">Top Values</span>
            <p className="text-sm text-zinc-300">{values.map(v => v.name || v).join(', ')}</p>
          </div>
        )}
        {strategy?.positioning?.statement && (
          <div>
            <span className="text-xs text-zinc-500">Positioning</span>
            <p className="text-sm text-zinc-300 line-clamp-2">{strategy.positioning.statement}</p>
          </div>
        )}
      </div>

      {/* Tone Word Selection */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Tone Words</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Select 3-5 words that describe how your brand should sound.
          {toneWords.length > 0 && (
            <span className="ml-2 text-yellow-400">{toneWords.length}/5 selected</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {TONE_WORDS.map((word) => {
            const selected = toneWords.includes(word);
            const disabled = !selected && toneWords.length >= 5;
            return (
              <motion.button
                key={word}
                whileHover={!disabled ? { scale: 1.03 } : undefined}
                whileTap={!disabled ? { scale: 0.97 } : undefined}
                onClick={() => !disabled && toggleWord(word)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                    : disabled
                    ? 'bg-zinc-800/30 text-zinc-600 border border-white/[0.04] cursor-not-allowed'
                    : 'bg-zinc-800/60 text-zinc-400 border border-white/[0.06] hover:border-white/20 hover:text-zinc-300'
                }`}
                title={TONE_WORD_DESCRIPTIONS[word]}
              >
                {word}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Formality & Humor Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-white">Formality</label>
            <span className="text-xs text-zinc-500 font-mono">{formality}/100</span>
          </div>
          <div className="flex items-center justify-between mb-2 text-[10px] text-zinc-600">
            <span>Very Casual</span>
            <span>Very Formal</span>
          </div>
          <Slider
            value={[formality]}
            onValueChange={([v]) => onChange({ _formalityLevel: v })}
            min={0}
            max={100}
            step={5}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-white">Humor</label>
            <span className="text-xs text-zinc-500 font-mono">{humor}/100</span>
          </div>
          <div className="flex items-center justify-between mb-2 text-[10px] text-zinc-600">
            <span>Serious</span>
            <span>Playful</span>
          </div>
          <Slider
            value={[humor]}
            onValueChange={([v]) => onChange({ _humorLevel: v })}
            min={0}
            max={100}
            step={5}
          />
        </div>
      </div>

      {/* Target Audiences */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Target Audiences</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Describe 1-4 audience segments your brand speaks to.
        </p>

        <div className="space-y-2 mb-3">
          {audiences.map((aud, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 border border-white/[0.06]"
            >
              <span className="text-sm text-zinc-300 flex-1">{aud}</span>
              <button
                onClick={() => removeAudience(idx)}
                className="p-1 rounded-md hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {audiences.length < 4 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newAudience}
              onChange={(e) => setNewAudience(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAudience()}
              placeholder="e.g., Small business owners aged 25-45"
              className="flex-1 px-3 py-2 text-sm bg-zinc-800/40 border border-white/[0.06] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400/40"
            />
            <button
              onClick={addAudience}
              disabled={!newAudience.trim()}
              className="px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-sm font-medium hover:bg-yellow-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
