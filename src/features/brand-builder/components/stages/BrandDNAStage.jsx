import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAutoSave } from '../../hooks/useAutoSave';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import BusinessIdentity from './brand-dna/BusinessIdentity';
import BrandPersonality from './brand-dna/BrandPersonality';
import VisualDirection from './brand-dna/VisualDirection';
import StrategicInputs from './brand-dna/StrategicInputs';
import BrandDNAReview from './brand-dna/BrandDNAReview';

const INITIAL_BRAND_DNA = {
  company_name: '',
  tagline: null,
  industry: { primary: '', sub: '', sic_code: '' },
  company_stage: 'startup',
  personality_vector: [50, 50, 50, 50, 50],
  personality_description: '',
  visual_preference_vector: [],
  selected_direction_ids: [],
  strategy: {
    mission: '',
    vision: '',
    values: [],
    positioning: {
      target: '',
      category: '',
      differentiation: '',
      reason_to_believe: '',
      statement: '',
    },
    brand_story: '',
    tagline_options: [],
    elevator_pitch: '',
  },
  competitor_brands: [],
  must_words: [],
  must_not_words: [],
  existing_assets: null,
};

const SUB_STEP_LABELS = {
  1: 'Business Identity',
  2: 'Brand Personality',
  3: 'Visual Direction',
  4: 'Strategic Inputs',
  5: 'Review',
};

export default function BrandDNAStage({ project, updateStageData, onNext }) {
  const [brandDna, setBrandDna] = useState(() => {
    if (project?.brand_dna && Object.keys(project.brand_dna).length > 0) {
      return { ...INITIAL_BRAND_DNA, ...project.brand_dna };
    }
    return { ...INITIAL_BRAND_DNA };
  });

  const [subStep, setSubStep] = useState(() => {
    return project?.brand_dna?._subStep || project?.wizard_state?.brandDnaSubStep || 1;
  });

  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-save brand DNA data
  const saveFn = useCallback(
    (data) => updateStageData(1, data),
    [updateStageData]
  );
  useAutoSave(saveFn, brandDna, 500);

  // Patch handler — sub-screens call this to update slices of brandDna
  const handleChange = useCallback((patch) => {
    setBrandDna(prev => ({ ...prev, ...patch }));
  }, []);

  // Persist sub-step so page refreshes resume correctly
  const advanceSubStep = useCallback((newStep) => {
    setSubStep(newStep);
    setBrandDna(prev => ({ ...prev, _subStep: newStep }));
  }, []);

  // Strategy generation
  const generateStrategy = useCallback(async () => {
    setIsGenerating(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-brand-strategy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          company_name: brandDna.company_name,
          tagline: brandDna.tagline,
          industry: brandDna.industry,
          company_stage: brandDna.company_stage,
          personality_vector: brandDna.personality_vector,
          personality_description: brandDna.personality_description,
          selected_direction_ids: brandDna.selected_direction_ids,
          competitor_brands: brandDna.competitor_brands,
          must_words: brandDna.must_words,
          must_not_words: brandDna.must_not_words,
          problem: brandDna._problem || '',
          ideal_customer: brandDna._ideal_customer || '',
          differentiator: brandDna._differentiator || '',
        }),
      });

      if (!res.ok) {
        throw new Error(`Strategy generation failed: ${res.status}`);
      }

      const data = await res.json();
      if (data.strategy) {
        setBrandDna(prev => ({ ...prev, strategy: data.strategy }));
        toast.success('Brand strategy generated');
      }
    } catch (err) {
      console.error('[BrandDNAStage] Strategy generation failed:', err);
      toast.error('Strategy generation failed — you can edit manually');
    } finally {
      setIsGenerating(false);
      advanceSubStep(5);
    }
  }, [brandDna, advanceSubStep]);

  // Sub-step navigation
  const goSubNext = useCallback(() => {
    if (subStep === 4) {
      generateStrategy();
    } else if (subStep === 5) {
      // Final step — advance to stage 2
      updateStageData(1, brandDna);
      onNext();
    } else {
      advanceSubStep(Math.min(subStep + 1, 5));
    }
  }, [subStep, generateStrategy, updateStageData, brandDna, onNext, advanceSubStep]);

  const goSubBack = useCallback(() => {
    advanceSubStep(Math.max(subStep - 1, 1));
  }, [subStep, advanceSubStep]);

  // Validation per sub-step
  const canProceed = useMemo(() => {
    switch (subStep) {
      case 1:
        return brandDna.company_name.trim().length > 0 && brandDna.industry.primary.length > 0;
      case 2: {
        const moved = brandDna.personality_vector.some((v, i) => v !== 50);
        return moved || brandDna.personality_description.trim().length > 0;
      }
      case 3:
        return brandDna.selected_direction_ids.length >= 2 && brandDna.selected_direction_ids.length <= 3;
      case 4:
        return true; // optional screen
      case 5: {
        const s = brandDna.strategy;
        return s.mission.trim().length > 0 && s.vision.trim().length > 0 && (s.values?.length || 0) >= 2;
      }
      default:
        return true;
    }
  }, [subStep, brandDna]);

  const nextLabel = useMemo(() => {
    if (subStep === 4) return 'Generate Strategy';
    if (subStep === 5) return 'Continue to Colors';
    return 'Continue';
  }, [subStep]);

  // Build content — loading overlay or sub-screen
  const loadingOverlay = isGenerating ? (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
      <p className="text-sm text-zinc-400">Crafting your brand strategy...</p>
      <p className="text-xs text-zinc-600">This usually takes 5-10 seconds</p>
    </div>
  ) : null;

  return {
    subStep,
    subStepCount: 5,
    canProceed: isGenerating ? false : canProceed,
    nextLabel,
    goSubNext,
    goSubBack,
    skipLabel: subStep === 4 && !isGenerating ? 'Skip for now' : null,
    onSkip: subStep === 4 && !isGenerating ? () => { generateStrategy(); } : null,
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
            <BusinessIdentity data={brandDna} onChange={handleChange} />
          )}
          {subStep === 2 && (
            <BrandPersonality data={brandDna} onChange={handleChange} />
          )}
          {subStep === 3 && (
            <VisualDirection data={brandDna} onChange={handleChange} />
          )}
          {subStep === 4 && (
            <StrategicInputs data={brandDna} onChange={handleChange} />
          )}
          {subStep === 5 && (
            <BrandDNAReview
              data={brandDna}
              onChange={handleChange}
              onEditPersonality={() => setSubStep(2)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    ),
  };
}
