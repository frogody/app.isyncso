/**
 * Stage 4: Logo System.
 * Returns the same render-object as prior stages:
 *   { subStep, subStepCount, canProceed, nextLabel, goSubNext, goSubBack, content }
 *
 * Sub-step 1: LogoTypeSelection (logo type + keywords + style)
 * Sub-step 2: LogoConceptGrid (8-12 concepts, more-like-this)
 * Sub-step 3: LogoRefinement (tabbed editor + live preview)
 * Sub-step 4: LogoSystemPreview (all variations + rules)
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoSave } from '../../hooks/useAutoSave';
import {
  generateLogoConcepts,
  generateConceptVariations,
  generateLogoVariations,
  generateLogoRules,
  generateConstructionGrid,
} from '../../lib/logo-engine/index.js';
import { generateBrandImage, buildLogoPrompt } from '../../lib/brand-image-service.js';
import LogoTypeSelection from './logo-system/LogoTypeSelection';
import LogoConceptGrid from './logo-system/LogoConceptGrid';
import LogoRefinement from './logo-system/LogoRefinement';
import LogoSystemPreview from './logo-system/LogoSystemPreview';

const MIN_GENERATE_MS = 1500;

export default function LogoSystemStage({ project, updateStageData, onNext }) {
  // ── State ──────────────────────────────────────────────────────
  const [subStep, setSubStep] = useState(() => {
    return project?.brand_dna?._logoSubStep ?? 1;
  });

  const [concepts, setConcepts] = useState(() => {
    return project?.brand_dna?._logoConcepts || null;
  });

  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = project?.brand_dna?._logoSelectedIndex;
    return idx != null ? idx : null;
  });

  const [refinedConcept, setRefinedConcept] = useState(() => {
    return project?.brand_dna?._logoRefinedConcept || null;
  });

  const [logoSystem, setLogoSystem] = useState(() => {
    if (project?.logo_system && Object.keys(project.logo_system).length > 0) {
      return project.logo_system;
    }
    return null;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [aiLogos, setAiLogos] = useState(() => {
    return project?.brand_dna?._aiLogos || [];
  });
  const [aiLogosLoading, setAiLogosLoading] = useState(false);
  const [selectedAiLogoIndex, setSelectedAiLogoIndex] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // ── Derived ────────────────────────────────────────────────────
  const brandDna = project?.brand_dna;
  const palette = project?.color_system?.palette;
  const typography = project?.typography_system;

  // ── Auto-save logo system ──────────────────────────────────────
  const saveFn = useCallback(
    (data) => updateStageData(4, data),
    [updateStageData],
  );
  useAutoSave(saveFn, logoSystem, 500);

  // ── Handlers ───────────────────────────────────────────────────
  const handleTypeChange = useCallback((patch) => {
    // Write logo prefs back to brand_dna for persistence
    updateStageData(1, { ...brandDna, ...patch });
  }, [brandDna, updateStageData]);

  const handleConceptSelect = useCallback((idx) => {
    setSelectedIndex(idx);
    setSelectedAiLogoIndex(null); // Clear AI selection
  }, []);

  const handleAiLogoSelect = useCallback((idx) => {
    if (!aiLogos[idx]?.url) return;
    setSelectedAiLogoIndex(idx);
    setSelectedIndex(null); // Clear SVG selection
  }, [aiLogos]);

  const handleMoreLikeThis = useCallback((idx) => {
    if (!concepts?.[idx]) return;
    setIsLoadingMore(true);
    const start = Date.now();

    Promise.resolve().then(() => {
      try {
        const variations = generateConceptVariations(concepts[idx], project, 6);
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 800 - elapsed);

        setTimeout(() => {
          if (!mountedRef.current) return;
          setConcepts(prev => [...(prev || []), ...variations]);
          setIsLoadingMore(false);
          toast.success('Generated 6 variations');
        }, remaining);
      } catch (err) {
        console.error('[LogoSystemStage] Variation generation failed:', err);
        toast.error('Variation generation failed');
        setIsLoadingMore(false);
      }
    });
  }, [concepts, project]);

  const handleRefinementChange = useCallback((updatedConcept) => {
    setRefinedConcept(updatedConcept);
  }, []);

  // ── AI Logo Generation ───────────────────────────────────────
  const handleGenerateAiLogos = useCallback(async () => {
    setAiLogosLoading(true);
    const primaryColor = palette?.primary?.base || '#000000';
    const secondaryColor = palette?.secondary?.base || '#666666';
    const fontFamily = typography?.headings?.family || 'sans-serif';
    const industry = brandDna?.industry?.primary || 'business';
    const pv = brandDna?.personality_vector;
    const name = brandDna?.company_name || 'Brand';

    const tagline = brandDna?.strategy?.positioning?.statement?.split('.')[0] || '';

    const variations = [
      `Iconic symbol mark — a single distinctive abstract or geometric icon that captures the essence of ${industry || 'the business'}. No text, pure symbol. Think Apple, Nike, Airbnb level iconography.`,
      `Lettermark / Monogram — use the initials or first letter of "${name}" as the primary design element. Craft the letter(s) into a unique, ownable mark with distinctive character. Think IBM, HBO, Chanel.`,
      `Custom wordmark — the full name "${name}" set in a bespoke typographic treatment with unique character. The letterforms themselves become the brand mark through distinctive styling, spacing, or ligatures. Think Google, FedEx, Coca-Cola.`,
    ];

    try {
      const results = await Promise.allSettled(
        variations.map((variation) =>
          generateBrandImage({
            prompt: buildLogoPrompt({
              companyName: name,
              industry,
              personalityVector: pv,
              primaryColor,
              secondaryColor,
              fontFamily,
              variation,
              tagline,
            }),
            category: 'logo',
            width: 1024,
            height: 1024,
          })
        )
      );

      if (!mountedRef.current) return;

      const logos = results.map((r, i) => {
        if (r.status === 'fulfilled') return { url: r.value.url };
        console.error(`[LogoSystemStage] AI logo ${i} failed:`, r.reason);
        return { url: null, error: true };
      });

      setAiLogos(logos);
      // Persist to project for brand book PDF
      updateStageData(1, { ...brandDna, _aiLogos: logos });
      toast.success(`Generated ${logos.filter(l => l.url).length} AI logos`);
    } catch (err) {
      console.error('[LogoSystemStage] AI logo generation failed:', err);
      toast.error('AI logo generation failed');
    } finally {
      if (mountedRef.current) setAiLogosLoading(false);
    }
  }, [palette, typography, brandDna]);

  const handleRegenerateAiLogo = useCallback(async (index) => {
    const primaryColor = palette?.primary?.base || '#000000';
    const secondaryColor = palette?.secondary?.base || '#666666';
    const fontFamily = typography?.headings?.family || 'sans-serif';
    const industry = brandDna?.industry?.primary || 'business';
    const pv = brandDna?.personality_vector;
    const name = brandDna?.company_name || 'Brand';
    const tagline = brandDna?.strategy?.positioning?.statement?.split('.')[0] || '';
    const variations = [
      `Iconic symbol mark — a single distinctive abstract or geometric icon that captures the essence of ${industry || 'the business'}. No text, pure symbol. Think Apple, Nike, Airbnb level iconography.`,
      `Lettermark / Monogram — use the initials or first letter of "${name}" as the primary design element. Craft the letter(s) into a unique, ownable mark. Think IBM, HBO, Chanel.`,
      `Custom wordmark — the full name "${name}" set in a bespoke typographic treatment. The letterforms themselves become the brand mark. Think Google, FedEx, Coca-Cola.`,
    ];

    setAiLogos(prev => prev.map((l, i) => i === index ? { ...l, loading: true } : l));

    try {
      const result = await generateBrandImage({
        prompt: buildLogoPrompt({
          companyName: name,
          industry,
          personalityVector: pv,
          primaryColor,
          secondaryColor,
          fontFamily,
          tagline,
          variation: variations[index] || 'Creative logo concept with distinctive character',
        }),
        category: 'logo',
        width: 1024,
        height: 1024,
      });

      if (!mountedRef.current) return;
      setAiLogos(prev => {
        const updated = prev.map((l, i) => i === index ? { url: result.url } : l);
        updateStageData(1, { ...brandDna, _aiLogos: updated });
        return updated;
      });
      toast.success('Logo regenerated');
    } catch (err) {
      if (!mountedRef.current) return;
      setAiLogos(prev => prev.map((l, i) => i === index ? { url: null, error: true } : l));
      toast.error('Regeneration failed');
    }
  }, [palette, typography, brandDna]);

  // ── Sub-step navigation ────────────────────────────────────────
  const goSubNext = useCallback(() => {
    if (subStep === 1) {
      // Type selection → generate concepts
      setIsGenerating(true);
      const start = Date.now();

      Promise.resolve().then(() => {
        try {
          const generated = generateLogoConcepts(project);
          const elapsed = Date.now() - start;
          const remaining = Math.max(0, MIN_GENERATE_MS - elapsed);

          setTimeout(() => {
            if (!mountedRef.current) return;
            setConcepts(generated);
            setIsGenerating(false);
            setSubStep(2);
          }, remaining);
        } catch (err) {
          console.error('[LogoSystemStage] Concept generation failed:', err);
          toast.error('Logo generation failed');
          setIsGenerating(false);
        }
      });
    } else if (subStep === 2) {
      // AI logo selected → skip refinement, build simplified system
      if (selectedAiLogoIndex != null && aiLogos[selectedAiLogoIndex]?.url) {
        const aiLogo = aiLogos[selectedAiLogoIndex];
        const system = {
          concept: {
            ai_image_url: aiLogo.url,
            svg_source: null,
            design_rationale: `AI-generated ${['symbol mark', 'lettermark', 'wordmark'][selectedAiLogoIndex] || 'logo'} concept`,
            icon_keywords: brandDna?._iconKeywords || [],
            style: 'ai-generated',
          },
          variations: [],
          rules: {
            clear_space: '2x logo height on all sides',
            min_size: '24px',
            backgrounds: ['white', 'light neutral', 'dark'],
          },
          grid: null,
          exports: {},
        };
        setLogoSystem(system);
        setSubStep(4); // Skip refinement, go to system preview
        return;
      }
      // SVG concept selected → refinement
      if (selectedIndex == null || !concepts?.[selectedIndex]) return;
      setRefinedConcept(concepts[selectedIndex]);
      setSubStep(3);
    } else if (subStep === 3) {
      // Refinement → system preview (build full logo system)
      if (!refinedConcept) return;
      setIsGenerating(true);
      const start = Date.now();

      Promise.resolve().then(() => {
        try {
          const variations = generateLogoVariations(refinedConcept, project);
          const rules = generateLogoRules(refinedConcept, palette, typography);
          const grid = generateConstructionGrid(refinedConcept);

          const system = {
            concept: {
              svg_source: refinedConcept.svg_source,
              design_rationale: refinedConcept.design_rationale,
              icon_keywords: refinedConcept.icon_keywords || [],
              style: refinedConcept.style,
            },
            variations,
            rules,
            grid,
            exports: {},
          };

          const elapsed = Date.now() - start;
          const remaining = Math.max(0, 1000 - elapsed);

          setTimeout(() => {
            if (!mountedRef.current) return;
            setLogoSystem(system);
            setIsGenerating(false);
            setSubStep(4);
          }, remaining);
        } catch (err) {
          console.error('[LogoSystemStage] System build failed:', err);
          toast.error('Logo system build failed');
          setIsGenerating(false);
        }
      });
    } else if (subStep === 4) {
      // Final — save and advance
      if (logoSystem) {
        updateStageData(4, logoSystem);
      }
      onNext();
    }
  }, [subStep, project, selectedIndex, concepts, refinedConcept, palette, typography, logoSystem, updateStageData, onNext]);

  const goSubBack = useCallback(() => {
    if (subStep === 4) setSubStep(3);
    else if (subStep === 3) setSubStep(2);
    else if (subStep === 2) setSubStep(1);
  }, [subStep]);

  // ── Validation ─────────────────────────────────────────────────
  const canProceed = useMemo(() => {
    if (isGenerating) return false;

    if (subStep === 1) {
      const logoType = brandDna?._logoType;
      if (!logoType) return false;
      // Wordmark-only doesn't need keywords
      if (logoType === 'wordmark_only' || logoType === 'lettermark') return true;
      const keywords = brandDna?._iconKeywords || [];
      return keywords.length >= 3;
    }

    if (subStep === 2) return selectedIndex != null || selectedAiLogoIndex != null;
    if (subStep === 3) return refinedConcept != null;
    if (subStep === 4) return logoSystem != null;

    return true;
  }, [isGenerating, subStep, brandDna, selectedIndex, refinedConcept, logoSystem]);

  const nextLabel = useMemo(() => {
    if (subStep === 1) return 'Generate Concepts';
    if (subStep === 2) return selectedAiLogoIndex != null ? 'Use This Logo' : 'Refine Logo';
    if (subStep === 3) return 'View Full System';
    return 'Continue to Verbal Identity';
  }, [subStep, selectedAiLogoIndex]);

  // ── Loading overlay ────────────────────────────────────────────
  const loadingMessage = subStep === 1
    ? 'Generating logo concepts...'
    : 'Building logo system...';

  const loadingDetail = subStep === 1
    ? 'Combining typography, colors, and iconography'
    : 'Creating 6 variations \u00d7 7 color modes';

  const loadingOverlay = (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
      <p className="text-sm text-zinc-400">{loadingMessage}</p>
      <p className="text-xs text-zinc-600">{loadingDetail}</p>
    </div>
  );

  // ── Render object ──────────────────────────────────────────────
  const companyName = brandDna?.company_name || 'Your Brand';

  return {
    subStep,
    subStepCount: 4,
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
            <LogoTypeSelection
              brandDna={brandDna}
              palette={palette}
              typography={typography}
              onChange={handleTypeChange}
            />
          )}
          {subStep === 2 && concepts && (
            <LogoConceptGrid
              concepts={concepts}
              selectedIndex={selectedIndex}
              onSelect={handleConceptSelect}
              onMoreLikeThis={handleMoreLikeThis}
              isLoadingMore={isLoadingMore}
              aiLogos={aiLogos}
              aiLogosLoading={aiLogosLoading}
              onGenerateAiLogos={handleGenerateAiLogos}
              onRegenerateAiLogo={handleRegenerateAiLogo}
              selectedAiLogoIndex={selectedAiLogoIndex}
              onSelectAiLogo={handleAiLogoSelect}
            />
          )}
          {subStep === 3 && refinedConcept && (
            <LogoRefinement
              concept={refinedConcept}
              onChange={handleRefinementChange}
              typography={typography}
              palette={palette}
              companyName={companyName}
              brandDna={brandDna}
            />
          )}
          {subStep === 4 && logoSystem && (
            <LogoSystemPreview
              logoSystem={logoSystem}
              palette={palette}
            />
          )}
        </motion.div>
      </AnimatePresence>
    ),
  };
}
