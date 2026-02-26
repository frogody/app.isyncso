/**
 * Sub-step 2: Voice & Tone Review.
 * Shows generated voice attributes and tone spectrum cards. All editable.
 */
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { RefreshCw, Loader2 } from 'lucide-react';

const EXAMPLE_LABELS = {
  social_media: 'Social Media',
  website_hero: 'Website Hero',
  email_subject: 'Email Subject',
  error_message: 'Error Message',
  customer_support: 'Customer Support',
};

const TONE_SLIDER_CONFIG = [
  { key: 'formality', label: 'Formality', low: 'Casual', high: 'Formal' },
  { key: 'humor', label: 'Humor', low: 'Serious', high: 'Playful' },
  { key: 'technicality', label: 'Technicality', low: 'Simple', high: 'Technical' },
  { key: 'warmth', label: 'Warmth', low: 'Neutral', high: 'Warm' },
];

export default function VoiceToneReview({
  voiceAttributes,
  toneSpectrum,
  onChangeAttributes,
  onChangeTone,
  onRegenerate,
  isRegenerating,
}) {
  // Update a single voice attribute field
  const updateAttribute = useCallback((idx, field, value) => {
    const updated = [...voiceAttributes];
    if (field.startsWith('spectrum.')) {
      const subField = field.split('.')[1];
      updated[idx] = {
        ...updated[idx],
        spectrum: { ...updated[idx].spectrum, [subField]: value },
      };
    } else if (field.startsWith('example_sentences.')) {
      const subField = field.split('.')[1];
      updated[idx] = {
        ...updated[idx],
        example_sentences: { ...updated[idx].example_sentences, [subField]: value },
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    onChangeAttributes(updated);
  }, [voiceAttributes, onChangeAttributes]);

  // Update a single tone context field
  const updateTone = useCallback((idx, field, value) => {
    const updated = [...toneSpectrum];
    updated[idx] = { ...updated[idx], [field]: value };
    onChangeTone(updated);
  }, [toneSpectrum, onChangeTone]);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Your Brand Voice Profile</h2>
        <p className="text-sm text-zinc-400">
          Review and edit your voice attributes and tone spectrum. Everything is editable.
        </p>
      </div>

      {/* Voice Attributes */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Voice Attributes</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {voiceAttributes.map((attr, idx) => (
            <VoiceAttributeCard
              key={idx}
              attr={attr}
              index={idx}
              onUpdate={updateAttribute}
              onRegenerate={() => onRegenerate('attribute', idx)}
              isRegenerating={isRegenerating}
            />
          ))}
        </div>
      </section>

      {/* Tone Spectrum */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Tone Spectrum</h3>
        <p className="text-xs text-zinc-500">How your voice flexes across different contexts.</p>
        <div className="space-y-4">
          {toneSpectrum.map((tone, idx) => (
            <ToneContextCard
              key={idx}
              tone={tone}
              index={idx}
              onUpdate={updateTone}
              onRegenerate={() => onRegenerate('tone', idx)}
              isRegenerating={isRegenerating}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function VoiceAttributeCard({ attr, index, onUpdate, onRegenerate, isRegenerating }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-[20px] bg-white/[0.03] border border-white/10 hover:border-white/20 p-5 space-y-4 transition-colors duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <input
          value={attr.attribute}
          onChange={(e) => onUpdate(index, 'attribute', e.target.value)}
          className="text-sm font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-yellow-400/40 focus:outline-none w-full"
        />
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="p-1.5 rounded-lg bg-zinc-800/40 border border-white/[0.06] hover:bg-yellow-400/10 hover:border-yellow-400/20 text-zinc-500 hover:text-yellow-400 transition-all duration-200 shrink-0"
          title="Regenerate this attribute"
        >
          {isRegenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Description */}
      <textarea
        value={attr.description}
        onChange={(e) => onUpdate(index, 'description', e.target.value)}
        rows={2}
        className="w-full text-xs text-zinc-400 bg-transparent border border-transparent hover:border-white/10 focus:border-white/20 rounded-lg p-1.5 resize-none focus:outline-none"
      />

      {/* Spectrum */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">We are</span>
          <input
            value={attr.spectrum?.we_are || ''}
            onChange={(e) => onUpdate(index, 'spectrum.we_are', e.target.value)}
            className="w-full text-xs text-green-400 bg-green-400/5 border border-green-400/10 rounded-md px-2 py-1 focus:outline-none focus:border-green-400/30"
          />
        </div>
        <div className="text-zinc-700 text-xs font-bold mt-3">/</div>
        <div className="flex-1">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">We are not</span>
          <input
            value={attr.spectrum?.we_are_not || ''}
            onChange={(e) => onUpdate(index, 'spectrum.we_are_not', e.target.value)}
            className="w-full text-xs text-red-400 bg-red-400/5 border border-red-400/10 rounded-md px-2 py-1 focus:outline-none focus:border-red-400/30"
          />
        </div>
      </div>

      {/* Example Sentences */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Example Sentences</span>
        {Object.entries(EXAMPLE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="text-[10px] text-zinc-600 w-24 shrink-0 pt-1">{label}</span>
            <input
              value={attr.example_sentences?.[key] || ''}
              onChange={(e) => onUpdate(index, `example_sentences.${key}`, e.target.value)}
              className="flex-1 text-xs text-zinc-300 bg-transparent border-b border-white/[0.06] hover:border-white/15 focus:border-yellow-400/30 focus:outline-none py-0.5"
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ToneContextCard({ tone, index, onUpdate, onRegenerate, isRegenerating }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-[20px] bg-white/[0.03] border border-white/10 hover:border-white/20 p-5 transition-colors duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white">{tone.context}</h4>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="p-1.5 rounded-lg bg-zinc-800/40 border border-white/[0.06] hover:bg-yellow-400/10 hover:border-yellow-400/20 text-zinc-500 hover:text-yellow-400 transition-all duration-200"
          title="Regenerate this context"
        >
          {isRegenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {TONE_SLIDER_CONFIG.map(({ key, label, low, high }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-500">{label}</label>
              <span className="text-[10px] text-zinc-600 font-mono">{tone[key]}</span>
            </div>
            <Slider
              value={[tone[key] ?? 50]}
              onValueChange={([v]) => onUpdate(index, key, v)}
              min={0}
              max={100}
              step={5}
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[8px] text-zinc-700">{low}</span>
              <span className="text-[8px] text-zinc-700">{high}</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Example</span>
        <textarea
          value={tone.example_paragraph || ''}
          onChange={(e) => onUpdate(index, 'example_paragraph', e.target.value)}
          rows={3}
          className="w-full text-xs text-zinc-300 bg-zinc-800/40 border border-white/[0.06] rounded-lg p-2 resize-none focus:outline-none focus:border-white/20"
        />
      </div>
    </motion.div>
  );
}
