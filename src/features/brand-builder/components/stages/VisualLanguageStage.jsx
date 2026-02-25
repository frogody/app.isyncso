/**
 * Stage 6: Visual Language.
 * Returns the same render-object as prior stages:
 *   { subStep, subStepCount, canProceed, nextLabel, goSubNext, goSubBack, content }
 *
 * Sub-step 1: VisualConfig (photo moods + subjects + illustration style + icon style)
 * Sub-step 2: PhotographyIllustrationReview (LLM-generated photography + illustration)
 * Sub-step 3: IconographyPatterns (algorithmically generated icons + patterns)
 */
import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoSave } from '../../hooks/useAutoSave';
import { buildVisualContext, generateIconSet, rerenderIconSet, generatePatterns } from '../../lib/visual-engine/index.js';
import VisualConfig from './visual-language/VisualConfig';
import PhotographyIllustrationReview from './visual-language/PhotographyIllustrationReview';
import IconographyPatterns from './visual-language/IconographyPatterns';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callVisualLanguage(section, context) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-visual-language`, {
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

export default function VisualLanguageStage({ project, updateStageData, onNext }) {
  // ── State ──────────────────────────────────────────────────────
  const [subStep, setSubStep] = useState(() => {
    return project?.brand_dna?._visualSubStep ?? 1;
  });

  const [photography, setPhotography] = useState(() => {
    return project?.visual_language?.photography || null;
  });

  const [illustration, setIllustration] = useState(() => {
    return project?.visual_language?.illustration || null;
  });

  const [iconography, setIconography] = useState(() => {
    return project?.visual_language?.iconography || null;
  });

  const [patternSystem, setPatternSystem] = useState(() => {
    return project?.visual_language?.patterns || null;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ── Derived ────────────────────────────────────────────────────
  const brandDna = project?.brand_dna;
  const colorSystem = project?.color_system;

  // ── Auto-save assembled visual language ────────────────────────
  const visualLanguage = useMemo(() => {
    if (!photography && !illustration && !iconography && !patternSystem) return null;
    return {
      photography: photography || {},
      illustration: illustration || {},
      iconography: iconography || {},
      patterns: patternSystem || { patterns: [], graphic_devices: [] },
    };
  }, [photography, illustration, iconography, patternSystem]);

  const saveFn = useCallback(
    (data) => updateStageData(6, data),
    [updateStageData],
  );
  useAutoSave(saveFn, visualLanguage, 500);

  // ── Config onChange ──────────────────────────────────────────────
  const handleConfigChange = useCallback((patch) => {
    updateStageData(1, { ...brandDna, ...patch });
  }, [brandDna, updateStageData]);

  // ── Regeneration handler ──────────────────────────────────────────
  const handleRegenerate = useCallback(async (type) => {
    setIsRegenerating(true);
    try {
      const context = buildVisualContext(project);
      if (type === 'photography') {
        const result = await callVisualLanguage('photography', context);
        setPhotography(result);
        toast.success('Photography direction regenerated');
      } else if (type === 'illustration') {
        const result = await callVisualLanguage('illustration', context);
        setIllustration(result);
        toast.success('Illustration style regenerated');
      }
    } catch (err) {
      console.error('[VisualLanguageStage] Regeneration failed:', err);
      toast.error('Regeneration failed');
    } finally {
      setIsRegenerating(false);
    }
  }, [project]);

  const handleRegenerateIcons = useCallback(() => {
    try {
      const newIconography = generateIconSet(project);
      setIconography(newIconography);
      toast.success('Icon set regenerated');
    } catch (err) {
      console.error('[VisualLanguageStage] Icon regeneration failed:', err);
      toast.error('Icon regeneration failed');
    }
  }, [project]);

  const handleRegeneratePatterns = useCallback(() => {
    try {
      const newPatterns = generatePatterns(project);
      setPatternSystem(newPatterns);
      toast.success('Patterns regenerated');
    } catch (err) {
      console.error('[VisualLanguageStage] Pattern regeneration failed:', err);
      toast.error('Pattern regeneration failed');
    }
  }, [project]);

  // ── Handle icon style change (re-renders all icons) ──────────────
  const handleIconographyChange = useCallback((updated) => {
    // If style changed, re-render all icons
    if (updated.style !== iconography?.style) {
      const primaryColor = colorSystem?.palette?.primary?.base || '#000000';
      const secondaryColor = colorSystem?.palette?.secondary?.base || '#666666';
      const newBaseSet = rerenderIconSet(
        updated.base_set || [],
        updated.style,
        primaryColor,
        secondaryColor,
        updated.stroke_weight || 2,
      );
      setIconography({ ...updated, base_set: newBaseSet });
    } else {
      setIconography(updated);
    }
  }, [iconography?.style, colorSystem]);

  // ── Sub-step navigation ────────────────────────────────────────
  const goSubNext = useCallback(async () => {
    if (subStep === 1) {
      // Config → generate photography + illustration (parallel LLM calls)
      setIsGenerating(true);
      try {
        const context = buildVisualContext(project);

        const [photoResult, illustResult] = await Promise.all([
          callVisualLanguage('photography', context),
          callVisualLanguage('illustration', context),
        ]);

        setPhotography(photoResult);
        setIllustration(illustResult);
        setSubStep(2);
        toast.success('Visual direction generated');
      } catch (err) {
        console.error('[VisualLanguageStage] Generation failed:', err);
        toast.error('Generation failed — check your connection and try again');
      } finally {
        setIsGenerating(false);
      }
    } else if (subStep === 2) {
      // Photography/illustration review → generate icons + patterns (client-side, fast)
      try {
        const newIconography = generateIconSet(project);
        const newPatterns = generatePatterns(project);
        setIconography(newIconography);
        setPatternSystem(newPatterns);
        setSubStep(3);
        toast.success('Icons & patterns generated');
      } catch (err) {
        console.error('[VisualLanguageStage] Client generation failed:', err);
        toast.error('Generation failed');
      }
    } else if (subStep === 3) {
      // Final — save and advance
      const fullVisualLanguage = {
        photography: photography || {},
        illustration: illustration || {},
        iconography: iconography || {},
        patterns: patternSystem || { patterns: [], graphic_devices: [] },
      };
      updateStageData(6, fullVisualLanguage);
      onNext();
    }
  }, [subStep, project, photography, illustration, iconography, patternSystem, updateStageData, onNext]);

  const goSubBack = useCallback(() => {
    if (subStep === 3) setSubStep(2);
    else if (subStep === 2) setSubStep(1);
  }, [subStep]);

  // ── Validation ─────────────────────────────────────────────────
  const canProceed = useMemo(() => {
    if (isGenerating) return false;

    if (subStep === 1) {
      const moods = brandDna?._photoMoodPrefs || [];
      return moods.length >= 1 && brandDna?._illustrationStylePref && brandDna?._iconStylePref;
    }
    if (subStep === 2) {
      return photography != null && illustration != null;
    }
    if (subStep === 3) {
      return iconography != null && patternSystem != null;
    }

    return true;
  }, [isGenerating, subStep, brandDna, photography, illustration, iconography, patternSystem]);

  const nextLabel = useMemo(() => {
    if (subStep === 1) return 'Generate Visual Direction';
    if (subStep === 2) return 'Generate Icon Set & Patterns';
    return 'Continue to Applications';
  }, [subStep]);

  // ── Loading overlay ────────────────────────────────────────────
  const loadingMessages = {
    1: { title: 'Generating visual direction...', detail: 'Creating photography and illustration guidelines from your brand identity' },
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
            <VisualConfig
              brandDna={brandDna}
              colorSystem={colorSystem}
              onChange={handleConfigChange}
            />
          )}
          {subStep === 2 && photography && illustration && (
            <PhotographyIllustrationReview
              photography={photography}
              illustration={illustration}
              onChangePhotography={setPhotography}
              onChangeIllustration={setIllustration}
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
            />
          )}
          {subStep === 3 && iconography && patternSystem && (
            <IconographyPatterns
              iconography={iconography}
              patterns={patternSystem}
              onChangeIconography={handleIconographyChange}
              onChangePatterns={setPatternSystem}
              onRegenerateIcons={handleRegenerateIcons}
              onRegeneratePatterns={handleRegeneratePatterns}
              isRegenerating={isRegenerating}
            />
          )}
        </motion.div>
      </AnimatePresence>
    ),
  };
}
