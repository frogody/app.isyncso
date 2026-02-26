/**
 * Stage 3: Typography System.
 * Returns the same render-object as ColorSystemStage:
 *   { subStep, subStepCount, canProceed, nextLabel, goSubNext, goSubBack, content }
 *
 * Sub-step 1: ThisOrThatFlow (3 binary rounds)
 * Sub-step 2: PairingSelectionGrid (pick from top 4)
 * Sub-step 3: TypographyFineTune (swap fonts, adjust size, review)
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoSave } from '../../hooks/useAutoSave';
import {
  generateFilteredPairings,
  getDirectionCardFonts,
  buildTypographySystem,
  getFontByFamily,
  loadGoogleFonts,
} from '../../lib/type-engine/index.js';
import ThisOrThatFlow from './typography/ThisOrThatFlow';
import PairingSelectionGrid from './typography/PairingSelectionGrid';
import TypographyFineTune from './typography/TypographyFineTune';

const MIN_GENERATE_MS = 1200;

export default function TypographySystemStage({ project, updateStageData, onNext }) {
  // ── State ──────────────────────────────────────────────────────
  const [subStep, setSubStep] = useState(() => {
    return project?.brand_dna?._typoSubStep ?? 1;
  });

  const [thisOrThatChoices, setThisOrThatChoices] = useState(() => {
    return project?.brand_dna?._typoChoices || [];
  });

  const [pairingCandidates, setPairingCandidates] = useState(() => {
    return project?.brand_dna?._typoPairings || null;
  });

  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = project?.brand_dna?._typoSelectedIndex;
    return idx != null ? idx : null;
  });

  const [typographySystem, setTypographySystem] = useState(() => {
    if (project?.typography_system && Object.keys(project.typography_system).length > 0) {
      return project.typography_system;
    }
    return null;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // ── Derived data ─────────────────────────────────────────────
  const brandDna = project?.brand_dna;
  const colorSystem = project?.color_system;
  const personalityVector = brandDna?.personality_vector || [50, 50, 50, 50, 50];
  const density = personalityVector[4] || 50;
  const colorTemperature = colorSystem?.temperature || 'neutral';
  const directionFontSet = useMemo(
    () => getDirectionCardFonts(brandDna?.selected_direction_ids),
    [brandDna?.selected_direction_ids]
  );

  // ── Auto-save typography system ──────────────────────────────
  const saveFn = useCallback(
    (data) => updateStageData(3, data),
    [updateStageData]
  );
  useAutoSave(saveFn, typographySystem, 500);

  // ── Handlers ─────────────────────────────────────────────────
  const handleChoicesComplete = useCallback((choices) => {
    setThisOrThatChoices(choices);
  }, []);

  const handlePairingSelect = useCallback((idx) => {
    setSelectedIndex(idx);
  }, []);

  // ── Sub-step navigation ──────────────────────────────────────
  const goSubNext = useCallback(() => {
    if (subStep === 1) {
      // Choices complete → generate pairings
      if (thisOrThatChoices.length < 3) return;
      setIsGenerating(true);
      const start = Date.now();

      // Preload and generate in microtask
      Promise.resolve().then(() => {
        try {
          const pairings = generateFilteredPairings(
            personalityVector,
            thisOrThatChoices,
            colorTemperature,
            directionFontSet,
          );

          // Preload pairing fonts
          const families = new Set();
          for (const p of pairings) {
            families.add(p.heading.family);
            families.add(p.body.family);
          }
          loadGoogleFonts([...families]);

          const elapsed = Date.now() - start;
          const remaining = Math.max(0, MIN_GENERATE_MS - elapsed);

          setTimeout(() => {
            if (!mountedRef.current) return;
            setPairingCandidates(pairings);
            setIsGenerating(false);
            setSubStep(2);
          }, remaining);
        } catch (err) {
          console.error('[TypographySystemStage] Generation failed:', err);
          toast.error('Font pairing generation failed');
          setIsGenerating(false);
        }
      });
    } else if (subStep === 2) {
      // Build full system from selected pairing
      if (selectedIndex == null || !pairingCandidates?.[selectedIndex]) return;
      const selected = pairingCandidates[selectedIndex];
      const accentFont = getFontByFamily('JetBrains Mono');
      const system = buildTypographySystem(
        selected.heading,
        selected.body,
        accentFont,
        density,
        16,
        selected.score,
        selected.reasons,
      );
      setTypographySystem(system);
      setSubStep(3);
    } else if (subStep === 3) {
      // Final — save and advance
      if (typographySystem) {
        updateStageData(3, typographySystem);
      }
      onNext();
    }
  }, [subStep, thisOrThatChoices, personalityVector, colorTemperature, directionFontSet, selectedIndex, pairingCandidates, density, typographySystem, updateStageData, onNext]);

  const goSubBack = useCallback(() => {
    if (subStep === 3) setSubStep(2);
    else if (subStep === 2) setSubStep(1);
  }, [subStep]);

  // ── Validation ───────────────────────────────────────────────
  const canProceed = useMemo(() => {
    if (isGenerating) return false;
    if (subStep === 1) return thisOrThatChoices.length >= 3;
    if (subStep === 2) return selectedIndex != null;
    return true; // sub-step 3 always valid
  }, [isGenerating, subStep, thisOrThatChoices, selectedIndex]);

  const nextLabel = useMemo(() => {
    if (subStep === 1) return 'See Font Pairings';
    if (subStep === 2) return 'Fine-Tune Typography';
    return 'Continue to Logo';
  }, [subStep]);

  // ── Loading overlay ──────────────────────────────────────────
  const loadingOverlay = (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
      <p className="text-sm text-zinc-400">Generating font pairings...</p>
      <p className="text-xs text-zinc-600">Matching personality, contrast, and x-height harmony</p>
    </div>
  );

  // ── Render object ────────────────────────────────────────────
  const brandName = brandDna?.company_name || 'Your Brand';
  const bodyText = brandDna?.strategy?.brand_story?.slice(0, 80) || 'Building something extraordinary together.';
  const palette = colorSystem?.palette;

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
            <ThisOrThatFlow
              brandDna={brandDna}
              colorSystem={colorSystem}
              choices={thisOrThatChoices}
              onChoiceComplete={handleChoicesComplete}
            />
          )}
          {subStep === 2 && pairingCandidates && (
            <PairingSelectionGrid
              pairings={pairingCandidates}
              selectedIndex={selectedIndex}
              onSelect={handlePairingSelect}
              brandName={brandName}
              bodyText={bodyText}
              palette={palette}
            />
          )}
          {subStep === 3 && typographySystem && (
            <TypographyFineTune
              typographySystem={typographySystem}
              onChange={setTypographySystem}
              personalityVector={personalityVector}
              colorTemperature={colorTemperature}
              directionFontSet={directionFontSet}
              palette={palette}
              brandName={brandName}
            />
          )}
        </motion.div>
      </AnimatePresence>
    ),
  };
}
