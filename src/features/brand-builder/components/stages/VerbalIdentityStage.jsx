/**
 * Stage 5: Verbal Identity.
 * Returns the same render-object as prior stages:
 *   { subStep, subStepCount, canProceed, nextLabel, goSubNext, goSubBack, content }
 *
 * Sub-step 1: VoiceConfig (tone words + formality/humor + audiences)
 * Sub-step 2: VoiceToneReview (generated voice attributes + tone spectrum)
 * Sub-step 3: GuidelinesMessaging (writing guidelines + messaging + sample copy)
 */
import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoSave } from '../../hooks/useAutoSave';
import { buildBrandContext } from '../../lib/verbal-engine/index.js';
import VoiceConfig from './verbal-identity/VoiceConfig';
import VoiceToneReview from './verbal-identity/VoiceToneReview';
import GuidelinesMessaging from './verbal-identity/GuidelinesMessaging';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callVerbalIdentity(section, context) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-verbal-identity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ section, context }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default function VerbalIdentityStage({ project, updateStageData, onNext }) {
  // ── State ──────────────────────────────────────────────────────
  const [subStep, setSubStep] = useState(() => {
    return project?.brand_dna?._verbalSubStep || 1;
  });

  const [voiceAttributes, setVoiceAttributes] = useState(() => {
    return project?.verbal_identity?.voice_attributes || null;
  });

  const [toneSpectrum, setToneSpectrum] = useState(() => {
    return project?.verbal_identity?.tone_spectrum || null;
  });

  const [writingGuidelines, setWritingGuidelines] = useState(() => {
    if (project?.verbal_identity?.writing_guidelines) {
      return project.verbal_identity.writing_guidelines;
    }
    return null;
  });

  const [messagingFramework, setMessagingFramework] = useState(() => {
    return project?.verbal_identity?.messaging_framework || null;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ── Derived ────────────────────────────────────────────────────
  const brandDna = project?.brand_dna;

  // ── Auto-save assembled verbal identity ────────────────────────
  const verbalIdentity = useMemo(() => {
    if (!voiceAttributes && !toneSpectrum && !writingGuidelines && !messagingFramework) return null;
    return {
      voice_attributes: voiceAttributes || [],
      tone_spectrum: toneSpectrum || [],
      writing_guidelines: writingGuidelines || {},
      messaging_framework: messagingFramework || [],
    };
  }, [voiceAttributes, toneSpectrum, writingGuidelines, messagingFramework]);

  const saveFn = useCallback(
    (data) => updateStageData(5, data),
    [updateStageData],
  );
  useAutoSave(saveFn, verbalIdentity, 500);

  // ── Voice config onChange ──────────────────────────────────────
  const handleVoiceConfigChange = useCallback((patch) => {
    updateStageData(1, { ...brandDna, ...patch });
  }, [brandDna, updateStageData]);

  // ── Regeneration handler (individual items) ────────────────────
  const handleRegenerate = useCallback(async (type, index) => {
    setIsRegenerating(true);
    try {
      const context = buildBrandContext(project);
      if (type === 'attribute' || type === 'tone') {
        // Regenerate full voice_and_tone section (simplest approach)
        const result = await callVerbalIdentity('voice_and_tone', context);
        if (type === 'attribute' && result.voice_attributes?.[index]) {
          const updated = [...(voiceAttributes || [])];
          updated[index] = result.voice_attributes[index];
          setVoiceAttributes(updated);
          toast.success('Attribute regenerated');
        } else if (type === 'tone' && result.tone_spectrum?.[index]) {
          const updated = [...(toneSpectrum || [])];
          updated[index] = result.tone_spectrum[index];
          setToneSpectrum(updated);
          toast.success('Tone context regenerated');
        }
      } else if (type === 'sample_copy') {
        const context2 = {
          ...context,
          _voice_attributes: voiceAttributes,
          _writing_guidelines: writingGuidelines,
        };
        const result = await callVerbalIdentity('messaging_and_copy', context2);
        if (result.sample_copy) {
          setWritingGuidelines(prev => ({ ...prev, sample_copy: result.sample_copy }));
          toast.success('Sample copy regenerated');
        }
      }
    } catch (err) {
      console.error('[VerbalIdentityStage] Regeneration failed:', err);
      toast.error('Regeneration failed');
    } finally {
      setIsRegenerating(false);
    }
  }, [project, voiceAttributes, toneSpectrum, writingGuidelines]);

  // ── Sub-step navigation ────────────────────────────────────────
  const goSubNext = useCallback(async () => {
    if (subStep === 1) {
      // Voice config → generate voice & tone
      setIsGenerating(true);
      try {
        const context = buildBrandContext(project);
        const result = await callVerbalIdentity('voice_and_tone', context);
        setVoiceAttributes(result.voice_attributes || []);
        setToneSpectrum(result.tone_spectrum || []);
        setSubStep(2);
        toast.success('Voice profile generated');
      } catch (err) {
        console.error('[VerbalIdentityStage] Voice generation failed:', err);
        toast.error('Voice generation failed — check your connection and try again');
      } finally {
        setIsGenerating(false);
      }
    } else if (subStep === 2) {
      // Voice review → generate guidelines & messaging
      setIsGenerating(true);
      try {
        const context = buildBrandContext(project);
        context._voice_attributes = voiceAttributes;

        // Generate writing guidelines first
        const guidelinesResult = await callVerbalIdentity('writing_guidelines', context);

        // Then messaging + copy (using guidelines as additional context)
        context._writing_guidelines = guidelinesResult;
        const messagingResult = await callVerbalIdentity('messaging_and_copy', context);

        setWritingGuidelines({
          ...guidelinesResult,
          sample_copy: messagingResult.sample_copy || {},
        });
        setMessagingFramework(messagingResult.messaging_framework || []);
        setSubStep(3);
        toast.success('Guidelines & messaging generated');
      } catch (err) {
        console.error('[VerbalIdentityStage] Guidelines generation failed:', err);
        toast.error('Generation failed — check your connection and try again');
      } finally {
        setIsGenerating(false);
      }
    } else if (subStep === 3) {
      // Final — save and advance
      const fullIdentity = {
        voice_attributes: voiceAttributes || [],
        tone_spectrum: toneSpectrum || [],
        writing_guidelines: writingGuidelines || {},
        messaging_framework: messagingFramework || [],
      };
      updateStageData(5, fullIdentity);
      onNext();
    }
  }, [subStep, project, voiceAttributes, toneSpectrum, writingGuidelines, messagingFramework, updateStageData, onNext]);

  const goSubBack = useCallback(() => {
    if (subStep === 3) setSubStep(2);
    else if (subStep === 2) setSubStep(1);
  }, [subStep]);

  // ── Validation ─────────────────────────────────────────────────
  const canProceed = useMemo(() => {
    if (isGenerating) return false;

    if (subStep === 1) {
      const words = brandDna?._voiceToneWords || [];
      return words.length >= 3;
    }
    if (subStep === 2) {
      return voiceAttributes != null && voiceAttributes.length > 0;
    }
    if (subStep === 3) {
      return writingGuidelines != null;
    }

    return true;
  }, [isGenerating, subStep, brandDna, voiceAttributes, writingGuidelines]);

  const nextLabel = useMemo(() => {
    if (subStep === 1) return 'Generate Voice Profile';
    if (subStep === 2) return 'Generate Guidelines & Copy';
    return 'Continue to Visual Language';
  }, [subStep]);

  // ── Loading overlay ────────────────────────────────────────────
  const loadingMessages = {
    1: { title: 'Generating your brand voice...', detail: 'Analyzing personality, industry, and visual identity' },
    2: { title: 'Building writing guidelines & copy...', detail: 'Creating vocabulary rules, messaging, and sample content' },
  };
  const loading = loadingMessages[subStep] || loadingMessages[1];

  const loadingOverlay = (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
      <p className="text-sm text-zinc-400">{loading.title}</p>
      <p className="text-xs text-zinc-600">{loading.detail}</p>
    </div>
  );

  // ── Render object ──────────────────────────────────────────────
  return {
    subStep,
    subStepCount: 3,
    canProceed,
    nextLabel,
    goSubNext,
    goSubBack,
    content: isGenerating ? loadingOverlay : (
      <AnimatePresence mode="wait">
        <motion.div
          key={subStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {subStep === 1 && (
            <VoiceConfig
              brandDna={brandDna}
              onChange={handleVoiceConfigChange}
            />
          )}
          {subStep === 2 && voiceAttributes && toneSpectrum && (
            <VoiceToneReview
              voiceAttributes={voiceAttributes}
              toneSpectrum={toneSpectrum}
              onChangeAttributes={setVoiceAttributes}
              onChangeTone={setToneSpectrum}
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
            />
          )}
          {subStep === 3 && writingGuidelines && (
            <GuidelinesMessaging
              writingGuidelines={writingGuidelines}
              messagingFramework={messagingFramework || []}
              onChangeGuidelines={setWritingGuidelines}
              onChangeMessaging={setMessagingFramework}
              onRegenerateSection={handleRegenerate}
              isRegenerating={isRegenerating}
            />
          )}
        </motion.div>
      </AnimatePresence>
    ),
  };
}
