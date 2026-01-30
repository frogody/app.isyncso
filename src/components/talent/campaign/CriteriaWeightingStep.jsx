import React, { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Award, Briefcase, Target, MapPin, Clock, Users,
  Sparkles, RotateCcw, CheckCircle2, AlertCircle,
} from "lucide-react";

const MATCH_FACTORS = [
  {
    key: "skills_fit",
    label: "Skills Match",
    icon: Award,
    color: "red",
    description: "Technical & domain expertise alignment with role requirements",
  },
  {
    key: "experience_fit",
    label: "Experience Level",
    icon: Briefcase,
    color: "red",
    description: "Years of experience and seniority level fit",
  },
  {
    key: "title_fit",
    label: "Title Alignment",
    icon: Target,
    color: "red",
    description: "Current role title relevance to target position",
  },
  {
    key: "location_fit",
    label: "Location",
    icon: MapPin,
    color: "red",
    description: "Geographic proximity or remote work compatibility",
  },
  {
    key: "timing_score",
    label: "Flight Risk / Timing",
    icon: Clock,
    color: "red",
    description: "Likelihood candidate will change jobs soon (high = ready to move)",
  },
  {
    key: "culture_fit",
    label: "Culture Fit",
    icon: Users,
    color: "red",
    description: "Company background and values alignment",
  },
];

const PRESETS = {
  balanced: {
    name: "Balanced",
    description: "Equal emphasis across all factors",
    weights: { skills_fit: 20, experience_fit: 20, title_fit: 15, location_fit: 10, timing_score: 20, culture_fit: 15 },
  },
  skills_first: {
    name: "Skills First",
    description: "Prioritize technical qualifications",
    weights: { skills_fit: 40, experience_fit: 25, title_fit: 15, location_fit: 5, timing_score: 10, culture_fit: 5 },
  },
  urgency_first: {
    name: "Urgency First",
    description: "Target candidates ready to move now",
    weights: { skills_fit: 15, experience_fit: 15, title_fit: 10, location_fit: 5, timing_score: 40, culture_fit: 15 },
  },
  culture_focus: {
    name: "Culture Focus",
    description: "Emphasize team and values fit",
    weights: { skills_fit: 20, experience_fit: 15, title_fit: 10, location_fit: 10, timing_score: 15, culture_fit: 30 },
  },
};

const DEFAULT_WEIGHTS = PRESETS.balanced.weights;

// Static color maps (Tailwind can't see dynamic classes)
const iconBgColors = {
  red: "bg-red-500/20",
};
const iconTextColors = {
  red: "text-red-400",
};

const WeightSlider = ({ factor, value, onChange, index }) => {
  const Icon = factor.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl space-y-3 hover:border-zinc-600/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${iconBgColors[factor.color]}`}>
            <Icon className={`w-4 h-4 ${iconTextColors[factor.color]}`} />
          </div>
          <span className="text-sm font-medium text-zinc-200">{factor.label}</span>
        </div>
        <span className={`text-lg font-bold tabular-nums ${iconTextColors[factor.color]}`}>
          {value}%
        </span>
      </div>

      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={50}
        step={5}
        className="w-full"
      />

      <p className="text-xs text-zinc-500">{factor.description}</p>
    </motion.div>
  );
};

const TotalIndicator = ({ total }) => {
  const isValid = total === 100;
  const pct = Math.min(total, 100);
  const barWidth = `${pct}%`;

  return (
    <div
      className={`p-3 rounded-xl border flex items-center gap-3 ${
        isValid
          ? "bg-red-500/10 border-red-500/30"
          : "bg-red-600/10 border-red-600/30"
      }`}
    >
      {isValid ? (
        <CheckCircle2 className="w-5 h-5 text-red-400 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${isValid ? "text-red-400" : "text-red-600"}`}>
            Total: {total}%
          </span>
          <span className={`text-xs ${isValid ? "text-red-400/70" : "text-red-600/70"}`}>
            {isValid ? "Ready to match" : total < 100 ? `${100 - total}% remaining` : `${total - 100}% over`}
          </span>
        </div>
        <div className="h-1.5 bg-zinc-700/50 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isValid ? "bg-red-500" : total > 100 ? "bg-red-700" : "bg-red-600"}`}
            initial={{ width: 0 }}
            animate={{ width: barWidth }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
};

const CriteriaWeightingStep = ({ weights = DEFAULT_WEIGHTS, onChange, onPresetApply }) => {
  const [localWeights, setLocalWeights] = useState(weights);

  const totalWeight = useMemo(
    () => Object.values(localWeights).reduce((sum, w) => sum + w, 0),
    [localWeights]
  );

  const activePreset = useMemo(() => {
    return (
      Object.entries(PRESETS).find(([, preset]) =>
        Object.entries(preset.weights).every(([k, v]) => localWeights[k] === v)
      )?.[0] || null
    );
  }, [localWeights]);

  const handleWeightChange = useCallback(
    (factorKey, value) => {
      const newWeights = { ...localWeights, [factorKey]: value };
      setLocalWeights(newWeights);
      onChange(newWeights);
    },
    [localWeights, onChange]
  );

  const applyPreset = useCallback(
    (presetKey) => {
      const preset = PRESETS[presetKey];
      setLocalWeights(preset.weights);
      onChange(preset.weights);
      onPresetApply?.(presetKey);
    },
    [onChange, onPresetApply]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-red-500/20">
          <Sparkles className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Customize Matching Weights</h3>
          <p className="text-sm text-zinc-400">
            Adjust how we prioritize different factors when scoring candidates
          </p>
        </div>
      </div>

      {/* Total Indicator */}
      <TotalIndicator total={totalWeight} />

      {/* Weight Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MATCH_FACTORS.map((factor, index) => (
          <WeightSlider
            key={factor.key}
            factor={factor}
            value={localWeights[factor.key] ?? 0}
            onChange={(v) => handleWeightChange(factor.key, v)}
            index={index}
          />
        ))}
      </div>

      {/* Presets */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Quick Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <motion.button
              key={key}

              whileTap={{ scale: 0.98 }}
              onClick={() => applyPreset(key)}
              className={`p-3 rounded-xl border text-left transition-colors ${
                activePreset === key
                  ? "bg-red-500/20 border-red-500/50"
                  : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
              }`}
            >
              <p className={`text-sm font-medium ${activePreset === key ? "text-red-400" : "text-zinc-200"}`}>
                {preset.name}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{preset.description}</p>
            </motion.button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyPreset("balanced")}
          className="border-zinc-700 text-zinc-400 hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset to Default
        </Button>
      </div>
    </div>
  );
};

export default CriteriaWeightingStep;
export { MATCH_FACTORS, PRESETS, DEFAULT_WEIGHTS };
