/**
 * RequestDemo — Public self-service demo landing page
 *
 * Premium dark aesthetic with SYNC ring visual centerpiece,
 * glass morphism form, animated gradient orbs, and particle grid.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  ChevronDown,
  Languages,
} from 'lucide-react';
import { LANGUAGES, DEFAULT_LANGUAGE } from '@/constants/languages';
import { t } from '@/constants/demoTranslations';

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
  { key: 'growth', label: 'Sales & Pipeline', icon: BarChart3, color: '#6366f1' },
  { key: 'crm', label: 'CRM & Contacts', icon: Users, color: '#3b82f6' },
  { key: 'talent', label: 'Hiring & Recruiting', icon: Target, color: '#ef4444' },
  { key: 'finance', label: 'Finance & Invoicing', icon: Briefcase, color: '#f59e0b' },
  { key: 'learn', label: 'Training & Learning', icon: BookOpen, color: '#06b6d4' },
  { key: 'products', label: 'Products & Inventory', icon: Package, color: '#10b981' },
  { key: 'sentinel', label: 'AI Compliance', icon: Shield, color: '#86EFAC' },
  { key: 'create', label: 'Content Creation', icon: Sparkles, color: '#f43f5e' },
];

function getPhases(lang) {
  return [
    { key: 'enriching', label: t('phase.enriching', lang), icon: Search, desc: t('phase.enrichingDesc', lang) },
    { key: 'researching', label: t('phase.researching', lang), icon: Brain, desc: t('phase.researchingDesc', lang) },
    { key: 'creating', label: t('phase.creating', lang), icon: Rocket, desc: t('phase.creatingDesc', lang) },
  ];
}

// SYNC ring segments with agent module colors
const RING_SEGMENTS = [
  { id: 'orchestrator', color: '#ec4899', from: 0.02, to: 0.08 },
  { id: 'learn', color: '#06b6d4', from: 0.12, to: 0.18 },
  { id: 'growth', color: '#6366f1', from: 0.22, to: 0.28 },
  { id: 'products', color: '#10b981', from: 0.32, to: 0.38 },
  { id: 'sentinel', color: '#86EFAC', from: 0.42, to: 0.48 },
  { id: 'finance', color: '#f59e0b', from: 0.52, to: 0.58 },
  { id: 'create', color: '#f43f5e', from: 0.62, to: 0.68 },
  { id: 'tasks', color: '#f97316', from: 0.72, to: 0.78 },
  { id: 'research', color: '#3b82f6', from: 0.82, to: 0.88 },
  { id: 'inbox', color: '#14b8a6', from: 0.92, to: 0.98 },
];

/* ---------- Helper: SVG Arc ---------- */
function polar(cx, cy, radius, a) {
  const ang = (a - 0.25) * Math.PI * 2;
  return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
}

