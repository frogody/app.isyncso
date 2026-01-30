import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, UserMinus, Crown, TrendingUp, Award,
  Calendar, Pause, Rocket, ChevronDown, ChevronUp,
  Settings2, Filter, Zap,
} from "lucide-react";

export const INTELLIGENCE_SIGNALS = [
  {
    id: "ma_activity",
    label: "M&A Activity",
    description: "Company undergoing merger, acquisition, or being acquired",
    icon: "Building2",
    color: "red",
    category: "company",
    defaultBoost: 15,
  },
  {
    id: "layoffs",
    label: "Layoffs/Restructuring",
    description: "Company has announced layoffs or restructuring",
    icon: "UserMinus",
    color: "red",
    category: "company",
    defaultBoost: 20,
  },
  {
    id: "leadership_change",
    label: "Leadership Change",
    description: "New CEO, CTO, or major leadership transition",
    icon: "Crown",
    color: "red",
    category: "company",
    defaultBoost: 10,
  },
  {
    id: "funding_round",
    label: "Recent Funding",
    description: "Company raised funding (may indicate growth or instability)",
    icon: "TrendingUp",
    color: "red",
    category: "company",
    defaultBoost: 5,
  },
  {
    id: "recent_promotion",
    label: "Recently Promoted",
    description: "Candidate was promoted in last 6-18 months",
    icon: "Award",
    color: "red",
    category: "career",
    defaultBoost: -5,
  },
  {
    id: "tenure_anniversary",
    label: "Work Anniversary",
    description: "Approaching 2, 3, or 5 year mark (common switch points)",
    icon: "Calendar",
    color: "red",
    category: "career",
    defaultBoost: 10,
  },
  {
    id: "stagnation",
    label: "Career Stagnation",
    description: "No promotion or growth in 2+ years",
    icon: "Pause",
    color: "zinc",
    category: "career",
    defaultBoost: 15,
  },
  {
    id: "high_flight_risk",
    label: "High Flight Risk",
    description: "Intelligence score indicates high likelihood to move",
    icon: "Rocket",
    color: "red",
    category: "timing",
    defaultBoost: 20,
  },
];

export const SIGNAL_CATEGORIES = [
  { id: "company", label: "Company Signals", description: "Events at their current employer" },
  { id: "career", label: "Career Signals", description: "Individual career patterns" },
  { id: "timing", label: "Timing Signals", description: "Readiness indicators" },
];

const ICON_MAP = {
  Building2, UserMinus, Crown, TrendingUp, Award,
  Calendar, Pause, Rocket,
};

const bgColorMap = {
  red: "bg-red-500/10",
  zinc: "bg-zinc-500/10",
};

const borderColorMap = {
  red: "border-red-500/30",
  zinc: "border-zinc-500/30",
};

const iconBgColorMap = {
  red: "bg-red-500/20",
  zinc: "bg-zinc-500/20",
};

const textColorMap = {
  red: "text-red-400",
  zinc: "text-zinc-400",
};

