import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Link, ArrowRight, CheckCircle2, Loader2, Sparkles, Zap,
  Eye, Lightbulb, Layers, Package, ShoppingBag, Shirt, Cpu, Utensils,
  Gem, Leaf, SunMedium, Contrast, Layout, Focus, Palette, ChevronRight,
  Play, Star, ArrowUpRight, MousePointerClick, Download, Image as ImageIcon,
  Wand2, Maximize2, X,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
// SyncStudioNav removed — sidebar handles navigation
import { VIBES, VIBE_KEYS } from '@/components/sync-studio/VibeSelector';

// ─── Animations ──────────────────────────────────────────────
const stagger = {
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

// ─── Shot Types ──────────────────────────────────────────────
const SHOT_TYPES = [
  {
    key: 'hero',
    label: 'Hero Shot',
    icon: Star,
    color: 'yellow',
    desc: 'The main product image. Clean, centered, maximum impact. This is your listing thumbnail.',
    tip: 'Use a clean background and fill 80% of the frame with the product.',
  },
  {
    key: 'lifestyle',
    label: 'Lifestyle',
    icon: SunMedium,
    color: 'amber',
    desc: 'Show the product in real-world context. Helps customers visualize ownership.',
    tip: 'Think about WHERE and HOW someone uses this product daily.',
  },
  {
    key: 'detail',
    label: 'Detail Close-up',
    icon: Focus,
    color: 'cyan',
    desc: 'Zoom into textures, materials, buttons, stitching. Builds trust and quality perception.',
    tip: 'Highlight the feature that differentiates you from competitors.',
  },
  {
    key: 'alternate',
    label: 'Alternate Angle',
    icon: Layers,
    color: 'purple',
    desc: 'Different perspectives — back, side, top-down. Gives a complete product understanding.',
    tip: 'Show at least 3 angles for a complete product story.',
  },
  {
    key: 'contextual',
    label: 'Contextual',
    icon: Layout,
    color: 'emerald',
    desc: 'Scale shots, group shots, or comparison images. Answers "how big is it?" questions.',
    tip: 'Include a common object for size reference or group complementary products.',
  },
];

// ─── Use Cases ───────────────────────────────────────────────
const USE_CASES = [
  { icon: Cpu, label: 'Electronics', desc: 'Clean tech shots with reflection and precision lighting', gradient: 'from-blue-500/20 to-cyan-500/10' },
  { icon: Shirt, label: 'Fashion', desc: 'Flat-lays, lifestyle contexts, and fabric detail close-ups', gradient: 'from-pink-500/20 to-rose-500/10' },
  { icon: Gem, label: 'Beauty & Care', desc: 'Luxurious textures, soft focus backgrounds, color accuracy', gradient: 'from-purple-500/20 to-violet-500/10' },
  { icon: Package, label: 'Home & Living', desc: 'Room context shots, styling vignettes, material details', gradient: 'from-amber-500/20 to-yellow-500/10' },
  { icon: Utensils, label: 'Kitchen', desc: 'Action shots, ingredient styling, countertop contexts', gradient: 'from-emerald-500/20 to-green-500/10' },
  { icon: Leaf, label: 'Garden & DIY', desc: 'Outdoor settings, before/after, scale demonstrations', gradient: 'from-lime-500/20 to-emerald-500/10' },
];

// ─── Pro Tips ────────────────────────────────────────────────
const PRO_TIPS = [
  {
    title: 'Start with Hero',
    body: 'Your hero shot is the thumbnail buyers see first. Nail this before anything else — it drives 70% of click-through rate.',
    icon: Star,
  },
  {
    title: 'Consistency is King',
    body: 'Pick one vibe for your entire catalog. A cohesive look builds brand recognition and signals professionalism.',
    icon: Palette,
  },
  {
    title: 'Show Scale',
    body: 'Include at least one contextual shot. "How big is it?" is the #1 unanswered question in online shopping.',
    icon: Maximize2,
  },
  {
    title: 'Leverage AI',
    body: 'Let the AI plan your shots first, then customize. It analyzes your product and suggests the optimal combination.',
    icon: Wand2,
  },
];

// ─── Workflow Steps ──────────────────────────────────────────
const WORKFLOW = [
  { step: 1, title: 'Import Catalog', desc: 'One-click sync from your Bol.com store. All SKUs, titles, and images pulled automatically.', icon: Download },
  { step: 2, title: 'AI Plans Your Shots', desc: 'Our AI analyzes each product and creates a tailored photoshoot brief with vibe, angles, and lighting.', icon: Wand2 },
  { step: 3, title: 'Review & Customize', desc: 'Approve plans as-is or tweak vibes, shot types, and backgrounds. You\'re always in control.', icon: MousePointerClick },
  { step: 4, title: 'Generate & Publish', desc: 'Studio-quality images generated in minutes. Export to Bol.com, download, or save to your library.', icon: Zap },
];

// ─── Color map helpers ───────────────────────────────────────
const colorMap = {
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', ring: 'ring-yellow-500/30' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', ring: 'ring-amber-500/30' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', ring: 'ring-cyan-500/30' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', ring: 'ring-purple-500/30' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
};

// ═════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════
export default function SyncStudioHome({ embedded = false }) {
  const { user } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bolConnected, setBolConnected] = useState(false);
  const [expandedVibe, setExpandedVibe] = useState(null);
  const [expandedShot, setExpandedShot] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    checkStatus();
  }, [user?.id]);

  async function checkStatus() {
    setLoading(true);
    try {
      const companyId = user.company_id;
      const [bolRes, catalogRes, importRes] = await Promise.all([
        supabase.from('bolcom_credentials').select('id').eq('company_id', companyId).eq('is_active', true).limit(1),
        supabase.from('sync_studio_products').select('ean').eq('user_id', user.id).limit(1),
        supabase.from('sync_studio_import_jobs').select('id, status').eq('user_id', user.id).in('status', ['importing', 'planning']).limit(1),
      ]);

      const connected = !bolRes.error && bolRes.data?.length > 0;
      const catalogSynced = !catalogRes.error && catalogRes.data?.length > 0;
      const activeImport = !importRes.error && importRes.data?.length > 0;

      setBolConnected(connected);

      if (activeImport) { navigate('/SyncStudioImport', { replace: true }); return; }
      if (catalogSynced) { navigate('/SyncStudioDashboard', { replace: true }); return; }
    } catch (err) {
      console.error('SyncStudioHome: status check failed', err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`${embedded ? 'min-h-[60vh]' : 'min-h-screen'} bg-black flex items-center justify-center`}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Camera className="w-8 h-8 text-yellow-400" />
            </div>
            <Loader2 className="w-5 h-5 text-yellow-400 animate-spin absolute -bottom-1 -right-1" />
          </div>
          <p className="text-zinc-400 text-sm">Checking your studio setup...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} bg-black relative overflow-hidden`}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-yellow-500/[0.03] rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[400px] bg-yellow-600/[0.02] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-10 pt-6 pb-24">
        {/* ════════════════════════════════════════════════════════ */}
        {/* HERO                                                     */}
        {/* ════════════════════════════════════════════════════════ */}
        <motion.section initial="hidden" animate="visible" variants={stagger} className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-300">AI-Powered Product Photography</span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Your Entire Catalog,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300">Studio-Ready</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
            Import your products, pick a vibe, and let AI generate professional photography for every SKU.
            No studio, no photographer, no waiting.
          </motion.p>

          {bolConnected && (
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-300 font-medium">Bol.com connected</span>
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3">
            {bolConnected ? (
              <button
                onClick={() => navigate('/SyncStudioImport')}
                className="group inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-full px-7 py-3 text-sm transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20"
              >
                Start Photoshoot
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/Integrations')}
                className="group inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-full px-7 py-3 text-sm transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20"
              >
                <Link className="w-4 h-4" />
                Connect Bol.com
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
            <button
              onClick={() => document.getElementById('vibes')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-full px-5 py-3 text-sm transition-colors"
            >
              <Eye className="w-4 h-4" />
              Explore Vibes
            </button>
          </motion.div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════ */}
        {/* HOW IT WORKS                                            */}
        {/* ════════════════════════════════════════════════════════ */}
        <motion.section
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mb-20"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
            <Play className="w-4 h-4 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">How It Works</h2>
          </motion.div>

          <div className="grid sm:grid-cols-4 gap-3">
            {WORKFLOW.map((w, i) => {
              const Icon = w.icon;
              return (
                <motion.div
                  key={w.step}
                  variants={fadeUp}
                  className="relative bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 group hover:border-yellow-500/20 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-yellow-400" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Step {w.step}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{w.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{w.desc}</p>
                  {i < WORKFLOW.length - 1 && (
                    <ChevronRight className="hidden sm:block absolute top-1/2 -right-3.5 w-4 h-4 text-zinc-700 -translate-y-1/2" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════ */}
        {/* VIBE EXPLORER                                           */}
        {/* ════════════════════════════════════════════════════════ */}
        <motion.section
          id="vibes"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mb-20"
        >
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">Explore Vibes</h2>
            </div>
            <span className="text-xs text-zinc-600">{VIBE_KEYS.length} styles available</span>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {VIBE_KEYS.map((key) => {
              const vibe = VIBES[key];
              const isExpanded = expandedVibe === key;
              return (
                <motion.div
                  key={key}
                  variants={fadeUp}
                  layout
                  onClick={() => setExpandedVibe(isExpanded ? null : key)}
                  className={`cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300 ${
                    isExpanded
                      ? 'border-yellow-500/40 ring-1 ring-yellow-500/20 col-span-2 sm:col-span-2'
                      : 'border-zinc-800/60 hover:border-zinc-700/60'
                  }`}
                >
                  {/* Gradient bar */}
                  <div className={`h-20 bg-gradient-to-r ${vibe.gradient} relative`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-2 left-3">
                      <span className="text-xs font-bold text-white drop-shadow-lg">{vibe.name}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-zinc-900/80 px-3 py-3">
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{vibe.description}</p>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-zinc-800/60 space-y-2">
                            <DetailRow label="Background" value={vibe.background_hint} />
                            <DetailRow label="Mood" value={vibe.mood_hint} />
                            <DetailRow label="Lighting" value={vibe.lighting_hint} />
                            <DetailRow label="Composition" value={vibe.composition_hint} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="text-[11px] text-zinc-600 mt-3 text-center">Click any vibe to explore its lighting, mood, and composition style</p>
        </motion.section>

        {/* ════════════════════════════════════════════════════════ */}
        {/* SHOT TYPES                                              */}
        {/* ════════════════════════════════════════════════════════ */}
        <motion.section
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mb-20"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
            <Camera className="w-4 h-4 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Shot Types</h2>
            <span className="text-xs text-zinc-600 ml-auto">AI selects the optimal mix per product</span>
          </motion.div>

          <div className="space-y-2">
            {SHOT_TYPES.map((shot) => {
              const Icon = shot.icon;
              const c = colorMap[shot.color];
              const isExpanded = expandedShot === shot.key;

              return (
                <motion.div
                  key={shot.key}
                  variants={fadeUp}
                  onClick={() => setExpandedShot(isExpanded ? null : shot.key)}
                  className={`cursor-pointer rounded-xl border transition-all duration-200 ${
                    isExpanded ? `${c.border} ${c.bg}` : 'border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${c.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white">{shot.label}</h3>
                      <p className="text-[11px] text-zinc-500 truncate">{shot.desc}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-zinc-600 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1">
                          <div className="bg-black/30 rounded-lg px-3 py-2.5 border border-zinc-800/40">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider">Pro Tip</span>
                                <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{shot.tip}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════ */}
        {/* USE CASES                                               */}
        {/* ════════════════════════════════════════════════════════ */}
        <motion.section
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mb-20"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
            <ShoppingBag className="w-4 h-4 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Works for Every Category</h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {USE_CASES.map((uc) => {
              const Icon = uc.icon;
              return (
                <motion.div
                  key={uc.label}
                  variants={fadeUp}
                  className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 hover:border-zinc-700/60 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${uc.gradient} flex items-center justify-center mb-3 border border-zinc-800/40`}>
                    <Icon className="w-5 h-5 text-zinc-200" />
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">{uc.label}</h3>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{uc.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════ */}
        {/* PRO TIPS                                                */}
        {/* ════════════════════════════════════════════════════════ */}
        <motion.section
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mb-20"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Pro Tips</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-3">
            {PRO_TIPS.map((tip, i) => {
              const Icon = tip.icon;
              return (
                <motion.div
                  key={tip.title}
                  variants={fadeUp}
                  className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 hover:border-yellow-500/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">{tip.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{tip.body}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════ */}
        {/* BOTTOM CTA                                              */}
        {/* ════════════════════════════════════════════════════════ */}
        <motion.section
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={stagger}
          className="text-center py-10 border-t border-zinc-800/40"
        >
          <motion.div variants={fadeUp} className="mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-6 h-6 text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Ready to upgrade your catalog?</h2>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Connect your store, pick your vibe, and watch your product images transform.
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            {bolConnected ? (
              <button
                onClick={() => navigate('/SyncStudioImport')}
                className="group inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-full px-7 py-3 text-sm transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20"
              >
                Sync My Catalog
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/Integrations')}
                className="group inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-full px-7 py-3 text-sm transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20"
              >
                <Link className="w-4 h-4" />
                Connect Bol.com Store
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </motion.div>

          <motion.p variants={fadeUp} className="mt-6 text-zinc-600 text-xs">
            Works with your existing Bol.com Retailer API connection. No extra setup.
          </motion.p>
        </motion.section>
      </div>
    </div>
  );
}

// ─── Sub-component ───────────────────────────────────────────
function DetailRow({ label, value }) {
  return (
    <div>
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
      <p className="text-xs text-zinc-300 leading-relaxed">{value}</p>
    </div>
  );
}
