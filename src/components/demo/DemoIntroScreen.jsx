import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, BarChart3, Shield, Puzzle, Activity,
  Rocket, Euro, GraduationCap, UserPlus, Palette, Package,
  TrendingUp, Contact, FolderKanban, Inbox, ChevronRight,
  CheckSquare, BookOpen, Globe, Mic, ArrowRight,
} from 'lucide-react';

// SYNC avatar ring segments (matching production)
const RING_SEGMENTS = [
  { color: '#ec4899', from: 0.02, to: 0.08 },
  { color: '#06b6d4', from: 0.12, to: 0.18 },
  { color: '#6366f1', from: 0.22, to: 0.28 },
  { color: '#10b981', from: 0.32, to: 0.38 },
  { color: '#86EFAC', from: 0.42, to: 0.48 },
  { color: '#f59e0b', from: 0.52, to: 0.58 },
  { color: '#f43f5e', from: 0.62, to: 0.68 },
  { color: '#f97316', from: 0.72, to: 0.78 },
  { color: '#3b82f6', from: 0.82, to: 0.88 },
  { color: '#14b8a6', from: 0.92, to: 0.98 },
];

function SyncAvatarLarge({ size = 120, spinning = true }) {
  const r = size / 2;
  const segmentR = r - 4;
  const innerR = r * 0.52;

  const polar = (cx, cy, radius, a) => {
    const ang = (a - 0.25) * Math.PI * 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };

  const arcPath = (cx, cy, radius, a0, a1) => {
    const p0 = polar(cx, cy, radius, a0);
    const p1 = polar(cx, cy, radius, a1);
    return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 0 1 ${p1.x} ${p1.y}`;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)',
          transform: 'scale(1.5)',
          opacity: 0.4,
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={spinning ? { animation: 'syncSpin 20s linear infinite' } : undefined}
      >
        <defs>
          <filter id="introGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={2.5} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g filter="url(#introGlow)">
          {RING_SEGMENTS.map((seg, i) => (
            <path
              key={i}
              d={arcPath(r, r, segmentR, seg.from, seg.to)}
              fill="none"
              stroke={seg.color}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.85}
            />
          ))}
        </g>
      </svg>
      <div
        className="absolute rounded-full"
        style={{
          top: size / 2 - innerR,
          left: size / 2 - innerR,
          width: innerR * 2,
          height: innerR * 2,
          background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(0,0,0,0.7) 100%)',
        }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingTop: 2 }}
      >
        <span className="text-white font-bold tracking-tight" style={{ fontSize: size * 0.18 }}>
          SYNC
        </span>
      </div>
    </div>
  );
}

// Feature showcase data
const HERO_FEATURES = [
  {
    icon: Brain,
    title: 'SYNC AI Orchestrator',
    desc: 'One AI that understands your entire business. 51 actions across every module, voice-controlled.',
    color: 'from-purple-500/20 to-violet-500/20',
    border: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    tag: 'AI-Powered',
  },
  {
    icon: Zap,
    title: '10 Integrated Engines',
    desc: 'CRM, Finance, Growth, Talent, Learn, Create, Products, Raise, Sentinel, and more — all connected.',
    color: 'from-cyan-500/20 to-blue-500/20',
    border: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
    tag: 'All-in-One',
  },
  {
    icon: Activity,
    title: 'Real-Time Activity Tracking',
    desc: 'Every action logged. AI-generated daily journals. Complete visibility across your team.',
    color: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    tag: 'Live Insights',
  },
  {
    icon: Puzzle,
    title: '30+ Integrations',
    desc: 'Connect Slack, HubSpot, Gmail, Stripe, QuickBooks, and more. Everything syncs automatically.',
    color: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    tag: 'Connected',
  },
  {
    icon: Shield,
    title: 'EU AI Act Compliance',
    desc: 'Built-in AI governance. Register systems, assess risk, generate compliance docs automatically.',
    color: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30',
    iconColor: 'text-green-400',
    tag: 'Compliant',
  },
  {
    icon: Mic,
    title: 'Voice-First Experience',
    desc: 'Talk to SYNC like a colleague. Ask questions, give commands, navigate — all by voice.',
    color: 'from-rose-500/20 to-pink-500/20',
    border: 'border-rose-500/30',
    iconColor: 'text-rose-400',
    tag: 'Voice AI',
  },
];

// Module icons for the orbiting ring
const MODULE_ICONS = [
  { icon: Contact, label: 'CRM', color: '#06b6d4' },
  { icon: Euro, label: 'Finance', color: '#f59e0b' },
  { icon: Rocket, label: 'Growth', color: '#6366f1' },
  { icon: UserPlus, label: 'Talent', color: '#ef4444' },
  { icon: GraduationCap, label: 'Learn', color: '#14b8a6' },
  { icon: Palette, label: 'Create', color: '#eab308' },
  { icon: Package, label: 'Products', color: '#06b6d4' },
  { icon: TrendingUp, label: 'Raise', color: '#f97316' },
  { icon: Shield, label: 'Sentinel', color: '#86EFAC' },
  { icon: BarChart3, label: 'Analytics', color: '#3b82f6' },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

export default function DemoIntroScreen({ recipientName, companyName, onStart, language = 'en' }) {
  const [phase, setPhase] = useState(0); // 0=avatar, 1=headline, 2=features, 3=ready
  const [activeFeature, setActiveFeature] = useState(-1);

  // Auto-advance phases
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-cycle through features for visual interest
  useEffect(() => {
    if (phase < 2) return;
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % HERO_FEATURES.length);
    }, 3000);
    setActiveFeature(0);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-8 overflow-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px]" />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] rounded-full bg-amber-500/5 blur-[80px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center">
        {/* SYNC Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0, 0.7, 0.3, 1] }}
          className="mb-6"
        >
          <SyncAvatarLarge size={100} />
        </motion.div>

        {/* Welcome text */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              {recipientName && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-zinc-400 text-sm mb-2 tracking-wide uppercase"
                >
                  Welcome, {recipientName}
                </motion.p>
              )}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
                Meet <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">iSyncSO</span>
              </h1>
              <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                The AI-powered operating system that runs your entire business
                {companyName ? ` — personalized for ${companyName}` : ''}.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Module orbit ring - horizontal strip */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center gap-3 sm:gap-4 mb-8 flex-wrap px-4"
            >
              {MODULE_ICONS.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={mod.label}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.4, ease: [0, 0.7, 0.3, 1] }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border border-white/10 bg-white/[0.03] backdrop-blur-sm"
                      style={{ boxShadow: `0 0 20px ${mod.color}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: mod.color }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-medium">{mod.label}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature cards grid */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full mb-8"
            >
              {HERO_FEATURES.map((feat, i) => {
                const Icon = feat.icon;
                const isActive = activeFeature === i;
                return (
                  <motion.div
                    key={feat.title}
                    variants={fadeUp}
                    className={`relative rounded-2xl border p-4 transition-all duration-500 cursor-default overflow-hidden ${
                      isActive
                        ? `${feat.border} bg-gradient-to-br ${feat.color}`
                        : 'border-white/5 bg-white/[0.02]'
                    }`}
                    onMouseEnter={() => setActiveFeature(i)}
                  >
                    {/* Tag */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-white/10' : 'bg-white/[0.04]'
                      }`}>
                        <Icon className={`w-5 h-5 ${isActive ? feat.iconColor : 'text-zinc-500'}`} />
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isActive
                          ? `${feat.iconColor} bg-white/10`
                          : 'text-zinc-600 bg-white/[0.03]'
                      }`}>
                        {feat.tag}
                      </span>
                    </div>
                    <h3 className={`text-sm font-semibold mb-1 transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-zinc-300'
                    }`}>
                      {feat.title}
                    </h3>
                    <p className={`text-xs leading-relaxed transition-colors duration-300 ${
                      isActive ? 'text-zinc-300' : 'text-zinc-500'
                    }`}>
                      {feat.desc}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats strip */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center gap-6 sm:gap-10 mb-8 text-center"
            >
              {[
                { value: '51', label: 'AI Actions' },
                { value: '10', label: 'Engines' },
                { value: '30+', label: 'Integrations' },
                { value: '11', label: 'Languages' },
              ].map((stat, i) => (
                <div key={stat.label}>
                  <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Button */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.button
                onClick={onStart}
                className="group flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-2xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-[1.02]"
                whileTap={{ scale: 0.97 }}
              >
                Start the Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
              <p className="text-zinc-600 text-xs flex items-center gap-1.5">
                <Mic className="w-3 h-3" />
                Voice-guided interactive experience
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes syncSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
