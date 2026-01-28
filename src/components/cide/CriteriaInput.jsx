import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, X, Bookmark } from "lucide-react";
import { db } from "@/api/supabaseClient";

const SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10001+"];

export default function CriteriaInput({ onSubmit, isProcessing, initialCriteria }) {
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState([]);
  const [companySize, setCompanySize] = useState([]);
  const [country, setCountry] = useState("");
  const [techStack, setTechStack] = useState([]);
  const [techInput, setTechInput] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState(null);

  const loadTemplates = React.useCallback(async () => {
    try {
      const response = await db.functions.invoke('getICPTemplates');
      if (response.data?.success) {
        setTemplates(response.data.templates || []);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
      // Fail silently - templates are optional
    }
  }, []);

  const prefillFromUserContext = React.useCallback(async () => {
    try {
      const user = await db.auth.me();
      if (!user) return;

      let companyData = null;

      // NEW structure: user has company_id linking to Company entity
      if (user.company_id) {
        companyData = await db.entities.Company.get(user.company_id);
      }
      // LEGACY structure: user has company_data embedded directly
      else if (user.company_data) {
        companyData = user.company_data;
      }

      if (!companyData) return;

      // Pre-fill based on user's company profile
      const suggestions = [];

      if (companyData.industry) {
        suggestions.push(`Companies in ${companyData.industry}`);
      }

      if (companyData.tech_stack?.length > 0) {
        const mainTech = companyData.tech_stack.slice(0, 3).join(', ');
        suggestions.push(`that use ${mainTech}`);
        setTechStack(companyData.tech_stack.slice(0, 5));
      }

      if (companyData.employee_count) {
        const size = companyData.employee_count < 50 ? '1-50'
          : companyData.employee_count < 200 ? '51-200'
          : companyData.employee_count < 500 ? '201-500'
          : '501+';
        setCompanySize([size]);
      }

      if (companyData.headquarters_country) {
        setCountry(companyData.headquarters_country);
      }

      // Set a helpful starting description
      if (suggestions.length > 0) {
        setDescription(`Similar to my company: ${suggestions.join(' ')}`);
      }

    } catch {
      // Fail silently - prefill is nice to have
    }
  }, []);

  const loadCriteria = React.useCallback((criteria) => {
    setDescription(criteria.description || "");
    setIndustry(criteria.industry || []);
    setCompanySize(criteria.companySize || []);
    setCountry(criteria.location?.country || "");
    setTechStack(criteria.techStack || []);
  }, []);

  useEffect(() => {
    loadTemplates();
    if (initialCriteria) {
      loadCriteria(initialCriteria);
    } else {
      // Pre-fill from user's company context if no initial criteria
      prefillFromUserContext();
    }
  }, [loadTemplates, prefillFromUserContext, loadCriteria, initialCriteria]);

  const handleLoadTemplate = React.useCallback(async () => {
    if (!selectedTemplate) return;
    
    try {
      const response = await db.functions.invoke('loadICPTemplate', {
        template_id: selectedTemplate
      });
      
      if (response.data?.success) {
        loadCriteria(response.data.template.criteria);
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      alert('Failed to load template');
    }
  }, [selectedTemplate]);

  const handleAddTech = () => {
    if (techInput.trim() && !techStack.includes(techInput.trim())) {
      setTechStack([...techStack, techInput.trim()]);
      setTechInput("");
    }
  };

  const handleSubmit = React.useCallback(async () => {
    if (!description.trim()) {
      setError("Please describe the companies you're looking for");
      return;
    }
    
    setError(null);

    const criteria = {
      description,
      industry,
      companySize,
      location: { country },
      techStack,
      websiteKeywords: []
    };

    // Save as template if requested
    if (saveAsTemplate && templateName.trim()) {
      try {
        await db.functions.invoke('saveICPTemplate', {
          name: templateName,
          description: `Template based on: ${description.substring(0, 100)}...`,
          criteria
        });
        setSaveAsTemplate(false);
        setTemplateName("");
        await loadTemplates();
      } catch (error) {
        console.error('Failed to save template:', error);
        setError(`Failed to save template: ${error.message}`);
        // Continue anyway since criteria is valid
      }
    }

    onSubmit(criteria);
  }, [description, industry, companySize, country, techStack, saveAsTemplate, templateName, loadTemplates, onSubmit]);

  const toggleSize = (size) => {
    setCompanySize(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  return (
    <Card className="border-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-400" />
          Define Your Target Companies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pre-fill indicator */}
        {description && description.startsWith('Similar to my company') && (
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300">
              Pre-filled based on your company profile. Edit to refine.
            </span>
          </div>
        )}
        {/* Template Loader */}
        {templates.length > 0 && (
          <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
            <Label className="text-gray-300 mb-2">Start from Template (optional)</Label>
            <div className="flex gap-2">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="flex-1 px-3 py-2 bg-black/30 border border-indigo-500/30 rounded-lg text-white"
              >
                <option value="">Select saved template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.use_count > 0 && `(used ${t.use_count}x)`}
                  </option>
                ))}
              </select>
              <Button 
                onClick={handleLoadTemplate}
                disabled={!selectedTemplate}
                className="bg-indigo-500/30 border border-indigo-400/50 text-indigo-200"
              >
                Load
              </Button>
            </div>
          </div>
        )}

        {/* Natural Language Description */}
        <div>
          <Label className="text-gray-300 mb-2">Describe your ideal company profile</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: Software companies in the Netherlands with 50-200 employees that use Salesforce and are hiring for engineering roles"
            className="min-h-[120px] bg-black/30 border-indigo-500/30 text-white placeholder:text-gray-600"
          />
        </div>

        {/* Company Size */}
        <div>
          <Label className="text-gray-300 mb-2">Company Size (Employees)</Label>
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map(size => (
              <Badge
                key={size}
                onClick={() => toggleSize(size)}
                className={`cursor-pointer transition-all ${
                  companySize.includes(size)
                    ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/50'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                }`}
              >
                {size}
              </Badge>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <Label className="text-gray-300 mb-2">Country</Label>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., Netherlands, United States, Germany"
            className="bg-black/30 border-indigo-500/30 text-white placeholder:text-gray-600"
          />
        </div>

        {/* Tech Stack */}
        <div>
          <Label className="text-gray-300 mb-2">Technology Stack</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTech())}
              placeholder="e.g., Salesforce, AWS, React"
              className="bg-black/30 border-indigo-500/30 text-white placeholder:text-gray-600"
            />
            <Button onClick={handleAddTech} className="bg-indigo-500/30 border border-indigo-400/50 text-indigo-200">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {techStack.map((tech, idx) => (
              <Badge key={idx} className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30">
                {tech}
                <button onClick={() => setTechStack(techStack.filter((_, i) => i !== idx))} className="ml-2">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Save as Template */}
        <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
          <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="w-4 h-4"
            />
            Save these criteria as template
          </label>
          {saveAsTemplate && (
            <div className="mt-2">
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name (e.g., 'SaaS Companies NL')"
                className="bg-black/30 border-indigo-500/30 text-white"
              />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={isProcessing || !description.trim()}
            className="bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 border border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/40 px-8"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isProcessing ? 'Researching...' : 'Start AI Research'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}