const SignalCard = ({ signal, config, showAdvanced, onUpdate, Icon }) => {
  return (
    <div
      className={"p-3 rounded-lg border transition-all " + (
        config.enabled
          ? bgColorMap[signal.color] + " " + borderColorMap[signal.color]
          : "bg-zinc-900/50 border-zinc-700/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={"p-2 rounded-lg " + (
              config.enabled ? iconBgColorMap[signal.color] : "bg-zinc-800"
            )}
          >
            <Icon
              className={"w-4 h-4 " + (
                config.enabled ? textColorMap[signal.color] : "text-zinc-500"
              )}
            />
          </div>
          <div>
            <p
              className={"text-sm font-medium " + (
                config.enabled ? "text-white" : "text-zinc-400"
              )}
            >
              {signal.label}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">{signal.description}</p>
          </div>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
        />
      </div>

      {showAdvanced && config.enabled && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-3 pt-3 border-t border-zinc-700/30 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Required (filter out others)</span>
            <Switch
              checked={config.required}
              onCheckedChange={(required) => onUpdate({ required })}
              className="scale-75"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Score Boost</span>
              <span
                className={"text-xs font-medium " + (
                  config.boost > 0
                    ? "text-red-400"
                    : config.boost < 0
                    ? "text-red-600"
                    : "text-zinc-400"
                )}
              >
                {config.boost > 0 ? "+" : ""}{config.boost}
              </span>
            </div>
            <Slider
              value={[config.boost]}
              onValueChange={([boost]) => onUpdate({ boost })}
              min={-20}
              max={30}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>-20</span>
              <span>+30</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const SignalMatchingConfig = ({
  selectedSignals = [],
  onChange,
  showAdvanced: initialAdvanced = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(initialAdvanced);
  const [expandedCategory, setExpandedCategory] = useState("company");

  const signalsByCategory = useMemo(() => {
    return SIGNAL_CATEGORIES.map((cat) => ({
      ...cat,
      signals: INTELLIGENCE_SIGNALS.filter((s) => s.category === cat.id),
    }));
  }, []);

  const getSignalConfig = (signalId) => {
    const existing = selectedSignals.find((s) => s.id === signalId);
    const defaultSignal = INTELLIGENCE_SIGNALS.find((s) => s.id === signalId);
    return (
      existing || {
        id: signalId,
        enabled: false,
        boost: defaultSignal?.defaultBoost || 10,
        required: false,
      }
    );
  };

  const updateSignal = (signalId, updates) => {
    const current = getSignalConfig(signalId);
    const updated = { ...current, ...updates };
    const newSignals = selectedSignals.filter((s) => s.id !== signalId);
    if (updated.enabled) {
      newSignals.push(updated);
    }
    onChange(newSignals);
  };

  const activeCount = selectedSignals.filter((s) => s.enabled).length;
  const requiredCount = selectedSignals.filter((s) => s.required).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-red-400" />
          <h3 className="font-medium text-white">Signal Filters</h3>
          {activeCount > 0 && (
            <Badge variant="secondary" className="bg-red-500/20 text-red-300">
              {activeCount} active
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-zinc-400 hover:text-white"
        >
          <Settings2 className="w-4 h-4 mr-1" />
          {showAdvanced ? "Simple" : "Advanced"}
        </Button>
      </div>

      <p className="text-sm text-zinc-500">
        Boost or filter candidates based on intelligence signals detected in their profile.
        {requiredCount > 0 && (
          <span className="text-red-400 ml-1">
            ({requiredCount} required filter{requiredCount > 1 ? "s" : ""} active)
          </span>
        )}
      </p>

      <div className="space-y-3">
        {signalsByCategory.map((category) => (
          <div
            key={category.id}
            className="rounded-lg border border-zinc-700/50 overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedCategory(
                  expandedCategory === category.id ? null : category.id
                )
              }
              className="w-full flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <div>
                <span className="text-sm font-medium text-zinc-200">
                  {category.label}
                </span>
                <span className="text-xs text-zinc-500 ml-2">
                  {category.description}
                </span>
              </div>
              {expandedCategory === category.id ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            <AnimatePresence>
              {expandedCategory === category.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-2 space-y-2">
                    {category.signals.map((signal) => {
                      const config = getSignalConfig(signal.id);
                      const Icon = ICON_MAP[signal.icon];

                      return (
                        <SignalCard
                          key={signal.id}
                          signal={signal}
                          config={config}
                          showAdvanced={showAdvanced}
                          onUpdate={(updates) => updateSignal(signal.id, updates)}
                          Icon={Icon}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const urgencySignals = INTELLIGENCE_SIGNALS.filter((s) =>
              ["ma_activity", "layoffs", "high_flight_risk"].includes(s.id)
            ).map((s) => ({
              id: s.id,
              enabled: true,
              boost: s.defaultBoost,
              required: false,
            }));
            onChange(urgencySignals);
          }}
          className="text-xs"
        >
          <Zap className="w-3 h-3 mr-1" />
          Urgency Preset
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          className="text-xs text-zinc-500"
        >
          Clear All
        </Button>
      </div>
    </div>
  );
};

export default SignalMatchingConfig;
