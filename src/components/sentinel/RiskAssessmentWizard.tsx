import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { Loader2, AlertTriangle, CheckCircle, Shield, ArrowRight, ArrowLeft, Info, Sparkles, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { SentinelCard } from './ui/SentinelCard';
import { SentinelButton } from './ui/SentinelButton';
import { SentinelBadge } from './ui/SentinelBadge';
import RiskClassificationBadge from './RiskClassificationBadge';
import type { RiskClassification } from '@/tokens/sentinel';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

interface RiskAssessmentWizardProps {
  systemId: string;
  onComplete?: () => void;
}

interface Answers {
  prohibited: Record<string, boolean>;
  highRisk: Record<string, boolean>;
  gpai: Record<string, boolean>;
  transparency: Record<string, boolean>;
}

interface AssessmentResult {
  classification: RiskClassification;
  reasoning: string;
  transparencyRequired: boolean;
  prohibitedFlags: string[];
  highRiskCategories: string[];
  gpaiFlags: string[];
  transparencyFlags: string[];
}

interface TrainingCourse {
  course_id: string;
  course: { title: string };
}

const PROHIBITED_CHECKS = [
  { id: 'subliminal', question: 'Does this system use subliminal techniques to materially distort behavior in a manner that causes harm?', article: 'Article 5(1)(a)' },
  { id: 'vulnerability', question: 'Does it exploit vulnerabilities of specific groups (age, disability, social/economic situation)?', article: 'Article 5(1)(b)' },
  { id: 'social_scoring', question: 'Is it used by public authorities for social scoring that leads to detrimental treatment?', article: 'Article 5(1)(c)' },
  { id: 'biometric_public', question: 'Does it use real-time remote biometric identification in publicly accessible spaces for law enforcement?', article: 'Article 5(1)(d)' },
  { id: 'emotion_workplace', question: 'Does it infer emotions in workplace or education contexts?', article: 'Article 5(1)(f)' },
  { id: 'biometric_categorization', question: 'Does it perform biometric categorization to infer sensitive attributes (race, political opinions, sexual orientation)?', article: 'Article 5(1)(e)' },
  { id: 'facial_scraping', question: 'Does it scrape facial images from the internet or CCTV for facial recognition databases?', article: 'Article 5(1)(g)' },
];

const HIGH_RISK_CATEGORIES = [
  { id: 'biometric', title: 'Biometric Identification and Categorization', description: 'Remote biometric identification of persons', annex: 'Annex III, Point 1' },
  { id: 'infrastructure', title: 'Critical Infrastructure', description: 'Safety component in management/operation of road traffic, water/gas/electricity supply', annex: 'Annex III, Point 2' },
  { id: 'education', title: 'Education and Vocational Training', description: 'Determining access, evaluating learning outcomes, monitoring students, detecting cheating', annex: 'Annex III, Point 3' },
  { id: 'employment', title: 'Employment and Worker Management', description: 'Recruitment, hiring, task allocation, monitoring, evaluation, promotion, termination', annex: 'Annex III, Point 4' },
  { id: 'essential_services', title: 'Access to Essential Services', description: 'Evaluating creditworthiness, pricing/risk for life/health insurance, assessing emergency services', annex: 'Annex III, Point 5' },
  { id: 'law_enforcement', title: 'Law Enforcement', description: 'Risk assessment for offense/reoffense, polygraphs, evidence evaluation, offense profiling', annex: 'Annex III, Point 6' },
  { id: 'migration', title: 'Migration, Asylum, Border Control', description: 'Polygraphs, risk assessment, authenticity verification, assisting authorities', annex: 'Annex III, Point 7' },
  { id: 'justice', title: 'Administration of Justice', description: 'Assisting judicial authorities in researching/interpreting facts and law', annex: 'Annex III, Point 8' },
];

const TRANSPARENCY_CHECKS = [
  { id: 'direct_interaction', question: 'Does this system interact directly with humans (chatbot, voice assistant)?', article: 'Article 50(1)' },
  { id: 'synthetic_content', question: 'Does it generate or manipulate synthetic content (deepfakes, AI-generated text/images)?', article: 'Article 50(2)' },
  { id: 'emotion_recognition', question: 'Does it perform emotion recognition (excluding prohibited contexts)?', article: 'Article 50(3)' },
  { id: 'biometric_categorization_transparent', question: 'Does it perform biometric categorization (excluding prohibited sensitive attributes)?', article: 'Article 50(4)' },
];

const stepTransition = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.25 },
};

