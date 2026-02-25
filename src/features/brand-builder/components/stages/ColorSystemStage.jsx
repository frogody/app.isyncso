/**
 * Stage 2: Color System.
 * Returns the same render-object as BrandDNAStage:
 *   { subStep, subStepCount, canProceed, nextLabel, goSubNext, goSubBack, content }
 *
 * Sub-step 1: PaletteSelectionGrid (pick from 6 variants)
 * Sub-step 2: ColorFineTune (adjust + review)
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoSave } from '../../hooks/useAutoSave';
import {
  generatePaletteVariants,
  buildColorSystem,
  buildFullPalette,
} from '../../lib/color-engine/index.js';
import { hexToHsl } from '../../lib/color-engine/color-utils.js';
import { getDensityHarmony } from '../../lib/color-engine/personality-mapping.js';
import PaletteSelectionGrid from './color-system/PaletteSelectionGrid';
import ColorFineTune from './color-system/ColorFineTune';

const MIN_GENERATE_MS = 1500; // polished delay

export default function ColorSystemStage({ project, updateStageData, onNext }) {
  // ── State ──────────────────────────────────────────────────────
  const [subStep, setSubStep] = useState(() => {
    return project?.brand_dna?._colorSubStep || 1;
  });

  const [candidates, setCandidates] = useState(() => {
    return project?.brand_dna?._colorCandidates || null;
  });

  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = project?.brand_dna?._colorSelectedIndex;
    return idx != null ? idx : null;
  });

  const [colorSystem, setColorSystem] = useState(() => {
    if (project?.color_system && Object.keys(project.color_system).length > 0) {
      return project.color_system;
    }
    return null;
  });

  // Keep a snapshot of the palette at selection time for "reset" in fine-tune
  const [originalPalette, setOriginalPalette] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);

  // ── Auto-save color system ─────────────────────────────────────
  const saveFn = useCallback(
    (data) => updateStageData(2, data),
    [updateStageData]
  );
  useAutoSave(saveFn, colorSystem, 500);

  // Persist wizard state into brand_dna (same pattern as BrandDNAStage)
  const persistWizardState = useCallback((patch) => {
    // We write to brand_dna so it auto-saves via the existing mechanism
    // The parent BrandBuilderWizard saves brand_dna changes
  }, []);

  // ── Generate candidates on mount if needed ─────────────────────
  const generatedRef = useRef(false);

  useEffect(() => {
    if (generatedRef.current) return;
    if (candidates) return; // already have them
    if (!project?.brand_dna) return;

    generatedRef.current = true;
    setIsGenerating(true);

    const start = Date.now();

    // Generate in a microtask to avoid blocking render
    Promise.resolve().then(() => {
      try {
        const variants = generatePaletteVariants(project.brand_dna);
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, MIN_GENERATE_MS - elapsed);

        setTimeout(() => {
          setCandidates(variants);
          setIsGenerating(false);
        }, remaining);
      } catch (err) {
        console.error('[ColorSystemStage] Generation failed:', err);
        toast.error('Color generation failed');
        setIsGenerating(false);
      }
    });
  }, [project?.brand_dna, candidates]);

  // ── Selection handler ──────────────────────────────────────────
  const handleSelect = useCallback((idx) => {
    setSelectedIndex(idx);
  }, []);

  // ── Custom primary ─────────────────────────────────────────────
  const handleCustomPrimary = useCallback((hex) => {
    if (!project?.brand_dna) return;
    const vector = project.brand_dna.personality_vector || [50, 50, 50, 50, 50];
    const density = vector[4] || 50;
    const hsl = hexToHsl(hex);
    const harmony = getDensityHarmony(density);
    const palette = buildFullPalette(hsl, harmony, project.brand_dna);

    const customVariant = {
      label: 'Custom',
      description: `Based on ${hex}`,
      palette,
      score: 50,
      index: candidates?.length || 6,
    };

    setCandidates(prev => {
      const next = prev ? [...prev] : [];
      // Replace last slot or add
      if (next.length >= 7) {
        next[6] = customVariant;
      } else {
        next.push(customVariant);
      }
      return next;
    });
    setSelectedIndex(candidates?.length >= 7 ? 6 : (candidates?.length || 6));
    toast.success('Custom palette generated');
  }, [project?.brand_dna, candidates]);

  // ── Sub-step navigation ────────────────────────────────────────
  const advanceSubStep = useCallback((newStep) => {
    setSubStep(newStep);
  }, []);

  const goSubNext = useCallback(() => {
    if (subStep === 1) {
      // Build full color system from selected variant
      if (selectedIndex == null || !candidates?.[selectedIndex]) return;
      const selected = candidates[selectedIndex];
      const system = buildColorSystem(selected.palette, project?.brand_dna);
      setColorSystem(system);
      setOriginalPalette(JSON.parse(JSON.stringify(selected.palette)));
      advanceSubStep(2);
    } else if (subStep === 2) {
      // Final — rebuild system from potentially modified palette, save, advance
      if (colorSystem) {
        const rebuilt = buildColorSystem(colorSystem.palette, project?.brand_dna);
        updateStageData(2, rebuilt);
      }
      onNext();
    }
  }, [subStep, selectedIndex, candidates, project?.brand_dna, colorSystem, advanceSubStep, updateStageData, onNext]);

  const goSubBack = useCallback(() => {
    if (subStep === 2) {
      advanceSubStep(1);
    }
  }, [subStep, advanceSubStep]);

  // ── Validation ─────────────────────────────────────────────────
  const canProceed = useMemo(() => {
    if (isGenerating) return false;
    if (subStep === 1) return selectedIndex != null;
    if (subStep === 2) return true;
    return true;
  }, [isGenerating, subStep, selectedIndex]);

  const nextLabel = useMemo(() => {
    if (subStep === 1) return 'Customize Colors';
    return 'Continue to Typography';
  }, [subStep]);

  // ── Loading overlay ────────────────────────────────────────────
  const loadingOverlay = (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
      <p className="text-sm text-zinc-400">Generating your color palettes...</p>
      <p className="text-xs text-zinc-600">Analyzing personality, harmony, and accessibility</p>
    </div>
  );

  // ── Render object ──────────────────────────────────────────────
  return {
    subStep,
    subStepCount: 2,
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
          {subStep === 1 && candidates && (
            <PaletteSelectionGrid
              variants={candidates}
              selectedIndex={selectedIndex}
              onSelect={handleSelect}
              onCustomPrimary={handleCustomPrimary}
            />
          )}
          {subStep === 2 && colorSystem && (
            <ColorFineTune
              colorSystem={colorSystem}
              onChange={setColorSystem}
              competitors={project?.brand_dna?.competitor_brands || []}
              originalPalette={originalPalette}
            />
          )}
        </motion.div>
      </AnimatePresence>
    ),
  };
}
