import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paintbrush,
  Camera,
  Clapperboard,
  FolderOpen,
  ChevronLeft,
  ChevronDown,
  Image as ImageIcon,
  Palette,
  Type,
  MessageSquare,
  Sparkles,
  Plus,
  X,
  Wand2,
  Package,
  Clock,
  Film,
  Zap,
  Download,
  RefreshCw,
  History,
  Play,
  Trash2,
  Search,
  Grid,
  List,
  CheckSquare,
  Square,
  Heart,
  Eye,
  Video,
  ArrowLeft,
  Loader2,
  Check,
  Droplets,
  Monitor,
  Box,
} from 'lucide-react';

// =====================================================================================
// SHARED MOCK DATA
// =====================================================================================

const BRAND_COLORS = {
  primary: '#22d3ee',
  secondary: '#f59e0b',
  accent: '#8b5cf6',
  background: '#0a0a0a',
  text: '#ffffff',
};

const COLOR_LABELS = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  background: 'Background',
  text: 'Text',
};

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'playful', label: 'Playful' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'bold', label: 'Bold' },
];

const MOOD_OPTIONS = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimalist', label: 'Minimal' },
  { value: 'bold', label: 'Bold' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'tech', label: 'Tech' },
  { value: 'playful', label: 'Playful' },
];

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat',
  'Source Sans Pro', 'Nunito', 'Raleway', 'Work Sans', 'Playfair Display',
  'Merriweather', 'DM Sans', 'Space Grotesk',
];

const IMAGE_STYLE_PRESETS = [
  { id: 'photorealistic', label: 'Photo', icon: Camera },
  { id: 'illustration', label: 'Illustr.', icon: Paintbrush },
  { id: '3d_render', label: '3D', icon: Box },
  { id: 'digital_art', label: 'Digital', icon: Monitor },
  { id: 'watercolor', label: 'Water', icon: Droplets },
  { id: 'minimalist', label: 'Minimal', icon: Square },
  { id: 'vintage', label: 'Vintage', icon: Clock },
  { id: 'cinematic', label: 'Cinema', icon: Film },
];

const IMAGE_ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', shape: 'w-5 h-5' },
  { id: '16:9', label: '16:9', shape: 'w-7 h-4' },
  { id: '9:16', label: '9:16', shape: 'w-4 h-7' },
  { id: '4:3', label: '4:3', shape: 'w-6 h-5' },
  { id: '3:4', label: '3:4', shape: 'w-5 h-6' },
];

const IMAGE_QUICK_SUGGESTIONS = [
  'Product on marble',
  'Lifestyle scene',
  'Social media post',
  'Marketing banner',
  'Portrait photo',
];

const IMAGE_MODES = [
  {
    id: 'product',
    label: 'Product Shot',
    description: 'Best for product photography with reference images',
    icon: Camera,
  },
  {
    id: 'marketing',
    label: 'Marketing Creative',
    description: 'Text-to-image for ads, social content & marketing',
    icon: Sparkles,
  },
  {
    id: 'draft',
    label: 'Quick Draft',
    description: 'Fast generation for brainstorming & concepts',
    icon: Zap,
  },
];

const VIDEO_STYLE_PRESETS = [
  { id: 'cinematic', label: 'Cinematic', icon: Film },
  { id: 'documentary', label: 'Documentary', icon: Video },
  { id: 'animated', label: 'Animated', icon: Clapperboard },
  { id: 'product_showcase', label: 'Product', icon: Package },
  { id: 'social_media', label: 'Social', icon: Camera },
  { id: 'creative', label: 'Creative', icon: Zap },
];

const VIDEO_DURATIONS = [
  { id: '5', seconds: 5 },
  { id: '10', seconds: 10 },
  { id: '15', seconds: 15 },
  { id: '30', seconds: 30 },
];

