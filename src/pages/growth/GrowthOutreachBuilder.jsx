/**
 * Growth Outreach Builder
 * Build multi-step email outreach sequences for researched prospects
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Clock,
  GitBranch,
  Plus,
  Trash2,
  GripVertical,
  Users,
  Filter,
  Check,
  X,
  Sparkles,
  Send,
  Calendar,
  Save,
  Eye,
  Edit3,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Loader2,
  AlertCircle,
  Star,
  Flame,
  Building2,
  User,
  Globe,
  Play,
  RefreshCw,
  Copy,
  Zap,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useGrowthAI } from '@/hooks/useGrowthAI';

// Default sequence template
const DEFAULT_SEQUENCE = [
  { id: 'step-1', type: 'email', subject: '', body: '', name: 'Initial Outreach' },
  { id: 'step-2', type: 'wait', days: 3 },
  { id: 'step-3', type: 'email', subject: '', body: '', name: 'Follow-up' },
  { id: 'step-4', type: 'wait', days: 5 },
  { id: 'step-5', type: 'email', subject: '', body: '', name: 'Final Touch' },
];

// Available variables for email templates
const EMAIL_VARIABLES = [
  { key: 'first_name', label: 'First Name', example: 'John' },
  { key: 'last_name', label: 'Last Name', example: 'Smith' },
  { key: 'full_name', label: 'Full Name', example: 'John Smith' },
  { key: 'company', label: 'Company', example: 'Acme Corp' },
  { key: 'title', label: 'Job Title', example: 'VP of Sales' },
  { key: 'industry', label: 'Industry', example: 'Technology' },
  { key: 'website', label: 'Website', example: 'acme.com' },
  { key: 'ai_research', label: 'AI Research Summary', example: 'Shows strong growth signals...' },
];

// Tone options for AI generation
const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-appropriate' },
  { value: 'casual', label: 'Casual', description: 'Friendly and approachable' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and personable' },
  { value: 'urgent', label: 'Urgent', description: 'Time-sensitive and action-oriented' },
];

// Length options
const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short', description: '2-3 sentences' },
  { value: 'medium', label: 'Medium', description: '1 paragraph' },
  { value: 'long', label: 'Long', description: '2+ paragraphs' },
];

// Fit score badge component
function FitScoreBadge({ score }) {
  if (score === null || score === undefined) return null;

  let color = 'bg-red-500/20 text-red-400 border-red-500/30';
  let icon = AlertCircle;

  if (score >= 80) {
    color = 'bg-green-500/20 text-green-400 border-green-500/30';
    icon = Flame;
  } else if (score >= 50) {
    color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    icon = Star;
  }

  const Icon = icon;

  return (
    <Badge className={`${color} font-mono text-xs`}>
      <Icon className="w-3 h-3 mr-1" />
      {score}
    </Badge>
  );
}

// Prospect row component
function ProspectRow({ prospect, isSelected, onToggle }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-indigo-500/10 border border-indigo-500/30'
          : 'bg-zinc-800/50 border border-transparent hover:bg-zinc-800'
      }`}
      onClick={() => onToggle(prospect.id)}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(prospect.id)}
        className="data-[state=checked]:bg-indigo-600"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white truncate">
            {prospect.name || 'Unknown'}
          </span>
          {prospect.email && (
            <Mail className="w-3 h-3 text-green-400 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Building2 className="w-3 h-3" />
          <span className="truncate">{prospect.company || 'Unknown'}</span>
        </div>
      </div>
      <FitScoreBadge score={prospect.fitScore} />
    </div>
  );
}

// Email step card component
function EmailStepCard({ step, index, isActive, onEdit, onDelete, totalSteps }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`relative group ${isActive ? 'z-10' : ''}`}
    >
      {/* Timeline connector */}
      {index < totalSteps - 1 && (
        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-zinc-700" style={{ height: '24px' }} />
      )}

      <div
        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
          isActive
            ? 'bg-indigo-500/10 border-indigo-500/50 ring-2 ring-indigo-500/30'
            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
        }`}
        onClick={onEdit}
      >
        {/* Drag handle */}
        <div className="p-1 rounded hover:bg-zinc-700 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-zinc-500" />
        </div>

        {/* Step icon */}
        <div className={`p-2 rounded-lg ${
          isActive ? 'bg-indigo-500/20' : 'bg-zinc-800'
        }`}>
          <Mail className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">
              {step.name || `Email ${index + 1}`}
            </span>
            <Badge className="bg-zinc-800 text-zinc-400 text-xs">Step {index + 1}</Badge>
          </div>
          {step.subject ? (
            <p className="text-sm text-zinc-400 truncate">{step.subject}</p>
          ) : (
            <p className="text-sm text-zinc-600 italic">No subject set</p>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Wait step card component
function WaitStepCard({ step, index, onEdit, onDelete, totalSteps }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="relative group"
    >
      {/* Timeline connector */}
      {index < totalSteps - 1 && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-zinc-700" style={{ height: '24px' }} />
      )}

      <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
        {/* Drag handle */}
        <div className="p-1 rounded hover:bg-zinc-700 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-zinc-500" />
        </div>

        {/* Icon */}
        <div className="p-2 rounded-lg bg-zinc-800/50">
          <Clock className="w-4 h-4 text-amber-400" />
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-zinc-400">Wait</span>
          <Select
            value={String(step.days)}
            onValueChange={(value) => onEdit({ ...step, days: parseInt(value) })}
          >
            <SelectTrigger className="w-20 h-8 bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {[1, 2, 3, 4, 5, 7, 10, 14].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} {d === 1 ? 'day' : 'days'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// AI Email Generator Modal
function AIGeneratorModal({ isOpen, onClose, onGenerate, stepName }) {
  const [intent, setIntent] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!intent.trim()) return;
    setGenerating(true);
    try {
      await onGenerate({ intent, tone, length });
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Generate Email with AI
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Describe what you want this email to achieve for "{stepName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Intent */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              What should this email achieve?
            </label>
            <Textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g., Introduce our product and ask for a 15-minute call to discuss their growth challenges..."
              className="bg-zinc-800 border-zinc-700 min-h-[100px]"
            />
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Tone</label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTone(option.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    tone === option.value
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs opacity-70">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Length</label>
            <div className="grid grid-cols-3 gap-2">
              {LENGTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLength(option.value)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    length === option.value
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs opacity-70">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!intent.trim() || generating}
            className="bg-purple-600 hover:bg-purple-500"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Variable picker component
function VariablePicker({ onInsert }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="border-zinc-700 text-xs"
      >
        <Zap className="w-3 h-3 mr-1" />
        Variables
        <ChevronDown className="w-3 h-3 ml-1" />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-20 top-full mt-1 right-0 w-56 p-2 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl"
          >
            {EMAIL_VARIABLES.map((variable) => (
              <button
                key={variable.key}
                onClick={() => {
                  onInsert(`{${variable.key}}`);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-zinc-700 text-left"
              >
                <div>
                  <p className="text-sm text-white">{variable.label}</p>
                  <p className="text-xs text-zinc-500">{`{${variable.key}}`}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Email editor panel
function EmailEditor({
  step,
  onChange,
  sampleProspect,
  onGenerateAI,
}) {
  const [activeTab, setActiveTab] = useState('edit');
  const [subjectRef, setSubjectRef] = useState(null);
  const [bodyRef, setBodyRef] = useState(null);

  // Render preview with variable substitution
  const renderPreview = (text) => {
    if (!text) return '';

    let rendered = text;
    EMAIL_VARIABLES.forEach((v) => {
      const regex = new RegExp(`\\{${v.key}\\}`, 'g');
      const value = sampleProspect?.[v.key] || v.example;
      rendered = rendered.replace(regex, `<span class="text-indigo-400">${value}</span>`);
    });

    return rendered;
  };

  const insertVariable = (variable, target) => {
    if (target === 'subject') {
      onChange({ ...step, subject: (step.subject || '') + variable });
    } else {
      onChange({ ...step, body: (step.body || '') + variable });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-400" />
          <span className="font-medium text-white">{step.name || 'Email'}</span>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-800 h-8">
            <TabsTrigger value="edit" className="text-xs">
              <Edit3 className="w-3 h-3 mr-1" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'edit' ? (
          <div className="space-y-4">
            {/* Step Name */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Step Name</label>
              <Input
                value={step.name || ''}
                onChange={(e) => onChange({ ...step, name: e.target.value })}
                placeholder="e.g., Initial Outreach"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400">Subject Line</label>
                <VariablePicker onInsert={(v) => insertVariable(v, 'subject')} />
              </div>
              <Input
                value={step.subject || ''}
                onChange={(e) => onChange({ ...step, subject: e.target.value })}
                placeholder="e.g., Quick question about {company}'s growth"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400">Email Body</label>
                <VariablePicker onInsert={(v) => insertVariable(v, 'body')} />
              </div>
              <Textarea
                value={step.body || ''}
                onChange={(e) => onChange({ ...step, body: e.target.value })}
                placeholder="Write your email content here. Use {variables} for personalization..."
                className="bg-zinc-800 border-zinc-700 min-h-[200px]"
              />
            </div>

            {/* AI Generate Button */}
            <Button
              onClick={onGenerateAI}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview Subject */}
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <p className="text-xs text-zinc-500 mb-1">Subject</p>
              <p
                className="text-white"
                dangerouslySetInnerHTML={{ __html: renderPreview(step.subject) || '<span class="text-zinc-600">No subject</span>' }}
              />
            </div>

            {/* Preview Body */}
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-xs text-zinc-500 mb-2">Body</p>
              <div
                className="text-zinc-300 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: renderPreview(step.body) || '<span class="text-zinc-600">No content</span>' }}
              />
            </div>

            {/* Sample prospect info */}
            {sampleProspect && (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-xs text-indigo-400 mb-1">Previewing with sample prospect:</p>
                <p className="text-sm text-white">
                  {sampleProspect.full_name || sampleProspect.name} at {sampleProspect.company}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Main component
export default function GrowthOutreachBuilder() {
  const { workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const { executeAIForRow, models } = useGrowthAI();

  // State
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [prospects, setProspects] = useState([]);
  const [selectedProspectIds, setSelectedProspectIds] = useState(new Set());
  const [sequence, setSequence] = useState(DEFAULT_SEQUENCE);
  const [activeStepId, setActiveStepId] = useState(null);
  const [filters, setFilters] = useState({
    minScore: 50,
    hasEmail: true,
    industries: [],
  });
  const [showAIModal, setShowAIModal] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  // Get active step
  const activeStep = useMemo(() => {
    return sequence.find((s) => s.id === activeStepId && s.type === 'email');
  }, [sequence, activeStepId]);

  // Get sample prospect for preview
  const sampleProspect = useMemo(() => {
    const selectedIds = Array.from(selectedProspectIds);
    if (selectedIds.length > 0) {
      return prospects.find((p) => p.id === selectedIds[0]);
    }
    return prospects[0];
  }, [prospects, selectedProspectIds]);

  // Available industries from prospects
  const availableIndustries = useMemo(() => {
    const industries = new Set();
    prospects.forEach((p) => {
      if (p.industry) industries.add(p.industry);
    });
    return Array.from(industries).sort();
  }, [prospects]);

  // Filtered prospects
  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      if (filters.minScore > 0 && (p.fitScore || 0) < filters.minScore) return false;
      if (filters.hasEmail && !p.email) return false;
      if (filters.industries.length > 0 && !filters.industries.includes(p.industry)) return false;
      return true;
    });
  }, [prospects, filters]);

  // Calculate sequence stats
  const sequenceStats = useMemo(() => {
    const emails = sequence.filter((s) => s.type === 'email').length;
    const totalDays = sequence
      .filter((s) => s.type === 'wait')
      .reduce((sum, s) => sum + (s.days || 0), 0);

    return {
      prospects: selectedProspectIds.size,
      emails,
      totalDays,
      totalEmails: selectedProspectIds.size * emails,
    };
  }, [sequence, selectedProspectIds]);

  // Load workspace and prospects
  useEffect(() => {
    async function loadData() {
      const wsId = workspaceId || searchParams.get('workspace');
      if (!wsId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load workspace
        const { data: wsData, error: wsError } = await supabase
          .from('enrich_workspaces')
          .select('*')
          .eq('id', wsId)
          .single();

        if (wsError) throw wsError;
        setWorkspace(wsData);

        // Load columns to find key fields
        const { data: columns } = await supabase
          .from('enrich_columns')
          .select('*')
          .eq('workspace_id', wsId);

        // Find column IDs by type/name
        const findColumn = (names) => {
          return columns?.find((c) =>
            names.some((n) => c.name.toLowerCase().includes(n.toLowerCase()))
          );
        };

        const nameCol = findColumn(['name', 'full_name', 'contact']);
        const companyCol = findColumn(['company', 'organization']);
        const emailCol = findColumn(['email']);
        const industryCol = findColumn(['industry', 'sector']);
        const titleCol = findColumn(['title', 'position', 'role']);
        const fitScoreCol = columns?.find((c) => c.type === 'fit_score');
        const aiResearchCol = columns?.find((c) => c.type === 'ai');

        // Load rows with cells
        const { data: rows, error: rowsError } = await supabase
          .from('enrich_rows')
          .select(`*, enrich_cells(*)`)
          .eq('workspace_id', wsId)
          .order('order_index')
          .limit(200);

        if (rowsError) throw rowsError;

        // Transform rows to prospect format
        const transformedProspects = (rows || []).map((row) => {
          const cells = (row.enrich_cells || []).reduce((acc, cell) => {
            acc[cell.column_id] = cell;
            return acc;
          }, {});

          return {
            id: row.id,
            name: cells[nameCol?.id]?.value || '',
            first_name: (cells[nameCol?.id]?.value || '').split(' ')[0],
            last_name: (cells[nameCol?.id]?.value || '').split(' ').slice(1).join(' '),
            full_name: cells[nameCol?.id]?.value || '',
            company: cells[companyCol?.id]?.value || '',
            email: cells[emailCol?.id]?.value || '',
            industry: cells[industryCol?.id]?.value || '',
            title: cells[titleCol?.id]?.value || '',
            fitScore: cells[fitScoreCol?.id]?.value,
            ai_research: cells[aiResearchCol?.id]?.value || '',
          };
        });

        setProspects(transformedProspects);

        // Auto-select high-fit prospects
        const highFitIds = new Set(
          transformedProspects
            .filter((p) => p.fitScore >= 50 && p.email)
            .slice(0, 100)
            .map((p) => p.id)
        );
        setSelectedProspectIds(highFitIds);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load workspace data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [workspaceId, searchParams, toast]);

  // Toggle prospect selection
  const toggleProspect = useCallback((id) => {
    setSelectedProspectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all / deselect all
  const selectAll = useCallback(() => {
    const allIds = new Set(filteredProspects.map((p) => p.id));
    setSelectedProspectIds(allIds);
  }, [filteredProspects]);

  const deselectAll = useCallback(() => {
    setSelectedProspectIds(new Set());
  }, []);

  // Update step
  const updateStep = useCallback((updatedStep) => {
    setSequence((prev) =>
      prev.map((s) => (s.id === updatedStep.id ? updatedStep : s))
    );
  }, []);

  // Delete step
  const deleteStep = useCallback((stepId) => {
    setSequence((prev) => prev.filter((s) => s.id !== stepId));
    if (activeStepId === stepId) {
      setActiveStepId(null);
    }
  }, [activeStepId]);

  // Add email step
  const addEmailStep = useCallback(() => {
    const newId = `step-${Date.now()}`;
    const emailCount = sequence.filter((s) => s.type === 'email').length + 1;
    setSequence((prev) => [
      ...prev,
      { id: newId, type: 'email', subject: '', body: '', name: `Email ${emailCount}` },
    ]);
    setActiveStepId(newId);
  }, [sequence]);

  // Add wait step
  const addWaitStep = useCallback(() => {
    const newId = `step-${Date.now()}`;
    setSequence((prev) => [...prev, { id: newId, type: 'wait', days: 3 }]);
  }, []);

  // Generate email with AI
  const handleAIGenerate = async ({ intent, tone, length }) => {
    if (!activeStep) return;

    try {
      // Build prompt for email generation
      const prompt = `Write a ${length} ${tone} B2B outreach email.

