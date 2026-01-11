import React, { useState } from "react";
import { db } from "@/api/supabaseClient";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Shield, ArrowRight, ArrowLeft, Info, Sparkles, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * RiskAssessmentWizard - Multi-step wizard for classifying AI systems under EU AI Act
 * 
 * Classification Flow:
 * 1. Prohibited Practices Check (Article 5) → If YES: PROHIBITED
 * 2. High-Risk Categories (Annex III) → If YES: HIGH-RISK
 * 3. GPAI Check (Chapter V) → If YES: GPAI (with/without systemic risk)
 * 4. Transparency Requirements (Article 50) → If YES: LIMITED-RISK
 * 5. Results → Shows final classification with reasoning
 * 
 * Classification Algorithm:
 * - Prohibited trumps all (deployment banned)
 * - High-risk requires full compliance (CE marking, conformity assessment)
 * - GPAI has separate obligations under Chapter V
 * - Transparency requires user disclosure
 * - Minimal-risk is default (no matches)
 * 
 * Audit Trail:
 * - All answers stored in AISystem.assessment_answers
 * - Classification reasoning saved for documentation
 * 
 * @param {Object} props
 * @param {string} props.systemId - AISystem entity ID to assess
 * @param {Function} props.onComplete - Callback after assessment saved
 */

const PROHIBITED_CHECKS = [
  {
    id: "subliminal",
    question: "Does this system use subliminal techniques to materially distort behavior in a manner that causes harm?",
    article: "Article 5(1)(a)"
  },
  {
    id: "vulnerability",
    question: "Does it exploit vulnerabilities of specific groups (age, disability, social/economic situation)?",
    article: "Article 5(1)(b)"
  },
  {
    id: "social_scoring",
    question: "Is it used by public authorities for social scoring that leads to detrimental treatment?",
    article: "Article 5(1)(c)"
  },
  {
    id: "biometric_public",
    question: "Does it use real-time remote biometric identification in publicly accessible spaces for law enforcement?",
    article: "Article 5(1)(d)"
  },
  {
    id: "emotion_workplace",
    question: "Does it infer emotions in workplace or education contexts?",
    article: "Article 5(1)(f)"
  },
  {
    id: "biometric_categorization",
    question: "Does it perform biometric categorization to infer sensitive attributes (race, political opinions, sexual orientation)?",
    article: "Article 5(1)(e)"
  },
  {
    id: "facial_scraping",
    question: "Does it scrape facial images from the internet or CCTV for facial recognition databases?",
    article: "Article 5(1)(g)"
  }
];

const HIGH_RISK_CATEGORIES = [
  {
    id: "biometric",
    title: "Biometric Identification and Categorization",
    description: "Remote biometric identification of persons",
    annex: "Annex III, Point 1"
  },
  {
    id: "infrastructure",
    title: "Critical Infrastructure",
    description: "Safety component in management/operation of road traffic, water/gas/electricity supply",
    annex: "Annex III, Point 2"
  },
  {
    id: "education",
    title: "Education and Vocational Training",
    description: "Determining access, evaluating learning outcomes, monitoring students, detecting cheating",
    annex: "Annex III, Point 3"
  },
  {
    id: "employment",
    title: "Employment and Worker Management",
    description: "Recruitment, hiring, task allocation, monitoring, evaluation, promotion, termination",
    annex: "Annex III, Point 4"
  },
  {
    id: "essential_services",
    title: "Access to Essential Services",
    description: "Evaluating creditworthiness, pricing/risk for life/health insurance, assessing emergency services",
    annex: "Annex III, Point 5"
  },
  {
    id: "law_enforcement",
    title: "Law Enforcement",
    description: "Risk assessment for offense/reoffense, polygraphs, evidence evaluation, offense profiling, deep fakes detection",
    annex: "Annex III, Point 6"
  },
  {
    id: "migration",
    title: "Migration, Asylum, Border Control",
    description: "Polygraphs, risk assessment, authenticity verification, assisting authorities",
    annex: "Annex III, Point 7"
  },
  {
    id: "justice",
    title: "Administration of Justice",
    description: "Assisting judicial authorities in researching/interpreting facts and law",
    annex: "Annex III, Point 8"
  }
];

