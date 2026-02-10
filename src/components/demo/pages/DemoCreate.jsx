import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera, Sparkles, Zap, Paintbrush, Box, Monitor, Droplets, Square,
  Clock, Film, Package, History, Palette, Image, Wand2,
  ChevronDown, Download, Save, BookmarkPlus, ArrowLeft,
} from 'lucide-react';

// ─── Mode Cards ─────────────────────────────────────────────────────────────

const MODES = [
  { id: 'product', label: 'Product Shot', description: 'Best for product photography with reference images', icon: Camera },
  { id: 'marketing', label: 'Marketing Creative', description: 'Text-to-image for ads, social content & marketing', icon: Sparkles },
  { id: 'draft', label: 'Quick Draft', description: 'Fast generation for brainstorming & concepts', icon: Zap },
];

// ─── Style Presets ──────────────────────────────────────────────────────────

const STYLE_PRESETS = [
  { id: 'photorealistic', label: 'Photo', icon: Camera },
  { id: 'illustration', label: 'Illustr.', icon: Paintbrush },
  { id: '3d_render', label: '3D', icon: Box },
  { id: 'digital_art', label: 'Digital', icon: Monitor },
  { id: 'watercolor', label: 'Water', icon: Droplets },
  { id: 'minimalist', label: 'Minimal', icon: Square },
  { id: 'vintage', label: 'Vintage', icon: Clock },
  { id: 'cinematic', label: 'Cinema', icon: Film },
];

// ─── Aspect Ratios ──────────────────────────────────────────────────────────

const ASPECT_RATIOS = [
  { id: '1:1', shape: 'w-5 h-5' },
  { id: '16:9', shape: 'w-7 h-4' },
  { id: '9:16', shape: 'w-4 h-7' },
  { id: '4:3', shape: 'w-6 h-5' },
  { id: '3:4', shape: 'w-5 h-6' },
];

const QUICK_SUGGESTIONS = ['Product on marble', 'Lifestyle scene', 'Social media post', 'Marketing banner', 'Portrait photo'];

// ─── Mock History ───────────────────────────────────────────────────────────

