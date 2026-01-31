import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Download, Sparkles, AlertTriangle, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SentinelButton } from './ui/SentinelButton';
import { SentinelCard } from './ui/SentinelCard';
import { SentinelBadge } from './ui/SentinelBadge';

interface AISystem {
  id: string;
  name: string;
  purpose: string;
  description?: string;
  deployment_context?: string;
  ai_techniques?: string[];
  data_inputs?: string;
  decision_impact?: string;
  risk_classification: string;
  classification_reasoning?: string;
}

interface TechnicalDocTemplateProps {
  system: AISystem;
  onBack: () => void;
}

export default function TechnicalDocTemplate({ system, onBack }: TechnicalDocTemplateProps) {
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [copied, setCopied] = useState(false);

  const generateDocument = useCallback(async () => {
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

Generate comprehensive Technical Documentation following Annex IV structure:
1. GENERAL DESCRIPTION
2. DETAILED DESCRIPTION OF ELEMENTS AND DEVELOPMENT PROCESS
3. MONITORING, FUNCTIONING, AND CONTROL
4. RISK MANAGEMENT SYSTEM
5. CHANGES THROUGHOUT LIFECYCLE
6. COMPLIANCE WITH STANDARDS
7. REFERENCE TO EU DECLARATION OF CONFORMITY

Format as markdown with clear section headings.`;

      const response = await db.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      const generatedContent = typeof response === 'string' ? response : response.content || response.text || JSON.stringify(response);
      setContent(generatedContent);
      setEditableContent(generatedContent);
    } catch (error) {
      console.error('Failed to generate document:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [system]);

  useEffect(() => {
    generateDocument();
  }, [generateDocument]);

  const handleExport = useCallback(() => {
    const disclaimer = `# DISCLAIMER\nThis document is an AI-generated draft based on provided system information.\n\n⚠️ **IMPORTANT**: This draft requires thorough legal review and completion by qualified personnel before submission to any regulatory authority.\n\n---\n\n`;
    const fullContent = disclaimer + editableContent;
    const blob = new Blob([fullContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Technical_Documentation_${system.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [editableContent, system.name]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(editableContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [editableContent]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SentinelButton variant="secondary" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </SentinelButton>
        <div className="flex items-center gap-3">
          {content && !editMode && (
            <SentinelButton variant="ghost" onClick={() => setEditMode(true)}>Edit</SentinelButton>
          )}
          {editMode && (
            <SentinelButton variant="ghost" onClick={() => setEditMode(false)}>Preview</SentinelButton>
          )}
          {content && (
            <>
              <SentinelButton variant="secondary" onClick={handleCopy} icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
                {copied ? 'Copied' : 'Copy'}
              </SentinelButton>
              <SentinelButton onClick={handleExport} icon={<Download className="w-4 h-4" />}>
                Export Markdown
              </SentinelButton>
            </>
          )}
        </div>
      </div>

      {/* System Info */}
      <SentinelCard padding="md">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Technical Documentation (Annex IV)</h2>
            <p className="text-sm text-zinc-400">{system.name}</p>
          </div>
          <SentinelBadge variant="highRisk">HIGH-RISK</SentinelBadge>
        </div>
      </SentinelCard>

      {/* Disclaimer */}
      <SentinelCard padding="sm" className="border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400 mb-1">AI-Generated Draft</p>
            <p className="text-xs text-zinc-300">
              This document requires legal review and completion by qualified personnel before submission to regulatory authorities.
            </p>
          </div>
        </div>
      </SentinelCard>

      {/* Document Content */}
      {generating ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <SentinelCard padding="lg" className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Generating Technical Documentation</h3>
            <p className="text-sm text-zinc-400 mb-4">AI is analyzing system information and drafting Annex IV compliant documentation...</p>
            <div className="w-full max-w-xs mx-auto h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '90%' }}
                transition={{ duration: 25, ease: 'easeOut' }}
              />
            </div>
          </SentinelCard>
        </motion.div>
      ) : content ? (
        <SentinelCard padding="md">
          {editMode ? (
            <Textarea
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              className="min-h-[600px] font-mono text-sm bg-black/50 border-zinc-800/60 text-white"
              placeholder="Edit document content..."
            />
          ) : (
            <div className="prose prose-invert prose-emerald max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-6 mb-4">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold text-white mt-6 mb-3">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-zinc-300 leading-relaxed mb-4">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside text-zinc-300 mb-4 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside text-zinc-300 mb-4 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-zinc-300">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  code: ({ children, ...props }) => (
                    <code className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-sm font-mono">{children}</code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-emerald-500/50 pl-4 italic text-zinc-400 my-4">{children}</blockquote>
                  ),
                }}
              >
                {editableContent}
              </ReactMarkdown>
            </div>
          )}
        </SentinelCard>
      ) : null}
    </div>
  );
}
