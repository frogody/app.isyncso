import React, { useState } from "react";
import { db } from "@/api/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Sparkles, Globe, Building2, Box, Database } from "lucide-react";
import { useEffect } from "react";

/**
 * AISystemModal - Form for registering/editing AI systems in SENTINEL
 * 
 * Features:
 * - Creates new AI system or updates existing one
 * - Validates required fields (name, purpose, ai_techniques)
 * - Auto-assigns company_id with multiple fallback strategies
 * - Tracks created_by for audit trail
 * - Seamless flow to risk assessment after creation
 * 
 * Company Fallback Strategy:
 * 1. Use user.company_id if available
 * 2. Find existing Company by user.company_data.domain
 * 3. Create Company from user.company_data if exists
 * 4. Create Company from email domain as last resort
 * 
 * @param {Object} props
 * @param {Object} props.system - Existing system to edit (null for new)
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onSave - Callback after successful save
 * @param {Function} props.onCreateAndAssess - Optional callback to go directly to assessment
 */
export default function AISystemModal({ system, onClose, onSave, onCreateAndAssess }) {
  const [formData, setFormData] = useState({
    name: system?.name || "",
    description: system?.description || "",
    purpose: system?.purpose || "",
    deployment_context: system?.deployment_context || "internal",
    ai_techniques: system?.ai_techniques || [],
    data_inputs: system?.data_inputs || "",
    decision_impact: system?.decision_impact || "",
    provider_name: system?.provider_name || "",
    provider_url: system?.provider_url || "",
    product_url: system?.product_url || "",
  });
  
  // Research State
  const [showResearchStep, setShowResearchStep] = useState(!system); // Show research step only for new systems
  const [researchData, setResearchData] = useState({
    productName: system?.name || "",
    productUrl: system?.product_url || "",
    providerName: system?.provider_name || "",
    providerUrl: system?.provider_url || ""
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [cideCompanies, setCideCompanies] = useState([]);
  const [showCideImport, setShowCideImport] = useState(false);
  const [loadingCide, setLoadingCide] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadCideCompanies = React.useCallback(async () => {

    setLoadingCide(true);
    try {
      const [prospects, companies] = await Promise.all([
        db.entities.Prospect.list('-updated_date', 10),
        db.entities.Company.list('-updated_date', 10)
      ]);
      const combined = [
        ...prospects.map(p => ({ name: p.name, domain: p.domain, source: 'prospect' })),
        ...companies.map(c => ({ name: c.name, domain: c.domain, source: 'company' }))
      ];
      setCideCompanies(combined);
    } catch (e) {
      console.error("Failed to load companies:", e);
    } finally {
      setLoadingCide(false);
    }
  }, []);

  // Load CIDE companies for import
  useEffect(() => {
    if (showResearchStep && !system) {
      loadCideCompanies();
    }
  }, [showResearchStep, system, loadCideCompanies]);

  const handleImportFromCide = React.useCallback((company) => {
    setResearchData({
      productName: "",
      productUrl: "",
      providerName: company.name,
      providerUrl: `https://${company.domain}`
    });
    setShowCideImport(false);
  }, []);

  const aiTechniqueOptions = [
    { value: "machine-learning", label: "Machine Learning" },
    { value: "deep-learning", label: "Deep Learning" },
    { value: "expert-systems", label: "Expert Systems" },
    { value: "generative-ai", label: "Generative AI" },
    { value: "computer-vision", label: "Computer Vision" },
    { value: "nlp", label: "Natural Language Processing" },
    { value: "other", label: "Other" },
  ];

  const handleTechniqueToggle = React.useCallback((technique) => {
    setFormData(prev => ({
      ...prev,
      ai_techniques: prev.ai_techniques.includes(technique)
        ? prev.ai_techniques.filter(t => t !== technique)
        : [...prev.ai_techniques, technique]
    }));
  }, []);

  const handleAnalyze = React.useCallback(async () => {
    if (!researchData.productName || !researchData.providerName) {
      setError("Product Name and Provider Name are required for analysis");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // CIDE comprehensive research with full risk assessment
      const response = await db.functions.invoke('analyzeAISystem', {
        ...researchData,
        deepResearch: true,
        includeRiskAssessment: true
      });

      if (response.data) {
        const data = response.data;

        console.log('CIDE Research Response:', data);
        console.log('Prohibited flags:', data.prohibited_flags);
        console.log('High risk flags:', data.high_risk_flags);
        console.log('GPAI flags:', data.gpai_flags);
        console.log('Transparency flags:', data.transparency_flags);
        
        // Store complete system data including pre-filled assessment
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
          // Store pre-filled assessment for wizard
          assessment_answers: {
            prohibited: data.prohibited_flags || {},
            highRisk: data.high_risk_flags || {},
            gpai: data.gpai_flags || {},
            transparency: data.transparency_flags || {}
          }
        }));
        
        console.log('Stored assessment answers:', {
          prohibited: data.prohibited_flags || {},
          highRisk: data.high_risk_flags || {},
          gpai: data.gpai_flags || {},
          transparency: data.transparency_flags || {}
        });
        
        setShowResearchStep(false);
      } else {
        throw new Error("No data returned from analysis");
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Analysis failed. You can try again or skip to manual entry.");
    } finally {
      setAnalyzing(false);
    }
  }, [researchData]);

  const handleSubmit = React.useCallback(async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name?.trim()) {
      setError("System name is required");
      return;
    }
    if (!formData.purpose?.trim()) {
      setError("Purpose is required");
      return;
    }
    if (formData.ai_techniques.length === 0) {
      setError("Please select at least one AI technique");
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      const user = await db.auth.me();
      
      // Get user's company
      let companyId = user.company_id;
      
      // Fallback: If no company_id but has company_data, try to find/create company
      if (!companyId && user.company_data?.domain) {
        const companies = await db.entities.Company.filter({ domain: user.company_data.domain });
        if (companies.length > 0) {
          companyId = companies[0].id;
        } else {
          // Create company from legacy data
          const newCompany = await db.entities.Company.create({
            name: user.company_data.name || "My Company",
            domain: user.company_data.domain,
            industry: user.company_data.industry,
            tech_stack: user.company_data.tech_stack || []
          });
          companyId = newCompany.id;
        }
      }
      
      // Final fallback: Create company from email domain
      if (!companyId) {
        const domain = user.email.split('@')[1];
        const newCompany = await db.entities.Company.create({
          name: domain,
          domain: domain
        });
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
        // Include pre-filled assessment if available
        assessment_answers: formData.assessment_answers || null
      };

      let savedSystem;
      if (system?.id) {
        await db.entities.AISystem.update(system.id, systemData);
        savedSystem = { ...system, ...systemData };
      } else {
        savedSystem = await db.entities.AISystem.create(systemData);
      }

      // If this is a new system and we have onCreateAndAssess, go directly to assessment
      if (!system?.id && onCreateAndAssess) {
        onCreateAndAssess(savedSystem.id);
      } else {
        onSave();
      }
    } catch (err) {
      console.error("Failed to save AI system:", err);
      setError(err.message || "Failed to save AI system");
    } finally {
      setSaving(false);
    }
  }, [formData, system, onCreateAndAssess, onSave]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-black border border-[#86EFAC]/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {system ? "Edit AI System" : "Register New AI System"}
          </DialogTitle>
        </DialogHeader>

        {showResearchStep ? (
          <div className="space-y-6 mt-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-white mb-2 block flex items-center gap-2">
                  <Box className="w-4 h-4 text-[#86EFAC]" />
                  Product Name *
                </Label>
                <Input
                  value={researchData.productName}
                  onChange={(e) => setResearchData(prev => ({ ...prev, productName: e.target.value }))}
                  placeholder="e.g., Einstein GPT"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-white mb-2 block flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#86EFAC]" />
                  Product Page URL
                </Label>
                <Input
                  value={researchData.productUrl}
                  onChange={(e) => setResearchData(prev => ({ ...prev, productUrl: e.target.value }))}
                  placeholder="https://salesforce.com/einstein"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-white mb-2 block flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#86EFAC]" />
                  Provider / Company Name *
                </Label>
                <Input
                  value={researchData.providerName}
                  onChange={(e) => setResearchData(prev => ({ ...prev, providerName: e.target.value }))}
                  placeholder="e.g., Salesforce"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-white mb-2 block flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#86EFAC]" />
                  Provider Website
                </Label>
                <Input
                  value={researchData.providerUrl}
                  onChange={(e) => setResearchData(prev => ({ ...prev, providerUrl: e.target.value }))}
                  placeholder="https://salesforce.com"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
              <h4 className="text-indigo-400 font-semibold mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Research with CIDE
              </h4>
              <p className="text-sm text-gray-300 mb-3">
                CIDE will conduct comprehensive research, analyze the AI system against all EU AI Act criteria, and pre-answer all risk assessment questions.
              </p>
              <div className="bg-white/5 rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-400 mb-2">What CIDE will research:</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• System capabilities and technical architecture</li>
                  <li>• Prohibited practices (Article 5)</li>
                  <li>• High-risk categories (Annex III)</li>
                  <li>• GPAI classification (Chapter V)</li>
                  <li>• Transparency requirements (Article 50)</li>
                </ul>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !researchData.productName || !researchData.providerName}
                className="w-full bg-gradient-to-r from-[#86EFAC]/20 to-[#6EE7B7]/10 border border-[#86EFAC]/30 text-[#86EFAC] hover:bg-[#86EFAC]/30"
              >
                {analyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Researching & Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start CIDE Research
                  </>
                )}
              </Button>
            </div>

            <div className="pt-2">
              <p className="text-xs text-center text-gray-500">
                Or <button type="button" onClick={() => setShowResearchStep(false)} className="text-[#86EFAC] hover:text-[#6EE7B7] underline">skip to manual entry</button>
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="name" className="text-white mb-2 block">System Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Customer Support Chatbot"
              required
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label htmlFor="purpose" className="text-white mb-2 block">Purpose *</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="What does this AI system do?"
              required
              rows={3}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white mb-2 block">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the system"
              rows={3}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label className="text-white mb-2 block">Deployment Context</Label>
            <select
              value={formData.deployment_context}
              onChange={(e) => setFormData({ ...formData, deployment_context: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="internal">Internal Use</option>
              <option value="customer-facing">Customer-Facing</option>
              <option value="embedded-in-product">Embedded in Product</option>
            </select>
          </div>

          <div>
            <Label className="text-white mb-2 block">AI Techniques Used</Label>
            <div className="grid grid-cols-2 gap-2">
              {aiTechniqueOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTechniqueToggle(option.value)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    formData.ai_techniques.includes(option.value)
                      ? 'bg-[#86EFAC]/20 border-[#86EFAC]/50 text-[#86EFAC]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="data_inputs" className="text-white mb-2 block">Data Inputs</Label>
            <Textarea
              id="data_inputs"
              value={formData.data_inputs}
              onChange={(e) => setFormData({ ...formData, data_inputs: e.target.value })}
              placeholder="What data does this system process?"
              rows={2}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label htmlFor="decision_impact" className="text-white mb-2 block">Decision Impact</Label>
            <Textarea
              id="decision_impact"
              value={formData.decision_impact}
              onChange={(e) => setFormData({ ...formData, decision_impact: e.target.value })}
              placeholder="What decisions does this system influence?"
              rows={2}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {!system && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowResearchStep(true)}
                className="mr-auto text-[#86EFAC] hover:text-[#6EE7B7] hover:bg-[#86EFAC]/10"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Back to AI Research
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50"
            >
              {saving ? "Saving..." : system ? "Update System" : "Save & Continue to Assessment"}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}