const HISTORY = [
  { prompt: 'Professional product photo on marble surface...', style: 'Photo', time: '2 hours ago', gradient: 'from-yellow-600 to-amber-800' },
  { prompt: 'Marketing banner with abstract geometric shapes...', style: 'Digital', time: '5 hours ago', gradient: 'from-violet-600 to-purple-900' },
  { prompt: 'Social media post with team celebration...', style: 'Photo', time: '1 day ago', gradient: 'from-emerald-600 to-teal-800' },
  { prompt: 'Isometric illustration of cloud infrastructure...', style: 'Illustr.', time: '2 days ago', gradient: 'from-indigo-600 to-blue-900' },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DemoCreate({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [selectedMode, setSelectedMode] = useState('marketing');
  const [selectedStyle, setSelectedStyle] = useState('photorealistic');
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const demoPrompt = 'Professional product photo of our platform dashboard displayed on a sleek monitor, soft studio lighting, shallow depth of field...';

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="w-full px-4 lg:px-6 py-6 space-y-5">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm text-zinc-500 cursor-default">
              <ArrowLeft className="w-4 h-4" />
              Create Studio
            </span>
            <div className="w-px h-5 bg-zinc-800" />
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <Camera className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">AI Image Generation</h1>
                <p className="text-xs text-zinc-500">FLUX Pro & Kontext</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-full bg-zinc-900/50 border border-zinc-800/60 text-zinc-500 cursor-default">
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Prompt Area ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-[20px] bg-zinc-900/50 border border-zinc-800/60 p-5"
        >
          <div className="min-h-[80px] text-base text-zinc-400">
            {demoPrompt}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/40">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map(chip => (
                <span
                  key={chip}
                  className="px-3 py-1 text-xs rounded-full bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 cursor-default"
                >
                  {chip}
                </span>
              ))}
            </div>
            <span className="text-[10px] text-zinc-600 flex-shrink-0 ml-3">{demoPrompt.length}/1000</span>
          </div>
        </motion.div>

        {/* ── Mode Selector ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="grid grid-cols-3 gap-3"
        >
          {MODES.map(mode => {
            const IconComp = mode.icon;
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`relative rounded-[20px] p-4 text-left transition-all border cursor-default ${
                  isSelected
                    ? 'bg-yellow-500/[0.03] border-yellow-500/30'
                    : 'bg-zinc-900/50 border-zinc-800/60'
                }`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-yellow-500" />
                )}
                <IconComp className={`w-5 h-5 mb-2 ${isSelected ? 'text-yellow-400' : 'text-zinc-500'}`} />
                <div className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                  {mode.label}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{mode.description}</div>
              </button>
            );
          })}
        </motion.div>

        {/* ── Settings Row ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-[20px] bg-zinc-900/50 border border-zinc-800/60 p-4"
        >
          <div className="flex flex-wrap items-start gap-6">
            {/* Style swatches */}
            <div className="space-y-1.5">
              <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Style</span>
              <div className="flex gap-1.5">
                {STYLE_PRESETS.map(style => {
                  const Ic = style.icon;
                  const isSel = selectedStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      title={style.label}
                      className={`p-2 rounded-lg transition-all cursor-default ${
                        isSel
                          ? 'bg-yellow-500/10 ring-2 ring-yellow-500/40 text-yellow-400'
                          : 'bg-zinc-800/40 text-zinc-500'
                      }`}
                    >
                      <Ic className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Ratio</span>
              <div className="flex gap-1.5">
                {ASPECT_RATIOS.map(ratio => {
                  const isSel = aspectRatio === ratio.id;
                  return (
                    <button
                      key={ratio.id}
                      onClick={() => setAspectRatio(ratio.id)}
                      title={ratio.id}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-default ${
                        isSel
                          ? 'bg-yellow-400 text-black'
                          : 'bg-zinc-800/40 text-zinc-500'
                      }`}
                    >
                      <div className={`border-2 rounded-sm ${isSel ? 'border-black' : 'border-current'} ${ratio.shape}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product selector (shown in product mode) */}
            {selectedMode === 'product' && (
              <div className="space-y-1.5">
                <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Product</span>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700/40 text-zinc-300 text-sm min-w-[160px] cursor-default">
                  <Package className="w-3.5 h-3.5 text-yellow-400/70" />
                  <span className="truncate">Select...</span>
                  <ChevronDown className="w-3 h-3 opacity-50 ml-auto" />
                </button>
              </div>
            )}

            {/* Brand context */}
            <div className="space-y-1.5">
              <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Brand</span>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm cursor-default">
                <Palette className="w-3.5 h-3.5" />
                On
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Generate Button ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="flex items-center gap-3"
        >
          <button className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-black font-semibold text-sm rounded-2xl cursor-default">
            <Wand2 className="w-4 h-4" />
            Generate Image
          </button>
          <span className="text-xs text-zinc-500">~$0.025 per image · Estimated 8-12 seconds</span>
        </motion.div>

        {/* ── Mock Generated Result ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-[20px] bg-zinc-900/50 border border-zinc-800/60 overflow-hidden"
        >
          <div className="aspect-square max-w-lg mx-auto bg-gradient-to-br from-yellow-600/20 via-amber-900/20 to-zinc-900 flex items-center justify-center">
            <div className="text-center">
              <Image className="w-12 h-12 text-yellow-400/30 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Generated image preview</p>
              <p className="text-xs text-zinc-600 mt-1">1024 × 1024 · Photorealistic</p>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between">
            <p className="text-xs text-zinc-500 truncate flex-1 mr-4">{demoPrompt}</p>
            <div className="flex items-center gap-2 shrink-0">
              <button className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 cursor-default">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 cursor-default">
                <Save className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 cursor-default">
                <BookmarkPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Generation History ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="rounded-[20px] bg-zinc-900/50 border border-zinc-800/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-semibold text-white">Recent Generations</h3>
            </div>
            <span className="text-[11px] text-zinc-500">{HISTORY.length} images</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {HISTORY.map((item, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-zinc-800/30 border border-zinc-800/40">
                <div className={`aspect-square bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                  <Image className="w-6 h-6 text-white/20" />
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] text-zinc-400 truncate">{item.prompt}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-zinc-600">{item.style}</span>
                    <span className="text-[10px] text-zinc-600">{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
