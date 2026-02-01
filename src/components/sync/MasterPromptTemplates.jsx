import React, { useState } from 'react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Zap, Copy, Loader2, CheckCircle, ChevronLeft, Sparkles, Send } from "lucide-react";
import { supabase } from "./supabaseSync";
import { GlassCard } from "@/components/ui/GlassCard";
import { toast } from 'sonner';

const TEMPLATES = [
  {
    id: 'clay_campaign',
    name: 'Clay Campaign Builder',
    description: 'Create a full prospecting campaign in Clay',
    icon: '🧱',
    category: 'growth',
    prompt: `You are helping me build a prospecting campaign in Clay.

Target: {{targetRole}} at companies in {{targetIndustry}}
Company Size: {{companySize}}
Region: {{region}}

Please help me:
1. Navigate to Clay and create a new table
2. Use "Find People" with these filters
3. Add email enrichment columns
4. Set up AI personalization
5. Export when ready

Start by going to app.clay.com`,
    variables: ['targetRole', 'targetIndustry', 'companySize', 'region']
  },
  {
    id: 'linkedin_research',
    name: 'LinkedIn Profile Research',
    description: 'Deep research on a LinkedIn profile',
    icon: '💼',
    category: 'research',
    prompt: `Research this LinkedIn profile and provide:

Profile: {{profileUrl}}

1. Full name and current role
2. Career history summary
3. Key skills and expertise
4. Mutual connections or commonalities
5. Potential conversation starters
6. Best approach for outreach

Be thorough and professional.`,
    variables: ['profileUrl']
  },
  {
    id: 'email_sequence',
    name: 'Email Sequence Generator',
    description: 'Create a multi-touch email sequence',
    icon: '📧',
    category: 'outreach',
    prompt: `Create a {{numEmails}}-email outreach sequence:

Target Persona: {{targetPersona}}
Product/Service: {{product}}
Campaign Goal: {{goal}}

Each email should:
- Be under 150 words
- Have a clear, single CTA
- Sound human and conversational
- Build on previous touchpoints

Generate all emails with subject lines.`,
    variables: ['numEmails', 'targetPersona', 'product', 'goal']
  },
  {
    id: 'company_research',
    name: 'Company Intelligence',
    description: 'Research a target company thoroughly',
    icon: '🔍',
    category: 'research',
    prompt: `Research {{companyName}} and compile intelligence:

1. Company Overview
   - Size, funding, revenue
   - Industry and market position
   
2. Key Decision Makers
   - C-suite and VP+ executives
   - Their backgrounds and tenure
   
3. Recent News
   - Funding, acquisitions, launches
   - Leadership changes
   
4. Tech Stack (if B2B SaaS)
   - Tools they use
   - Integration opportunities
   
5. Pain Points
   - Based on industry challenges
   - Recent news indicators

Provide actionable insights for sales outreach.`,
    variables: ['companyName']
  }
];

const categoryColors = {
  growth: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  research: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  outreach: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' }
};

