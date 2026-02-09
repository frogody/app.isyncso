/**
 * RequestDemo — Public self-service demo landing page
 *
 * Visitors fill in their info, the system runs Explorium enrichment +
 * AI research automatically, creates a demo link, and redirects to the
 * personalized demo experience.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Building2,
  User,
  Mail,
  Globe,
  Briefcase,
  MessageSquare,
  Loader2,
  CheckCircle,
  Search,
  Brain,
  Rocket,
  Zap,
  Shield,
  BarChart3,
  Users,
  BookOpen,
  Package,
  Target,
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const INDUSTRY_OPTIONS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Marketing',
  'Consulting',
  'Real Estate',
  'E-commerce',
  'Manufacturing',
  'Other',
];

const INTEREST_OPTIONS = [
  { key: 'growth', label: 'Sales & Pipeline', icon: BarChart3, color: 'text-indigo-400' },
  { key: 'crm', label: 'CRM & Contacts', icon: Users, color: 'text-blue-400' },
  { key: 'talent', label: 'Hiring & Recruiting', icon: Target, color: 'text-red-400' },
  { key: 'finance', label: 'Finance & Invoicing', icon: Briefcase, color: 'text-amber-400' },
  { key: 'learn', label: 'Training & Learning', icon: BookOpen, color: 'text-teal-400' },
  { key: 'products', label: 'Products & Inventory', icon: Package, color: 'text-cyan-400' },
  { key: 'sentinel', label: 'AI Compliance', icon: Shield, color: 'text-green-400' },
  { key: 'create', label: 'Content Creation', icon: Sparkles, color: 'text-yellow-400' },
];

const PHASES = [
  { key: 'enriching', label: 'Analyzing your company', icon: Search },
  { key: 'researching', label: 'Building your demo strategy', icon: Brain },
  { key: 'creating', label: 'Preparing your personalized demo', icon: Rocket },
];

function FloatingLabel({ icon: Icon, label, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm text-zinc-400">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}

export default function RequestDemo() {
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [interests, setInterests] = useState([]);
  const [notes, setNotes] = useState('');

  // Flow state
  const [phase, setPhase] = useState(null); // null = form, 'enriching' | 'researching' | 'creating' | 'ready'
  const [error, setError] = useState(null);

  const handleEmailChange = (val) => {
    setEmail(val);
    if (!domain && val.includes('@')) {
      const d = val.split('@')[1];
      if (d && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'live.com', 'protonmail.com'].includes(d.toLowerCase())) {
        setDomain(d);
      }
    }
  };

  const toggleInterest = (key) => {
    setInterests(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleStart = useCallback(async () => {
    if (!name.trim() || !email.trim() || !company.trim()) {
      setError('Please fill in your name, email, and company.');
      return;
    }
    setError(null);

    try {
      // Phase 1: Explorium enrichment
      setPhase('enriching');

      const enrichPromises = [];

      // Company intelligence
      enrichPromises.push(
        fetch(`${SUPABASE_URL}/functions/v1/generateCompanyIntelligence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: company.trim(),
            companyDomain: domain.trim() || null,
          }),
        }).then(r => r.json()).catch(() => ({ error: 'failed' }))
      );

      // Prospect enrichment
      if (email.trim()) {
        enrichPromises.push(
          fetch(`${SUPABASE_URL}/functions/v1/explorium-enrich`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'full_enrich',
              email: email.trim(),
              full_name: name.trim(),
              company_name: company.trim(),
            }),
          }).then(r => r.json()).catch(() => ({ error: 'failed' }))
        );
      }

      const [companyResult, prospectResult] = await Promise.all(enrichPromises);
      const exploriumIntel = companyResult?.intelligence || null;
      const prospectEnriched = prospectResult?.error ? null : (prospectResult || null);

      // Auto-detect industry from Explorium
      let detectedIndustry = industry;
      if (!detectedIndustry && exploriumIntel?.firmographics?.industry) {
        detectedIndustry = INDUSTRY_OPTIONS.find(o =>
          exploriumIntel.firmographics.industry.toLowerCase().includes(o.toLowerCase())
        ) || 'Other';
      }

      // Phase 2: LLM research
      setPhase('researching');

      const researchRes = await fetch(`${SUPABASE_URL}/functions/v1/research-demo-prospect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: name.trim(),
          recipientEmail: email.trim(),
          companyName: company.trim(),
          companyDomain: domain.trim() || null,
          industry: detectedIndustry,
          notes: notes.trim() || (interests.length > 0 ? `Interested in: ${interests.join(', ')}` : ''),
          exploriumData: exploriumIntel,
          prospectData: prospectEnriched,
        }),
      });
      const researchData = await researchRes.json();
      const research = researchData.research || null;

      // Build selected modules from interests + research priority
      let selectedModules = ['dashboard'];
      if (research?.demo_strategy?.priority_modules) {
        selectedModules = ['dashboard', ...research.demo_strategy.priority_modules];
      } else if (interests.length > 0) {
        selectedModules = ['dashboard', ...interests];
      } else {
        selectedModules = ['dashboard', 'growth', 'crm', 'talent', 'finance', 'learn', 'create', 'products', 'raise', 'sentinel', 'inbox', 'tasks', 'integrations'];
      }

      // Phase 3: Create demo link
      setPhase('creating');

      const createRes = await fetch(`${SUPABASE_URL}/functions/v1/create-public-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: name.trim(),
          recipientEmail: email.trim(),
          companyName: company.trim(),
          companyDomain: domain.trim() || null,
          industry: detectedIndustry || null,
          notes: notes.trim() || null,
          research,
          explorium: exploriumIntel,
          prospectData: prospectEnriched,
          selectedModules,
        }),
      });
      const createData = await createRes.json();
      if (createData.error) throw new Error(createData.error);

      // Phase 4: Ready — redirect to demo
      setPhase('ready');
      setTimeout(() => {
        navigate(`/demo?token=${createData.token}`);
      }, 1200);

    } catch (err) {
      console.error('[RequestDemo] Error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setPhase(null);
    }
  }, [name, email, company, domain, industry, interests, notes, navigate]);

  // Processing screen
  if (phase) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          {/* Logo */}
          <div className="mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Building your demo
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              Personalizing everything for {company}
            </p>
          </div>

          {/* Phase indicators */}
          <div className="space-y-4">
            {PHASES.map((p, i) => {
              const phaseIndex = PHASES.findIndex(ph => ph.key === phase);
              const thisIndex = i;
              const isDone = thisIndex < phaseIndex || phase === 'ready';
              const isActive = thisIndex === phaseIndex && phase !== 'ready';
              const isPending = thisIndex > phaseIndex && phase !== 'ready';

              return (
                <motion.div
                  key={p.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
                    isDone
                      ? 'bg-green-500/5 border-green-500/20'
                      : isActive
                      ? 'bg-red-500/5 border-red-500/30'
                      : 'bg-zinc-900/50 border-zinc-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDone
                      ? 'bg-green-500/20'
                      : isActive
                      ? 'bg-red-500/20'
                      : 'bg-zinc-800/50'
                  }`}>
                    {isDone ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                    ) : (
                      <p.icon className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    isDone
                      ? 'text-green-400'
                      : isActive
                      ? 'text-white'
                      : 'text-zinc-600'
                  }`}>
                    {p.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto flex gap-0.5">
                      {[0, 1, 2].map(j => (
                        <motion.div
                          key={j}
                          className="w-1 h-1 rounded-full bg-red-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.3 }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Ready state */}
          <AnimatePresence>
            {phase === 'ready' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <p className="text-green-400 text-sm font-medium">
                  Your demo is ready — launching now...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // Main landing page
  return (
    <div className="min-h-screen bg-black">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-red-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left: Hero content */}
          <div className="lg:sticky lg:top-20">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-semibold text-lg tracking-tight">iSyncso</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                See iSyncso
                <br />
                <span className="bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
                  in action
                </span>
              </h1>
              <p className="text-zinc-400 text-lg mt-4 leading-relaxed max-w-md">
                Get a personalized, AI-guided walkthrough of the platform — tailored to your company, your role, and what matters most to you.
              </p>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {[
                { icon: Brain, title: 'AI-Personalized', desc: 'We research your company and tailor every screen to your business' },
                { icon: MessageSquare, title: 'Voice-Guided', desc: 'SYNC, our AI agent, walks you through the platform live' },
                { icon: Zap, title: 'Interactive', desc: 'Ask questions, explore modules, and see real scenarios for your team' },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <f.icon className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{f.title}</p>
                    <p className="text-zinc-500 text-sm">{f.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-10 pt-8 border-t border-zinc-800/50"
            >
              <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">Trusted by teams at</p>
              <div className="flex items-center gap-6 text-zinc-700 text-sm">
                <span>SaaS Companies</span>
                <span className="w-1 h-1 rounded-full bg-zinc-800" />
                <span>Agencies</span>
                <span className="w-1 h-1 rounded-full bg-zinc-800" />
                <span>Startups</span>
                <span className="w-1 h-1 rounded-full bg-zinc-800" />
                <span>Enterprise</span>
              </div>
            </motion.div>
          </div>

          {/* Right: Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 lg:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Start your demo</h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Fill in your details and we'll build a personalized experience in seconds.
                </p>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <FloatingLabel icon={User} label="Your name" htmlFor="req-name">
                  <input
                    id="req-name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
                  />
                </FloatingLabel>

                {/* Email */}
                <FloatingLabel icon={Mail} label="Work email" htmlFor="req-email">
                  <input
                    id="req-email"
                    type="email"
                    placeholder="john@company.com"
                    value={email}
                    onChange={e => handleEmailChange(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
                  />
                </FloatingLabel>

                {/* Company */}
                <FloatingLabel icon={Building2} label="Company" htmlFor="req-company">
                  <input
                    id="req-company"
                    type="text"
                    placeholder="Acme Corp"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
                  />
                </FloatingLabel>

                {/* Domain (auto-filled) */}
                {domain && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <FloatingLabel icon={Globe} label="Company domain" htmlFor="req-domain">
                      <input
                        id="req-domain"
                        type="text"
                        value={domain}
                        onChange={e => setDomain(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
                      />
                    </FloatingLabel>
                  </motion.div>
                )}

                {/* Industry */}
                <FloatingLabel icon={Briefcase} label="Industry" htmlFor="req-industry">
                  <select
                    id="req-industry"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors appearance-none"
                    style={{ color: industry ? 'white' : '#52525b' }}
                  >
                    <option value="" style={{ color: '#52525b' }}>Select your industry...</option>
                    {INDUSTRY_OPTIONS.map(opt => (
                      <option key={opt} value={opt} style={{ color: 'white', backgroundColor: '#27272a' }}>{opt}</option>
                    ))}
                  </select>
                </FloatingLabel>

                {/* What interests you */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    What are you most interested in?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {INTEREST_OPTIONS.map(opt => {
                      const selected = interests.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          onClick={() => toggleInterest(opt.key)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm transition-all ${
                            selected
                              ? 'bg-red-500/10 border-red-500/30 text-white'
                              : 'bg-zinc-800/30 border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                          }`}
                        >
                          <opt.icon className={`w-3.5 h-3.5 flex-shrink-0 ${selected ? 'text-red-400' : opt.color}`} />
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes (optional) */}
                <FloatingLabel icon={MessageSquare} label="Anything specific you'd like to see? (optional)" htmlFor="req-notes">
                  <textarea
                    id="req-notes"
                    placeholder="e.g., We're struggling with pipeline visibility and need better forecasting..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors resize-none"
                  />
                </FloatingLabel>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-400 text-sm"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  onClick={handleStart}
                  disabled={!name.trim() || !email.trim() || !company.trim()}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-500/10 hover:shadow-red-500/20 disabled:shadow-none"
                >
                  Start My Personalized Demo
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-zinc-600 text-xs text-center">
                  No account needed. Your demo starts in under 30 seconds.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
