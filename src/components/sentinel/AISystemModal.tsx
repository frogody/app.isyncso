import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Globe, Building2, Box, Database } from 'lucide-react';
import { SentinelButton } from './ui/SentinelButton';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';
import { cn } from '@/lib/utils';

interface AISystem {
  id?: string;
  name?: string;
  description?: string;
  purpose?: string;
  deployment_context?: string;
  ai_techniques?: string[];
  data_inputs?: string;
  decision_impact?: string;
  provider_name?: string;
  provider_url?: string;
  product_url?: string;
  assessment_answers?: Record<string, any>;
}

interface AISystemModalProps {
  system: AISystem | null;
  onClose: () => void;
  onSave: () => void;
  onCreateAndAssess?: (systemId: string) => void;
}

interface FormData {
  name: string;
  description: string;
  purpose: string;
  deployment_context: string;
  ai_techniques: string[];
  data_inputs: string;
  decision_impact: string;
  provider_name: string;
  provider_url: string;
  product_url: string;
  assessment_answers?: Record<string, any> | null;
}

interface ResearchData {
  productName: string;
  productUrl: string;
  providerName: string;
  providerUrl: string;
}

interface CideCompany {
  name: string;
  domain: string;
  source: string;
}

const AI_TECHNIQUE_OPTIONS = [
  { value: 'machine-learning', label: 'Machine Learning' },
  { value: 'deep-learning', label: 'Deep Learning' },
  { value: 'expert-systems', label: 'Expert Systems' },
  { value: 'generative-ai', label: 'Generative AI' },
  { value: 'computer-vision', label: 'Computer Vision' },
  { value: 'nlp', label: 'Natural Language Processing' },
  { value: 'other', label: 'Other' },
] as const;

