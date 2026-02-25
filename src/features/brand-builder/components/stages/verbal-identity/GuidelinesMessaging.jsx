/**
 * Sub-step 3: Writing Guidelines, Messaging Framework & Sample Copy.
 * All sections editable inline.
 */
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, Plus, X, Check } from 'lucide-react';

const JARGON_OPTIONS = [
  { value: 'avoid', label: 'Avoid' },
  { value: 'use_sparingly', label: 'Use Sparingly' },
  { value: 'embrace', label: 'Embrace' },
];

const EMOJI_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: 'sparingly', label: 'Sparingly' },
  { value: 'frequently', label: 'Frequently' },
];

const SENTENCE_LENGTH_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'varied', label: 'Varied' },
];

const PARAGRAPH_LENGTH_OPTIONS = [
  { value: 'brief', label: 'Brief' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'detailed', label: 'Detailed' },
];

const CONTRACTION_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'always', label: 'Always' },
];

const EXCLAMATION_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'frequently', label: 'Frequently' },
];

const CAPITALIZATION_OPTIONS = [
  { value: 'sentence_case', label: 'Sentence case' },
  { value: 'title_case', label: 'Title Case' },
  { value: 'all_caps_headings', label: 'ALL CAPS Headings' },
];

export default function GuidelinesMessaging({
  writingGuidelines,
  messagingFramework,
  onChangeGuidelines,
  onChangeMessaging,
  onRegenerateSection,
  isRegenerating,
}) {
  const vocab = writingGuidelines?.vocabulary || {};
  const grammar = writingGuidelines?.grammar_style || {};
  const doDonts = writingGuidelines?.do_dont_pairs || [];
  const sampleCopy = writingGuidelines?.sample_copy || {};

  // ── Vocabulary helpers ──────────────────────────────────────────────
  const updateVocab = useCallback((field, value) => {
    onChangeGuidelines({
      ...writingGuidelines,
      vocabulary: { ...vocab, [field]: value },
    });
  }, [writingGuidelines, vocab, onChangeGuidelines]);

  const updatePreferredWord = useCallback((idx, field, value) => {
    const updated = [...(vocab.preferred_words || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    updateVocab('preferred_words', updated);
  }, [vocab, updateVocab]);

  const updateBannedWord = useCallback((idx, field, value) => {
    const updated = [...(vocab.banned_words || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    updateVocab('banned_words', updated);
  }, [vocab, updateVocab]);

  // ── Grammar helpers ─────────────────────────────────────────────────
  const updateGrammar = useCallback((field, value) => {
    onChangeGuidelines({
      ...writingGuidelines,
      grammar_style: { ...grammar, [field]: value },
    });
  }, [writingGuidelines, grammar, onChangeGuidelines]);

  // ── Do/Don't helpers ────────────────────────────────────────────────
  const updateDoDont = useCallback((idx, side, field, value) => {
    const updated = [...doDonts];
    updated[idx] = {
      ...updated[idx],
      [side]: { ...updated[idx][side], [field]: value },
    };
    onChangeGuidelines({ ...writingGuidelines, do_dont_pairs: updated });
  }, [doDonts, writingGuidelines, onChangeGuidelines]);

  // ── Sample Copy helpers ─────────────────────────────────────────────
  const updateCopy = useCallback((field, value) => {
    onChangeGuidelines({
      ...writingGuidelines,
      sample_copy: { ...sampleCopy, [field]: value },
    });
  }, [writingGuidelines, sampleCopy, onChangeGuidelines]);

  const updateHero = useCallback((field, value) => {
    onChangeGuidelines({
      ...writingGuidelines,
      sample_copy: {
        ...sampleCopy,
        homepage_hero: { ...sampleCopy.homepage_hero, [field]: value },
      },
    });
  }, [writingGuidelines, sampleCopy, onChangeGuidelines]);

  // ── Messaging helpers ───────────────────────────────────────────────
  const updateSegment = useCallback((idx, field, value) => {
    const updated = [...messagingFramework];
    updated[idx] = { ...updated[idx], [field]: value };
    onChangeMessaging(updated);
  }, [messagingFramework, onChangeMessaging]);

  const updateProofPoint = useCallback((segIdx, ppIdx, value) => {
    const updated = [...messagingFramework];
    const pp = [...(updated[segIdx].proof_points || [])];
    pp[ppIdx] = value;
    updated[segIdx] = { ...updated[segIdx], proof_points: pp };
    onChangeMessaging(updated);
  }, [messagingFramework, onChangeMessaging]);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Writing Guidelines & Messaging</h2>
        <p className="text-sm text-zinc-400">
          Your complete writing rulebook and messaging framework. Edit anything inline.
        </p>
      </div>

      {/* ── Vocabulary ───────────────────────────────────────────── */}
      <Section title="Vocabulary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preferred Words */}
          <div>
            <h4 className="text-xs font-medium text-green-400 mb-3 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Preferred Words
            </h4>
            <div className="space-y-2">
              {(vocab.preferred_words || []).map((pw, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-1.5">
                  <input
                    value={pw.word || ''}
                    onChange={(e) => updatePreferredWord(idx, 'word', e.target.value)}
                    className="text-xs text-green-400 bg-green-400/5 border border-green-400/10 rounded-md px-2 py-1 focus:outline-none focus:border-green-400/30"
                    placeholder="Use..."
                  />
                  <input
                    value={pw.instead_of || ''}
                    onChange={(e) => updatePreferredWord(idx, 'instead_of', e.target.value)}
                    className="text-xs text-red-400 bg-red-400/5 border border-red-400/10 rounded-md px-2 py-1 focus:outline-none focus:border-red-400/30"
                    placeholder="Instead of..."
                  />
                  <input
                    value={pw.why || ''}
                    onChange={(e) => updatePreferredWord(idx, 'why', e.target.value)}
                    className="text-xs text-zinc-400 bg-zinc-800/40 border border-white/[0.06] rounded-md px-2 py-1 focus:outline-none focus:border-white/20"
                    placeholder="Why..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Banned Words */}
          <div>
            <h4 className="text-xs font-medium text-red-400 mb-3 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Banned Words
            </h4>
            <div className="space-y-2">
              {(vocab.banned_words || []).map((bw, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-1.5">
                  <input
                    value={bw.word || ''}
                    onChange={(e) => updateBannedWord(idx, 'word', e.target.value)}
                    className="text-xs text-red-400 bg-red-400/5 border border-red-400/10 rounded-md px-2 py-1 focus:outline-none focus:border-red-400/30"
                    placeholder="Word..."
                  />
                  <input
                    value={bw.why || ''}
                    onChange={(e) => updateBannedWord(idx, 'why', e.target.value)}
                    className="text-xs text-zinc-400 bg-zinc-800/40 border border-white/[0.06] rounded-md px-2 py-1 focus:outline-none focus:border-white/20"
                    placeholder="Why banned..."
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Policies */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <PolicySelect
            label="Jargon Policy"
            options={JARGON_OPTIONS}
            value={vocab.jargon_policy || 'use_sparingly'}
            onChange={(v) => updateVocab('jargon_policy', v)}
          />
          <PolicySelect
            label="Emoji Policy"
            options={EMOJI_OPTIONS}
            value={vocab.emoji_policy || 'sparingly'}
            onChange={(v) => updateVocab('emoji_policy', v)}
          />
        </div>
      </Section>

      {/* ── Grammar Style ────────────────────────────────────────── */}
      <Section title="Grammar Style">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ToggleControl
            label="Oxford Comma"
            value={grammar.oxford_comma}
            onChange={(v) => updateGrammar('oxford_comma', v)}
          />
          <ToggleControl
            label="Active Voice"
            value={grammar.active_voice_preference}
            onChange={(v) => updateGrammar('active_voice_preference', v)}
          />
          <PolicySelect
            label="Sentence Length"
            options={SENTENCE_LENGTH_OPTIONS}
            value={grammar.sentence_length || 'varied'}
            onChange={(v) => updateGrammar('sentence_length', v)}
          />
          <PolicySelect
            label="Paragraph Length"
            options={PARAGRAPH_LENGTH_OPTIONS}
            value={grammar.paragraph_length || 'moderate'}
            onChange={(v) => updateGrammar('paragraph_length', v)}
          />
          <PolicySelect
            label="Contractions"
            options={CONTRACTION_OPTIONS}
            value={grammar.contraction_usage || 'sometimes'}
            onChange={(v) => updateGrammar('contraction_usage', v)}
          />
          <PolicySelect
            label="Exclamation Marks"
            options={EXCLAMATION_OPTIONS}
            value={grammar.exclamation_marks || 'rarely'}
            onChange={(v) => updateGrammar('exclamation_marks', v)}
          />
          <PolicySelect
            label="Capitalization"
            options={CAPITALIZATION_OPTIONS}
            value={grammar.capitalization || 'sentence_case'}
            onChange={(v) => updateGrammar('capitalization', v)}
          />
        </div>
      </Section>

      {/* ── Do's & Don'ts ────────────────────────────────────────── */}
      <Section title="Do's & Don'ts">
        <div className="space-y-3">
          {doDonts.map((pair, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-green-500/5 border border-green-500/15 p-3 space-y-1.5">
                <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Do</span>
                <textarea
                  value={pair.do_example?.text || ''}
                  onChange={(e) => updateDoDont(idx, 'do_example', 'text', e.target.value)}
                  rows={2}
                  className="w-full text-xs text-zinc-300 bg-transparent border-none resize-none focus:outline-none"
                />
                <input
                  value={pair.do_example?.explanation || ''}
                  onChange={(e) => updateDoDont(idx, 'do_example', 'explanation', e.target.value)}
                  className="w-full text-[10px] text-zinc-500 bg-transparent border-none focus:outline-none italic"
                  placeholder="Why this works..."
                />
              </div>
              <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-3 space-y-1.5">
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Don't</span>
                <textarea
                  value={pair.dont_example?.text || ''}
                  onChange={(e) => updateDoDont(idx, 'dont_example', 'text', e.target.value)}
                  rows={2}
                  className="w-full text-xs text-zinc-300 bg-transparent border-none resize-none focus:outline-none"
                />
                <input
                  value={pair.dont_example?.explanation || ''}
                  onChange={(e) => updateDoDont(idx, 'dont_example', 'explanation', e.target.value)}
                  className="w-full text-[10px] text-zinc-500 bg-transparent border-none focus:outline-none italic"
                  placeholder="Why this fails..."
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Messaging Framework ──────────────────────────────────── */}
      <Section title="Messaging Framework">
        <div className="space-y-4">
          {messagingFramework.map((seg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-[20px] bg-white/[0.03] border border-white/10 p-5 space-y-3"
            >
              <input
                value={seg.audience_segment || ''}
                onChange={(e) => updateSegment(idx, 'audience_segment', e.target.value)}
                className="text-sm font-semibold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-yellow-400/40 focus:outline-none w-full"
                placeholder="Audience segment..."
              />
              <textarea
                value={seg.key_message || ''}
                onChange={(e) => updateSegment(idx, 'key_message', e.target.value)}
                rows={2}
                className="w-full text-xs text-zinc-300 bg-zinc-800/40 border border-white/[0.06] rounded-lg p-2 resize-none focus:outline-none focus:border-white/20"
                placeholder="Key message..."
              />
              <div>
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Proof Points</span>
                <div className="space-y-1 mt-1">
                  {(seg.proof_points || []).map((pp, ppIdx) => (
                    <input
                      key={ppIdx}
                      value={pp}
                      onChange={(e) => updateProofPoint(idx, ppIdx, e.target.value)}
                      className="w-full text-xs text-zinc-400 bg-transparent border-b border-white/[0.04] focus:border-white/15 focus:outline-none py-0.5"
                      placeholder={`Proof point ${ppIdx + 1}...`}
                    />
                  ))}
                </div>
              </div>
              <input
                value={seg.tone_adjustment || ''}
                onChange={(e) => updateSegment(idx, 'tone_adjustment', e.target.value)}
                className="w-full text-[10px] text-yellow-400/70 bg-transparent border-none focus:outline-none italic"
                placeholder="Tone adjustment note..."
              />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Sample Copy ──────────────────────────────────────────── */}
      <Section title="Sample Copy" regenerate={() => onRegenerateSection('sample_copy')} isRegenerating={isRegenerating}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Homepage Hero */}
          <CopyMockup label="Homepage Hero" className="lg:col-span-2">
            <div className="space-y-2 text-center py-4">
              <input
                value={sampleCopy.homepage_hero?.headline || ''}
                onChange={(e) => updateHero('headline', e.target.value)}
                className="w-full text-lg font-bold text-white bg-transparent text-center border-none focus:outline-none"
                placeholder="Headline..."
              />
              <input
                value={sampleCopy.homepage_hero?.subheadline || ''}
                onChange={(e) => updateHero('subheadline', e.target.value)}
                className="w-full text-sm text-zinc-400 bg-transparent text-center border-none focus:outline-none"
                placeholder="Subheadline..."
              />
              <div className="inline-block px-4 py-1.5 rounded-full bg-yellow-400/20 border border-yellow-400/30">
                <input
                  value={sampleCopy.homepage_hero?.cta || ''}
                  onChange={(e) => updateHero('cta', e.target.value)}
                  className="text-xs font-semibold text-yellow-400 bg-transparent text-center border-none focus:outline-none w-24"
                  placeholder="CTA..."
                />
              </div>
            </div>
          </CopyMockup>

          <CopyMockup label="About Page Intro">
            <textarea
              value={sampleCopy.about_page_intro || ''}
              onChange={(e) => updateCopy('about_page_intro', e.target.value)}
              rows={3}
              className="w-full text-xs text-zinc-300 bg-transparent resize-none focus:outline-none"
            />
          </CopyMockup>

          <CopyMockup label="Social Media Post">
            <textarea
              value={sampleCopy.social_media_post || ''}
              onChange={(e) => updateCopy('social_media_post', e.target.value)}
              rows={3}
              className="w-full text-xs text-zinc-300 bg-transparent resize-none focus:outline-none"
            />
          </CopyMockup>

          <CopyMockup label="Email Newsletter Opening">
            <textarea
              value={sampleCopy.email_newsletter_opening || ''}
              onChange={(e) => updateCopy('email_newsletter_opening', e.target.value)}
              rows={3}
              className="w-full text-xs text-zinc-300 bg-transparent resize-none focus:outline-none"
            />
          </CopyMockup>

          <CopyMockup label="Product Description">
            <textarea
              value={sampleCopy.product_description || ''}
              onChange={(e) => updateCopy('product_description', e.target.value)}
              rows={3}
              className="w-full text-xs text-zinc-300 bg-transparent resize-none focus:outline-none"
            />
          </CopyMockup>

          <CopyMockup label="404 Page">
            <textarea
              value={sampleCopy.four_oh_four_page || ''}
              onChange={(e) => updateCopy('four_oh_four_page', e.target.value)}
              rows={2}
              className="w-full text-xs text-zinc-300 bg-transparent resize-none focus:outline-none"
            />
          </CopyMockup>

          <CopyMockup label="Onboarding Welcome">
            <textarea
              value={sampleCopy.onboarding_welcome || ''}
              onChange={(e) => updateCopy('onboarding_welcome', e.target.value)}
              rows={3}
              className="w-full text-xs text-zinc-300 bg-transparent resize-none focus:outline-none"
            />
          </CopyMockup>
        </div>
      </Section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function Section({ title, children, regenerate, isRegenerating }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {regenerate && (
          <button
            onClick={regenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          >
            {isRegenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Regenerate
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function PolicySelect({ label, options, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 mb-2 block">{label}</label>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
              value === opt.value
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                : 'bg-zinc-800/60 text-zinc-500 border border-white/[0.06] hover:border-white/20'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleControl({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 mb-2 block">{label}</label>
      <button
        onClick={() => onChange(!value)}
        className={`w-full py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
          value
            ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
            : 'bg-zinc-800/60 text-zinc-500 border border-white/[0.06] hover:border-white/20'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </button>
    </div>
  );
}

function CopyMockup({ label, children, className = '' }) {
  return (
    <div className={`rounded-[16px] bg-white/[0.03] border border-white/10 p-4 ${className}`}>
      <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-2">{label}</span>
      {children}
    </div>
  );
}