const VIDEO_ASPECT_RATIOS = [
  { id: '16:9', label: 'Landscape', sublabel: '16:9' },
  { id: '9:16', label: 'Portrait', sublabel: '9:16' },
  { id: '1:1', label: 'Square', sublabel: '1:1' },
  { id: '4:5', label: 'Instagram', sublabel: '4:5' },
];

const VIDEO_QUICK_SUGGESTIONS = [
  'Product showcase',
  'Talking head',
  'Cinematic intro',
  'Social ad',
  'Explainer',
];

const LIBRARY_FILTER_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'recent', label: 'Recent' },
];

const LIBRARY_SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest' },
  { value: 'created_at', label: 'Oldest' },
  { value: 'name', label: 'Name A-Z' },
  { value: '-name', label: 'Name Z-A' },
];

const LIBRARY_ITEMS = [
  { id: '1', name: 'Product Hero Shot', content_type: 'image', created_at: '2026-02-08', prompt: 'Professional product shot on marble surface', style: 'photorealistic', gradient: 'from-yellow-600 to-amber-800' },
  { id: '2', name: 'Social Ad Campaign', content_type: 'image', created_at: '2026-02-07', prompt: 'Abstract geometric brand pattern', style: 'abstract', gradient: 'from-violet-600 to-purple-900' },
  { id: '3', name: 'Product Launch Teaser', content_type: 'video', created_at: '2026-02-06', prompt: 'Cinematic product launch video', style: 'cinematic', duration: 15, gradient: 'from-emerald-600 to-teal-800' },
  { id: '4', name: 'Email Banner v3', content_type: 'image', created_at: '2026-02-05', prompt: 'Clean email header with gradient', style: 'minimalist', gradient: 'from-rose-600 to-pink-900' },
  { id: '5', name: 'Instagram Carousel', content_type: 'image', created_at: '2026-02-04', prompt: 'LinkedIn carousel data visual', style: 'digital_art', gradient: 'from-indigo-600 to-blue-900' },
  { id: '6', name: 'Feature Walkthrough', content_type: 'video', created_at: '2026-02-03', prompt: 'Explainer video for product features', style: 'explainer', duration: 30, gradient: 'from-amber-600 to-orange-800' },
  { id: '7', name: 'Brand Pattern Pack', content_type: 'image', created_at: '2026-02-02', prompt: 'Minimalist icon set for landing page', style: 'illustration', gradient: 'from-cyan-600 to-teal-800' },
  { id: '8', name: 'Testimonial Edit', content_type: 'video', created_at: '2026-02-01', prompt: 'Customer testimonial compilation', style: 'documentary', duration: 45, gradient: 'from-pink-600 to-rose-900' },
  { id: '9', name: 'Blog Header Image', content_type: 'image', created_at: '2026-01-31', prompt: 'Abstract tech illustration for blog', style: 'illustration', gradient: 'from-sky-600 to-blue-900' },
  { id: '10', name: 'Social Reel Cut', content_type: 'video', created_at: '2026-01-30', prompt: 'Quick social media reel', style: 'social', duration: 10, gradient: 'from-lime-600 to-green-800' },
];

// =====================================================================================
// SHARED SUB-COMPONENTS
// =====================================================================================

function BrandingSection({ icon: Icon, title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-[20px] bg-zinc-900/50 border border-zinc-800/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors cursor-default"
      >
        <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <Icon className="w-4 h-4 text-yellow-400" />
        </div>
        <span className="text-white font-semibold text-sm flex-1">{title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PillSelect({ options, value }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <span
          key={opt.value}
          className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all cursor-default ${
            value === opt.value
              ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400'
              : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400'
          }`}
        >
          {opt.label}
        </span>
      ))}
    </div>
  );
}

function FontPickerDisplay({ value, label }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/60 cursor-default">
        <span className="text-white text-sm" style={{ fontFamily: value }}>{value}</span>
        <ChevronDown className="w-4 h-4 text-zinc-500" />
      </div>
    </div>
  );
}

function ChipDisplay({ items, variant = 'yellow' }) {
  const colors = variant === 'red'
    ? 'bg-red-500/10 text-red-400 border-red-500/20'
    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';

  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span
          key={item}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border cursor-default ${colors}`}
        >
          {item}
          <X className="w-3 h-3" />
        </span>
      ))}
    </div>
  );
}