export default function MasterPromptTemplates({ sessionId }) {
  const { syt } = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variables, setVariables] = useState({});
  const [sending, setSending] = useState(false);
  const [promptSent, setPromptSent] = useState(false);

  const sendMasterPrompt = async () => {
    if (!selectedTemplate || !sessionId) return;

    setSending(true);
    setPromptSent(false);
    
    let finalPrompt = selectedTemplate.prompt;
    for (const [key, value] of Object.entries(variables)) {
      finalPrompt = finalPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value || `[${key}]`);
    }

    try {
      const { error } = await supabase
        .from('sync_actions')
        .insert({
          session_id: sessionId,
          action_type: 'master_prompt',
          action_data: {
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
            prompt: finalPrompt,
            variables
          },
          status: 'pending'
        });

      if (error) throw error;

      setPromptSent(true);
      toast.success('Prompt sent to Claude!');
      setTimeout(() => setPromptSent(false), 10000);
    } catch (error) {
      toast.error('Failed to send prompt');
    } finally {
      setSending(false);
    }
  };

  return (
    <GlassCard glow="purple" className="p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${syt('text-slate-900', 'text-white')} mb-1`}>Master Prompt Templates</h3>
          <p className={`${syt('text-slate-500', 'text-zinc-400')} text-sm`}>
            Pre-built prompts for common workflows
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-purple-500/10 rounded-xl p-4 mb-6 border border-purple-500/20">
        <div className={`flex items-center gap-3 text-sm ${syt('text-slate-600', 'text-zinc-300')}`}>
          <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <span>Select → Fill variables → Send → Press <kbd className={`px-1.5 py-0.5 ${syt('bg-slate-100', 'bg-zinc-800')} rounded text-xs`}>⌘V</kbd> in Claude</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedTemplate ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {TEMPLATES.map((template, i) => {
              const colors = categoryColors[template.category];
              return (
                <motion.button
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 rounded-xl border ${syt('border-slate-200', 'border-zinc-700/50')} ${syt('bg-slate-50', 'bg-zinc-800/30')} ${syt('hover:bg-slate-100', 'hover:bg-zinc-800/50')} hover:border-purple-500/30 transition-all text-left group`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${syt('text-slate-900', 'text-white')} group-hover:text-purple-400 transition-colors`}>{template.name}</span>
                      </div>
                      <p className={`text-sm ${syt('text-slate-500', 'text-zinc-400')} mb-2`}>{template.description}</p>
                      <Badge className={`${colors.bg} ${colors.text} ${colors.border} text-xs`}>
                        {template.category}
                      </Badge>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${syt('text-slate-400', 'text-zinc-600')} group-hover:text-purple-400 transition-colors`} />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <button
              onClick={() => setSelectedTemplate(null)}
              className={`text-sm ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:text-slate-900', 'hover:text-white')} flex items-center gap-1 transition-colors`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back to templates
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-2xl">
                {selectedTemplate.icon}
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${syt('text-slate-900', 'text-white')}`}>{selectedTemplate.name}</h3>
                <p className={`text-sm ${syt('text-slate-500', 'text-zinc-400')}`}>{selectedTemplate.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              {selectedTemplate.variables.map((variable) => (
                <div key={variable}>
                  <label className={`block text-sm font-medium ${syt('text-slate-600', 'text-zinc-300')} mb-2 capitalize`}>
                    {variable.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <Input
                    value={variables[variable] || ''}
                    onChange={(e) => setVariables({ ...variables, [variable]: e.target.value })}
                    className={`${syt('bg-slate-50', 'bg-zinc-800/50')} ${syt('border-slate-300', 'border-zinc-700')} ${syt('text-slate-900', 'text-white')} focus:border-purple-500`}
                    placeholder={`Enter ${variable}...`}
                  />
                </div>
              ))}
            </div>

            <div className={`${syt('bg-slate-50', 'bg-zinc-900/50')} rounded-xl p-4 border ${syt('border-slate-200', 'border-zinc-700/50')}`}>
              <div className={`text-xs font-medium ${syt('text-slate-400', 'text-zinc-500')} uppercase tracking-wider mb-2`}>Preview</div>
              <pre className={`text-sm ${syt('text-slate-600', 'text-zinc-300')} whitespace-pre-wrap font-mono leading-relaxed`}>
                {selectedTemplate.prompt.replace(/{{(\w+)}}/g, (match, key) => 
                  variables[key] ? `<span class="text-purple-400">${variables[key]}</span>` : `[${key}]`
                )}
              </pre>
            </div>

            <Button
              onClick={sendMasterPrompt}
              disabled={sending}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-12 font-semibold"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Send to Claude</>
              )}
            </Button>
            
            <p className={`text-xs ${syt('text-slate-400', 'text-zinc-500')} text-center`}>
              Press <kbd className={`px-1.5 py-0.5 ${syt('bg-slate-100', 'bg-zinc-800')} rounded`}>⌘V</kbd> in Claude sidebar, then <kbd className={`px-1.5 py-0.5 ${syt('bg-slate-100', 'bg-zinc-800')} rounded`}>Enter</kbd>
            </p>

            {promptSent && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-medium">Prompt copied!</p>
                    <p className={`${syt('text-slate-500', 'text-zinc-400')} text-sm mt-1`}>
                      Switch to Claude and press <kbd className={`px-1.5 py-0.5 ${syt('bg-slate-100', 'bg-zinc-700')} rounded text-xs`}>⌘V</kbd> to paste.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}