const TRANSPARENCY_CHECKS = [
  {
    id: "direct_interaction",
    question: "Does this system interact directly with humans (chatbot, voice assistant)?",
    article: "Article 50(1)"
  },
  {
    id: "synthetic_content",
    question: "Does it generate or manipulate synthetic content (deepfakes, AI-generated text/images)?",
    article: "Article 50(2)"
  },
  {
    id: "emotion_recognition",
    question: "Does it perform emotion recognition (excluding prohibited contexts)?",
    article: "Article 50(3)"
  },
  {
    id: "biometric_categorization_transparent",
    question: "Does it perform biometric categorization (excluding prohibited sensitive attributes)?",
    article: "Article 50(4)"
  }
];

export default function RiskAssessmentWizard({ systemId, onComplete }) {
  const [step, setStep] = useState(0); // Start at URL input step
  const [urls, setUrls] = useState({ website: '', product: '' });
  const [researching, setResearching] = useState(false);
  const [systemData, setSystemData] = useState(null);

  // Auto-load system data and pre-populate URLs and assessment answers
  React.useEffect(() => {
    if (systemId) {
      db.entities.AISystem.get(systemId).then(system => {
        console.log('Loaded system for assessment:', system);
        console.log('Assessment answers from system:', system.assessment_answers);
        console.log('Assessment answers JSON:', JSON.stringify(system.assessment_answers, null, 2));
        
        setSystemData(system);
        if (system.provider_url || system.product_url) {
          setUrls({
            website: system.provider_url || '',
            product: system.product_url || ''
          });
        }
        
        // Pre-populate assessment answers if they exist from CIDE research
        if (system.assessment_answers && typeof system.assessment_answers === 'object' && Object.keys(system.assessment_answers).length > 0) {
          console.log('Setting pre-filled answers:', system.assessment_answers);
          
          // Build the new answers state
          const newAnswers = {
            prohibited: system.assessment_answers.prohibited || {},
            highRisk: system.assessment_answers.highRisk || {},
            gpai: {
              is_gpai: system.assessment_answers.gpai?.is_gpai ?? false,
              systemic_risk: system.assessment_answers.gpai?.systemic_risk ?? false
            },
            transparency: system.assessment_answers.transparency || {}
          };
          
          console.log('NEW ANSWERS TO SET:', JSON.stringify(newAnswers, null, 2));
          
          // Set answers and step together
          setAnswers(newAnswers);
          setStep(1);
          
          console.log('Answers state updated and moved to step 1');
        }
      }).catch(e => console.error("Failed to load system:", e));
    }
  }, [systemId]);
  const [answers, setAnswers] = useState({
    prohibited: {},
    highRisk: {},
    gpai: {},
    transparency: {}
  });
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [trainingRecommendation, setTrainingRecommendation] = useState(null);

  const handleAnswer = React.useCallback((category, id, value) => {
    setAnswers(prev => ({
      ...prev,
      [category]: { ...prev[category], [id]: value }
    }));
  }, []);

  /**
   * Calculates final risk classification based on wizard answers.
   * 
   * Priority Order:
   * 1. Prohibited (any yes) → prohibited
   * 2. High-Risk (any yes) → high-risk
   * 3. GPAI (is_gpai) → gpai (check systemic_risk for enhanced obligations)
   * 4. Transparency (any yes) → limited-risk
   * 5. None match → minimal-risk
   * 
   * @returns {Object} { classification, reasoning, transparencyRequired, flags }
   */
  const calculateClassification = React.useCallback(() => {
    // Check prohibited - highest priority
    const hasProhibited = Object.values(answers.prohibited).some(v => v === true);
    if (hasProhibited) {
      return {
        classification: "prohibited",
        reasoning: "System matches prohibited AI practice criteria under Article 5 of the EU AI Act. Deployment is not permitted.",
        obligations: [],
        transparencyRequired: false
      };
    }

    // Check high-risk
    const hasHighRisk = Object.values(answers.highRisk).some(v => v === true);
    
    // Check GPAI
    const isGPAI = answers.gpai.is_gpai === true;
    const hasSystemicRisk = answers.gpai.systemic_risk === true;

    // Check transparency
    const hasTransparency = Object.values(answers.transparency).some(v => v === true);

    let classification, reasoning;
    
    if (hasHighRisk) {
      classification = "high-risk";
      reasoning = "System falls under one or more Annex III high-risk categories. Subject to full compliance requirements including conformity assessment, CE marking, and EU database registration.";
    } else if (isGPAI) {
      classification = hasSystemicRisk ? "gpai" : "gpai";
      reasoning = isGPAI 
        ? "System is a General-Purpose AI model with systemic risk. Subject to Chapter V obligations including model evaluation and incident reporting."
        : "System is a General-Purpose AI model. Subject to transparency and documentation requirements under Chapter V.";
    } else if (hasTransparency) {
      classification = "limited-risk";
      reasoning = "System triggers transparency obligations under Article 50. Users must be informed they are interacting with AI.";
    } else {
      classification = "minimal-risk";
      reasoning = "System does not fall under prohibited, high-risk, or GPAI categories. Minimal regulatory requirements apply.";
    }

    return {
      classification,
      reasoning,
      transparencyRequired: hasTransparency,
      prohibitedFlags: Object.entries(answers.prohibited).filter(([k,v]) => v).map(([k]) => k),
      highRiskCategories: Object.entries(answers.highRisk).filter(([k,v]) => v).map(([k]) => k),
      gpaiFlags: isGPAI ? ['gpai'] : [],
      transparencyFlags: Object.entries(answers.transparency).filter(([k,v]) => v).map(([k]) => k)
    };
  }, [answers]);

  const handleComplete = React.useCallback(async () => {
    setSaving(true);
    try {
      const assessmentResult = calculateClassification();
      setResult(assessmentResult);

      // Update AI system with classification
      await db.entities.AISystem.update(systemId, {
        risk_classification: assessmentResult.classification,
        classification_reasoning: assessmentResult.reasoning,
        assessment_answers: answers,
        compliance_status: assessmentResult.classification === 'prohibited' ? 'non-compliant' : 'not-started'
      });

      // Check for compliance training recommendations
      if (assessmentResult.classification === 'high-risk' || assessmentResult.classification === 'gpai') {
        try {
          const user = await db.auth.me();
          const trainingResult = await db.functions.invoke('createComplianceTrainingRecommendation', {
            user_id: user.id,
            system_id: systemId,
            classification: assessmentResult.classification
          });
          
          if (trainingResult.data?.needed && trainingResult.data?.courses?.length > 0) {
            setTrainingRecommendation(trainingResult.data.courses[0]);
          }
        } catch (err) {
          console.error('Failed to create training recommendation:', err);
          // Continue to results even if recommendation fails
        }
      }

      setStep(5); // Move to results
    } catch (error) {
      console.error("Failed to save assessment:", error);
      alert("Failed to save assessment. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [systemId, calculateClassification]);

  const classificationColors = {
    prohibited: 'bg-red-500/20 text-red-400 border-red-500/30',
    'high-risk': 'bg-[#86EFAC]/20 text-[#86EFAC] border-[#86EFAC]/30',
    gpai: 'bg-[#6EE7B7]/20 text-[#6EE7B7] border-[#6EE7B7]/30',
    'limited-risk': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'minimal-risk': 'bg-[#86EFAC]/20 text-[#86EFAC] border-[#86EFAC]/30',
  };

  const handleAutoAssess = React.useCallback(async () => {
    if (!urls.website && !urls.product) {
      alert('Please provide at least one URL');
      return;
    }

    setResearching(true);
    try {
      // Call the analysis function directly
      const response = await db.functions.invoke('analyzeAISystem', {
        productName: "AI System", // Default placeholder if not collected
        productUrl: urls.product,
        providerName: "Provider", // Default placeholder
        providerUrl: urls.website
      });

      if (response.data) {
        const d = response.data;
        
        // Map backend response to local state structure
        setAnswers({
          prohibited: d.prohibited_flags || {},
          highRisk: d.high_risk_flags || {},
          gpai: d.gpai_flags || {},
          transparency: d.transparency_flags || {}
        });

        // Move to step 1 so user can review the pre-filled data
        setStep(1);
      }
    } catch (error) {
      console.error('Failed to analyze system:', error);
      alert('Failed to analyze system. Please try manual assessment.');
    } finally {
      setResearching(false);
    }
  }, [urls]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress */}
      {step > 0 && step < 5 && (
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full ${
                s <= step ? 'bg-[#86EFAC]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      )}

      {/* Step 0: URL Input for AI-Powered Assessment */}
      {step === 0 && (
        <Card className="glass-card border-0 border-[#86EFAC]/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#86EFAC]" />
              AI-Powered Risk Assessment
            </CardTitle>
            <p className="text-sm text-gray-400">
              {systemData?.provider_url || systemData?.product_url 
                ? "URLs loaded from system registration. Verify or edit before continuing."
                : "Provide website URLs and let Sentinel AI research and classify your system automatically"
              }
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-[#86EFAC]/10 border border-[#86EFAC]/20 rounded-lg p-4">
              <h4 className="text-[#86EFAC] font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                How it works
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Sentinel AI researches your company and product</li>
                <li>• Analyzes features, use cases, and technical capabilities</li>
                <li>• Auto-classifies against EU AI Act categories</li>
                <li>• Pre-fills assessment questions based on findings</li>
                <li>• You review and confirm the classification</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Company Website <span className="text-gray-500">(recommended)</span>
                </label>
                <input
                  type="url"
                  value={urls.website}
                  onChange={(e) => setUrls(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Product/Software Page <span className="text-gray-500">(recommended)</span>
                </label>
                <input
                  type="url"
                  value={urls.product}
                  onChange={(e) => setUrls(prev => ({ ...prev, product: e.target.value }))}
                  placeholder="https://example.com/product"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleAutoAssess}
                disabled={researching || (!urls.website && !urls.product)}
                className="w-full bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50"
              >
                {researching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Continue with AI Assessment
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-gray-500">
                Or <button type="button" onClick={() => setStep(1)} className="text-[#86EFAC] hover:text-[#6EE7B7] underline">skip to manual assessment</button>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Prohibited Practices */}
      {step === 1 && (
        <Card className="glass-card border-0 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Step 1: Prohibited Practices Check
            </CardTitle>
            <p className="text-sm text-gray-400">
              These AI practices are banned under the EU AI Act. If any apply, deployment is not permitted.
            </p>
            {systemData?.assessment_answers && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mt-3">
                <p className="text-xs text-indigo-400">
                  ✨ Pre-filled by CIDE research. Review and adjust if needed.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {PROHIBITED_CHECKS.map(check => (
              <div key={check.id} className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white mb-1">{check.question}</p>
                    <p className="text-xs text-gray-500">{check.article}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAnswer('prohibited', check.id, true)}
                      className={answers.prohibited[check.id] === true 
                        ? "bg-red-500 hover:bg-red-600 text-white border-0" 
                        : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"}
                    >
                      Yes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAnswer('prohibited', check.id, false)}
                      className={answers.prohibited[check.id] === false 
                        ? "bg-green-500 hover:bg-green-600 text-white border-0" 
                        : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"}
                    >
                      No
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button 
              onClick={() => setStep(2)} 
              className="w-full bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50"
            >
              Continue to High-Risk Check
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: High-Risk Check */}
      {step === 2 && (
        <Card className="glass-card border-0 border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-400" />
              Step 2: High-Risk Categories (Annex III)
            </CardTitle>
            <p className="text-sm text-gray-400">
              Select any categories that apply to this AI system
            </p>
            {systemData?.assessment_answers && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mt-3">
                <p className="text-xs text-indigo-400">
                  ✨ Pre-filled by CIDE research. Review and adjust if needed.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {HIGH_RISK_CATEGORIES.map(category => (
              <div
                key={category.id}
                onClick={() => handleAnswer('highRisk', category.id, !answers.highRisk[category.id])}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  answers.highRisk[category.id]
                    ? 'border-orange-500/50 bg-orange-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center mt-1 ${
                    answers.highRisk[category.id] 
                      ? 'border-orange-500 bg-orange-500' 
                      : 'border-white/20'
                  }`}>
                    {answers.highRisk[category.id] && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{category.title}</h4>
                    <p className="text-sm text-gray-400 mb-1">{category.description}</p>
                    <p className="text-xs text-gray-500">{category.annex}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <Button 
                onClick={() => setStep(1)} 
                variant="outline"
                className="flex-1 border-white/10 text-gray-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                className="flex-1 bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50"
              >
                Continue to GPAI Check
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: GPAI Check */}
      {step === 3 && (
        <Card className="glass-card border-0 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-400" />
              Step 3: General-Purpose AI Check
            </CardTitle>
            {systemData?.assessment_answers && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mt-3">
                <p className="text-xs text-indigo-400">
                  ✨ Pre-filled by CIDE research. Review and adjust if needed.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-white">Is this a general-purpose AI model?</p>
              <p className="text-sm text-gray-400">
                A model trained on large amounts of data that can perform a wide range of tasks
              </p>
              <div className="flex gap-2">
               <Button
                 size="sm"
                 onClick={() => handleAnswer('gpai', 'is_gpai', true)}
                 className={answers.gpai.is_gpai === true 
                   ? "bg-purple-500 hover:bg-purple-600 text-white border-0" 
                   : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"}
               >
                 Yes
               </Button>
               <Button
                 size="sm"
                 onClick={() => handleAnswer('gpai', 'is_gpai', false)}
                 className={answers.gpai.is_gpai === false 
                   ? "bg-green-500 hover:bg-green-600 text-white border-0" 
                   : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"}
               >
                 No
               </Button>
              </div>
            </div>

            {answers.gpai.is_gpai === true && (
              <div className="space-y-2">
                <p className="text-white">Does it have systemic risk?</p>
                <p className="text-sm text-gray-400">
                  Training compute &gt; 10^25 FLOPs or assessed as having systemic risk
                </p>
                <div className="flex gap-2">
                 <Button
                   size="sm"
                   onClick={() => handleAnswer('gpai', 'systemic_risk', true)}
                   className={answers.gpai.systemic_risk === true 
                     ? "bg-purple-500 hover:bg-purple-600 text-white border-0" 
                     : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"}
                 >
                   Yes
                 </Button>
                 <Button
                   size="sm"
                   onClick={() => handleAnswer('gpai', 'systemic_risk', false)}
                   className={answers.gpai.systemic_risk === false 
                     ? "bg-green-500 hover:bg-green-600 text-white border-0" 
                     : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"}
                 >
                   No
                 </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                onClick={() => setStep(0)} 
                variant="outline"
                className="flex-1 border-white/10 text-gray-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => setStep(4)} 
                className="flex-1 bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50"
              >
                Continue to Transparency Check
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Transparency */}
      {step === 4 && (
        <Card className="glass-card border-0 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-yellow-400" />
              Step 4: Transparency Requirements
            </CardTitle>
            {systemData?.assessment_answers && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mt-3">
                <p className="text-xs text-indigo-400">
                  ✨ Pre-filled by CIDE research. Review and adjust if needed.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {TRANSPARENCY_CHECKS.map(check => (
              <div key={check.id} className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white mb-1">{check.question}</p>
                    <p className="text-xs text-gray-500">{check.article}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAnswer('transparency', check.id, true)}
                      className={answers.transparency[check.id] === true 
                        ? "bg-yellow-500 hover:bg-yellow-600 text-black border-0" 
                        : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"}
                    >
                      Yes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAnswer('transparency', check.id, false)}
                      className={answers.transparency[check.id] === false 
                        ? "bg-green-500 hover:bg-green-600 text-white border-0" 
                        : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"}
                    >
                      No
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <Button 
                onClick={() => setStep(3)} 
                variant="outline"
                className="flex-1 border-white/10 text-gray-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50"
              >
                {saving ? "Calculating..." : "Complete Assessment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Results */}
      {step === 5 && result && (
        <Card className="glass-card border-0 border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-cyan-400" />
              Assessment Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-6">
              <Badge className={`text-lg px-6 py-2 border ${classificationColors[result.classification]}`}>
                {result.classification.replace('-', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="font-semibold text-white mb-2">Classification Reasoning</h3>
              <p className="text-gray-300 leading-relaxed">{result.reasoning}</p>
            </div>

            {result.classification === 'prohibited' && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 font-medium">
                  ⚠️ This AI system matches prohibited AI practice criteria. Deployment is not permitted under the EU AI Act.
                </p>
              </div>
            )}

            {trainingRecommendation && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-yellow-400 font-semibold mb-1">Compliance Training Recommended</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      {trainingRecommendation.course.title}
                    </p>
                    <Link to={createPageUrl(`CourseDetail?id=${trainingRecommendation.course_id}`)}>
                      <Button size="sm" className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30">
                        Start Training
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={() => onComplete && onComplete()}
              className="w-full bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50"
            >
              View System Details
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}