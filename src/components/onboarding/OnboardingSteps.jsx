import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Building2, Target, Brain, Zap, CheckCircle2, Loader2,
  ChevronRight, ChevronLeft, Globe, Users, Rocket, Shield,
  Linkedin, ExternalLink, Sparkles, Bot, Briefcase, GraduationCap,
  TrendingUp, UserPlus, DollarSign, Scale, Palette, MapPin,
  Calendar, Cpu, Banknote, Award, BookOpen, Code, Lightbulb
} from "lucide-react";
// Loader2 is already imported above
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Shared animation variants for consistency
const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } }
};

// Step 1: Welcome & Profile
export function WelcomeStep({ data, onChange, onNext }) {
  const isValid = data.fullName?.trim() && data.jobTitle?.trim();

  return (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-800/80 border border-zinc-700/50 mb-2">
          <User className="w-4 h-4 text-zinc-300" />
        </div>
        <h2 className="text-lg font-semibold text-white">Welcome</h2>
        <p className="text-zinc-500 text-xs max-w-sm mx-auto">
          Tell us about yourself so we can personalize your experience
        </p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Your name</Label>
          <Input
            placeholder="John Smith"
            value={data.fullName || ''}
            onChange={(e) => onChange({ fullName: e.target.value })}
            className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-0"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Job title</Label>
          <Input
            placeholder="Product Manager, Engineer, etc."
            value={data.jobTitle || ''}
            onChange={(e) => onChange({ jobTitle: e.target.value })}
            className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-0"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Experience level</Label>
          <div className="grid grid-cols-3 gap-3">
            {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
              <button
                key={level}
                onClick={() => onChange({ experienceLevel: level.toLowerCase() })}
                className={cn(
                  "py-2.5 px-3 rounded-lg text-sm font-medium transition-all border",
                  data.experienceLevel === level.toLowerCase()
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4">
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

// Step 2: LinkedIn Profile (NEW)
export function LinkedInStep({ data, onChange, onNext, onBack, onSkip }) {
  const [isValidating, setIsValidating] = useState(false);

  const handleContinue = () => {
    if (data.linkedinUrl?.trim()) {
      setIsValidating(true);
      // Brief delay to show validation state
      setTimeout(() => {
        setIsValidating(false);
        onNext();
      }, 500);
    } else {
      onNext();
    }
  };

  return (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-800/80 border border-zinc-700/50 mb-2">
          <Linkedin className="w-4 h-4 text-zinc-300" />
        </div>
        <h2 className="text-lg font-semibold text-white">Your Profile</h2>
        <p className="text-zinc-500 text-xs max-w-sm mx-auto">
          Share your LinkedIn so we can learn more about your background and tailor your learning path
        </p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs flex items-center gap-2">
            <Linkedin className="w-4 h-4" />
            LinkedIn profile URL
          </Label>
          <Input
            placeholder="linkedin.com/in/yourprofile"
            value={data.linkedinUrl || ''}
            onChange={(e) => onChange({ linkedinUrl: e.target.value })}
            className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-0"
          />
          <p className="text-[10px] text-zinc-600">
            We'll research your background to personalize courses and recommendations
          </p>
        </div>

        {/* Benefits of sharing LinkedIn */}
        <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 space-y-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">What we'll discover</p>
          <div className="space-y-2">
            {[
              'Your industry expertise and focus areas',
              'Skills to build upon or develop',
              'Relevant experience for course content'
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-400">
                <div className="w-1 h-1 rounded-full bg-cyan-500/50" />
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2 max-w-sm mx-auto">
        <Button variant="ghost" onClick={onBack} className="text-zinc-500 hover:text-zinc-300">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-zinc-600 hover:text-zinc-400"
          >
            Skip
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isValidating}
            className="h-11 px-6 bg-white/5 hover:bg-white/10 text-white border border-zinc-700 hover:border-zinc-600"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Step 3: Company Info
export function CompanyStep({ data, onChange, onNext, onBack }) {
  const isValid = data.companyName?.trim() && data.companyWebsite?.trim();

  return (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-800/80 border border-zinc-700/50 mb-2">
          <Building2 className="w-4 h-4 text-zinc-300" />
        </div>
        <h2 className="text-lg font-semibold text-white">Your Company</h2>
        <p className="text-zinc-500 text-xs max-w-sm mx-auto">
          We'll use this to create relevant examples and scenarios
        </p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Company name</Label>
          <Input
            placeholder="Acme Inc."
            value={data.companyName || ''}
            onChange={(e) => onChange({ companyName: e.target.value })}
            className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-0"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            Website
          </Label>
          <Input
            placeholder="acme.com"
            value={data.companyWebsite || ''}
            onChange={(e) => onChange({ companyWebsite: e.target.value })}
            className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-0"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Company size</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: '1-50', label: '1-50' },
              { value: '51-200', label: '51-200' },
              { value: '201-1000', label: '201-1000' },
              { value: '1000+', label: '1000+' }
            ].map((size) => (
              <button
                key={size.value}
                onClick={() => onChange({ companySize: size.value })}
                className={cn(
                  "py-2.5 px-3 rounded-lg text-sm font-medium transition-all border",
                  data.companySize === size.value
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
                )}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Industry</Label>
          <select
            value={data.industry || ''}
            onChange={(e) => onChange({ industry: e.target.value })}
            className="w-full h-11 bg-zinc-900/50 border border-zinc-800 text-white rounded-lg px-3 focus:border-zinc-600 focus:outline-none text-xs"
          >
            <option value="" className="bg-zinc-900">Select...</option>
            <option value="technology" className="bg-zinc-900">Technology</option>
            <option value="finance" className="bg-zinc-900">Finance & Banking</option>
            <option value="healthcare" className="bg-zinc-900">Healthcare</option>
            <option value="retail" className="bg-zinc-900">Retail & E-commerce</option>
            <option value="manufacturing" className="bg-zinc-900">Manufacturing</option>
            <option value="consulting" className="bg-zinc-900">Consulting</option>
            <option value="education" className="bg-zinc-900">Education</option>
            <option value="media" className="bg-zinc-900">Media & Entertainment</option>
            <option value="other" className="bg-zinc-900">Other</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between pt-4 max-w-sm mx-auto">
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

// Step 4: Goals - Now shows iSyncSO Apps
export function GoalsStep({ data, onChange, onNext, onBack }) {
  // App color schemes matching the actual app colors
  const appColors = {
    growth: {
      border: 'border-indigo-500/50',
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      icon: 'text-indigo-400'
    },
    sentinel: {
      border: 'border-[#86EFAC]/50',
      bg: 'bg-[#86EFAC]/10',
      text: 'text-[#86EFAC]',
      icon: 'text-[#86EFAC]'
    },
    learn: {
      border: 'border-cyan-500/50',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      icon: 'text-cyan-400'
    },
    finance: {
      border: 'border-amber-500/50',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      icon: 'text-amber-400'
    },
    raise: {
      border: 'border-orange-500/50',
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      icon: 'text-orange-400'
    },
    create: {
      border: 'border-rose-500/50',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      icon: 'text-rose-400'
    },
    talent: {
      border: 'border-red-500/50',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      icon: 'text-red-400'
    }
  };

  const apps = [
    {
      id: 'growth',
      label: 'Growth',
      description: 'AI-powered prospecting, pipeline management, and multi-channel outreach',
      icon: Rocket,
      color: 'growth'
    },
    {
      id: 'sentinel',
      label: 'Sentinel',
      description: 'EU AI Act compliance management, risk assessments, and documentation',
      icon: Shield,
      color: 'sentinel'
    },
    {
      id: 'learn',
      label: 'Learn',
      description: 'Personalized courses, skill tracking, and AI tutors that adapt to you',
      icon: GraduationCap,
      color: 'learn'
    },
    {
      id: 'finance',
      label: 'Finance',
      description: 'Invoice management, expense tracking, and financial reporting',
      icon: DollarSign,
      color: 'finance'
    },
    {
      id: 'raise',
      label: 'Raise',
      description: 'Investor management, pitch decks, data rooms, and fundraising',
      icon: TrendingUp,
      color: 'raise'
    },
    {
      id: 'create',
      label: 'Create',
      description: 'Generate images, videos, and branded content using AI',
      icon: Palette,
      color: 'create'
    },
    {
      id: 'talent',
      label: 'Talent',
      description: 'AI-powered candidate sourcing, flight risk intelligence, and recruitment',
      icon: UserPlus,
      color: 'talent'
    },
  ];

  const toggleApp = (appId) => {
    const current = data.selectedGoals || [];
    const updated = current.includes(appId)
      ? current.filter(g => g !== appId)
      : [...current, appId];
    onChange({ selectedGoals: updated });
  };

  const isValid = (data.selectedGoals?.length || 0) >= 1;
  const selectedCount = data.selectedGoals?.length || 0;

  return (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-800/80 border border-zinc-700/50 mb-2">
          <Target className="w-4 h-4 text-zinc-300" />
        </div>
        <h2 className="text-lg font-semibold text-white">What brings you here?</h2>
        <p className="text-zinc-500 text-xs max-w-sm mx-auto">
          Select the apps you're interested in to personalize your experience
        </p>
      </div>

      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {apps.map((app) => {
          const isSelected = data.selectedGoals?.includes(app.id);
          const Icon = app.icon;
          const colors = appColors[app.color];

          return (
            <motion.button
              key={app.id}
              variants={fadeIn}
              onClick={() => toggleApp(app.id)}
              className={cn(
                "p-3 rounded-xl text-left transition-all border group",
                isSelected
                  ? `${colors.border} ${colors.bg}`
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                  isSelected ? colors.bg : "bg-zinc-800/80"
                )}>
                  <Icon className={cn(
                    "w-4 h-4",
                    isSelected ? colors.icon : "text-zinc-500 group-hover:text-zinc-400"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "text-xs font-medium mb-1",
                    isSelected ? "text-white" : "text-zinc-300"
                  )}>
                    {app.label}
                  </h3>
                  <p className={cn(
                    "text-[10px] leading-relaxed",
                    isSelected ? "text-zinc-400" : "text-zinc-600"
                  )}>
                    {app.description}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2 className={cn("w-5 h-5 flex-shrink-0", colors.icon)} />
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Selection counter */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <span className="text-xs text-zinc-500">
            {selectedCount} app{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </motion.div>
      )}

      <div className="flex justify-between pt-4 max-w-2xl mx-auto">
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

// Step 5: Analysis / Loading
export function AnalysisStep({ data, currentMessage }) {
  return (
    <motion.div {...fadeIn} className="py-12">
      <div className="text-center space-y-4">
        {/* Minimal loading animation */}
        <div className="relative inline-flex items-center justify-center w-16 h-16">
          <motion.div
            className="absolute inset-0 rounded-full border border-zinc-700"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
            <Brain className="w-4 h-4 text-zinc-300" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium text-white">Setting up your workspace</h3>
          <motion.p
            key={currentMessage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-zinc-500 text-xs"
          >
            {currentMessage}
          </motion.p>
        </div>

        {/* Subtle progress dots */}
        <div className="flex justify-center gap-1.5 pt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-zinc-700"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Goal label mapping for display
const GOAL_LABELS = {
  'personal-assistant': 'Personal AI Assistant',
  'manage-work': 'Manage My Work',
  'learn-ai': 'Learn AI Skills',
  'ai-strategy': 'AI Strategy & Leadership',
  'recruitment': 'Recruitment & Hiring',
  'grow-sales': 'Grow My Sales',
  'compliance-ethics': 'AI Compliance & Ethics',
  'creative-work': 'AI for Creative Work',
  // Legacy goal IDs for backwards compatibility
  'ai-fundamentals': 'Learn AI Fundamentals',
  'productivity': 'Boost Productivity',
  'leadership': 'AI Strategy',
  'technical': 'Technical Skills',
  'compliance': 'AI Compliance',
  'team': 'Train My Team'
};

// Step 6: Review - Enhanced with full profile and company data
export function ReviewStep({ data, dossier, profileData, companyEnrichment, onChange, onConfirm, onBack, isSubmitting }) {
  const [expandedSection, setExpandedSection] = useState(null);

  // Check if data is fully loaded
  const hasProfileData = profileData && (profileData.headline || profileData.experience_summary || profileData.skills?.length > 0);
  const hasCompanyData = dossier && (dossier.tech_stack?.length > 0 || dossier.data_completeness > 0 || dossier.business_summary);

  // Format currency
  const formatFunding = (amount) => {
    if (!amount) return null;
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.]/g, '')) : amount;
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num}`;
  };

  return (
    <motion.div {...fadeIn} className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
      <div className="text-center space-y-3 sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10 pb-2">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Your Workspace is Ready</h2>
        <p className="text-zinc-500 text-xs">Here's what we discovered about you and your company</p>
      </div>

      <div className="space-y-3 max-w-2xl mx-auto">
        {/* === YOUR PROFILE SECTION === */}
        <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium text-white">Your Profile</span>
            </div>
            {data.linkedinUrl && (
              <a
                href={data.linkedinUrl.startsWith('http') ? data.linkedinUrl : `https://${data.linkedinUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
              >
                <Linkedin className="w-3 h-3" />
                LinkedIn
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-medium text-white">{data.fullName || 'Your Name'}</h3>
              <p className="text-xs text-zinc-400">{data.jobTitle || 'Your Role'}</p>
              {profileData?.headline && profileData.headline !== data.jobTitle && (
                <p className="text-xs text-zinc-500 italic">{profileData.headline}</p>
              )}
            </div>
            <div className="px-3 py-1 rounded-lg bg-zinc-800 text-xs text-zinc-400 capitalize">
              {data.experienceLevel || 'intermediate'}
            </div>
          </div>

          {/* Profile Data from LinkedIn Research */}
          {hasProfileData && (
            <>
              {/* Experience Summary */}
              {profileData.experience_summary && (
                <div className="p-2 rounded-lg bg-zinc-800/50 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <Briefcase className="w-3 h-3" />
                    <span>Experience</span>
                    {profileData.years_experience && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">{profileData.years_experience} years</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300">{profileData.experience_summary}</p>
                </div>
              )}

              {/* Industries */}
              {profileData.industries?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500">Industries</span>
                  <div className="flex flex-wrap gap-1">
                    {profileData.industries.slice(0, 5).map((industry, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {(profileData.skills?.length > 0 || profileData.technical_skills?.length > 0) && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Code className="w-3 h-3" />
                    Skills & Expertise
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[...(profileData.technical_skills || []), ...(profileData.skills || [])]
                      .slice(0, 12)
                      .map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                          {skill}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Education & Certifications */}
              {(profileData.education || profileData.certifications?.length > 0) && (
                <div className="flex flex-wrap gap-3">
                  {profileData.education && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        Education
                      </span>
                      <p className="text-xs text-zinc-400">{profileData.education}</p>
                    </div>
                  )}
                  {profileData.certifications?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        Certifications
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {profileData.certifications.slice(0, 3).map((cert, i) => (
                          <span key={i} className="text-[10px] text-zinc-400">{cert}{i < Math.min(profileData.certifications.length, 3) - 1 ? ', ' : ''}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interests & Thought Leadership */}
              {(profileData.interests?.length > 0 || profileData.thought_leadership) && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Focus Areas
                  </span>
                  {profileData.interests?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profileData.interests.slice(0, 6).map((interest, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                  {profileData.thought_leadership && (
                    <p className="text-[10px] text-zinc-500 italic">{profileData.thought_leadership}</p>
                  )}
                </div>
              )}

              {/* Learning Style Recommendation */}
              {profileData.learning_style_hint && (
                <div className="p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-1">
                  <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    Personalized Learning Approach
                  </span>
                  <p className="text-xs text-zinc-400">{profileData.learning_style_hint}</p>
                </div>
              )}
            </>
          )}

          {/* No profile data message */}
          {!hasProfileData && (
            <div className="text-xs text-zinc-500 italic flex items-center gap-2">
              {data.linkedinUrl ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing your professional background...
                </>
              ) : (
                "Add your LinkedIn to unlock personalized recommendations"
              )}
            </div>
          )}
        </div>

        {/* === COMPANY SECTION === */}
        <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-medium text-white">Company Intelligence</span>
            </div>
            {dossier?.data_completeness > 0 && (
              <span className="text-[10px] text-zinc-500">
                {dossier.data_completeness}% data coverage
              </span>
            )}
          </div>

          {/* Company Header */}
          <div className="flex items-start gap-3">
            {dossier?.logo_url && (
              <img
                src={dossier.logo_url}
                alt={dossier?.company_name}
                className="w-8 h-8 rounded-lg object-contain bg-white p-1"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <div className="flex-1">
              <Input
                value={dossier?.company_name || data.companyName || ''}
                onChange={(e) => onChange({ companyName: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 text-white text-base font-medium h-8 mb-1"
              />
              <div className="flex flex-wrap gap-1 text-[10px]">
                {dossier?.industry && (
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {dossier.industry}
                  </span>
                )}
                {(dossier?.size_range || dossier?.employee_count) && (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Users className="w-3 h-3" />
                    {dossier.employee_count ? `${dossier.employee_count.toLocaleString()} employees` : dossier.size_range}
                  </span>
                )}
                {dossier?.founded_year && (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Calendar className="w-3 h-3" />
                    Founded {dossier.founded_year}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {dossier?.business_summary && (
            <p className="text-xs text-zinc-400 leading-relaxed">{dossier.business_summary}</p>
          )}

          {/* Location & Funding Row */}
          <div className="flex flex-wrap gap-3">
            {dossier?.headquarters && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <MapPin className="w-3 h-3 text-zinc-500" />
                <span>{dossier.headquarters}</span>
              </div>
            )}
            {dossier?.revenue_range && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <DollarSign className="w-3 h-3 text-zinc-500" />
                <span>{dossier.revenue_range} revenue</span>
              </div>
            )}
            {dossier?.linkedin_url && (
              <a
                href={dossier.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <Linkedin className="w-3 h-3" />
                <span>Company Page</span>
              </a>
            )}
          </div>

          {/* Funding Data */}
          {dossier?.funding_data && (dossier.total_funding || dossier.funding_stage) && (
            <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/20 space-y-1">
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <Banknote className="w-3 h-3" />
                Funding Information
              </span>
              <div className="flex flex-wrap gap-3">
                {dossier.total_funding && (
                  <div>
                    <span className="text-lg font-semibold text-white">{formatFunding(dossier.total_funding)}</span>
                    <span className="text-[10px] text-zinc-500 ml-1">total raised</span>
                  </div>
                )}
                {dossier.funding_stage && (
                  <div className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-[10px]">
                    {dossier.funding_stage}
                  </div>
                )}
                {dossier.funding_data?.last_funding_type && (
                  <span className="text-[10px] text-zinc-400">
                    Last: {dossier.funding_data.last_funding_type}
                    {dossier.funding_data.last_funding_date && ` (${dossier.funding_data.last_funding_date})`}
                  </span>
                )}
              </div>
              {dossier.funding_data?.investors?.length > 0 && (
                <div className="text-[10px] text-zinc-500">
                  Investors: {dossier.funding_data.investors.slice(0, 5).join(', ')}
                  {dossier.funding_data.investors.length > 5 && ` +${dossier.funding_data.investors.length - 5} more`}
                </div>
              )}
            </div>
          )}

          {/* Tech Stack */}
          {dossier?.tech_stack?.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  Tech Stack ({dossier.tech_stack.length} technologies)
                </span>
                {dossier.tech_stack.length > 15 && (
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'tech' ? null : 'tech')}
                    className="text-[10px] text-cyan-500 hover:text-cyan-400"
                  >
                    {expandedSection === 'tech' ? 'Show less' : 'Show all'}
                  </button>
                )}
              </div>

              {/* Tech Categories */}
              {dossier.tech_categories?.length > 0 ? (
                <div className="space-y-2">
                  {dossier.tech_categories.slice(0, expandedSection === 'tech' ? undefined : 4).map((cat, i) => (
                    <div key={i}>
                      <span className="text-[10px] text-zinc-600 uppercase tracking-wide">{cat.category}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cat.technologies.slice(0, expandedSection === 'tech' ? undefined : 8).map((tech, j) => (
                          <span key={j} className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                            {tech}
                          </span>
                        ))}
                        {!expandedSection && cat.technologies.length > 8 && (
                          <span className="text-[10px] text-zinc-600">+{cat.technologies.length - 8}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {dossier.tech_stack.slice(0, expandedSection === 'tech' ? undefined : 15).map((tech, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                      {tech}
                    </span>
                  ))}
                  {!expandedSection && dossier.tech_stack.length > 15 && (
                    <span className="text-[10px] text-zinc-600">+{dossier.tech_stack.length - 15} more</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No company data message */}
          {!hasCompanyData && (
            <div className="text-xs text-zinc-500 italic flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gathering company intelligence...
            </div>
          )}
        </div>

        {/* === GOALS SECTION === */}
        {data.selectedGoals?.length > 0 && (
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-medium text-white">Your Goals</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {data.selectedGoals.map((goalId) => (
                <span key={goalId} className="px-3 py-1 rounded-lg text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {GOAL_LABELS[goalId] || goalId.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* === APPS SECTION === */}
        {data.selectedApps?.length > 0 && (
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium text-white">Your Workspace Apps</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {data.selectedApps.map((appId) => {
                const appConfig = {
                  sync: { name: 'SYNC', icon: Bot, color: 'purple' },
                  learn: { name: 'Learn', icon: GraduationCap, color: 'cyan' },
                  growth: { name: 'Growth', icon: Rocket, color: 'indigo' },
                  talent: { name: 'Talent', icon: UserPlus, color: 'violet' },
                  finance: { name: 'Finance', icon: DollarSign, color: 'amber' },
                  sentinel: { name: 'Sentinel', icon: Shield, color: 'sage' },
                  raise: { name: 'Raise', icon: TrendingUp, color: 'orange' },
                  products: { name: 'Products', icon: Briefcase, color: 'teal' },
                  create: { name: 'Create', icon: Palette, color: 'rose' }
                };
                const colorClasses = {
                  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
                  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                  sage: "bg-[#86EFAC]/10 text-[#86EFAC] border-[#86EFAC]/20",
                  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
                  teal: "bg-teal-500/10 text-teal-400 border-teal-500/20",
                  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20"
                };
                const app = appConfig[appId];
                if (!app) return null;
                const Icon = app.icon;
                return (
                  <span key={appId} className={cn(
                    "px-2 py-1 rounded-lg text-xs flex items-center gap-2 border",
                    colorClasses[app.color]
                  )}>
                    <Icon className="w-3 h-3" />
                    {app.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2 max-w-2xl mx-auto sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm py-2">
        <Button variant="ghost" onClick={onBack} className="text-zinc-500 hover:text-zinc-300">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="h-11 px-6 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Setting up workspace...
            </>
          ) : (
            <>
              Launch Workspace
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// Progress Indicator - more subtle
export function ProgressIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-4">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            width: i + 1 === currentStep ? 24 : 8,
            backgroundColor: i + 1 <= currentStep ? 'rgb(39, 39, 42)' : 'rgb(24, 24, 27)',
            opacity: i + 1 <= currentStep ? 1 : 0.5
          }}
          className="h-1.5 rounded-full"
          transition={{ duration: 0.2 }}
        />
      ))}
    </div>
  );
}