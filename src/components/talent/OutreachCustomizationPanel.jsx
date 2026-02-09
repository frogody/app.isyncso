import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Mail,
  Linkedin,
  Send,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  RotateCcw,
  Zap,
  Heart,
  Scale,
  SlidersHorizontal,
  Globe,
  Palette,
  Settings2,
  Info,
  Type,
} from 'lucide-react';
import {
  useOutreachPreferences,
  DATA_POINT_LABELS,
  TONE_OPTIONS,
  PRESET_CONFIGS,
  DEFAULT_PREFERENCES,
} from '@/hooks/useOutreachPreferences';

// ─── Message Type Icons ──────────────────────────────────

const MESSAGE_TYPE_ICONS = {
  linkedin_connection: Linkedin,
  linkedin_inmail: Send,
  linkedin_message: MessageSquare,
  email: Mail,
};

// ─── Collapsible Section ─────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-zinc-700/20 transition-colors"
      >
        {Icon && <Icon className="w-4 h-4 text-red-400 shrink-0" />}
        <span className="text-sm font-semibold text-white flex-1">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2"
    >
      <div
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-red-500' : 'bg-zinc-700'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
      {label && <span className="text-sm text-zinc-300">{label}</span>}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function OutreachCustomizationPanel({ organizationId, campaignId }) {
  const { preferences, loading, saving, savePreferences, resetToDefaults } =
    useOutreachPreferences(organizationId, campaignId);

  // Local draft state so user can edit before saving
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!loading && preferences) {
      setDraft(preferences);
      setDirty(false);
    }
  }, [loading, preferences]);

  if (loading || !draft) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
        <span className="ml-3 text-sm text-zinc-400">Loading outreach preferences...</span>
      </div>
    );
  }

  const updateDraft = (path, value) => {
    setDraft((prev) => {
      const next = { ...prev };
      // Support nested paths like 'message_types.email.enabled'
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await savePreferences(draft);
      setDirty(false);
      toast.success('Outreach preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      setDirty(false);
      toast.success('Preferences reset to defaults');
    } catch {
      toast.error('Failed to reset preferences');
    }
  };

  const applyPreset = (presetKey) => {
    const preset = PRESET_CONFIGS[presetKey];
    if (!preset) return;
    updateDraft('data_point_priorities', { ...preset.priorities });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-red-400" />
            Outreach Customization
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Configure how AI generates outreach messages for this campaign
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={saving}
            className="text-zinc-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Section 1: Message Types & Limits */}
      <Section title="Message Types & Limits" icon={Type} defaultOpen>
        <div className="space-y-4">
          {Object.entries(draft.message_types).map(([key, config]) => {
            const Icon = MESSAGE_TYPE_ICONS[key] || MessageSquare;
            return (
              <MessageTypeCard
                key={key}
                typeKey={key}
                config={config}
                icon={Icon}
                onChange={(field, value) =>
                  updateDraft(`message_types.${key}.${field}`, value)
                }
              />
            );
          })}
        </div>
      </Section>

      {/* Section 2: Message Style */}
      <Section title="Message Style" icon={Palette}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Default Tone */}
          <div>
            <Label className="text-xs text-zinc-400 mb-1.5 block">Default Tone</Label>
            <Select
              value={draft.default_tone}
              onValueChange={(v) => updateDraft('default_tone', v)}
            >
              <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div>
            <Label className="text-xs text-zinc-400 mb-1.5 block">Language</Label>
            <Select
              value={draft.default_language}
              onValueChange={(v) => updateDraft('default_language', v)}
            >
              <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="nl">Dutch</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Formality */}
          <div>
            <Label className="text-xs text-zinc-400 mb-1.5 block">Formality</Label>
            <div className="flex gap-2">
              {['formal', 'casual', 'friendly'].map((f) => (
                <button
                  key={f}
                  onClick={() => updateDraft('formality', f)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    draft.formality === f
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Section 3: Data Point Priorities */}
      <Section title="Data Point Priorities" icon={SlidersHorizontal}>
        {/* Presets */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-zinc-500 mr-1">Presets:</span>
          {Object.entries(PRESET_CONFIGS).map(([key, preset]) => {
            const presetIcons = { aggressive: Zap, relationship: Heart, balanced: Scale };
            const PresetIcon = presetIcons[key] || Scale;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 hover:border-red-500/50 hover:text-red-400 transition-colors"
                title={preset.description}
              >
                <PresetIcon className="w-3 h-3" />
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          {Object.entries(DATA_POINT_LABELS).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <div className="text-sm text-zinc-300 truncate" title={meta.description}>
                  {meta.label}
                </div>
              </div>
              <Slider
                value={[draft.data_point_priorities[key] ?? 50]}
                onValueChange={([v]) =>
                  updateDraft('data_point_priorities', {
                    ...draft.data_point_priorities,
                    [key]: v,
                  })
                }
                min={0}
                max={100}
                step={5}
                className="flex-1 [&_[data-radix-slider-range]]:bg-red-500 [&_[data-radix-slider-thumb]]:border-red-500"
              />
              <span className="w-8 text-right text-sm font-mono text-zinc-400">
                {draft.data_point_priorities[key] ?? 50}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 4: Custom Instructions */}
      <Section title="Custom Instructions" icon={Info}>
        <div>
          <Textarea
            value={draft.custom_instructions}
            onChange={(e) => updateDraft('custom_instructions', e.target.value)}
            placeholder="e.g., Always mention our Amsterdam office, reference the candidate's most recent role change, don't mention salary..."
            rows={4}
            className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600 resize-none"
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs text-zinc-500">
              {draft.custom_instructions.length} characters
            </span>
          </div>
        </div>
      </Section>

      {/* Section 5: LinkedIn Workflow */}
      <Section title="LinkedIn Workflow" icon={Settings2}>
        <div className="space-y-4">
          <Toggle
            checked={draft.linkedin_workflow.auto_advance_on_mark_sent}
            onChange={(v) =>
              updateDraft('linkedin_workflow', {
                ...draft.linkedin_workflow,
                auto_advance_on_mark_sent: v,
              })
            }
            label="Auto-advance to next candidate after marking sent"
          />
          <Toggle
            checked={draft.linkedin_workflow.connection_first_strategy}
            onChange={(v) =>
              updateDraft('linkedin_workflow', {
                ...draft.linkedin_workflow,
                connection_first_strategy: v,
              })
            }
            label="Connection-first strategy (connect before InMail)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Daily Limit</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={draft.linkedin_workflow.daily_limit}
                onChange={(e) =>
                  updateDraft('linkedin_workflow', {
                    ...draft.linkedin_workflow,
                    daily_limit: parseInt(e.target.value) || 25,
                  })
                }
                className="bg-zinc-900/50 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Batch Size</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={draft.linkedin_workflow.batch_size}
                onChange={(e) =>
                  updateDraft('linkedin_workflow', {
                    ...draft.linkedin_workflow,
                    batch_size: parseInt(e.target.value) || 10,
                  })
                }
                className="bg-zinc-900/50 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">
                Follow-up Days (comma-separated)
              </Label>
              <Input
                value={(draft.linkedin_workflow.follow_up_days || []).join(', ')}
                onChange={(e) => {
                  const days = e.target.value
                    .split(',')
                    .map((s) => parseInt(s.trim()))
                    .filter((n) => !isNaN(n) && n > 0);
                  updateDraft('linkedin_workflow', {
                    ...draft.linkedin_workflow,
                    follow_up_days: days,
                  });
                }}
                placeholder="3, 7"
                className="bg-zinc-900/50 border-zinc-700 text-white"
              />
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Message Type Card ───────────────────────────────────

function MessageTypeCard({ typeKey, config, icon: Icon, onChange }) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="bg-zinc-900/40 border border-zinc-700/40 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-red-400" />
          <div>
            <div className="text-sm font-medium text-white">{config.label}</div>
            <div className="text-xs text-zinc-500">{config.description}</div>
          </div>
        </div>
        <Toggle checked={config.enabled} onChange={(v) => onChange('enabled', v)} />
      </div>

      {config.enabled && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <Label className="text-xs text-zinc-500 mb-1 block">Character Limit</Label>
            <Input
              type="number"
              min={50}
              max={10000}
              value={config.char_limit}
              onChange={(e) => onChange('char_limit', parseInt(e.target.value) || 300)}
              className="bg-zinc-900/50 border-zinc-700 text-white text-sm h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-500 mb-1 block">Tone</Label>
            <Select
              value={config.default_tone}
              onValueChange={(v) => onChange('default_tone', v)}
            >
              <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-white text-sm h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              {showInstructions ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              Template Instructions
            </button>
            {showInstructions && (
              <Textarea
                value={config.template_instructions}
                onChange={(e) => onChange('template_instructions', e.target.value)}
                placeholder="Specific instructions for this message type..."
                rows={2}
                className="mt-2 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600 text-sm resize-none"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
