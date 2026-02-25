/**
 * Stage 7: Applications.
 * Returns the same render-object as prior stages:
 *   { subStep, subStepCount, canProceed, nextLabel, goSubNext, goSubBack, content }
 *
 * Sub-step 1: StationeryPreview (business cards, letterhead, envelope)
 * Sub-step 2: DigitalPreview (email sig, social, OG, zoom)
 * Sub-step 3: PresentationWebPreview (slides + website mockups)
 *
 * All generation is synchronous client-side SVG composition — no LLM, no loading.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAutoSave } from '../../hooks/useAutoSave';
import {
  buildAllApplications,
  generateBusinessCardFront, generateBusinessCardBack,
  generateLetterhead, generateEnvelope,
  generateEmailSignatureHtml, generateEmailSignatureAssets,
  generateSocialProfiles, generateSocialCovers,
  generateSocialPostTemplate, generateOgImage, generateZoomBackground,
  generateSlides, generateDesktopMockup, generateMobileMockup,
} from '../../lib/application-engine/index.js';
import StationeryPreview from './applications/StationeryPreview';
import DigitalPreview from './applications/DigitalPreview';
import PresentationWebPreview from './applications/PresentationWebPreview';

export default function ApplicationsStage({ project, updateStageData, onNext }) {
  // ── State ──────────────────────────────────────────────────────
  const [subStep, setSubStep] = useState(1);

  // Generate all applications on mount (synchronous, fast)
  const generated = useMemo(() => {
    if (!project?.logo_system || !project?.color_system || !project?.typography_system) {
      return null;
    }
    try {
      return buildAllApplications(project);
    } catch (err) {
      console.error('[ApplicationsStage] Generation failed:', err);
      return null;
    }
  }, [
    project?.logo_system,
    project?.color_system,
    project?.typography_system,
    project?.brand_dna,
    project?.verbal_identity,
    project?.visual_language,
  ]);

  const [applications, setApplications] = useState(() => {
    return project?.applications || null;
  });

  // Set generated data if no saved data exists
  useEffect(() => {
    if (generated && !applications) {
      setApplications(generated);
    }
  }, [generated, applications]);

  // ── Auto-save ────────────────────────────────────────────────────
  const saveFn = useCallback(
    (data) => updateStageData(7, data),
    [updateStageData],
  );
  useAutoSave(saveFn, applications, 500);

  // ── Regeneration handler ─────────────────────────────────────────
  const handleRegenerate = useCallback((type) => {
    if (!applications || !project) return;

    try {
      let updated = { ...applications };

      switch (type) {
        case 'business_card_front':
          updated.stationery = { ...updated.stationery, business_card_front: generateBusinessCardFront(project) };
          break;
        case 'business_card_back':
          updated.stationery = { ...updated.stationery, business_card_back: generateBusinessCardBack(project) };
          break;
        case 'letterhead':
          updated.stationery = { ...updated.stationery, letterhead: generateLetterhead(project) };
          break;
        case 'envelope':
          updated.stationery = { ...updated.stationery, envelope: generateEnvelope(project) };
          break;
        case 'email_signature':
          updated.digital = {
            ...updated.digital,
            email_signature_html: generateEmailSignatureHtml(project),
            email_signature_assets: generateEmailSignatureAssets(project),
          };
          break;
        case 'social_profiles':
          updated.digital = { ...updated.digital, social_profiles: generateSocialProfiles(project) };
          break;
        case 'social_covers':
          updated.digital = { ...updated.digital, social_covers: generateSocialCovers(project) };
          break;
        case 'social_post':
          updated.digital = { ...updated.digital, social_post_templates: [generateSocialPostTemplate(project)] };
          break;
        case 'og_image':
          updated.digital = { ...updated.digital, og_image: generateOgImage(project) };
          break;
        case 'zoom_background':
          updated.digital = { ...updated.digital, zoom_background: generateZoomBackground(project) };
          break;
        case 'slides':
          updated.presentation = generateSlides(project);
          break;
        case 'website':
          updated.website_mockup = {
            ...updated.website_mockup,
            screenshot_desktop: generateDesktopMockup(project),
            screenshot_mobile: generateMobileMockup(project),
          };
          break;
        default:
          return;
      }

      setApplications(updated);
      toast.success('Mockup regenerated');
    } catch (err) {
      console.error('[ApplicationsStage] Regeneration failed:', err);
      toast.error('Regeneration failed');
    }
  }, [applications, project]);

  // ── Sub-step navigation ────────────────────────────────────────
  const goSubNext = useCallback(() => {
    if (subStep < 3) {
      setSubStep(subStep + 1);
    } else {
      // Final — save and advance
      updateStageData(7, applications);
      onNext();
    }
  }, [subStep, applications, updateStageData, onNext]);

  const goSubBack = useCallback(() => {
    if (subStep > 1) setSubStep(subStep - 1);
  }, [subStep]);

  // ── Validation ─────────────────────────────────────────────────
  const canProceed = applications != null;

  const nextLabel = useMemo(() => {
    if (subStep === 1) return 'Continue to Digital';
    if (subStep === 2) return 'Continue to Presentations';
    return 'Continue to Brand Book';
  }, [subStep]);

  // ── Missing data guard ─────────────────────────────────────────
  if (!generated && !applications) {
    return {
      subStep: 1,
      subStepCount: 3,
      canProceed: false,
      nextLabel: 'Continue to Digital',
      goSubNext: () => {},
      goSubBack: () => {},
      content: (
        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-[20px] bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-12">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-6">
            <span className="text-2xl font-bold text-yellow-400">!</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Missing Data</h2>
          <p className="text-sm text-zinc-400 text-center max-w-md">
            Complete the Logo System, Color System, and Typography stages first to generate application mockups.
          </p>
        </div>
      ),
    };
  }

  // ── Render object ──────────────────────────────────────────────
  return {
    subStep,
    subStepCount: 3,
    canProceed,
    nextLabel,
    goSubNext,
    goSubBack,
    content: (
      <AnimatePresence mode="wait">
        <motion.div
          key={subStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {subStep === 1 && (
            <StationeryPreview
              stationery={applications?.stationery}
              onRegenerate={handleRegenerate}
            />
          )}
          {subStep === 2 && (
            <DigitalPreview
              digital={applications?.digital}
              onRegenerate={handleRegenerate}
            />
          )}
          {subStep === 3 && (
            <PresentationWebPreview
              presentation={applications?.presentation}
              websiteMockup={applications?.website_mockup}
              onRegenerate={handleRegenerate}
            />
          )}
        </motion.div>
      </AnimatePresence>
    ),
  };
}
