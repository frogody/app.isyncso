import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, CheckCircle2, Globe } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AIEnhancement({ enrichedData, onSubmit, onBack, productContext }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState("");
  const [enhancedData, setEnhancedData] = useState(null);
  const [progressLog, setProgressLog] = useState([]);

  const addLog = React.useCallback((message) => {
    setProgressLog(prev => [...prev, { message, timestamp: new Date().toLocaleTimeString() }]);
  }, []);

  const handleStartEnhancement = React.useCallback(async () => {
    setIsProcessing(true);
    setProgress(10);
    setCurrentStage("Analyzing enriched data...");
    addLog("Starting AI enhancement process");

    try {
      // Step 1: Generate prompts from enriched data
      setProgress(20);
      setCurrentStage("Generating search prompts...");
      addLog("Creating tailored web search prompts");

      const promptGeneration = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a data enrichment specialist. Given the following enriched company data and product context, create specific web search prompts that will uncover additional valuable insights.

**Enriched Data Sample:**
${JSON.stringify(enrichedData.slice(0, 2), null, 2)}

**Product Context:**
${JSON.stringify(productContext, null, 2)}

**Your Task:**
For each company, generate 5-10 specific search prompts that will help find:
1. Key decision-makers and their contact information
2. Recent company news, funding, or initiatives
3. Pain points and challenges they might be facing
4. Technology adoption patterns
5. Buying signals (job postings, technology changes, growth indicators)
6. Competitive positioning
7. Social media presence and engagement
8. Customer reviews and reputation

Create prompts that use company-specific details as placeholders (e.g., {{company_name}}, {{domain}}, {{industry}}).

Return an array of prompt templates with categories.`,
        response_json_schema: {
          type: "object",
          properties: {
            prompt_templates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  prompt: { type: "string" },
                  expected_data: { type: "string" }
                }
              }
            }
          }
        }
      });

      setProgress(40);
      setCurrentStage("Executing web searches...");
      addLog(`Generated ${promptGeneration.prompt_templates?.length || 0} search prompts`);

      // Step 2: Execute searches for each company
      const fullyEnhancedData = [];
      const totalCompanies = enrichedData.length;

      for (let i = 0; i < enrichedData.length; i++) {
        const company = enrichedData[i];
        setProgress(40 + (i / totalCompanies) * 40);
        addLog(`Enhancing ${company.company_name || company.domain}...`);

        // Execute searches using the generated prompts
        const searchResults = [];
        for (const template of promptGeneration.prompt_templates.slice(0, 5)) {
          const prompt = template.prompt
            .replace(/\{\{company_name\}\}/g, company.company_name || company.domain)
            .replace(/\{\{domain\}\}/g, company.domain)
            .replace(/\{\{industry\}\}/g, company.industry || 'unknown');

          try {
            const result = await base44.integrations.Core.InvokeLLM({
              prompt: `${prompt}\n\nProvide a concise, factual answer based on current web data.`,
              add_context_from_internet: true,
              response_json_schema: {
                type: "object",
                properties: {
                  finding: { type: "string" },
                  confidence: { type: "number" },
                  sources: { type: "array", items: { type: "string" } }
                }
              }
            });

            searchResults.push({
              category: template.category,
              expected_data: template.expected_data,
              ...result
            });
          } catch (err) {
            console.error(`Search failed for ${company.domain}:`, err);
            // Continue with other searches even if one fails
            addLog(`⚠️ Search failed for ${template.category}, continuing...`);
          }
        }

        // Consolidate all findings into structured data (with error handling)
        let consolidatedData = {};
        try {
          const consolidationPrompt = `Consolidate the following search results into structured, actionable data:

**Original Company Data:**
${JSON.stringify(company, null, 2)}

**Search Results:**
${JSON.stringify(searchResults, null, 2)}

Extract and structure:
- Key contacts (names, titles, LinkedIn profiles)
- Recent news and events
- Technology stack insights
- Buying signals
- Pain points
- Social media metrics
- Any other valuable insights

Return well-structured data that goes beyond the original enrichment.`;

          consolidatedData = await base44.integrations.Core.InvokeLLM({
          prompt: consolidationPrompt + `

**CRITICAL: AI Vendor Detection**
Analyze if this company offers AI products/services that may require EU AI Act compliance.
Check for:
- AI/ML keywords: artificial intelligence, machine learning, deep learning, neural network, automation, algorithms, predictive analytics, computer vision, NLP, natural language, generative AI, LLM, chatbot
- AI tech stack: TensorFlow, PyTorch, OpenAI, Anthropic, Hugging Face, scikit-learn, Keras
- Product positioning: "AI-powered", "intelligent", "smart", "automated", "predictive"

Confidence scoring:
- 80-100: Core business is AI (e.g., AI platform, ML tools, AI SaaS)
- 50-79: Significant AI features (e.g., uses AI for core functionality)
- 0-49: Not an AI vendor (no AI products/services)

Return is_ai_vendor: true if confidence >= 50, with a one-line summary.`,
          response_json_schema: {
            type: "object",
            properties: {
              contacts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    title: { type: "string" },
                    linkedin_url: { type: "string" },
                    email_pattern: { type: "string" }
                  }
                }
              },
              recent_news: { type: "array", items: { type: "string" } },
              technology_insights: { type: "string" },
              buying_signals: { type: "array", items: { type: "string" } },
              pain_points: { type: "array", items: { type: "string" } },
              social_presence: {
                type: "object",
                properties: {
                  linkedin_followers: { type: "string" },
                  twitter_handle: { type: "string" },
                  engagement_level: { type: "string" }
                }
              },
              competitive_intel: { type: "string" },
              overall_score: { type: "number" },
              is_ai_vendor: { type: "boolean" },
              ai_confidence: { type: "number" },
              ai_summary: { type: "string" }
            }
          }
        });
        } catch (consolidationError) {
          console.error(`Consolidation failed for ${company.domain}:`, consolidationError);
          addLog(`⚠️ Consolidation failed for ${company.company_name}, using partial data`);
          // Use partial data if consolidation fails
          consolidatedData = {
            contacts: [],
            recent_news: [],
            technology_insights: "Data consolidation failed",
            buying_signals: [],
            pain_points: [],
            social_presence: {},
            competitive_intel: "N/A",
            overall_score: company.confidence_score || 50
          };
        }

        fullyEnhancedData.push({
          ...company,
          ai_enhanced: consolidatedData,
          enhancement_timestamp: new Date().toISOString()
        });
      }

      setProgress(100);
      setCurrentStage("Enhancement complete!");
      addLog(`Successfully enhanced ${fullyEnhancedData.length} companies`);
      setEnhancedData(fullyEnhancedData);
    } catch (error) {
      console.error("AI Enhancement failed:", error);
      addLog(`❌ Enhancement failed: ${error.message}`);
      setCurrentStage("Enhancement failed");
      setProgress(0);
      alert(`Failed to enhance data: ${error.message}. You can skip this step or retry.`);
      setIsProcessing(false);
    }
  }, [enrichedData, productContext, addLog]);

  const handleContinue = () => {
    onSubmit(enhancedData);
  };

  return (
    <Card className="border-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          AI Enhancement Layer
        </CardTitle>
        <p className="text-sm text-gray-400 mt-2">
          Deep web research to enrich data beyond standard API responses
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!enhancedData && !isProcessing && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Unlock Deeper Insights
            </h3>
            <p className="text-gray-400 mb-6 max-w-xl mx-auto">
              Our AI will create tailored search prompts and scour the web for additional information 
              about each company, including contacts, buying signals, pain points, and competitive intelligence.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-2xl mx-auto">
              {[
                { label: "Key Contacts", icon: "👤" },
                { label: "Buying Signals", icon: "📊" },
                { label: "Pain Points", icon: "🎯" },
                { label: "Social Intel", icon: "🌐" }
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-xs text-gray-300">{item.label}</div>
                </div>
              ))}
            </div>
            <Button
              onClick={handleStartEnhancement}
              className="bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 border border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/40 px-8"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start AI Enhancement
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{currentStage}</h3>
              <Progress value={progress} className="w-full max-w-md mx-auto h-2" />
              <p className="text-sm text-gray-400 mt-2">{progress}% complete</p>
            </div>

            {/* Progress Log */}
            <div className="max-w-2xl mx-auto">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Activity Log</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {progressLog.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-500">{log.timestamp}</span>
                    <span className="text-gray-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {enhancedData && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-white mb-1">Enhancement Complete!</h3>
              <p className="text-sm text-gray-400">
                {enhancedData.length} companies enhanced with deep web intelligence
              </p>
            </div>

            {/* Preview */}
            <div>
              <h4 className="text-white font-semibold mb-3">Enhanced Data Preview</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {enhancedData.slice(0, 3).map((company, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="text-white font-semibold">{company.company_name || company.domain}</h5>
                        <p className="text-xs text-gray-400">{company.domain}</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                        Enhanced
                      </Badge>
                    </div>
                    {company.ai_enhanced && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-black/30">
                          <div className="text-gray-500">Contacts Found</div>
                          <div className="text-indigo-300 font-semibold">
                            {company.ai_enhanced.contacts?.length || 0}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-black/30">
                          <div className="text-gray-500">Buying Signals</div>
                          <div className="text-indigo-300 font-semibold">
                            {company.ai_enhanced.buying_signals?.length || 0}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-black/30">
                          <div className="text-gray-500">Recent News</div>
                          <div className="text-indigo-300 font-semibold">
                            {company.ai_enhanced.recent_news?.length || 0}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-black/30">
                          <div className="text-gray-500">Overall Score</div>
                          <div className="text-indigo-300 font-semibold">
                            {company.ai_enhanced.overall_score || 'N/A'}/100
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-indigo-500/20">
              <Button onClick={onBack} variant="outline" className="border-gray-700 text-gray-400">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleContinue}
                className="bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 border border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/40"
              >
                Continue to Download
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}