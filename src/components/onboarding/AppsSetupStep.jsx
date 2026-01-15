import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, Rocket, Shield, Sparkles, Check,
  ChevronLeft, ChevronRight, Plus, LayoutGrid,
  Users, Palette, TrendingUp, Lock, Clock, Brain,
  DollarSign, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shared animation variants for consistency with other steps
const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
};

// All available apps - comprehensive list of iSyncSO capabilities
const ALL_APPS = [
  {
    id: 'sync',
    name: 'SYNC',
    shortDesc: 'AI command center',
    description: 'Your AI assistant that executes tasks across all apps with natural language commands.',
    icon: Brain,
    features: ['Natural language commands', 'Cross-app automation', 'Smart integrations', 'Activity tracking'],
    recommendedFor: ['personal-assistant', 'manage-work', 'ai-strategy'],
    color: 'purple'
  },
  {
    id: 'learn',
    name: 'Learn',
    shortDesc: 'AI-powered learning',
    description: 'Personalized courses, skill tracking, and AI tutors that adapt to your pace.',
    icon: GraduationCap,
    features: ['Personalized courses', 'Skill assessments', 'XP & gamification', 'AI tutor assistance'],
    recommendedFor: ['learn-ai', 'personal-assistant', 'creative-work'],
    color: 'cyan'
  },
  {
    id: 'growth',
    name: 'Growth',
    shortDesc: 'Sales pipeline',
    description: 'AI-powered prospecting, pipeline management, and multi-channel outreach campaigns.',
    icon: Rocket,
    features: ['Smart prospecting', 'Pipeline tracking', 'Buying signals', 'Campaign automation'],
    recommendedFor: ['grow-sales', 'ai-strategy'],
    color: 'indigo'
  },
  {
    id: 'talent',
    name: 'Talent',
    shortDesc: 'Recruitment intelligence',
    description: 'AI-powered candidate sourcing, flight risk intelligence, and recruitment pipeline management.',
    icon: Users,
    features: ['Candidate intelligence', 'Flight risk scoring', 'Recruitment pipeline', 'Outreach campaigns'],
    recommendedFor: ['recruitment', 'ai-strategy'],
    color: 'red'
  },
  {
    id: 'finance',
    name: 'Finance',
    shortDesc: 'Business finances',
    description: 'Invoice management, expense tracking, and financial reporting with AI-powered insights.',
    icon: DollarSign,
    features: ['Invoice creation', 'Expense tracking', 'Financial reports', 'Subscription management'],
    recommendedFor: ['manage-work', 'grow-sales'],
    color: 'amber'
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    shortDesc: 'AI compliance',
    description: 'EU AI Act compliance management, risk assessments, and automated documentation.',
    icon: Shield,
    features: ['Risk classification', 'Compliance tracking', 'Task management', 'Auto documentation'],
    recommendedFor: ['compliance-ethics', 'ai-strategy'],
    color: 'sage'
  },
  {
    id: 'raise',
    name: 'Raise',
    shortDesc: 'Fundraising toolkit',
    description: 'Investor management, pitch deck organization, data rooms, and fundraising campaigns.',
    icon: TrendingUp,
    features: ['Investor pipeline', 'Pitch deck library', 'Data room', 'Campaign tracking'],
    recommendedFor: ['ai-strategy', 'grow-sales'],
    color: 'orange'
  },
  {
    id: 'products',
    name: 'Products',
    shortDesc: 'Inventory & catalog',
    description: 'Product catalog, inventory management, receiving, shipping, and stock tracking.',
    icon: Package,
    features: ['Product catalog', 'Stock management', 'Receiving & shipping', 'Purchase orders'],
    recommendedFor: ['manage-work', 'grow-sales'],
    color: 'teal'
  },
  {
    id: 'create',
    name: 'Create',
    shortDesc: 'AI content studio',
    description: 'Generate images, videos, and branded content using AI with your company context.',
    icon: Palette,
    features: ['AI image generation', 'Video creation', 'Brand assets', 'Content library'],
    recommendedFor: ['creative-work', 'grow-sales'],
    color: 'rose'
  }
];

// Coming Soon apps - future capabilities (not base package features)
const COMING_SOON_APPS = [];

const MAX_MAIN_APPS = 6;

