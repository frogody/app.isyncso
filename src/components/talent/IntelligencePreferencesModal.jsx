import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronDown, ChevronUp, Plus, X, Loader2,
  TrendingUp, AlertTriangle, ArrowUpRight, Target,
  Euro, Calendar, Network, Users, Award, Zap,
  Building2, RotateCcw, Save, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useIntelligencePreferences,
  SIGNAL_DEFINITIONS,
  DEFAULT_SIGNAL_WEIGHTS,
  WEIGHT_PRESETS,
  DEFAULT_TIMING_PREFERENCES,
} from '@/hooks/useIntelligencePreferences';

const ICON_MAP = {
  TrendingUp, AlertTriangle, ArrowUpRight, Target,
  Euro, Calendar, Network, Users, Award, Zap,
};

// Accordion section wrapper
const Section = ({ title, icon: Icon, count, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-red-500/20">
            <Icon className="w-4 h-4 text-red-400" />
          </div>
          <span className="font-medium text-white">{title}</span>
          {count != null && (
            <Badge className="bg-zinc-700/50 text-zinc-400 text-[10px]">{count}</Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function IntelligencePreferencesModal({ open, onOpenChange }) {
  const { preferences, loading, saving, savePreferences, resetToDefaults } = useIntelligencePreferences();

  const [localPrefs, setLocalPrefs] = useState(null);

  // Sync from hook when loaded or preferences change
  useEffect(() => {
    if (!loading && preferences) {
      setLocalPrefs({ ...preferences });
    }
  }, [loading, preferences]);

  const update = (key, value) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await savePreferences(localPrefs);
      toast.success('Intelligence preferences saved');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      toast.success('Reset to defaults');
    } catch {
      toast.error('Failed to reset');
    }
  };

  if (!localPrefs) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-red-400" />
            Intelligence Preferences
          </DialogTitle>
          <p className="text-sm text-zinc-400 mt-1">
            Customize how the AI analyzes candidates for your organization
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* Section 1: Signal Weights */}
          <Section title="Signal Weights" icon={TrendingUp} defaultOpen={true}>
            {/* Presets */}
            <div className="flex gap-2 mb-4">
              {Object.entries(WEIGHT_PRESETS).map(([key, preset]) => {
                const isActive = Object.entries(preset.weights).every(
                  ([k, v]) => localPrefs.signal_weights[k] === v
                );
                return (
                  <button
                    key={key}
                    onClick={() => update('signal_weights', { ...preset.weights })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>

            {/* Signal sliders grouped by category */}
            {['company', 'career', 'timing'].map(category => (
              <div key={category} className="space-y-3">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {category === 'company' ? 'Company Signals' : category === 'career' ? 'Career Signals' : 'Timing Signals'}
                </p>
                {SIGNAL_DEFINITIONS.filter(s => s.category === category).map(signal => {
                  const Icon = ICON_MAP[signal.icon] || Zap;
                  const value = localPrefs.signal_weights[signal.key] ?? DEFAULT_SIGNAL_WEIGHTS[signal.key] ?? 0;
                  return (
                    <div key={signal.key} className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-zinc-300 truncate">{signal.label}</span>
                          <span className={`text-xs font-mono ${value < 0 ? 'text-orange-400' : 'text-red-400'}`}>
                            {value > 0 ? '+' : ''}{value}
                          </span>
                        </div>
                        <Slider
                          value={[value]}
                          onValueChange={([v]) => update('signal_weights', { ...localPrefs.signal_weights, [signal.key]: v })}
                          min={-20}
                          max={50}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </Section>

          {/* Section 2: Custom Signals */}
          <Section title="Custom Signals" icon={Sparkles} count={localPrefs.custom_signals.length}>
            <p className="text-xs text-zinc-500 mb-3">
              Add domain-specific signals the AI should look for (max 10)
            </p>
            {localPrefs.custom_signals.map((signal, i) => (
              <div key={i} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    value={signal.name}
                    onChange={e => {
                      const updated = [...localPrefs.custom_signals];
                      updated[i] = { ...updated[i], name: e.target.value };
                      update('custom_signals', updated);
                    }}
                    placeholder="Signal name"
                    className="bg-transparent text-sm text-white font-medium outline-none flex-1"
                  />
                  <button
                    onClick={() => update('custom_signals', localPrefs.custom_signals.filter((_, j) => j !== i))}
                    className="p-1 hover:bg-zinc-700 rounded"
                  >
                    <X className="w-3 h-3 text-zinc-500" />
                  </button>
                </div>
                <textarea
                  value={signal.description || ''}
                  onChange={e => {
                    const updated = [...localPrefs.custom_signals];
                    updated[i] = { ...updated[i], description: e.target.value };
                    update('custom_signals', updated);
                  }}
                  placeholder="What should the AI look for?"
                  rows={2}
                  className="w-full bg-zinc-900/50 text-xs text-zinc-300 rounded p-2 outline-none border border-zinc-700/30 resize-none"
                />
                <div className="flex gap-3">
                  <select
                    value={signal.impact || 'positive'}
                    onChange={e => {
                      const updated = [...localPrefs.custom_signals];
                      updated[i] = { ...updated[i], impact: e.target.value };
                      update('custom_signals', updated);
                    }}
                    className="bg-zinc-900/50 text-xs text-zinc-300 rounded px-2 py-1 border border-zinc-700/30 outline-none"
                  >
                    <option value="positive">Positive (boost)</option>
                    <option value="negative">Negative (reduce)</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Weight:</span>
                    <input
                      type="number"
                      value={signal.weight || 10}
                      onChange={e => {
                        const updated = [...localPrefs.custom_signals];
                        updated[i] = { ...updated[i], weight: parseInt(e.target.value) || 0 };
                        update('custom_signals', updated);
                      }}
                      min={-20}
                      max={50}
                      className="w-16 bg-zinc-900/50 text-xs text-zinc-300 rounded px-2 py-1 border border-zinc-700/30 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
            {localPrefs.custom_signals.length < 10 && (
              <button
                onClick={() => update('custom_signals', [
                  ...localPrefs.custom_signals,
                  { name: '', description: '', impact: 'positive', weight: 10 },
                ])}
                className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Custom Signal
              </button>
            )}
          </Section>

          {/* Section 3: Industry & Role Context */}
          <Section title="Industry & Role Context" icon={Target}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Industry Context</label>
                <Textarea
                  value={localPrefs.industry_context}
                  onChange={e => update('industry_context', e.target.value)}
                  placeholder="e.g., In pharma recruiting, FDA approval cycles cause burnout. Look for candidates at companies in Phase III trials..."
                  rows={3}
                  maxLength={500}
                  className="bg-zinc-800/50 border-zinc-700/50 text-sm text-zinc-300 resize-none"
                />
                <p className="text-[10px] text-zinc-600 mt-1">{localPrefs.industry_context?.length || 0}/500</p>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Role Context</label>
                <Textarea
                  value={localPrefs.role_context}
                  onChange={e => update('role_context', e.target.value)}
                  placeholder="e.g., For sales roles, quota misses and territory changes are strong signals. Look for reps at companies that just cut commission structures..."
                  rows={3}
                  maxLength={500}
                  className="bg-zinc-800/50 border-zinc-700/50 text-sm text-zinc-300 resize-none"
                />
                <p className="text-[10px] text-zinc-600 mt-1">{localPrefs.role_context?.length || 0}/500</p>
              </div>
            </div>
          </Section>

          {/* Section 4: Company Rules */}
          <Section title="Company Rules" icon={Building2} count={localPrefs.company_rules.length}>
            <p className="text-xs text-zinc-500 mb-3">
              Tell the AI how to treat candidates from specific companies
            </p>
            {localPrefs.company_rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <input
                  value={rule.company}
                  onChange={e => {
                    const updated = [...localPrefs.company_rules];
                    updated[i] = { ...updated[i], company: e.target.value };
                    update('company_rules', updated);
                  }}
                  placeholder="Company name"
                  className="flex-1 bg-transparent text-sm text-white outline-none min-w-0"
                />
                <select
                  value={rule.rule}
                  onChange={e => {
                    const updated = [...localPrefs.company_rules];
                    updated[i] = { ...updated[i], rule: e.target.value };
                    update('company_rules', updated);
                  }}
                  className="bg-zinc-900/50 text-xs text-zinc-300 rounded px-2 py-1 border border-zinc-700/30 outline-none"
                >
                  <option value="boost">Boost</option>
                  <option value="deprioritize">Deprioritize</option>
                  <option value="ignore">Ignore</option>
                </select>
                <input
                  value={rule.reason || ''}
                  onChange={e => {
                    const updated = [...localPrefs.company_rules];
                    updated[i] = { ...updated[i], reason: e.target.value };
                    update('company_rules', updated);
                  }}
                  placeholder="Reason"
                  className="flex-1 bg-transparent text-xs text-zinc-400 outline-none min-w-0"
                />
                <button
                  onClick={() => update('company_rules', localPrefs.company_rules.filter((_, j) => j !== i))}
                  className="p-1 hover:bg-zinc-700 rounded flex-shrink-0"
                >
                  <X className="w-3 h-3 text-zinc-500" />
                </button>
              </div>
            ))}
            <button
              onClick={() => update('company_rules', [
                ...localPrefs.company_rules,
                { company: '', rule: 'boost', reason: '' },
              ])}
              className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Company Rule
            </button>
          </Section>

          {/* Section 5: Timing Preferences */}
          <Section title="Timing Preferences" icon={Calendar}>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 cursor-pointer">
                <div>
                  <p className="text-sm text-white">Anniversary Boost</p>
                  <p className="text-xs text-zinc-500">Boost candidates at 2/3/5 year marks</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPrefs.timing_preferences.anniversary_boost ?? true}
                  onChange={e => update('timing_preferences', { ...localPrefs.timing_preferences, anniversary_boost: e.target.checked })}
                  className="w-4 h-4 accent-red-500"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 cursor-pointer">
                <div>
                  <p className="text-sm text-white">Ignore Recent Promotions</p>
                  <p className="text-xs text-zinc-500">Deprioritize recently promoted candidates</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPrefs.timing_preferences.ignore_recent_promotions ?? true}
                  onChange={e => update('timing_preferences', { ...localPrefs.timing_preferences, ignore_recent_promotions: e.target.checked })}
                  className="w-4 h-4 accent-red-500"
                />
              </label>
              {localPrefs.timing_preferences.ignore_recent_promotions && (
                <div className="flex items-center gap-3 pl-3">
                  <span className="text-xs text-zinc-400">Ignore window:</span>
                  <input
                    type="number"
                    value={localPrefs.timing_preferences.ignore_recent_promotions_months ?? 6}
                    onChange={e => update('timing_preferences', { ...localPrefs.timing_preferences, ignore_recent_promotions_months: parseInt(e.target.value) || 6 })}
                    min={1}
                    max={24}
                    className="w-16 bg-zinc-800/50 text-sm text-white rounded px-2 py-1 border border-zinc-700/30 outline-none"
                  />
                  <span className="text-xs text-zinc-400">months</span>
                </div>
              )}
              <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 cursor-pointer">
                <div>
                  <p className="text-sm text-white">Seasonal Boost (Q1/Q4)</p>
                  <p className="text-xs text-zinc-500">Boost during peak job-change seasons</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPrefs.timing_preferences.q1_q4_seasonal_boost ?? false}
                  onChange={e => update('timing_preferences', { ...localPrefs.timing_preferences, q1_q4_seasonal_boost: e.target.checked })}
                  className="w-4 h-4 accent-red-500"
                />
              </label>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-zinc-400 hover:text-zinc-300"
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              {saving ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Save className="w-3 h-3 mr-1.5" />}
              Save Preferences
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