export default function RiskAssessmentWizard({ systemId, onComplete }: RiskAssessmentWizardProps) {
  const { st } = useTheme();
  const [step, setStep] = useState(0);
  const [urls, setUrls] = useState({ website: '', product: '' });
  const [researching, setResearching] = useState(false);
  const [systemData, setSystemData] = useState<any>(null);
  const [answers, setAnswers] = useState<Answers>({ prohibited: {}, highRisk: {}, gpai: {}, transparency: {} });
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [trainingRecommendation, setTrainingRecommendation] = useState<TrainingCourse | null>(null);

  useEffect(() => {
    if (!systemId) return;
    db.entities.AISystem.get(systemId).then((system: any) => {
      setSystemData(system);
      if (system.provider_url || system.product_url) {
        setUrls({ website: system.provider_url || '', product: system.product_url || '' });
      }
      if (system.assessment_answers && typeof system.assessment_answers === 'object' && Object.keys(system.assessment_answers).length > 0) {
        setAnswers({
          prohibited: system.assessment_answers.prohibited || {},
          highRisk: system.assessment_answers.highRisk || {},
          gpai: { is_gpai: system.assessment_answers.gpai?.is_gpai ?? false, systemic_risk: system.assessment_answers.gpai?.systemic_risk ?? false },
          transparency: system.assessment_answers.transparency || {},
        });
        setStep(1);
      }
    }).catch((e: any) => console.error('Failed to load system:', e));
  }, [systemId]);

  const handleAnswer = useCallback((category: keyof Answers, id: string, value: boolean) => {
    setAnswers(prev => ({ ...prev, [category]: { ...prev[category], [id]: value } }));
  }, []);

  const calculateClassification = useCallback((): AssessmentResult => {
    const hasProhibited = Object.values(answers.prohibited).some(v => v === true);
    if (hasProhibited) {
      return { classification: 'prohibited', reasoning: 'System matches prohibited AI practice criteria under Article 5. Deployment is not permitted.', transparencyRequired: false, prohibitedFlags: Object.entries(answers.prohibited).filter(([, v]) => v).map(([k]) => k), highRiskCategories: [], gpaiFlags: [], transparencyFlags: [] };
    }
    const hasHighRisk = Object.values(answers.highRisk).some(v => v === true);
    const isGPAI = answers.gpai.is_gpai === true;
    const hasTransparency = Object.values(answers.transparency).some(v => v === true);

    if (hasHighRisk) return { classification: 'high-risk', reasoning: 'System falls under Annex III high-risk categories. Subject to full compliance requirements.', transparencyRequired: hasTransparency, prohibitedFlags: [], highRiskCategories: Object.entries(answers.highRisk).filter(([, v]) => v).map(([k]) => k), gpaiFlags: [], transparencyFlags: Object.entries(answers.transparency).filter(([, v]) => v).map(([k]) => k) };
    if (isGPAI) return { classification: 'gpai', reasoning: 'System is a General-Purpose AI model. Subject to Chapter V obligations.', transparencyRequired: hasTransparency, prohibitedFlags: [], highRiskCategories: [], gpaiFlags: ['gpai'], transparencyFlags: Object.entries(answers.transparency).filter(([, v]) => v).map(([k]) => k) };
    if (hasTransparency) return { classification: 'limited-risk', reasoning: 'System triggers transparency obligations under Article 50.', transparencyRequired: true, prohibitedFlags: [], highRiskCategories: [], gpaiFlags: [], transparencyFlags: Object.entries(answers.transparency).filter(([, v]) => v).map(([k]) => k) };
    return { classification: 'minimal-risk', reasoning: 'System does not fall under prohibited, high-risk, or GPAI categories. Minimal regulatory requirements apply.', transparencyRequired: false, prohibitedFlags: [], highRiskCategories: [], gpaiFlags: [], transparencyFlags: [] };
  }, [answers]);

  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      const assessmentResult = calculateClassification();
      setResult(assessmentResult);
      await db.entities.AISystem.update(systemId, {
        risk_classification: assessmentResult.classification,
        classification_reasoning: assessmentResult.reasoning,
        assessment_answers: answers,
        compliance_status: assessmentResult.classification === 'prohibited' ? 'non-compliant' : 'not-started',
      });
      if (assessmentResult.classification === 'high-risk' || assessmentResult.classification === 'gpai') {
        try {
          const user = await db.auth.me();
          const trainingResult = await db.functions.invoke('createComplianceTrainingRecommendation', { user_id: user.id, system_id: systemId, classification: assessmentResult.classification });
          if (trainingResult.data?.needed && trainingResult.data?.courses?.length > 0) {
            setTrainingRecommendation(trainingResult.data.courses[0]);
          }
        } catch { /* continue to results */ }
      }
      setStep(5);
    } catch (error) {
      console.error('Failed to save assessment:', error);
      alert('Failed to save assessment. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [systemId, calculateClassification, answers]);

  const handleAutoAssess = useCallback(async () => {
    if (!urls.website && !urls.product) { alert('Please provide at least one URL'); return; }
    setResearching(true);
    try {
      const response = await db.functions.invoke('analyzeAISystem', { productName: 'AI System', productUrl: urls.product, providerName: 'Provider', providerUrl: urls.website });
      if (response.data) {
        setAnswers({ prohibited: response.data.prohibited_flags || {}, highRisk: response.data.high_risk_flags || {}, gpai: response.data.gpai_flags || {}, transparency: response.data.transparency_flags || {} });
        setStep(1);
      }
    } catch { alert('Failed to analyze system. Please try manual assessment.'); } finally { setResearching(false); }
  }, [urls]);

  const prefilledBanner = systemData?.assessment_answers && (
    <div className={cn('border rounded-xl p-3 mt-3', st('bg-emerald-50 border-emerald-200', 'bg-emerald-500/10 border-emerald-500/20'))}>
      <p className={cn('text-xs', st('text-emerald-700', 'text-emerald-400'))}>Pre-filled by CIDE research. Review and adjust if needed.</p>
    </div>
  );

  const yesNoButtons = (category: keyof Answers, id: string, activeColor: string) => (
    <div className="flex gap-2">
      <button onClick={() => handleAnswer(category, id, true)} className={cn(
        'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
        answers[category][id] === true
          ? `${activeColor} text-white`
          : st('bg-slate-100 border border-slate-300 text-slate-500 hover:bg-slate-200', 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-800')
      )}>Yes</button>
      <button onClick={() => handleAnswer(category, id, false)} className={cn(
        'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
        answers[category][id] === false
          ? 'bg-green-500 text-white'
          : st('bg-slate-100 border border-slate-300 text-slate-500 hover:bg-slate-200', 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-800')
      )}>No</button>
    </div>
  );

  const inputClass = cn(
    'w-full h-11 border rounded-xl px-4 text-sm transition-all duration-200',
    st(
      'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20',
      'bg-zinc-900/40 border-zinc-800/60 text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
    )
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress bar */}
      {step > 0 && step < 5 && (
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <motion.div key={s} className={cn('flex-1 h-2 rounded-full', s <= step ? 'bg-emerald-500' : st('bg-slate-200', 'bg-zinc-800'))} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: s * 0.05 }} />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 0: AI-Powered Assessment */}
        {step === 0 && (
          <motion.div key="step0" {...stepTransition}>
            <SentinelCard padding="md">
              <div className="mb-4">
                <h2 className={cn('text-xl font-semibold flex items-center gap-2 mb-1', st('text-slate-900', 'text-white'))}>
                  <Shield className={cn('w-5 h-5', st('text-emerald-600', 'text-emerald-400'))} /> AI-Powered Risk Assessment
                </h2>
                <p className={cn('text-sm', st('text-slate-500', 'text-zinc-400'))}>
                  {systemData?.provider_url || systemData?.product_url
                    ? 'URLs loaded from system registration. Verify or edit before continuing.'
                    : 'Provide website URLs and let Sentinel AI research and classify your system automatically'}
                </p>
              </div>

              <div className={cn('border rounded-xl p-4 mb-6', st('bg-emerald-50 border-emerald-200', 'bg-emerald-500/5 border-emerald-500/20'))}>
                <h4 className={cn('font-semibold mb-2 flex items-center gap-2', st('text-emerald-700', 'text-emerald-400'))}><Sparkles className="w-4 h-4" /> How it works</h4>
                <ul className={cn('text-sm space-y-1', st('text-slate-600', 'text-zinc-300'))}>
                  <li>Sentinel AI researches your company and product</li>
                  <li>Auto-classifies against EU AI Act categories</li>
                  <li>Pre-fills assessment questions based on findings</li>
                  <li>You review and confirm the classification</li>
                </ul>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>Company Website</label>
                  <input type="url" value={urls.website} onChange={(e) => setUrls(prev => ({ ...prev, website: e.target.value }))} placeholder="https://example.com" className={inputClass} />
                </div>
                <div>
                  <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>Product/Software Page</label>
                  <input type="url" value={urls.product} onChange={(e) => setUrls(prev => ({ ...prev, product: e.target.value }))} placeholder="https://example.com/product" className={inputClass} />
                </div>
              </div>

              <SentinelButton onClick={handleAutoAssess} disabled={researching || (!urls.website && !urls.product)} loading={researching} icon={!researching ? <Sparkles className="w-4 h-4" /> : undefined} className="w-full mb-3">
                {researching ? 'Analyzing...' : 'Continue with AI Assessment'}
              </SentinelButton>
              <p className={cn('text-xs text-center', st('text-slate-500', 'text-zinc-500'))}>
                Or <button type="button" onClick={() => setStep(1)} className={cn('underline', st('text-emerald-600 hover:text-emerald-700', 'text-emerald-400 hover:text-emerald-300'))}>skip to manual assessment</button>
              </p>
            </SentinelCard>
          </motion.div>
        )}

        {/* Step 1: Prohibited Practices */}
        {step === 1 && (
          <motion.div key="step1" {...stepTransition}>
            <SentinelCard padding="md" className="border-red-500/20">
              <h2 className={cn('text-xl font-semibold flex items-center gap-2 mb-1', st('text-slate-900', 'text-white'))}>
                <AlertTriangle className="w-5 h-5 text-red-400" /> Step 1: Prohibited Practices Check
              </h2>
              <p className={cn('text-sm mb-2', st('text-slate-500', 'text-zinc-400'))}>These AI practices are banned under the EU AI Act.</p>
              {prefilledBanner}
              <div className="space-y-5 mt-6">
                {PROHIBITED_CHECKS.map(check => (
                  <div key={check.id} className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className={cn('text-sm mb-0.5', st('text-slate-900', 'text-white'))}>{check.question}</p>
                      <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>{check.article}</p>
                    </div>
                    {yesNoButtons('prohibited', check.id, 'bg-red-500')}
                  </div>
                ))}
              </div>
              <SentinelButton onClick={() => setStep(2)} className="w-full mt-6" icon={<ArrowRight className="w-4 h-4" />}>
                Continue to High-Risk Check
              </SentinelButton>
            </SentinelCard>
          </motion.div>
        )}

        {/* Step 2: High-Risk */}
        {step === 2 && (
          <motion.div key="step2" {...stepTransition}>
            <SentinelCard padding="md" className="border-orange-500/20">
              <h2 className={cn('text-xl font-semibold flex items-center gap-2 mb-1', st('text-slate-900', 'text-white'))}>
                <Shield className="w-5 h-5 text-orange-400" /> Step 2: High-Risk Categories (Annex III)
              </h2>
              <p className={cn('text-sm mb-2', st('text-slate-500', 'text-zinc-400'))}>Select any categories that apply.</p>
              {prefilledBanner}
              <div className="space-y-3 mt-6">
                {HIGH_RISK_CATEGORIES.map(cat => (
                  <button key={cat.id} type="button" onClick={() => handleAnswer('highRisk', cat.id, !answers.highRisk[cat.id])} className={cn(
                    'w-full text-left p-4 rounded-[20px] border transition-all',
                    answers.highRisk[cat.id]
                      ? 'border-orange-500/50 bg-orange-500/10'
                      : st('border-slate-200 hover:border-slate-300', 'border-zinc-800/60 hover:border-zinc-700')
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn('w-5 h-5 rounded border flex items-center justify-center mt-0.5 flex-shrink-0', answers.highRisk[cat.id] ? 'border-orange-500 bg-orange-500' : st('border-slate-300', 'border-zinc-700'))}>
                        {answers.highRisk[cat.id] && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <h4 className={cn('font-semibold text-sm mb-0.5', st('text-slate-900', 'text-white'))}>{cat.title}</h4>
                        <p className={cn('text-xs mb-0.5', st('text-slate-500', 'text-zinc-400'))}>{cat.description}</p>
                        <p className={cn('text-[10px]', st('text-slate-400', 'text-zinc-500'))}>{cat.annex}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <SentinelButton variant="secondary" onClick={() => setStep(1)} icon={<ArrowLeft className="w-4 h-4" />} className="flex-1">Back</SentinelButton>
                <SentinelButton onClick={() => setStep(3)} icon={<ArrowRight className="w-4 h-4" />} className="flex-1">Continue to GPAI Check</SentinelButton>
              </div>
            </SentinelCard>
          </motion.div>
        )}

        {/* Step 3: GPAI */}
        {step === 3 && (
          <motion.div key="step3" {...stepTransition}>
            <SentinelCard padding="md" className="border-purple-500/20">
              <h2 className={cn('text-xl font-semibold flex items-center gap-2 mb-1', st('text-slate-900', 'text-white'))}>
                <Info className="w-5 h-5 text-purple-400" /> Step 3: General-Purpose AI Check
              </h2>
              {prefilledBanner}
              <div className="space-y-6 mt-6">
                <div>
                  <p className={cn('text-sm mb-1', st('text-slate-900', 'text-white'))}>Is this a general-purpose AI model?</p>
                  <p className={cn('text-xs mb-3', st('text-slate-500', 'text-zinc-400'))}>A model trained on large amounts of data that can perform a wide range of tasks</p>
                  {yesNoButtons('gpai', 'is_gpai', 'bg-purple-500')}
                </div>
                {answers.gpai.is_gpai === true && (
                  <div>
                    <p className={cn('text-sm mb-1', st('text-slate-900', 'text-white'))}>Does it have systemic risk?</p>
                    <p className={cn('text-xs mb-3', st('text-slate-500', 'text-zinc-400'))}>Training compute &gt; 10^25 FLOPs or assessed as having systemic risk</p>
                    {yesNoButtons('gpai', 'systemic_risk', 'bg-purple-500')}
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <SentinelButton variant="secondary" onClick={() => setStep(2)} icon={<ArrowLeft className="w-4 h-4" />} className="flex-1">Back</SentinelButton>
                <SentinelButton onClick={() => setStep(4)} icon={<ArrowRight className="w-4 h-4" />} className="flex-1">Continue to Transparency Check</SentinelButton>
              </div>
            </SentinelCard>
          </motion.div>
        )}

        {/* Step 4: Transparency */}
        {step === 4 && (
          <motion.div key="step4" {...stepTransition}>
            <SentinelCard padding="md" className="border-yellow-500/20">
              <h2 className={cn('text-xl font-semibold flex items-center gap-2 mb-1', st('text-slate-900', 'text-white'))}>
                <Info className="w-5 h-5 text-yellow-400" /> Step 4: Transparency Requirements
              </h2>
              {prefilledBanner}
              <div className="space-y-5 mt-6">
                {TRANSPARENCY_CHECKS.map(check => (
                  <div key={check.id} className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className={cn('text-sm mb-0.5', st('text-slate-900', 'text-white'))}>{check.question}</p>
                      <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>{check.article}</p>
                    </div>
                    {yesNoButtons('transparency', check.id, 'bg-yellow-500')}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <SentinelButton variant="secondary" onClick={() => setStep(3)} icon={<ArrowLeft className="w-4 h-4" />} className="flex-1">Back</SentinelButton>
                <SentinelButton onClick={handleComplete} disabled={saving} loading={saving} className="flex-1">
                  {saving ? 'Calculating...' : 'Complete Assessment'}
                </SentinelButton>
              </div>
            </SentinelCard>
          </motion.div>
        )}

        {/* Step 5: Results */}
        {step === 5 && result && (
          <motion.div key="step5" {...stepTransition}>
            <SentinelCard padding="md">
              <h2 className={cn('text-xl font-semibold flex items-center gap-2 mb-6', st('text-slate-900', 'text-white'))}>
                <CheckCircle className={cn('w-5 h-5', st('text-emerald-600', 'text-emerald-400'))} /> Assessment Complete
              </h2>

              <div className="text-center py-6">
                <RiskClassificationBadge classification={result.classification} showHelp={false} size="md" />
              </div>

              <div className={cn('rounded-[20px] p-6 border mb-6', st('bg-slate-50 border-slate-200', 'bg-zinc-800/30 border-zinc-700/30'))}>
                <h3 className={cn('font-semibold mb-2', st('text-slate-900', 'text-white'))}>Classification Reasoning</h3>
                <p className={cn('leading-relaxed text-sm', st('text-slate-600', 'text-zinc-300'))}>{result.reasoning}</p>
              </div>

              {result.classification === 'prohibited' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                  <p className="text-red-400 font-medium text-sm">
                    This AI system matches prohibited AI practice criteria. Deployment is not permitted under the EU AI Act.
                  </p>
                </div>
              )}

              {trainingRecommendation && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-yellow-400 font-semibold mb-1 text-sm">Compliance Training Recommended</h4>
                      <p className={cn('text-sm mb-3', st('text-slate-600', 'text-zinc-300'))}>{trainingRecommendation.course.title}</p>
                      <Link to={createPageUrl(`CourseDetail?id=${trainingRecommendation.course_id}`)}>
                        <SentinelButton size="sm" variant="secondary" icon={<ArrowRight className="w-4 h-4" />}>
                          Start Training
                        </SentinelButton>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <SentinelButton onClick={() => onComplete?.()} className="w-full">
                View System Details
              </SentinelButton>
            </SentinelCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
