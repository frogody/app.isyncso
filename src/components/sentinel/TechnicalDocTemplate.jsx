import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, Sparkles, AlertTriangle, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function TechnicalDocTemplate({ system, onBack }) {
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editableContent, setEditableContent] = useState("");
  const [copied, setCopied] = useState(false);

  const generateDocument = React.useCallback(async () => {

    setGenerating(true);
    try {
      const prompt = `Generate EU AI Act Annex IV Technical Documentation for the following high-risk AI system. Use formal, regulatory-compliant language. Include [PLACEHOLDER: specific detail needed] markers where additional information is required.

AI SYSTEM INFORMATION:
- Name: ${system.name}
- Purpose: ${system.purpose}
- Description: ${system.description || 'Not provided'}
- Deployment Context: ${system.deployment_context || 'Not specified'}
- AI Techniques: ${system.ai_techniques?.join(', ') || 'Not specified'}
- Data Inputs: ${system.data_inputs || 'Not specified'}
- Decision Impact: ${system.decision_impact || 'Not specified'}
- Risk Classification: ${system.risk_classification}
- Classification Reasoning: ${system.classification_reasoning || 'Not provided'}

Generate a comprehensive Technical Documentation following Annex IV structure:

1. GENERAL DESCRIPTION
   - System identification and intended purpose
   - General characteristics and capabilities
   - Intended users and operational context

2. DETAILED DESCRIPTION OF ELEMENTS AND DEVELOPMENT PROCESS
   - Design specifications and system architecture
   - Algorithms and computational methods used
   - Data requirements (training, validation, testing)
   - Training methodology and performance metrics
   - Development lifecycle and versioning

3. MONITORING, FUNCTIONING, AND CONTROL
   - Human oversight measures and mechanisms
   - Input data specifications and quality requirements
   - Output interpretation and usage guidelines
   - Performance monitoring and quality metrics

4. RISK MANAGEMENT SYSTEM
   - Identified risks to health, safety, and fundamental rights
   - Risk assessment methodology
   - Mitigation measures and residual risks
   - Testing and validation results

5. CHANGES THROUGHOUT LIFECYCLE
   - Version control system
   - Change management procedures
   - Update and maintenance protocols

6. COMPLIANCE WITH STANDARDS
   - Harmonised standards applied (if any)
   - Other technical specifications used
   - Testing and certification procedures

7. REFERENCE TO EU DECLARATION OF CONFORMITY
   - Declaration reference and date
   - Conformity assessment procedure used

Format as markdown with clear section headings. Be specific where data is provided, use [PLACEHOLDER: ...] where information is missing. Keep regulatory language formal and precise.`;

      const response = await db.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const generatedContent = typeof response === 'string' ? response : response.content || response.text || JSON.stringify(response);
      
      setContent(generatedContent);
      setEditableContent(generatedContent);
    } catch (error) {
      console.error("Failed to generate document:", error);
      alert("Failed to generate document. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [system]);

  useEffect(() => {
    generateDocument();
  }, [generateDocument]);

  const handleExport = () => {
    const disclaimer = `# DISCLAIMER
This document is an AI-generated draft based on provided system information.

⚠️ **IMPORTANT**: This draft requires thorough legal review and completion by qualified personnel before submission to any regulatory authority.

- Complete all [PLACEHOLDER] sections with accurate information
- Verify all technical details with engineering teams
- Ensure compliance with current EU AI Act requirements
- Have document reviewed by legal counsel
- Update with actual test results and validation data

---

`;

    const fullContent = disclaimer + editableContent;
    
    // Create markdown file
    const blob = new Blob([fullContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Technical_Documentation_${system.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(editableContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [editableContent]);

  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/5 to-blue-600/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-white/10 text-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            {!editMode && content && (
              <Button
                onClick={() => setEditMode(true)}
                variant="outline"
                className="border-white/10 text-gray-300"
              >
                Edit
              </Button>
            )}
            {editMode && (
              <Button
                onClick={() => setEditMode(false)}
                variant="outline"
                className="border-white/10 text-gray-300"
              >
                Preview
              </Button>
            )}
            {content && (
              <>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="border-white/10 text-gray-300"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleExport}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Markdown
                </Button>
              </>
            )}
          </div>
        </div>

        {/* System Info */}
        <Card className="glass-card border-0 border-cyan-500/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-white mb-2">Technical Documentation (Annex IV)</CardTitle>
                <p className="text-sm text-gray-400">{system.name}</p>
              </div>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                HIGH-RISK
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Disclaimer */}
        <Card className="glass-card border-0 border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-400 mb-1">AI-Generated Draft</p>
                <p className="text-xs text-gray-300">
                  This document requires legal review and completion by qualified personnel before submission to regulatory authorities. 
                  Verify all technical details, complete placeholders, and ensure full compliance with current regulations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Content */}
        {generating ? (
          <Card className="glass-card border-0 border-cyan-500/20">
            <CardContent className="p-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-8 h-8 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Generating Technical Documentation</h3>
              <p className="text-sm text-gray-400">
                AI is analyzing system information and drafting Annex IV compliant documentation...
              </p>
            </CardContent>
          </Card>
        ) : content ? (
          <Card className="glass-card border-0 border-cyan-500/20">
            <CardContent className="p-6">
              {editMode ? (
                <Textarea
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="min-h-[600px] font-mono text-sm bg-black/50 border-white/10 text-white"
                  placeholder="Edit document content..."
                />
              ) : (
                <div className="prose prose-invert prose-cyan max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-6 mb-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-bold text-white mt-6 mb-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h3>,
                      p: ({ children }) => <p className="text-gray-300 leading-relaxed mb-4">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-gray-300">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      code: ({ inline, children }) => 
                        inline ? (
                          <code className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-sm font-mono">
                            {children}
                          </code>
                        ) : (
                          <code className="block p-3 rounded bg-black/50 text-cyan-400 text-sm font-mono overflow-x-auto">
                            {children}
                          </code>
                        ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-cyan-500/50 pl-4 italic text-gray-400 my-4">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {editableContent}
                  </ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}