function arcPath(cx, cy, radius, a0, a1) {
  const p0 = polar(cx, cy, radius, a0);
  const p1 = polar(cx, cy, radius, a1);
  const large = a1 - a0 > 0.5 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${large} 1 ${p1.x} ${p1.y}`;
}

/* ---------- Animated SYNC Ring ---------- */
function SyncRing({ size = 180, spinning = false }) {
  const r = size / 2;
  const segR = r - 4;
  const innerR = r * 0.55;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)',
          transform: 'scale(1.4)',
        }}
      />

      {/* SVG ring */}
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        animate={spinning ? { rotate: 360 } : { rotate: 0 }}
        transition={spinning ? { duration: 20, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
      >
        <defs>
          <filter id="syncGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={2.5} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ring segments */}
        <g filter="url(#syncGlow)">
          {RING_SEGMENTS.map((seg, i) => (
            <motion.path
              key={seg.id}
              d={arcPath(r, r, segR, seg.from, seg.to)}
              fill="none"
              stroke={seg.color}
              strokeWidth={3.5}
              strokeLinecap="round"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 0.85, pathLength: 1 }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
            />
          ))}
        </g>
      </motion.svg>

      {/* Inner dark core */}
      <div
        className="absolute rounded-full"
        style={{
          top: r - innerR,
          left: r - innerR,
          width: innerR * 2,
          height: innerR * 2,
          background: 'radial-gradient(circle at 40% 40%, rgba(168,85,247,0.15), rgba(0,0,0,0.8))',
        }}
      />

      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Zap className="w-8 h-8 text-red-400 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.4))' }} />
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- Background Particle Grid ---------- */
function ParticleGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let running = true;
    let frame;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Grid dots
    const spacing = 60;
    let time = 0;

    const render = () => {
      if (!running) return;
      time += 0.003;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      for (let x = spacing; x < w; x += spacing) {
        for (let y = spacing; y < h; y += spacing) {
          const dist = Math.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2);
          const wave = Math.sin(dist * 0.005 + time) * 0.5 + 0.5;
          const alpha = 0.03 + wave * 0.04;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

/* ---------- Main Component ---------- */
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
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  // Flow state
  const [phase, setPhase] = useState(null);
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
      setError(t('request.fillRequired', language));
      return;
    }
    setError(null);

    try {
      setPhase('enriching');

      const enrichPromises = [];
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

      let detectedIndustry = industry;
      if (!detectedIndustry && exploriumIntel?.firmographics?.industry) {
        detectedIndustry = INDUSTRY_OPTIONS.find(o =>
          exploriumIntel.firmographics.industry.toLowerCase().includes(o.toLowerCase())
        ) || 'Other';
      }

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

      let selectedModules = ['dashboard'];
      if (research?.demo_strategy?.priority_modules) {
        selectedModules = ['dashboard', ...research.demo_strategy.priority_modules];
      } else if (interests.length > 0) {
        selectedModules = ['dashboard', ...interests];
      } else {
        selectedModules = ['dashboard', 'growth', 'crm', 'talent', 'finance', 'learn', 'create', 'products', 'raise', 'sentinel', 'inbox', 'tasks', 'integrations'];
      }

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
          language,
        }),
      });
      const createData = await createRes.json();
      if (createData.error) throw new Error(createData.error);

      setPhase('ready');
      setTimeout(() => {
        navigate(`/demo?token=${createData.token}`);
      }, 1200);

    } catch (err) {
      console.error('[RequestDemo] Error:', err);
      setError(err.message || t('request.error', language));
      setPhase(null);
    }
  }, [name, email, company, domain, industry, interests, notes, language, navigate]);

  const isValid = name.trim() && email.trim() && company.trim();

  // ── Processing Screen ──
  if (phase) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 overflow-hidden">
        <ParticleGrid />

        {/* Gradient orbs */}
        <motion.div
          className="fixed top-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)' }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="fixed bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }}
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-lg text-center"
        >
          {/* SYNC Ring */}
          <div className="flex justify-center mb-10">
            <SyncRing size={160} spinning={phase !== 'ready'} />
          </div>

          <h2 className="text-2xl font-semibold text-white mb-1 tracking-tight">
            {t('request.buildingExperience', language)}
          </h2>
          <p className="text-zinc-500 text-sm mb-10">
            {t('request.personalizing', language, { company: company || '' })}
          </p>

          {/* Phase indicators */}
          <div className="space-y-3 max-w-sm mx-auto">
            {getPhases(language).map((p, i) => {
              const phaseIndex = getPhases(language).findIndex(ph => ph.key === phase);
              const isDone = i < phaseIndex || phase === 'ready';
              const isActive = i === phaseIndex && phase !== 'ready';
              const isPending = i > phaseIndex && phase !== 'ready';

              return (
                <motion.div
                  key={p.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.12 }}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl border backdrop-blur-sm transition-all duration-700 ${
                    isDone
                      ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                      : isActive
                      ? 'bg-white/[0.03] border-white/10'
                      : 'bg-white/[0.01] border-white/[0.04]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                    isDone
                      ? 'bg-emerald-500/15'
                      : isActive
                      ? 'bg-red-500/15'
                      : 'bg-white/[0.03]'
                  }`}>
                    {isDone ? (
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="w-4.5 h-4.5 text-red-400 animate-spin" />
                    ) : (
                      <p.icon className="w-4.5 h-4.5 text-zinc-600" />
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <span className={`text-sm font-medium block ${
                      isDone ? 'text-emerald-400' : isActive ? 'text-white' : 'text-zinc-600'
                    }`}>
                      {p.label}
                    </span>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-zinc-500 block mt-0.5"
                      >
                        {p.desc}
                      </motion.span>
                    )}
                  </div>
                  {isActive && (
                    <div className="flex gap-1 ml-auto">
                      {[0, 1, 2].map(j => (
                        <motion.div
                          key={j}
                          className="w-1 h-1 rounded-full bg-red-400"
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1.4, repeat: Infinity, delay: j * 0.3 }}
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
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-medium">
                    {t('request.demoReady', language)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // ── Main Landing Page ──
  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <ParticleGrid />

      {/* Animated gradient orbs */}
      <motion.div
        className="fixed top-[-300px] left-[10%] w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 60%)' }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fixed bottom-[-200px] right-[-5%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)' }}
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fixed top-[40%] right-[20%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 60%)' }}
        animate={{ x: [0, 20, 0], y: [0, -25, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 lg:px-12 py-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold tracking-tight">iSyncso</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI-powered demo
          </div>
        </motion.header>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-5xl">
            <div className="grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-center">

              {/* Left: Hero */}
              <div className="text-center lg:text-left order-2 lg:order-1">
                {/* SYNC ring for mobile only */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="lg:hidden flex justify-center mb-8"
                >
                  <SyncRing size={120} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-6">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs text-zinc-400 font-medium">Personalized AI demo</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight">
                    Experience the
                    <br />
                    <span className="bg-gradient-to-r from-red-400 via-red-500 to-rose-500 bg-clip-text text-transparent">
                      future of work
                    </span>
                  </h1>

                  <p className="text-zinc-400 text-base lg:text-lg mt-5 leading-relaxed max-w-lg mx-auto lg:mx-0">
                    Get a personalized, voice-guided walkthrough of iSyncso — tailored to your company, your role, and what matters most to you.
                  </p>
                </motion.div>

                {/* Feature cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="mt-8 space-y-3 max-w-lg mx-auto lg:mx-0"
                >
                  {[
                    { icon: Brain, title: 'AI-Personalized', desc: 'We research your company and tailor every screen to your business', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    { icon: MessageSquare, title: 'Voice-Guided by SYNC', desc: 'Our AI agent walks you through the platform, answering questions live', color: 'text-red-400', bg: 'bg-red-500/10' },
                    { icon: Zap, title: 'Fully Interactive', desc: 'Explore modules, ask questions, and see real scenarios for your team', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  ].map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-start gap-3 text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg ${f.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <f.icon className={`w-4 h-4 ${f.color}`} />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{f.title}</p>
                        <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Social proof */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-10 pt-8 border-t border-white/[0.04] max-w-lg mx-auto lg:mx-0"
                >
                  <p className="text-zinc-600 text-[11px] uppercase tracking-[0.15em] mb-3 font-medium">Trusted by teams at</p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-zinc-600 text-sm">
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
                transition={{ delay: 0.15, duration: 0.7 }}
                className="order-1 lg:order-2"
              >
                <div className="relative">
                  {/* SYNC ring behind form on desktop */}
                  <div className="hidden lg:block absolute -top-20 -right-16 opacity-30 pointer-events-none">
                    <SyncRing size={200} />
                  </div>

                  {/* Glass card */}
                  <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl p-6 lg:p-7 shadow-2xl shadow-black/40">
                    {/* Subtle gradient edge glow */}
                    <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
                      background: 'linear-gradient(135deg, rgba(239,68,68,0.03) 0%, transparent 40%, rgba(99,102,241,0.02) 100%)',
                    }} />

                    <div className="relative">
                      <div className="mb-6">
                        <h2 className="text-lg font-semibold text-white tracking-tight">Start your demo</h2>
                        <p className="text-zinc-500 text-sm mt-1">
                          Fill in your details — your personalized experience starts in seconds.
                        </p>
                      </div>

                      <div className="space-y-4">
                        {/* Name */}
                        <div>
                          <label htmlFor="req-name" className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">
                            <User className="w-3 h-3" />
                            Your name
                          </label>
                          <input
                            id="req-name"
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all duration-200"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label htmlFor="req-email" className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">
                            <Mail className="w-3 h-3" />
                            Work email
                          </label>
                          <input
                            id="req-email"
                            type="email"
                            placeholder="john@company.com"
                            value={email}
                            onChange={e => handleEmailChange(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all duration-200"
                          />
                        </div>

                        {/* Company */}
                        <div>
                          <label htmlFor="req-company" className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">
                            <Building2 className="w-3 h-3" />
                            Company
                          </label>
                          <input
                            id="req-company"
                            type="text"
                            placeholder="Acme Corp"
                            value={company}
                            onChange={e => setCompany(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all duration-200"
                          />
                        </div>

                        {/* Domain (auto-filled) */}
                        <AnimatePresence>
                          {domain && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <label htmlFor="req-domain" className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">
                                <Globe className="w-3 h-3" />
                                Company domain
                              </label>
                              <input
                                id="req-domain"
                                type="text"
                                value={domain}
                                onChange={e => setDomain(e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all duration-200"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Industry */}
                        <div>
                          <label htmlFor="req-industry" className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">
                            <Briefcase className="w-3 h-3" />
                            Industry
                          </label>
                          <div className="relative">
                            <select
                              id="req-industry"
                              value={industry}
                              onChange={e => setIndustry(e.target.value)}
                              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all duration-200 appearance-none pr-10"
                              style={{ color: industry ? 'white' : '#52525b' }}
                            >
                              <option value="" style={{ color: '#52525b', backgroundColor: '#18181b' }}>Select your industry...</option>
                              {INDUSTRY_OPTIONS.map(opt => (
                                <option key={opt} value={opt} style={{ color: 'white', backgroundColor: '#18181b' }}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                          </div>
                        </div>

                        {/* Demo Language */}
                        <div>
                          <label htmlFor="req-language" className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">
                            <Languages className="w-3 h-3" />
                            {t('language.label', language)}
                          </label>
                          <div className="relative">
                            <select
                              id="req-language"
                              value={language}
                              onChange={e => setLanguage(e.target.value)}
                              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all duration-200 appearance-none pr-10"
                            >
                              {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code} style={{ color: 'white', backgroundColor: '#18181b' }}>
                                  {lang.nativeLabel} ({lang.label})
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                          </div>
                        </div>

                        {/* Interest chips */}
                        <div>
                          <label className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2.5 font-medium uppercase tracking-wide">
                            <Sparkles className="w-3 h-3" />
                            What interests you most?
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {INTEREST_OPTIONS.map(opt => {
                              const selected = interests.includes(opt.key);
                              return (
                                <motion.button
                                  key={opt.key}
                                  onClick={() => toggleInterest(opt.key)}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-sm transition-all duration-200 group ${
                                    selected
                                      ? 'border-white/[0.12] bg-white/[0.06]'
                                      : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.04]'
                                  }`}
                                >
                                  <div
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                      selected ? 'shadow-lg' : 'opacity-60 group-hover:opacity-80'
                                    }`}
                                    style={{
                                      backgroundColor: selected ? opt.color + '20' : 'rgba(255,255,255,0.03)',
                                    }}
                                  >
                                    <opt.icon
                                      className="w-3.5 h-3.5 transition-colors"
                                      style={{ color: selected ? opt.color : '#71717a' }}
                                    />
                                  </div>
                                  <span className={`truncate text-xs font-medium transition-colors ${
                                    selected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                                  }`}>
                                    {opt.label}
                                  </span>
                                  {selected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: opt.color }}
                                    />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label htmlFor="req-notes" className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">
                            <MessageSquare className="w-3 h-3" />
                            Anything specific? <span className="text-zinc-700 normal-case tracking-normal">(optional)</span>
                          </label>
                          <textarea
                            id="req-notes"
                            placeholder="e.g., We're struggling with pipeline visibility and need better forecasting..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all duration-200 resize-none"
                          />
                        </div>

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
                        <motion.button
                          onClick={handleStart}
                          disabled={!isValid}
                          whileHover={isValid ? { scale: 1.01 } : {}}
                          whileTap={isValid ? { scale: 0.99 } : {}}
                          className={`w-full relative overflow-hidden font-medium py-3.5 px-6 rounded-xl transition-all text-sm flex items-center justify-center gap-2 ${
                            isValid
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/15 hover:shadow-red-500/25'
                              : 'bg-white/[0.04] border border-white/[0.06] text-zinc-600 cursor-not-allowed'
                          }`}
                        >
                          {isValid && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                            />
                          )}
                          <span className="relative">{t('request.startDemo', language)}</span>
                          <ArrowRight className="w-4 h-4 relative" />
                        </motion.button>

                        <p className="text-zinc-600 text-xs text-center">
                          {t('request.noAccount', language)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="px-6 lg:px-12 py-6 text-center"
        >
          <p className="text-zinc-700 text-xs">
            &copy; 2026 iSyncso. All rights reserved.
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