Goal: ${intent}

The email should:
- Be personalized using the recipient's name and company
- Be concise and value-focused
- Have a clear call to action
- Sound natural, not robotic

Format your response as:
SUBJECT: [subject line here]

BODY:
[email body here]

Use these variables for personalization:
- {first_name} - recipient's first name
- {company} - their company name
- {industry} - their industry
- {ai_research} - relevant research about them`;

      const { data, error } = await supabase.functions.invoke('growth-ai-execute', {
        body: {
          prompt,
          model: 'moonshotai/Kimi-K2-Instruct',
          systemPrompt: 'You are an expert B2B sales copywriter who writes compelling, personalized outreach emails. You understand how to grab attention and create genuine interest without being pushy.',
          maxTokens: 800,
          temperature: 0.8,
        },
      });

      if (error) throw error;

      // Parse response
      const result = data.result || '';
      const subjectMatch = result.match(/SUBJECT:\s*(.+?)(?:\n|BODY:)/i);
      const bodyMatch = result.match(/BODY:\s*([\s\S]+)$/i);

      const newSubject = subjectMatch ? subjectMatch[1].trim() : activeStep.subject;
      const newBody = bodyMatch ? bodyMatch[1].trim() : result;

      updateStep({
        ...activeStep,
        subject: newSubject,
        body: newBody,
      });

      toast({
        title: 'Email Generated',
        description: 'AI has crafted your email. Review and customize as needed.',
      });
    } catch (error) {
      console.error('Error generating email:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate email. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Save as draft
  const saveDraft = async () => {
    try {
      // TODO: Save to database
      toast({
        title: 'Draft Saved',
        description: 'Your sequence has been saved as a draft.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save draft.',
        variant: 'destructive',
      });
    }
  };

  // Launch sequence
  const launchSequence = async () => {
    if (selectedProspectIds.size === 0) {
      toast({
        title: 'No Prospects Selected',
        description: 'Please select at least one prospect.',
        variant: 'destructive',
      });
      return;
    }

    const emailSteps = sequence.filter((s) => s.type === 'email');
    const emptyEmails = emailSteps.filter((s) => !s.subject || !s.body);

    if (emptyEmails.length > 0) {
      toast({
        title: 'Incomplete Emails',
        description: `${emptyEmails.length} email(s) are missing subject or body.`,
        variant: 'destructive',
      });
      return;
    }

    setLaunching(true);

    try {
      // TODO: Create campaign and schedule emails
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: 'Sequence Launched!',
        description: `${sequenceStats.totalEmails} emails scheduled for ${sequenceStats.prospects} prospects.`,
      });

      navigate('/growth/campaigns');
    } catch (error) {
      toast({
        title: 'Launch Failed',
        description: 'Failed to launch sequence. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLaunching(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 h-14 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/growth/dashboard')}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/growth/dashboard')}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-indigo-400 transition-colors"
            >
              <Rocket className="w-4 h-4" />
              Growth
            </button>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
            <span className="text-white font-medium">Create Sequence</span>
            {workspace && (
              <span className="text-zinc-500">/ {workspace.name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={saveDraft} className="border-zinc-700">
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={launchSequence}
            disabled={launching || selectedProspectIds.size === 0}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {launching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Launch Sequence
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main content - Three columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Prospect Selector */}
        <div className="w-80 flex-shrink-0 border-r border-zinc-800 flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-white">Filters</span>
              </div>
            </div>

            {/* Fit Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Min Fit Score</span>
                <span className="text-xs text-indigo-400">{filters.minScore}+</span>
              </div>
              <Slider
                value={[filters.minScore]}
                onValueChange={([value]) => setFilters((f) => ({ ...f, minScore: value }))}
                min={0}
                max={100}
                step={10}
                className="w-full"
              />
            </div>

            {/* Has Email */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasEmail"
                checked={filters.hasEmail}
                onCheckedChange={(checked) => setFilters((f) => ({ ...f, hasEmail: checked }))}
              />
              <label htmlFor="hasEmail" className="text-sm text-zinc-300 cursor-pointer">
                Has email address
              </label>
            </div>

            {/* Industry filter */}
            {availableIndustries.length > 0 && (
              <Select
                value={filters.industries[0] || 'all'}
                onValueChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    industries: value === 'all' ? [] : [value],
                  }))
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="All industries" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All industries</SelectItem>
                  {availableIndustries.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selection controls */}
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              <span className="text-indigo-400 font-medium">{selectedProspectIds.size}</span> of{' '}
              {filteredProspects.length} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-indigo-400 hover:underline"
              >
                Select all
              </button>
              <span className="text-zinc-600">|</span>
              <button
                onClick={deselectAll}
                className="text-xs text-zinc-400 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Prospect list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredProspects.length > 0 ? (
              filteredProspects.map((prospect) => (
                <ProspectRow
                  key={prospect.id}
                  prospect={prospect}
                  isSelected={selectedProspectIds.has(prospect.id)}
                  onToggle={toggleProspect}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="w-10 h-10 text-zinc-700 mb-2" />
                <p className="text-sm text-zinc-500">No prospects match filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Center Column - Sequence Builder */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-white mb-1">Sequence Timeline</h2>
            <p className="text-xs text-zinc-500">
              {sequenceStats.emails} emails over {sequenceStats.totalDays} days
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3 max-w-md mx-auto">
              <AnimatePresence mode="popLayout">
                {sequence.map((step, index) =>
                  step.type === 'email' ? (
                    <EmailStepCard
                      key={step.id}
                      step={step}
                      index={index}
                      isActive={activeStepId === step.id}
                      onEdit={() => setActiveStepId(step.id)}
                      onDelete={() => deleteStep(step.id)}
                      totalSteps={sequence.length}
                    />
                  ) : (
                    <WaitStepCard
                      key={step.id}
                      step={step}
                      index={index}
                      onEdit={(updated) => updateStep(updated)}
                      onDelete={() => deleteStep(step.id)}
                      totalSteps={sequence.length}
                    />
                  )
                )}
              </AnimatePresence>

              {/* Add step buttons */}
              <div className="flex items-center gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={addEmailStep}
                  className="flex-1 border-zinc-700 border-dashed"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Add Email
                </Button>
                <Button
                  variant="outline"
                  onClick={addWaitStep}
                  className="flex-1 border-zinc-700 border-dashed"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Add Wait
                </Button>
              </div>
            </div>
          </div>

          {/* Launch summary */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="text-white">{sequenceStats.prospects} prospects</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span className="text-white">{sequenceStats.totalEmails} total emails</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-white">{sequenceStats.totalDays} day duration</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Email Editor */}
        <div className="w-96 flex-shrink-0 border-l border-zinc-800">
          {activeStep ? (
            <EmailEditor
              step={activeStep}
              onChange={updateStep}
              sampleProspect={sampleProspect}
              onGenerateAI={() => setShowAIModal(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Mail className="w-12 h-12 text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Select an Email Step</h3>
              <p className="text-sm text-zinc-500">
                Click on an email step in the sequence to edit its content
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Generator Modal */}
      <AIGeneratorModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={handleAIGenerate}
        stepName={activeStep?.name || 'Email'}
      />
    </div>
  );
}