// =====================================================================================
// 1. DemoCreateBranding
// =====================================================================================

export function DemoCreateBranding({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const brandData = {
    colors: BRAND_COLORS,
    typography: { primary_font: 'Inter', secondary_font: 'Roboto' },
    voice: {
      tone: 'professional',
      keywords: ['innovative', 'reliable', 'modern'],
      style_guide: 'Use clear, concise language. Avoid jargon unless speaking to technical audiences.',
      sample_copy: 'We build tools that empower teams to do their best work.',
    },
    visual_style: {
      mood: 'modern',
      image_style: 'clean',
      preferred_themes: ['tech', 'collaboration', 'growth'],
      avoid_themes: ['cluttered', 'dark imagery'],
    },
  };

  const toneLabel = TONE_OPTIONS.find(t => t.value === brandData.voice.tone)?.label || brandData.voice.tone;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="min-h-screen bg-[#09090b]">
        <div className="w-full px-4 lg:px-6 py-5 space-y-5">

          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-default">
                <ChevronLeft className="w-3.5 h-3.5" />
                Create Studio
              </span>
              <div className="w-px h-5 bg-zinc-800" />
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <Paintbrush className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white leading-tight">Brand Identity Designer</h1>
                  <p className="text-[11px] text-zinc-500">Complete Brand Kits</p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Brand Preview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-[20px] bg-zinc-900/50 border border-yellow-500/10 shadow-[0_0_40px_-12px_rgba(234,179,8,0.06)] p-5"
          >
            <div className="flex items-center gap-6 flex-wrap">
              {/* Logo placeholder */}
              <div className="w-16 h-16 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center overflow-hidden shrink-0">
                <ImageIcon className="w-5 h-5 text-zinc-600" />
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-2">
                {Object.entries(brandData.colors).map(([key, color]) => (
                  <div
                    key={key}
                    className="w-8 h-8 rounded-full border-2 border-zinc-800"
                    style={{ backgroundColor: color }}
                    title={`${COLOR_LABELS[key]}: ${color}`}
                  />
                ))}
              </div>

              {/* Typography preview */}
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-bold text-white truncate" style={{ fontFamily: brandData.typography.primary_font }}>
                  {brandData.typography.primary_font}
                </p>
                <p className="text-xs text-zinc-400 truncate" style={{ fontFamily: brandData.typography.secondary_font }}>
                  Body text in {brandData.typography.secondary_font}
                </p>
              </div>

              {/* Tone badge */}
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 capitalize shrink-0">
                {toneLabel}
              </span>
            </div>
          </motion.div>

          {/* Section 1: Logos */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <BrandingSection icon={ImageIcon} title="Brand Identity (Logos)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Primary Logo', 'Secondary Logo', 'Icon'].map((label) => (
                  <div key={label} className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400">{label}</p>
                    <div className="aspect-video bg-zinc-800/30 rounded-xl border-2 border-dashed border-zinc-700/60 flex flex-col items-center justify-center gap-2 cursor-default">
                      <Camera className="w-5 h-5 text-zinc-600" />
                      <span className="text-xs text-zinc-500">Drop or click</span>
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      {label === 'Primary Logo' ? 'Main logo for headers and documents' :
                       label === 'Secondary Logo' ? 'Alternative for dark/light backgrounds' :
                       'Square icon for favicons and apps'}
                    </p>
                  </div>
                ))}
              </div>
            </BrandingSection>
          </motion.div>

          {/* Section 2: Colors */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <BrandingSection icon={Palette} title="Color Palette">
              <div className="flex items-start gap-5 flex-wrap">
                {Object.entries(brandData.colors).map(([key, color]) => (
                  <div key={key} className="flex flex-col items-center gap-2 min-w-[72px]">
                    <div
                      className="w-14 h-14 rounded-full border-2 border-zinc-700/60 shadow-lg cursor-default"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[11px] text-zinc-500 capitalize">{COLOR_LABELS[key]}</span>
                    <span className="w-20 text-center text-[11px] font-mono text-zinc-300 bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-1.5 py-1">
                      {color}
                    </span>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-5 p-4 rounded-xl border border-zinc-700/40 bg-zinc-800/30">
                <h4 className="text-sm font-bold mb-2 text-white">Preview Header</h4>
                <p className="text-xs mb-3 text-zinc-400">This is how your brand colors will look in generated content.</p>
                <div className="flex gap-2 flex-wrap">
                  {['primary', 'secondary', 'accent'].map(key => (
                    <span
                      key={key}
                      className="px-4 py-1.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: brandData.colors[key], color: '#fff' }}
                    >
                      {COLOR_LABELS[key]}
                    </span>
                  ))}
                </div>
              </div>
            </BrandingSection>
          </motion.div>

          {/* Section 3: Typography */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <BrandingSection icon={Type} title="Typography">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FontPickerDisplay label="Heading Font" value={brandData.typography.primary_font} />
                <FontPickerDisplay label="Body Font" value={brandData.typography.secondary_font} />
              </div>
              <div className="mt-4 p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/40 space-y-1.5">
                <h4
                  className="text-lg font-bold text-white"
                  style={{ fontFamily: brandData.typography.primary_font }}
                >
                  Your Heading
                </h4>
                <p
                  className="text-sm text-zinc-400 leading-relaxed"
                  style={{ fontFamily: brandData.typography.secondary_font }}
                >
                  Your body text looks like this. It should be easy to read and reflect your brand personality across all generated content.
                </p>
              </div>
            </BrandingSection>
          </motion.div>

          {/* Section 4: Voice & Tone */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <BrandingSection icon={MessageSquare} title="Voice & Tone">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Tone</p>
                  <PillSelect options={TONE_OPTIONS} value={brandData.voice.tone} />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Keywords</p>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        readOnly
                        placeholder="Add a keyword..."
                        className="flex-1 bg-zinc-800/50 border border-zinc-700/60 text-white text-sm rounded-xl px-4 py-2.5 cursor-default focus:outline-none"
                      />
                      <span className="shrink-0 p-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/60 text-zinc-400 cursor-default">
                        <Plus className="w-4 h-4" />
                      </span>
                    </div>
                    <ChipDisplay items={brandData.voice.keywords} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1.5">Style Guide</p>
                  <div className="bg-zinc-800/50 border border-zinc-700/60 text-zinc-300 text-sm min-h-[80px] rounded-xl p-3 cursor-default">
                    {brandData.voice.style_guide}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1.5">Sample Copy</p>
                  <div className="bg-zinc-800/50 border border-zinc-700/60 text-zinc-300 text-sm min-h-[100px] rounded-xl p-3 cursor-default">
                    {brandData.voice.sample_copy}
                  </div>
                </div>
              </div>
            </BrandingSection>
          </motion.div>

          {/* Section 5: Visual Style */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <BrandingSection icon={Sparkles} title="Visual Style">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Mood</p>
                  <PillSelect options={MOOD_OPTIONS} value={brandData.visual_style.mood} />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1.5">Image Style</p>
                  <div className="bg-zinc-800/50 border border-zinc-700/60 text-zinc-300 text-sm rounded-xl px-4 py-2.5 cursor-default">
                    {brandData.visual_style.image_style}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-2">Preferred Themes</p>
                    <ChipDisplay items={brandData.visual_style.preferred_themes} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-2">Themes to Avoid</p>
                    <ChipDisplay items={brandData.visual_style.avoid_themes} variant="red" />
                  </div>
                </div>
              </div>
            </BrandingSection>
          </motion.div>

          {/* Bottom spacer */}
          <div className="h-8" />
        </div>
      </div>
    </motion.div>
  );
}

// =====================================================================================
// 2. DemoCreateImages
// =====================================================================================

export function DemoCreateImages({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [selectedMode, setSelectedMode] = useState('marketing');
  const [selectedStyle, setSelectedStyle] = useState('photorealistic');
  const [aspectRatio, setAspectRatio] = useState('1:1');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="min-h-screen bg-[#09090b]">
        <div className="w-full px-4 lg:px-6 py-6 space-y-5">

          {/* Back nav + Header row */}
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
              <span className="p-2.5 rounded-full border bg-zinc-900/50 border-zinc-800/60 text-zinc-500 cursor-default">
                <History className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Hero Prompt Area */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[20px] bg-zinc-900/50 border-zinc-800/60 border p-5"
          >
            <div className="min-h-[80px] text-base text-zinc-600 cursor-default">
              Describe the image you want to create...
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/40">
              <div className="flex flex-wrap gap-1.5">
                {IMAGE_QUICK_SUGGESTIONS.map(chip => (
                  <span
                    key={chip}
                    className="px-3 py-1 text-xs rounded-full bg-zinc-800/60 border-zinc-700/40 text-zinc-400 border cursor-default"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-zinc-600 flex-shrink-0 ml-3">0/1000</span>
            </div>
          </motion.div>

          {/* Mode Selector */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="grid grid-cols-3 gap-3"
          >
            {IMAGE_MODES.map(mode => {
              const IconComp = mode.icon;
              const isSelected = selectedMode === mode.id;
              return (
                <span
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
                </span>
              );
            })}
          </motion.div>

          {/* Settings Row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-[20px] bg-zinc-900/50 border-zinc-800/60 border p-4"
          >
            <div className="flex flex-wrap items-start gap-6">
              {/* Style swatches */}
              <div className="space-y-1.5">
                <span className="text-zinc-500 text-[11px] uppercase tracking-wider">Style</span>
                <div className="flex gap-1.5">
                  {IMAGE_STYLE_PRESETS.map(style => {
                    const Ic = style.icon;
                    const isSel = selectedStyle === style.id;
                    return (
                      <span
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
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <span className="text-zinc-500 text-[11px] uppercase tracking-wider">Ratio</span>
                <div className="flex gap-1.5">
                  {IMAGE_ASPECT_RATIOS.map(ratio => {
                    const isSel = aspectRatio === ratio.id;
                    return (
                      <span
                        key={ratio.id}
                        onClick={() => setAspectRatio(ratio.id)}
                        title={ratio.label}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-default ${
                          isSel
                            ? 'bg-yellow-400 text-black'
                            : 'bg-zinc-800/40 text-zinc-500'
                        }`}
                      >
                        <div className={`border-2 rounded-sm ${isSel ? 'border-black' : 'border-current'} ${ratio.shape}`} />
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Generate Button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="flex items-center justify-center gap-3"
          >
            <span className="bg-zinc-800 text-zinc-600 font-bold rounded-full px-8 py-3 text-sm flex items-center gap-2 cursor-default">
              <Wand2 className="w-4 h-4" />
              Generate Image
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full border-zinc-700 text-zinc-400 border">
              ~$0.025
            </span>
          </motion.div>

          {/* Empty state */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-[20px] border border-dashed border-zinc-800/60 py-16 flex flex-col items-center justify-center"
          >
            <ImageIcon className="w-12 h-12 text-zinc-800 mb-3" />
            <p className="text-zinc-500 text-sm">Your generated image will appear here</p>
            <p className="text-zinc-700 text-xs mt-1">Enter a prompt and click Generate</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// =====================================================================================
// 3. DemoCreateVideos
// =====================================================================================

export function DemoCreateVideos({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [duration, setDuration] = useState('10');
  const [aspectRatio, setAspectRatio] = useState('16:9');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="min-h-screen bg-[#09090b]">
        <div className="w-full px-4 lg:px-6 py-5 space-y-5">

          {/* Back Nav + Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm text-zinc-500 cursor-default">
                <ArrowLeft className="w-4 h-4" />
                Create Studio
              </span>
              <div className="w-px h-5 bg-zinc-800" />
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <Clapperboard className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white leading-tight">Cinematic Video Studio</h1>
                  <p className="text-xs text-zinc-500">Kling v2.1 & Minimax</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-full border border-zinc-800/60 bg-zinc-900/50 text-zinc-400 cursor-default">
                <Clock className="w-4 h-4" />
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-sm font-medium text-zinc-400 border border-zinc-800/60 bg-zinc-900/50 cursor-default">
                Templates
              </span>
            </div>
          </div>

          {/* Hero Prompt Area */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[20px] bg-zinc-900/50 border border-zinc-800/60 p-5"
          >
            <div className="min-h-[100px] text-base text-zinc-600 cursor-default">
              Describe your video scene...
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/40">
              <div className="flex flex-wrap gap-1.5">
                {VIDEO_QUICK_SUGGESTIONS.map(s => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-full text-xs text-zinc-500 border border-zinc-800/60 cursor-default"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <span className="text-xs text-zinc-600">0/1000</span>
            </div>
          </motion.div>

          {/* Mode Selector (2 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <span className="text-left p-4 rounded-[20px] border transition-all border-yellow-500/30 bg-yellow-500/[0.03] cursor-default">
              <div className="flex items-center gap-3 mb-1.5">
                <Film className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-medium text-white">AI Video</span>
              </div>
              <p className="text-xs text-zinc-500 mb-2">Single-shot video from a text prompt</p>
              <div className="flex gap-1.5">
                {['Kling', 'Minimax', 'Luma'].map(m => (
                  <span key={m} className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">{m}</span>
                ))}
              </div>
            </span>
            <span className="text-left p-4 rounded-[20px] border border-zinc-800/60 bg-zinc-900/50 cursor-default">
              <div className="flex items-center gap-3 mb-1.5">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-medium text-white">AI Studio</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Pro</span>
              </div>
              <p className="text-xs text-zinc-500">Multi-shot storyboard with automatic assembly</p>
            </span>
          </div>

          {/* Settings Row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="space-y-4"
          >
            <div className="rounded-[20px] bg-zinc-900/50 border border-zinc-800/60 p-4 space-y-4">
              {/* Style */}
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider mb-2.5 block">Style</span>
                <div className="flex flex-wrap gap-1.5">
                  {VIDEO_STYLE_PRESETS.map(style => {
                    const Icon = style.icon;
                    return (
                      <span
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-default ${
                          selectedStyle === style.id
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                            : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {style.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Duration */}
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider mb-2.5 block">Duration</span>
                  <div className="flex gap-1.5">
                    {VIDEO_DURATIONS.map(dur => (
                      <span
                        key={dur.id}
                        onClick={() => setDuration(dur.id)}
                        className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all text-center cursor-default ${
                          duration === dur.id
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                            : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50'
                        }`}
                      >
                        {dur.seconds}s
                      </span>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider mb-2.5 block">Aspect Ratio</span>
                  <div className="flex gap-1.5">
                    {VIDEO_ASPECT_RATIOS.map(ratio => (
                      <span
                        key={ratio.id}
                        onClick={() => setAspectRatio(ratio.id)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-center transition-all cursor-default ${
                          aspectRatio === ratio.id
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                            : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50'
                        }`}
                      >
                        <span className="text-[10px]">{ratio.sublabel}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Context */}
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider mb-2.5 block">Context</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800/60 bg-zinc-900/50 text-sm text-zinc-300 cursor-default">
                      <Package className="w-3.5 h-3.5 text-yellow-400" />
                      Product
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-default">
                      <Palette className="w-3 h-3" />
                      Brand
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex flex-col items-center gap-2">
              <span className="px-8 py-3 rounded-full bg-zinc-800 text-zinc-600 font-semibold text-sm flex items-center gap-2 cursor-default">
                <Sparkles className="w-4 h-4" />
                Generate Video
              </span>
              <span className="text-xs text-zinc-600">
                ~10s video &middot; est. 1-3 min
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// =====================================================================================
// 4. DemoCreateLibrary
// =====================================================================================

export function DemoCreateLibrary({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('-created_at');
  const [sortOpen, setSortOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const filteredContent = filterType === 'all'
    ? LIBRARY_ITEMS
    : filterType === 'image'
    ? LIBRARY_ITEMS.filter(i => i.content_type === 'image')
    : filterType === 'video'
    ? LIBRARY_ITEMS.filter(i => i.content_type === 'video')
    : LIBRARY_ITEMS;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="min-h-screen bg-[#09090b]">
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">

          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm text-zinc-400 cursor-default">
                <ArrowLeft className="w-4 h-4" />
                Create Studio
              </span>
              <div className="w-px h-5 bg-zinc-800" />
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <FolderOpen className="w-4 h-4 text-yellow-400" />
                </div>
                <h1 className="text-lg font-semibold text-white">Content Library</h1>
                <span className="px-2 py-0.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                  {filteredContent.length} items
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex border border-zinc-800/60 rounded-full overflow-hidden">
                <span
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors cursor-default ${viewMode === 'grid' ? 'bg-yellow-500 text-black' : 'bg-zinc-900/50 text-zinc-400'}`}
                >
                  <Grid className="w-4 h-4" />
                </span>
                <span
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors cursor-default ${viewMode === 'list' ? 'bg-yellow-500 text-black' : 'bg-zinc-900/50 text-zinc-400'}`}
                >
                  <List className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                readOnly
                placeholder="Search by name, prompt, or tags..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900/50 border-zinc-800/60 text-white placeholder:text-zinc-500 border rounded-full focus:outline-none cursor-default"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {LIBRARY_FILTER_CHIPS.map(chip => {
                const isActive = filterType === chip.value;
                return (
                  <span
                    key={chip.value}
                    onClick={() => setFilterType(chip.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-default ${
                      isActive
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    {chip.label}
                  </span>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="relative ml-auto">
              <span
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-zinc-900/50 border-zinc-800/60 text-zinc-400 border cursor-default"
              >
                {LIBRARY_SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                <ChevronDown className="w-3 h-3" />
              </span>
              <AnimatePresence>
                {sortOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setSortOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-full mt-1 z-50 w-36 bg-zinc-900 border-zinc-800 border rounded-xl overflow-hidden shadow-xl"
                    >
                      {LIBRARY_SORT_OPTIONS.map(option => (
                        <span
                          key={option.value}
                          onClick={() => { setSortBy(option.value); setSortOpen(false); }}
                          className={`block w-full text-left px-3 py-2 text-xs transition-colors cursor-default ${
                            sortBy === option.value
                              ? 'bg-yellow-500/10 text-yellow-400'
                              : 'text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          {option.label}
                        </span>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex gap-4">
            {/* Grid / List */}
            <div className="flex-1 min-w-0">
              {viewMode === 'grid' ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5"
                >
                  {filteredContent.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25, delay: index * 0.02 }}
                      className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-800/40 cursor-default"
                      onClick={() => setPreviewItem(item)}
                    >
                      {/* Favorite heart */}
                      <span className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Heart className="w-5 h-5 text-white/70 drop-shadow-lg" />
                      </span>

                      {/* Selection checkbox */}
                      <span className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Square className="w-5 h-5 text-white/70 drop-shadow-lg" />
                      </span>

                      {/* Thumbnail placeholder */}
                      <div className={`w-full h-full bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                        {item.content_type === 'video' ? (
                          <Play className="w-8 h-8 text-white/20" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-white/20" />
                        )}
                      </div>

                      {/* Video play overlay */}
                      {item.content_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-80 group-hover:opacity-0 transition-opacity">
                            <Play className="w-4 h-4 text-white ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Hover bottom bar */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-center gap-1">
                          <span className="p-1.5 rounded-lg bg-white/10 cursor-default" title="Preview">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </span>
                          <span className="p-1.5 rounded-lg bg-white/10 cursor-default" title="Download">
                            <Download className="w-3.5 h-3.5 text-white" />
                          </span>
                          <span className="p-1.5 rounded-lg bg-white/10 cursor-default" title="Delete">
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                /* List View */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1.5"
                >
                  {filteredContent.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      onClick={() => setPreviewItem(item)}
                      className="group flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 cursor-default"
                    >
                      <span>
                        <Square className="w-4 h-4 text-zinc-600" />
                      </span>

                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                        <div className={`w-full h-full bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                          {item.content_type === 'video' ? (
                            <Play className="w-3 h-3 text-white/80" />
                          ) : (
                            <ImageIcon className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">{item.name}</h3>
                        <p className="text-xs text-zinc-500 truncate">{item.prompt}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                          item.content_type === 'video'
                            ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                            : 'border-zinc-700 text-zinc-400 bg-zinc-800/50'
                        }`}>
                          {item.content_type}
                        </span>
                        {item.duration && (
                          <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />{item.duration}s
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-zinc-600 hidden md:block whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </span>

                      <span className="p-1">
                        <Heart className="w-4 h-4 text-zinc-700" />
                      </span>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="p-1 rounded cursor-default">
                          <Download className="w-3.5 h-3.5 text-zinc-400" />
                        </span>
                        <span className="p-1 rounded cursor-default">
                          <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Side Panel Preview */}
            <AnimatePresence>
              {previewItem && (
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="hidden lg:block w-[400px] flex-shrink-0"
                >
                  <div className="sticky top-4 rounded-[20px] bg-zinc-900/50 border-zinc-800/60 border overflow-hidden">
                    {/* Close */}
                    <span
                      onClick={() => setPreviewItem(null)}
                      className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/50 cursor-default"
                    >
                      <X className="w-4 h-4 text-white" />
                    </span>

                    {/* Media */}
                    <div className="aspect-square bg-zinc-950">
                      <div className={`w-full h-full bg-gradient-to-br ${previewItem.gradient} flex items-center justify-center`}>
                        {previewItem.content_type === 'video' ? (
                          <Play className="w-12 h-12 text-white/20" />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-white/20" />
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{previewItem.name}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{formatDate(previewItem.created_at)}</p>
                      </div>

                      {/* Type badge */}
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                          previewItem.content_type === 'video'
                            ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                            : 'border-zinc-700 text-zinc-400 bg-zinc-800/50'
                        }`}>
                          {previewItem.content_type === 'video' ? <Video className="w-3 h-3 inline mr-1" /> : <ImageIcon className="w-3 h-3 inline mr-1" />}
                          {previewItem.content_type}
                        </span>
                        {previewItem.duration && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{previewItem.duration}s
                          </span>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="space-y-2">
                        <div className="p-2.5 bg-zinc-800/40 border-zinc-800/40 rounded-xl border">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Prompt</p>
                          <p className="text-xs text-zinc-300 leading-relaxed">{previewItem.prompt}</p>
                        </div>
                        {previewItem.style && (
                          <div className="p-2.5 bg-zinc-800/40 border-zinc-800/40 rounded-xl border">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Style</p>
                            <p className="text-xs text-zinc-300 capitalize">{previewItem.style.replace('_', ' ')}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 pt-1">
                        <span className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-yellow-500 text-black cursor-default">
                          <Download className="w-4 h-4" />
                          Download
                        </span>
                        <span className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-zinc-800/60 text-zinc-300 cursor-default">
                          <RefreshCw className="w-4 h-4" />
                          Regenerate
                        </span>
                        <span className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-red-900/30 text-red-400 cursor-default">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
