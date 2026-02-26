import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Building2, ChevronRight, ChevronLeft, Globe,
  Users, Rocket, Shield, Briefcase, GraduationCap,
  TrendingUp, Euro, Palette, Package, Brain, Download,
  Check, Sparkles, UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import AvatarSelector from "@/components/shared/AvatarSelector";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
};

// ─────────────────────────────────────────────
// PERSONA DEFINITIONS
// This is the core mapping that drives everything.
// ─────────────────────────────────────────────

export const PERSONAS = [
  {
    id: 'recruiter',
    title: 'Recruiting & Talent',
    subtitle: 'Source candidates, manage pipelines, run outreach',
    icon: Users,
    color: 'red',
    enabledApps: ['sync', 'talent'],
    dashboardWidgets: ['quick_actions', 'actions_recent'],
    appConfigs: {},
  },
  {
    id: 'sales',
    title: 'Sales & Business Dev',
    subtitle: 'Prospect, manage deals, close revenue',
    icon: Rocket,
    color: 'indigo',
    enabledApps: ['sync', 'growth'],
    dashboardWidgets: ['growth_pipeline', 'growth_stats', 'growth_deals', 'quick_actions', 'actions_recent'],
    appConfigs: {},
  },
  {
    id: 'marketing',
    title: 'Marketing & Content',
    subtitle: 'Create content, manage brand, grow audience',
    icon: Palette,
    color: 'rose',
    enabledApps: ['sync', 'create'],
    dashboardWidgets: ['quick_actions', 'actions_recent'],
    appConfigs: {},
  },
  {
    id: 'ecommerce-physical',
    title: 'E-commerce (Physical)',
    subtitle: 'Inventory, warehousing, shipping, stock management',
    icon: Package,
    color: 'teal',
    enabledApps: ['sync', 'products', 'finance'],
    dashboardWidgets: ['commerce_b2b_overview', 'commerce_orders', 'commerce_revenue', 'commerce_products', 'commerce_outstanding', 'finance_overview', 'quick_actions', 'actions_recent'],
    appConfigs: {
      products_settings: { digitalEnabled: false, physicalEnabled: true, serviceEnabled: false }
    },
  },
  {
    id: 'ecommerce-digital',
    title: 'E-commerce (Digital)',
    subtitle: 'Digital products, subscriptions, SaaS',
    icon: Download,
    color: 'cyan',
    enabledApps: ['sync', 'products', 'finance'],
    dashboardWidgets: ['commerce_b2b_overview', 'commerce_orders', 'commerce_revenue', 'commerce_products', 'finance_overview', 'quick_actions', 'actions_recent'],
    appConfigs: {
      products_settings: { digitalEnabled: true, physicalEnabled: false, serviceEnabled: true }
    },
  },
  {
    id: 'finance',
    title: 'Finance & Operations',
    subtitle: 'Invoicing, expenses, financial reporting',
    icon: Euro,
    color: 'amber',
    enabledApps: ['sync', 'finance'],
    dashboardWidgets: ['finance_overview', 'finance_revenue', 'finance_expenses', 'finance_pending', 'finance_mrr', 'quick_actions', 'actions_recent'],
    appConfigs: {},
  },
  {
    id: 'founder',
    title: 'Founder / CEO',
    subtitle: 'Big picture overview with AI across all areas',
    icon: Briefcase,
    color: 'purple',
    enabledApps: ['sync', 'learn', 'growth', 'finance'],
    dashboardWidgets: ['learn_progress', 'learn_stats', 'growth_pipeline', 'growth_stats', 'finance_overview', 'finance_revenue', 'quick_actions', 'actions_recent'],
    appConfigs: {},
  },
  {
    id: 'compliance',
    title: 'Compliance & Legal',
    subtitle: 'EU AI Act, risk assessments, documentation',
    icon: Shield,
    color: 'sage',
    enabledApps: ['sync', 'sentinel'],
    dashboardWidgets: ['sentinel_compliance', 'sentinel_systems', 'quick_actions', 'actions_recent'],
    appConfigs: {},
  },
  {
    id: 'fundraising',
    title: 'Fundraising',
    subtitle: 'Investor pipeline, pitch decks, data rooms',
    icon: TrendingUp,
    color: 'orange',
    enabledApps: ['sync', 'raise'],
    dashboardWidgets: ['raise_campaign', 'raise_target', 'raise_committed', 'raise_investors', 'raise_meetings', 'quick_actions', 'actions_recent'],
    appConfigs: {},
  },
];

