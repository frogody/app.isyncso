import React, { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { 
  Mail, Linkedin, Phone, Clock, Plus, Trash2, GripVertical, 
  ChevronDown, ChevronUp, Sparkles, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { db } from "@/api/supabaseClient";

const STEP_TYPES = [
  { id: 'email', label: 'Email', icon: Mail, color: 'from-violet-500 to-violet-600' },
  { id: 'linkedin_connection', label: 'LinkedIn Connect', icon: Linkedin, color: 'from-blue-500 to-blue-600' },
  { id: 'linkedin_message', label: 'LinkedIn Message', icon: Linkedin, color: 'from-blue-500 to-blue-600' },
  { id: 'call', label: 'Phone Call', icon: Phone, color: 'from-amber-500 to-amber-600' },
  { id: 'wait', label: 'Wait', icon: Clock, color: 'from-zinc-500 to-zinc-600' },
];

function SequenceStep({ step, index, onUpdate, onDelete, isExpanded, onToggle }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const typeConfig = STEP_TYPES.find(t => t.id === step.type) || STEP_TYPES[0];
  const Icon = typeConfig.icon;

  const generateContent = async () => {
    setIsGenerating(true);
    try {
      const result = await db.integrations.Core.InvokeLLM({
        prompt: `Generate a brief, personalized ${step.type === 'email' ? 'cold email' : step.type === 'linkedin_message' ? 'LinkedIn message' : 'outreach message'} for step ${index + 1} of a sales sequence.
        
This is ${index === 0 ? 'the first touch' : `follow-up #${index}`}.
Keep it concise (${step.type === 'email' ? '3-4 sentences' : '2-3 sentences'}).
Be professional but conversational.
Include a clear CTA.
Use {{first_name}} and {{company}} as placeholders.`,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            content: { type: "string" }
          }
        }
      });

      onUpdate({ 
        ...step, 
        subject: result.subject || step.subject,
        content: result.content 
      });
    } catch (error) {
      console.error('Failed to generate:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-zinc-900/80 rounded-xl border border-zinc-800 overflow-hidden"
    >
      {/* Header */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
        onClick={onToggle}
      >
        <div className="cursor-grab">
          <GripVertical className="w-4 h-4 text-zinc-600" />
        </div>
        
        <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0", typeConfig.color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Step {index + 1}</span>
            <span className="text-white font-medium">{typeConfig.label}</span>
            {step.delay_days > 0 && (
              <span className="text-xs text-zinc-500">after {step.delay_days} day{step.delay_days > 1 ? 's' : ''}</span>
            )}
          </div>
          {step.subject && !isExpanded && (
            <p className="text-sm text-zinc-500 truncate">{step.subject}</p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4 border-t border-zinc-800">
              {step.type === 'wait' ? (
                <div>
                  <label className="text-zinc-400 text-sm mb-1.5 block">Wait Duration (days)</label>
                  <Input
                    type="number"
                    value={step.delay_days || 1}
                    onChange={(e) => onUpdate({ ...step, delay_days: parseInt(e.target.value) || 1 })}
                    className="bg-zinc-800/50 border-zinc-700 text-white w-32"
                    min={1}
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Step Type</label>
                      <Select 
                        value={step.type} 
                        onValueChange={(v) => onUpdate({ ...step, type: v })}
                      >
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {STEP_TYPES.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <span className="flex items-center gap-2">
                                <t.icon className="w-4 h-4" /> {t.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Delay After Previous (days)</label>
                      <Input
                        type="number"
                        value={step.delay_days || 0}
                        onChange={(e) => onUpdate({ ...step, delay_days: parseInt(e.target.value) || 0 })}
                        className="bg-zinc-800/50 border-zinc-700 text-white"
                        min={0}
                      />
                    </div>
                  </div>

                  {step.type === 'email' && (
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Subject Line</label>
                      <Input
                        value={step.subject || ''}
                        onChange={(e) => onUpdate({ ...step, subject: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="Quick question about {{company}}"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-zinc-400 text-sm">Message Content</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateContent}
                        disabled={isGenerating}
                        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 h-7 text-xs"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3 mr-1.5" />
                        )}
                        Generate with AI
                      </Button>
                    </div>
                    <Textarea
                      value={step.content || ''}
                      onChange={(e) => onUpdate({ ...step, content: e.target.value })}
                      className="bg-zinc-800/50 border-zinc-700 text-white resize-none"
                      rows={4}
                      placeholder="Hi {{first_name}}, I noticed..."
                    />
                    <p className="text-xs text-zinc-600 mt-1.5">
                      Use {"{{first_name}}"}, {"{{company}}"}, {"{{title}}"} for personalization
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CampaignSequenceEditor({ steps = [], onChange }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const addStep = (type = 'email') => {
    const newStep = {
      step_number: steps.length + 1,
      type,
      subject: '',
      content: '',
      delay_days: steps.length > 0 ? 2 : 0
    };
    onChange([...steps, newStep]);
    setExpandedIndex(steps.length);
  };

  const updateStep = (index, updatedStep) => {
    const newSteps = [...steps];
    newSteps[index] = updatedStep;
    onChange(newSteps);
  };

  const deleteStep = (index) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    newSteps.forEach((s, i) => { s.step_number = i + 1; });
    onChange(newSteps);
    setExpandedIndex(null);
  };

  const reorderSteps = (newOrder) => {
    newOrder.forEach((s, i) => { s.step_number = i + 1; });
    onChange(newOrder);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Sequence Steps</h3>
        <span className="text-xs text-zinc-500">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
      </div>

      {steps.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-zinc-700 text-center">
          <Mail className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm mb-4">No sequence steps yet</p>
          <Button onClick={() => addStep('email')} className="bg-indigo-500 hover:bg-indigo-400 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add First Step
          </Button>
        </div>
      ) : (
        <>
          <Reorder.Group axis="y" values={steps} onReorder={reorderSteps} className="space-y-3">
            {steps.map((step, index) => (
              <Reorder.Item key={`step-${index}`} value={step}>
                <SequenceStep
                  step={step}
                  index={index}
                  onUpdate={(updated) => updateStep(index, updated)}
                  onDelete={() => deleteStep(index)}
                  isExpanded={expandedIndex === index}
                  onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => addStep('email')}
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white flex-1"
            >
              <Mail className="w-4 h-4 mr-2" /> Add Email
            </Button>
            <Button
              variant="outline"
              onClick={() => addStep('linkedin_message')}
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white flex-1"
            >
              <Linkedin className="w-4 h-4 mr-2" /> Add LinkedIn
            </Button>
            <Button
              variant="outline"
              onClick={() => addStep('wait')}
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <Clock className="w-4 h-4 mr-2" /> Wait
            </Button>
          </div>
        </>
      )}
    </div>
  );
}