export default function AISystemModal({ system, onClose, onSave, onCreateAndAssess }: AISystemModalProps) {
  const { st } = useSentinelTheme();

  const [formData, setFormData] = useState<FormData>({
    name: system?.name || '',
    description: system?.description || '',
    purpose: system?.purpose || '',
    deployment_context: system?.deployment_context || 'internal',
    ai_techniques: system?.ai_techniques || [],
    data_inputs: system?.data_inputs || '',
    decision_impact: system?.decision_impact || '',
    provider_name: system?.provider_name || '',
    provider_url: system?.provider_url || '',
    product_url: system?.product_url || '',
  });

  const [showResearchStep, setShowResearchStep] = useState(!system);
  const [researchData, setResearchData] = useState<ResearchData>({
    productName: system?.name || '',
    productUrl: system?.product_url || '',
    providerName: system?.provider_name || '',
    providerUrl: system?.provider_url || '',
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [cideCompanies, setCideCompanies] = useState<CideCompany[]>([]);
  const [loadingCide, setLoadingCide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCideCompanies = useCallback(async () => {
    setLoadingCide(true);
    try {
      const [prospects, companies] = await Promise.all([
        db.entities.Prospect.list('-updated_date', 10),
        db.entities.Company.list('-updated_date', 10),
      ]);
      setCideCompanies([
        ...prospects.map((p: any) => ({ name: p.name, domain: p.domain, source: 'prospect' })),
        ...companies.map((c: any) => ({ name: c.name, domain: c.domain, source: 'company' })),
      ]);
    } catch (e) {
      console.error('Failed to load companies:', e);
    } finally {
      setLoadingCide(false);
    }
  }, []);

  useEffect(() => {
    if (showResearchStep && !system) {
      loadCideCompanies();
    }
  }, [showResearchStep, system, loadCideCompanies]);

  const handleTechniqueToggle = useCallback((technique: string) => {
    setFormData(prev => ({
      ...prev,
      ai_techniques: prev.ai_techniques.includes(technique)
        ? prev.ai_techniques.filter(t => t !== technique)
        : [...prev.ai_techniques, technique],
    }));
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!researchData.productName || !researchData.providerName) {
      setError('Product Name and Provider Name are required for analysis');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await db.functions.invoke('analyzeAISystem', {
        ...researchData,
        deepResearch: true,
        includeRiskAssessment: true,
      });

      if (response.data) {
        const data = response.data;
        setFormData(prev => ({
          ...prev,
          name: researchData.productName,
          provider_name: researchData.providerName,
          provider_url: researchData.providerUrl,
          product_url: researchData.productUrl,
          description: data.description || '',
          purpose: data.purpose || '',
          deployment_context: data.deployment_context || 'internal',
          ai_techniques: data.ai_techniques || [],
          data_inputs: data.data_inputs || '',
          decision_impact: data.decision_impact || '',
          assessment_answers: {
            prohibited: data.prohibited_flags || {},
            highRisk: data.high_risk_flags || {},
            gpai: data.gpai_flags || {},
            transparency: data.transparency_flags || {},
          },
        }));
        setShowResearchStep(false);
      } else {
        throw new Error('No data returned from analysis');
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError('Analysis failed. You can try again or skip to manual entry.');
    } finally {
      setAnalyzing(false);
    }
  }, [researchData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) { setError('System name is required'); return; }
    if (!formData.purpose?.trim()) { setError('Purpose is required'); return; }
    if (formData.ai_techniques.length === 0) { setError('Please select at least one AI technique'); return; }

    setSaving(true);
    setError(null);

    try {
      const user = await db.auth.me();
      let companyId = user.company_id;

      if (!companyId && user.company_data?.domain) {
        const companies = await db.entities.Company.filter({ domain: user.company_data.domain });
        if (companies.length > 0) {
          companyId = companies[0].id;
        } else {
          const newCompany = await db.entities.Company.create({
            name: user.company_data.name || 'My Company',
            domain: user.company_data.domain,
            industry: user.company_data.industry,
            tech_stack: user.company_data.tech_stack || [],
          });
          companyId = newCompany.id;
        }
      }

      if (!companyId) {
        const domain = user.email.split('@')[1];
        const newCompany = await db.entities.Company.create({ name: domain, domain });
        companyId = newCompany.id;
      }

      const systemData = {
        name: formData.name,
        description: formData.description,
        purpose: formData.purpose,
        deployment_context: formData.deployment_context,
        ai_techniques: formData.ai_techniques,
        data_inputs: formData.data_inputs,
        decision_impact: formData.decision_impact,
        provider_name: formData.provider_name,
        provider_url: formData.provider_url,
        product_url: formData.product_url,
        company_id: companyId,
        created_by: user.id,
        assessment_answers: formData.assessment_answers || null,
      };

      let savedSystem: any;
      if (system?.id) {
        await db.entities.AISystem.update(system.id, systemData);
        savedSystem = { ...system, ...systemData };
      } else {
        savedSystem = await db.entities.AISystem.create(systemData);
      }

      if (!system?.id && onCreateAndAssess) {
        onCreateAndAssess(savedSystem.id);
      } else {
        onSave();
      }
    } catch (err: any) {
      console.error('Failed to save AI system:', err);
      setError(err.message || 'Failed to save AI system');
    } finally {
      setSaving(false);
    }
  }, [formData, system, onCreateAndAssess, onSave]);

  const inputClass = cn(
    'rounded-xl',
    st(
      'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400',
      'bg-zinc-900/40 border-zinc-800/60 text-white placeholder:text-zinc-500'
    )
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={cn(
        'border max-w-4xl max-h-[90vh] overflow-y-auto',
        st('bg-white border-emerald-200 text-slate-900', 'bg-black border-emerald-500/20 text-white')
      )}>
        <DialogHeader>
          <DialogTitle className={cn('text-2xl font-bold', st('text-slate-900', 'text-white'))}>
            {system ? 'Edit AI System' : 'Register New AI System'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
        {showResearchStep ? (
          <motion.div
            key="research"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 mt-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className={cn('mb-2 block flex items-center gap-2', st('text-slate-900', 'text-white'))}>
                  <Box className={cn('w-4 h-4', st('text-emerald-600', 'text-emerald-400'))} /> Product Name *
                </Label>
                <Input value={researchData.productName} onChange={(e) => setResearchData(prev => ({ ...prev, productName: e.target.value }))} placeholder="e.g., Einstein GPT" className={inputClass} />
              </div>
              <div className="col-span-2">
                <Label className={cn('mb-2 block flex items-center gap-2', st('text-slate-900', 'text-white'))}>
                  <Globe className={cn('w-4 h-4', st('text-emerald-600', 'text-emerald-400'))} /> Product Page URL
                </Label>
                <Input value={researchData.productUrl} onChange={(e) => setResearchData(prev => ({ ...prev, productUrl: e.target.value }))} placeholder="https://salesforce.com/einstein" className={inputClass} />
              </div>
              <div className="col-span-2">
                <Label className={cn('mb-2 block flex items-center gap-2', st('text-slate-900', 'text-white'))}>
                  <Building2 className={cn('w-4 h-4', st('text-emerald-600', 'text-emerald-400'))} /> Provider / Company Name *
                </Label>
                <Input value={researchData.providerName} onChange={(e) => setResearchData(prev => ({ ...prev, providerName: e.target.value }))} placeholder="e.g., Salesforce" className={inputClass} />
              </div>
              <div className="col-span-2">
                <Label className={cn('mb-2 block flex items-center gap-2', st('text-slate-900', 'text-white'))}>
                  <Globe className={cn('w-4 h-4', st('text-emerald-600', 'text-emerald-400'))} /> Provider Website
                </Label>
                <Input value={researchData.providerUrl} onChange={(e) => setResearchData(prev => ({ ...prev, providerUrl: e.target.value }))} placeholder="https://salesforce.com" className={inputClass} />
              </div>
            </div>

            <div className={cn('border rounded-[20px] p-4', st('bg-emerald-50 border-emerald-200', 'bg-emerald-500/5 border-emerald-500/20'))}>
              <h4 className={cn('font-semibold mb-3 flex items-center gap-2', st('text-emerald-700', 'text-emerald-400'))}>
                <Database className="w-4 h-4" /> Research with CIDE
              </h4>
              <p className={cn('text-sm mb-3', st('text-slate-600', 'text-zinc-300'))}>
                CIDE will conduct comprehensive research, analyze the AI system against all EU AI Act criteria, and pre-answer all risk assessment questions.
              </p>
              <div className={cn('rounded-xl p-3 mb-3', st('bg-white border border-slate-200', 'bg-zinc-900/40'))}>
                <p className={cn('text-xs mb-2', st('text-slate-500', 'text-zinc-400'))}>What CIDE will research:</p>
                <ul className={cn('text-xs space-y-1', st('text-slate-600', 'text-zinc-300'))}>
                  <li>System capabilities and technical architecture</li>
                  <li>Prohibited practices (Article 5)</li>
                  <li>High-risk categories (Annex III)</li>
                  <li>GPAI classification (Chapter V)</li>
                  <li>Transparency requirements (Article 50)</li>
                </ul>
              </div>
              <SentinelButton
                onClick={handleAnalyze}
                disabled={analyzing || !researchData.productName || !researchData.providerName}
                loading={analyzing}
                icon={!analyzing ? <Sparkles className="w-4 h-4" /> : undefined}
                className="w-full"
              >
                {analyzing ? 'Researching & Analyzing...' : 'Start CIDE Research'}
              </SentinelButton>
            </div>

            <div className="pt-2">
              <p className={cn('text-xs text-center', st('text-slate-500', 'text-zinc-500'))}>
                Or <button type="button" onClick={() => setShowResearchStep(false)} className={cn('underline', st('text-emerald-600 hover:text-emerald-700', 'text-emerald-400 hover:text-emerald-300'))}>skip to manual entry</button>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-6 mt-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="name" className={cn('mb-2 block', st('text-slate-900', 'text-white'))}>System Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Customer Support Chatbot" required className={inputClass} />
            </div>

            <div>
              <Label htmlFor="purpose" className={cn('mb-2 block', st('text-slate-900', 'text-white'))}>Purpose *</Label>
              <Textarea id="purpose" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="What does this AI system do?" required rows={3} className={inputClass} />
            </div>

            <div>
              <Label htmlFor="description" className={cn('mb-2 block', st('text-slate-900', 'text-white'))}>Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detailed description of the system" rows={3} className={inputClass} />
            </div>

            <div>
              <Label className={cn('mb-2 block', st('text-slate-900', 'text-white'))}>Deployment Context</Label>
              <select value={formData.deployment_context} onChange={(e) => setFormData({ ...formData, deployment_context: e.target.value })} className={cn(
                'w-full px-4 h-11 border rounded-xl text-sm transition-all duration-200',
                st(
                  'bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20',
                  'bg-zinc-900/40 border-zinc-800/60 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                )
              )}>
                <option value="internal">Internal Use</option>
                <option value="customer-facing">Customer-Facing</option>
                <option value="embedded-in-product">Embedded in Product</option>
              </select>
            </div>

            <div>
              <Label className={cn('mb-2 block', st('text-slate-900', 'text-white'))}>AI Techniques Used</Label>
              <div className="grid grid-cols-2 gap-2">
                {AI_TECHNIQUE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTechniqueToggle(option.value)}
                    className={cn(
                      'px-4 py-2 rounded-full border text-sm transition-colors',
                      formData.ai_techniques.includes(option.value)
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : st(
                            'bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100',
                            'bg-zinc-900/40 border-zinc-800/60 text-zinc-400 hover:bg-zinc-800/50'
                          )
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="data_inputs" className={cn('mb-2 block', st('text-slate-900', 'text-white'))}>Data Inputs</Label>
              <Textarea id="data_inputs" value={formData.data_inputs} onChange={(e) => setFormData({ ...formData, data_inputs: e.target.value })} placeholder="What data does this system process?" rows={2} className={inputClass} />
            </div>

            <div>
              <Label htmlFor="decision_impact" className={cn('mb-2 block', st('text-slate-900', 'text-white'))}>Decision Impact</Label>
              <Textarea id="decision_impact" value={formData.decision_impact} onChange={(e) => setFormData({ ...formData, decision_impact: e.target.value })} placeholder="What decisions does this system influence?" rows={2} className={inputClass} />
            </div>

            <div className="flex gap-3 pt-4">
              {!system && (
                <SentinelButton type="button" variant="ghost" onClick={() => setShowResearchStep(true)} icon={<Sparkles className="w-4 h-4" />} className="mr-auto">
                  Back to AI Research
                </SentinelButton>
              )}
              <SentinelButton type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </SentinelButton>
              <SentinelButton type="submit" disabled={saving} loading={saving} className="flex-1">
                {saving ? 'Saving...' : system ? 'Update System' : 'Save & Continue to Assessment'}
              </SentinelButton>
            </div>
          </motion.form>
        )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