// Color classes for app cards
const APP_COLORS = {
  purple: { border: 'border-purple-500/50', bg: 'bg-purple-500/10', text: 'text-purple-400', iconBg: 'bg-purple-500/20' },
  cyan: { border: 'border-cyan-500/50', bg: 'bg-cyan-500/10', text: 'text-cyan-400', iconBg: 'bg-cyan-500/20' },
  indigo: { border: 'border-indigo-500/50', bg: 'bg-indigo-500/10', text: 'text-indigo-400', iconBg: 'bg-indigo-500/20' },
  violet: { border: 'border-violet-500/50', bg: 'bg-violet-500/10', text: 'text-violet-400', iconBg: 'bg-violet-500/20' },
  red: { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400', iconBg: 'bg-red-500/20' },
  amber: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', iconBg: 'bg-amber-500/20' },
  sage: { border: 'border-[#86EFAC]/50', bg: 'bg-[#86EFAC]/10', text: 'text-[#86EFAC]', iconBg: 'bg-[#86EFAC]/20' },
  orange: { border: 'border-orange-500/50', bg: 'bg-orange-500/10', text: 'text-orange-400', iconBg: 'bg-orange-500/20' },
  teal: { border: 'border-teal-500/50', bg: 'bg-teal-500/10', text: 'text-teal-400', iconBg: 'bg-teal-500/20' },
  rose: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-400', iconBg: 'bg-rose-500/20' },
  sky: { border: 'border-sky-500/50', bg: 'bg-sky-500/10', text: 'text-sky-400', iconBg: 'bg-sky-500/20' },
  pink: { border: 'border-pink-500/50', bg: 'bg-pink-500/10', text: 'text-pink-400', iconBg: 'bg-pink-500/20' },
  emerald: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
};

export function AppsSetupStep({ data, onChange, onNext, onBack }) {
  const [selectedApps, setSelectedApps] = useState(data.selectedApps || []);
  const carouselRef = useRef(null);
  const hasInitialized = useRef(false);

  // Calculate recommendations based on goals
  const recommendations = ALL_APPS.filter(app =>
    data.selectedGoals?.some(goal => app.recommendedFor.includes(goal))
  ).map(app => app.id);

  // Auto-select recommended apps on first load - always include SYNC
  useEffect(() => {
    if (!hasInitialized.current && !data.selectedApps) {
      hasInitialized.current = true;
      // Always include sync, then add recommendations up to MAX_MAIN_APPS
      let initialSelection = ['sync'];
      if (recommendations.length > 0) {
        const additionalApps = recommendations.filter(id => id !== 'sync').slice(0, MAX_MAIN_APPS - 1);
        initialSelection = ['sync', ...additionalApps];
      } else {
        initialSelection = ['sync', 'learn', 'growth', 'finance'];
      }
      setSelectedApps(initialSelection);
      onChange({ selectedApps: initialSelection });
    }
  }, [data.selectedApps, recommendations, onChange]);

  const toggleApp = (appId) => {
    setSelectedApps(prev => {
      let updated;
      if (prev.includes(appId)) {
        updated = prev.filter(id => id !== appId);
      } else {
        if (prev.length >= MAX_MAIN_APPS) {
          return prev;
        }
        updated = [...prev, appId];
      }
      onChange({ selectedApps: updated });
      return updated;
    });
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 280;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const isValid = selectedApps.length >= 1;

  return (
    <motion.div {...fadeIn} className="space-y-8">
      {/* Header - matching other steps */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 mb-2">
          <LayoutGrid className="w-7 h-7 text-zinc-300" />
        </div>
        <h2 className="text-2xl font-semibold text-white">Set up your workspace</h2>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto">
          Choose up to {MAX_MAIN_APPS} apps for your main sidebar. You can always add more later.
        </p>
      </div>

      {/* Recommendations Banner - subtle cyan style */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-2 text-sm text-zinc-400"
        >
          <Sparkles className="w-4 h-4 text-cyan-500/70" />
          <span>
            Based on your goals, we recommend: <span className="text-cyan-400">{recommendations.map(id => ALL_APPS.find(a => a.id === id)?.name).join(', ')}</span>
          </span>
        </motion.div>
      )}

      {/* App Library */}
      <div className="relative max-w-5xl mx-auto">
        {/* Navigation buttons */}
        <button
          onClick={() => scrollCarousel('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-colors hidden sm:flex"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scrollCarousel('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-colors hidden sm:flex"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Carousel */}
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {ALL_APPS.map((app, index) => {
            const Icon = app.icon;
            const isSelected = selectedApps.includes(app.id);
            const isRecommended = recommendations.includes(app.id);
            const canSelect = isSelected || selectedApps.length < MAX_MAIN_APPS;
            const colors = APP_COLORS[app.color] || APP_COLORS.cyan;

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => canSelect && toggleApp(app.id)}
                className={cn(
                  "flex-shrink-0 snap-start w-[200px] rounded-xl border transition-all cursor-pointer",
                  isSelected
                    ? `${colors.border} ${colors.bg}`
                    : "border-zinc-800 hover:border-zinc-700",
                  !canSelect && !isSelected && "opacity-50 cursor-not-allowed"
                )}
              >
                {/* Card Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isSelected ? colors.iconBg : "bg-zinc-800/80"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        isSelected ? colors.text : "text-zinc-400"
                      )} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isRecommended && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide bg-zinc-800 text-zinc-500">
                          Recommended
                        </span>
                      )}
                      {isSelected && (
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", colors.iconBg)}>
                          <Check className={cn("w-3 h-3", colors.text)} />
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className={cn(
                    "text-sm font-semibold mb-0.5",
                    isSelected ? "text-white" : "text-zinc-300"
                  )}>
                    {app.name}
                  </h3>
                  <p className="text-xs text-zinc-500">{app.shortDesc}</p>
                </div>

                {/* Card Body */}
                <div className="px-4 pb-3">
                  <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{app.description}</p>

                  {/* Features */}
                  <div className="space-y-1">
                    {app.features.slice(0, 3).map((feature, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                        <div className={cn(
                          "w-1 h-1 rounded-full",
                          isSelected ? colors.bg.replace('/10', '/50') : "bg-zinc-700"
                        )} />
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 pb-4">
                  <button
                    className={cn(
                      "w-full py-2 rounded-lg text-xs font-medium transition-all border",
                      isSelected
                        ? `${colors.border} ${colors.bg} ${colors.text}`
                        : canSelect
                          ? "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canSelect) toggleApp(app.id);
                    }}
                  >
                    {isSelected ? 'Added to Sidebar' : canSelect ? 'Add to Sidebar' : 'Max Apps Reached'}
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* Coming Soon Apps */}
          {COMING_SOON_APPS.map((app, index) => {
            const Icon = app.icon;
            const colors = APP_COLORS[app.color] || APP_COLORS.sky;

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (ALL_APPS.length + index) * 0.05 }}
                className="flex-shrink-0 snap-start w-[200px] rounded-xl border border-zinc-800/60 transition-all opacity-70 relative overflow-hidden"
              >
                {/* Coming Soon Overlay Ribbon */}
                <div className="absolute top-3 -right-8 rotate-45 bg-zinc-700 px-8 py-0.5 z-10">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-300">Soon</span>
                </div>

                {/* Card Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.iconBg)}>
                      <Icon className={cn("w-5 h-5", colors.text)} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide flex items-center gap-1", colors.bg, colors.text)}>
                        <Clock className="w-2.5 h-2.5" />
                        Coming Soon
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold mb-0.5 text-zinc-400">
                    {app.name}
                  </h3>
                  <p className="text-xs text-zinc-600">{app.shortDesc}</p>
                </div>

                {/* Card Body */}
                <div className="px-4 pb-3">
                  <p className="text-xs text-zinc-600 mb-3 line-clamp-2">{app.description}</p>

                  {/* Features */}
                  <div className="space-y-1">
                    {app.features.slice(0, 3).map((feature, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-zinc-700">
                        <div className={cn("w-1 h-1 rounded-full", colors.bg)} />
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 pb-4">
                  <div className="w-full py-2 rounded-lg text-xs font-medium border border-zinc-800 bg-zinc-900/50 text-zinc-600 text-center flex items-center justify-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    Get Notified
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* More Coming Soon Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (ALL_APPS.length + COMING_SOON_APPS.length) * 0.05 }}
            className="flex-shrink-0 snap-start w-[200px] rounded-xl border border-dashed border-zinc-800 p-4 flex flex-col items-center justify-center text-center min-h-[240px]"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-3">
              <Plus className="w-5 h-5 text-zinc-600" />
            </div>
            <h3 className="text-sm font-medium text-zinc-600 mb-1">More on the Way</h3>
            <p className="text-xs text-zinc-700">We're building more apps</p>
          </motion.div>
        </div>
      </div>

      {/* Selection summary */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 flex-wrap">
        <span>Selected:</span>
        <div className="flex gap-1 flex-wrap justify-center">
          {selectedApps.map(appId => {
            const app = ALL_APPS.find(a => a.id === appId);
            const colors = APP_COLORS[app?.color] || APP_COLORS.cyan;
            return (
              <span
                key={appId}
                className={cn("px-2 py-0.5 rounded text-[10px] font-medium", colors.bg, colors.text, colors.border)}
              >
                {app?.name}
              </span>
            );
          })}
          {selectedApps.length === 0 && (
            <span className="text-zinc-600">None</span>
          )}
        </div>
        <span className="text-zinc-600">({selectedApps.length}/{MAX_MAIN_APPS})</span>
        <span className="text-zinc-700 hidden sm:inline">•</span>
        <span className="text-zinc-600 hidden sm:inline">Change later in settings</span>
      </div>

      {/* Navigation - matching other steps */}
      <div className="flex justify-between pt-2 max-w-md mx-auto">
        <Button variant="ghost" onClick={onBack} className="text-zinc-500 hover:text-zinc-300">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="h-11 px-6 bg-white/5 hover:bg-white/10 text-white border border-zinc-700 hover:border-zinc-600"
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}

export default AppsSetupStep;
