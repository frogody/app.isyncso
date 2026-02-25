/**
 * Stage 8: Brand Book.
 * Returns the same render-object as prior stages:
 *   { subStep, subStepCount, canProceed, nextLabel, goSubNext, goSubBack, content }
 *
 * Sub-step 1: ConfigureStep (section toggles + metadata)
 * Sub-step 2: GeneratingStep (progress bar)
 * Sub-step 3: PreviewStep (download + overview)
 *
 * Generates a multi-page PDF brand guidelines document using @react-pdf/renderer.
 */
import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import {
  DEFAULT_SECTIONS,
  generateBrandBookPdf,
  generateQuickReference,
} from '../../lib/brand-book-engine/index.jsx';
import ConfigureStep from './brand-book/ConfigureStep';
import GeneratingStep from './brand-book/GeneratingStep';
import PreviewStep from './brand-book/PreviewStep';

export default function BrandBookStage({ project, updateStageData, onNext }) {
  // ── State ──────────────────────────────────────────────────────
  const [subStep, setSubStep] = useState(1);
  const [config, setConfig] = useState({
    sections: { ...DEFAULT_SECTIONS },
    version: '1.0',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    preparedBy: '',
    includeQuickRef: true,
  });

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [brandBook, setBrandBook] = useState(project?.brand_book || null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [quickRefUrl, setQuickRefUrl] = useState(null);

  // ── Generation pipeline ────────────────────────────────────────
  const startGeneration = useCallback(async () => {
    if (!project) return;
    setGenerating(true);
    setSubStep(2);

    try {
      // Progress callback
      const onProgress = (label, pct) => {
        setProgressLabel(label);
        setProgress(pct);
      };

      // Generate main PDF
      const { blob: mainBlob, sections } = await generateBrandBookPdf(
        project,
        config,
        onProgress,
      );

      // Create download URL
      const mainUrl = URL.createObjectURL(mainBlob);
      setPdfUrl(mainUrl);

      // Upload to storage
      onProgress('Uploading to storage...', 0.85);
      const mainPath = `brand-books/${project.id}/brand-book-v${config.version || '1.0'}.pdf`;
      let mainPublicUrl = '';
      try {
        await supabase.storage.from('brand-assets').upload(mainPath, mainBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });
        const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(mainPath);
        mainPublicUrl = urlData?.publicUrl || mainPath;
      } catch (err) {
        console.warn('[BrandBookStage] Storage upload failed, using local URL:', err);
        mainPublicUrl = mainPath;
      }

      // Generate quick reference if enabled
      let qrPublicUrl = '';
      if (config.includeQuickRef) {
        onProgress('Generating quick reference...', 0.9);
        const qrBlob = await generateQuickReference(project, onProgress);
        const qrUrl = URL.createObjectURL(qrBlob);
        setQuickRefUrl(qrUrl);

        const qrPath = `brand-books/${project.id}/quick-reference-v${config.version || '1.0'}.pdf`;
        try {
          await supabase.storage.from('brand-assets').upload(qrPath, qrBlob, {
            contentType: 'application/pdf',
            upsert: true,
          });
          const { data: qrUrlData } = supabase.storage.from('brand-assets').getPublicUrl(qrPath);
          qrPublicUrl = qrUrlData?.publicUrl || qrPath;
        } catch (err) {
          console.warn('[BrandBookStage] Quick ref upload failed:', err);
          qrPublicUrl = qrPath;
        }
      }

      // Build BrandBook data object
      const brandBookData = {
        pdf_path: mainPublicUrl,
        quick_reference_pdf_path: qrPublicUrl || null,
        html_path: null,
        page_count: sections.length * 3 + 2, // rough estimate
        sections,
      };

      setBrandBook(brandBookData);
      onProgress('Done', 1.0);
      toast.success('Brand book generated successfully');

      // Auto-advance to preview
      setTimeout(() => setSubStep(3), 500);
    } catch (err) {
      console.error('[BrandBookStage] Generation failed:', err);
      toast.error('Generation failed: ' + (err.message || 'Unknown error'));
      setSubStep(1);
    } finally {
      setGenerating(false);
    }
  }, [project, config]);

  // ── Download handler ───────────────────────────────────────────
  const handleDownload = useCallback((type) => {
    const url = type === 'quickref' ? quickRefUrl : pdfUrl;
    if (!url) return;

    const name = project?.brand_dna?.company_name || project?.name || 'Brand';
    const filename = type === 'quickref'
      ? `${name}-Quick-Reference.pdf`
      : `${name}-Brand-Guidelines.pdf`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [pdfUrl, quickRefUrl, project]);

  // ── Regenerate handler ─────────────────────────────────────────
  const handleRegenerate = useCallback(() => {
    // Clean up old URLs
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    if (quickRefUrl) URL.revokeObjectURL(quickRefUrl);
    setPdfUrl(null);
    setQuickRefUrl(null);
    setBrandBook(null);
    setSubStep(1);
  }, [pdfUrl, quickRefUrl]);

  // ── Sub-step navigation ────────────────────────────────────────
  const goSubNext = useCallback(() => {
    if (subStep === 1) {
      // Start generation
      startGeneration();
    } else if (subStep === 3) {
      // Final — save and advance
      if (brandBook) {
        updateStageData(8, brandBook);
      }
      onNext();
    }
  }, [subStep, startGeneration, brandBook, updateStageData, onNext]);

  const goSubBack = useCallback(() => {
    if (subStep === 3) {
      handleRegenerate();
    }
  }, [subStep, handleRegenerate]);

  // ── Validation ─────────────────────────────────────────────────
  const canProceed = useMemo(() => {
    if (subStep === 1) {
      // At least one section must be enabled
      return Object.values(config.sections).some(Boolean);
    }
    if (subStep === 2) return false; // generating
    if (subStep === 3) return brandBook != null;
    return false;
  }, [subStep, config.sections, brandBook]);

  const nextLabel = useMemo(() => {
    if (subStep === 1) return 'Generate Brand Book';
    if (subStep === 2) return 'Generating...';
    return 'Complete Project';
  }, [subStep]);

  // ── Missing data guard ─────────────────────────────────────────
  const hasRequiredData = project?.brand_dna && project?.color_system;
  if (!hasRequiredData) {
    return {
      subStep: 1,
      subStepCount: 3,
      canProceed: false,
      nextLabel: 'Generate Brand Book',
      goSubNext: () => {},
      goSubBack: () => {},
      content: (
        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-[20px] bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-12">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-6">
            <span className="text-2xl font-bold text-yellow-400">!</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Missing Data</h2>
          <p className="text-sm text-zinc-400 text-center max-w-md">
            Complete at least the Brand DNA and Color System stages to generate a brand book.
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
            <ConfigureStep config={config} setConfig={setConfig} />
          )}
          {subStep === 2 && (
            <GeneratingStep progress={progress} progressLabel={progressLabel} />
          )}
          {subStep === 3 && (
            <PreviewStep
              brandBook={brandBook}
              pdfUrl={pdfUrl}
              quickRefUrl={quickRefUrl}
              onDownload={handleDownload}
              onRegenerate={handleRegenerate}
            />
          )}
        </motion.div>
      </AnimatePresence>
    ),
  };
}