const PERSONA_COLORS = {
  red: { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400', iconBg: 'bg-red-500/15', ring: 'ring-red-500/30' },
  indigo: { border: 'border-indigo-500/50', bg: 'bg-indigo-500/10', text: 'text-indigo-400', iconBg: 'bg-indigo-500/15', ring: 'ring-indigo-500/30' },
  rose: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-400', iconBg: 'bg-rose-500/15', ring: 'ring-rose-500/30' },
  teal: { border: 'border-teal-500/50', bg: 'bg-teal-500/10', text: 'text-teal-400', iconBg: 'bg-teal-500/15', ring: 'ring-teal-500/30' },
  cyan: { border: 'border-cyan-500/50', bg: 'bg-cyan-500/10', text: 'text-cyan-400', iconBg: 'bg-cyan-500/15', ring: 'ring-cyan-500/30' },
  amber: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', iconBg: 'bg-amber-500/15', ring: 'ring-amber-500/30' },
  purple: { border: 'border-purple-500/50', bg: 'bg-purple-500/10', text: 'text-purple-400', iconBg: 'bg-purple-500/15', ring: 'ring-purple-500/30' },
  sage: { border: 'border-[#86EFAC]/50', bg: 'bg-[#86EFAC]/10', text: 'text-[#86EFAC]', iconBg: 'bg-[#86EFAC]/15', ring: 'ring-[#86EFAC]/30' },
  orange: { border: 'border-orange-500/50', bg: 'bg-orange-500/10', text: 'text-orange-400', iconBg: 'bg-orange-500/15', ring: 'ring-orange-500/30' },
};

// ─────────────────────────────────────────────
// Step 1: Welcome
// ─────────────────────────────────────────────

export function WelcomeStep({ data, onChange, onNext }) {
  const isValid = data.fullName?.trim() && data.jobTitle?.trim();

  return (
    <motion.div {...fadeIn} className="space-y-5">
      <div className="text-center space-y-2">
        <img
          src="/isyncso-logo.png"
          alt="iSyncSO"
          className="w-16 h-16 mx-auto mb-1 object-contain"
         loading="lazy" decoding="async" />
        <h2 className="text-xl font-semibold text-white">Welcome to iSyncSO</h2>
        <p className="text-zinc-500 text-xs max-w-sm mx-auto">
          Tell us about yourself so we can set up your workspace
        </p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Full name</Label>
          <Input
            placeholder="Jane Doe"
            value={data.fullName || ''}
            onChange={e => onChange({ fullName: e.target.value })}
            className="h-10 bg-zinc-800/40 border-zinc-700/50 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 text-sm rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Job title</Label>
          <Input
            placeholder="Head of Recruitment, CEO, Marketing Lead..."
            value={data.jobTitle || ''}
            onChange={e => onChange({ jobTitle: e.target.value })}
            className="h-10 bg-zinc-800/40 border-zinc-700/50 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 text-sm rounded-xl"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2 max-w-sm mx-auto">
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="h-10 px-6 bg-white/5 hover:bg-white/10 text-white border border-zinc-700 hover:border-zinc-600 rounded-xl disabled:opacity-30"
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Step 2: Persona Selection
// ─────────────────────────────────────────────

export function PersonaStep({ data, onChange, onNext, onBack, isLastStep, isSubmitting }) {
  const selectedPersona = data.persona;

  const handleSelect = (personaId) => {
    onChange({ persona: personaId });
  };

  return (
    <motion.div {...fadeIn} className="space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 mb-1">
          <Sparkles className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">What do you do?</h2>
        <p className="text-zinc-500 text-xs max-w-md mx-auto">
          We'll set up your workspace with the right tools. You can always add more later.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-2xl mx-auto">
        {PERSONAS.map((persona) => {
          const Icon = persona.icon;
          const isSelected = selectedPersona === persona.id;
          const colors = PERSONA_COLORS[persona.color] || PERSONA_COLORS.cyan;

          return (
            <button
              key={persona.id}
              onClick={() => handleSelect(persona.id)}
              className={cn(
                "relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                isSelected
                  ? `${colors.border} ${colors.bg} ring-1 ${colors.ring}`
                  : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                isSelected ? colors.iconBg : "bg-zinc-800/80"
              )}>
                <Icon className={cn("w-4 h-4", isSelected ? colors.text : "text-zinc-500")} />
              </div>
              <div className="min-w-0">
                <p className={cn(
                  "text-sm font-medium leading-tight",
                  isSelected ? "text-white" : "text-zinc-300"
                )}>
                  {persona.title}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                  {persona.subtitle}
                </p>
              </div>
              {isSelected && (
                <div className={cn("absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center", colors.iconBg)}>
                  <Check className={cn("w-3 h-3", colors.text)} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Show what apps will be enabled */}
      {selectedPersona && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 text-xs text-zinc-500"
        >
          <span>Your workspace will include:</span>
          <div className="flex gap-1">
            {PERSONAS.find(p => p.id === selectedPersona)?.enabledApps.map(appId => (
              <span key={appId} className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[11px] font-medium capitalize">
                {appId === 'sync' ? 'SYNC' : appId}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex justify-between pt-1 max-w-md mx-auto">
        <Button variant="ghost" onClick={onBack} className="text-zinc-500 hover:text-zinc-300">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedPersona || isSubmitting}
          className={cn(
            "h-10 px-6 text-white font-medium rounded-xl disabled:opacity-30",
            isLastStep
              ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              : "bg-white/5 hover:bg-white/10 border border-zinc-700 hover:border-zinc-600"
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Setting up...
            </div>
          ) : isLastStep ? (
            <>
              Launch workspace
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Step 3: Company
// ─────────────────────────────────────────────

export function CompanyStep({ data, onChange, onSubmit, onBack, isSubmitting }) {
  const isValid = data.companyName?.trim() && data.companyWebsite?.trim();

  return (
    <motion.div {...fadeIn} className="space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 mb-1">
          <Building2 className="w-5 h-5 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Your company</h2>
        <p className="text-zinc-500 text-xs max-w-sm mx-auto">
          We'll enrich this with AI to personalize your experience
        </p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Company name</Label>
          <Input
            placeholder="Acme Inc."
            value={data.companyName || ''}
            onChange={e => onChange({ companyName: e.target.value })}
            className="h-10 bg-zinc-800/40 border-zinc-700/50 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 text-sm rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Website</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input
              placeholder="acme.com"
              value={data.companyWebsite || ''}
              onChange={e => onChange({ companyWebsite: e.target.value })}
              className="h-10 pl-10 bg-zinc-800/40 border-zinc-700/50 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 text-sm rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2 max-w-sm mx-auto">
        <Button variant="ghost" onClick={onBack} className="text-zinc-500 hover:text-zinc-300">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="h-10 px-6 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium rounded-xl disabled:opacity-30"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Setting up...
            </div>
          ) : (
            <>
              Launch workspace
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Step 4: Avatar
// ─────────────────────────────────────────────

export function AvatarStep({ data, onChange, onNext, onBack, onSubmit, isLastStep, isSubmitting }) {
  return (
    <motion.div {...fadeIn} className="space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 mb-1">
          <UserCircle className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Choose your avatar</h2>
        <p className="text-zinc-500 text-xs max-w-sm mx-auto">
          Pick a style and find one you like, or upload your own photo
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <AvatarSelector
          selected={data.avatarUrl ? { id: data.avatarUrl, url: data.avatarUrl } : null}
          onSelect={(avatar) => onChange({ avatarUrl: avatar.url || avatar.id })}
          allowUpload
        />
      </div>

      <div className="flex justify-between pt-1 max-w-md mx-auto">
        <Button variant="ghost" onClick={onBack} className="text-zinc-500 hover:text-zinc-300">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {!data.avatarUrl && (
            <Button
              variant="ghost"
              onClick={isLastStep ? onSubmit : onNext}
              disabled={isSubmitting}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Skip for now
            </Button>
          )}
          <Button
            onClick={isLastStep ? onSubmit : onNext}
            disabled={isSubmitting}
            className={cn(
              "h-10 px-6 text-white font-medium rounded-xl disabled:opacity-30",
              isLastStep
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                : "bg-white/5 hover:bg-white/10 border border-zinc-700 hover:border-zinc-600"
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Setting up...
              </div>
            ) : isLastStep ? (
              <>
                Launch workspace
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Progress Indicator
// ─────────────────────────────────────────────

export function ProgressIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-4">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            i + 1 === currentStep
              ? "w-6 bg-gradient-to-r from-emerald-500 to-cyan-500"
              : i + 1 < currentStep
                ? "w-4 bg-emerald-500/40"
                : "w-4 bg-zinc-800"
          )}
        />
      ))}
    </div>
  );
}
