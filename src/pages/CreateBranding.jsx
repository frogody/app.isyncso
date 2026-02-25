import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/components/context/UserContext';
import { BrandAssets } from '@/api/entities';
import { storage } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import {
  Palette,
  Upload,
  Type,
  MessageSquare,
  Sparkles,
  Trash2,
  Plus,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronLeft,
  Paintbrush,
  Camera,
  Sun,
  Moon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CreatePageTransition } from '@/components/create/ui';
import { useTheme } from '@/contexts/GlobalThemeContext';

const BRAND_BUCKET = 'brand-assets';

const DEFAULT_BRAND_DATA = {
  logos: [],
  colors: {
    primary: '#22d3ee',
    secondary: '#f59e0b',
    accent: '#8b5cf6',
    background: '#0a0a0a',
    text: '#ffffff'
  },
  typography: {
    primary_font: 'Inter',
    secondary_font: 'Roboto',
    heading_weight: '700',
    body_weight: '400'
  },
  voice: {
    tone: 'professional',
    keywords: [],
    style_guide: '',
    sample_copy: ''
  },
  visual_style: {
    mood: 'modern',
    image_style: 'clean',
    preferred_themes: [],
    avoid_themes: []
  }
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
  'Merriweather', 'DM Sans', 'Space Grotesk'
];

const COLOR_LABELS = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  background: 'Background',
  text: 'Text',
};

// --- Section Card (always visible) ---
function Section({ icon: Icon, title, children }) {
  const { ct } = useTheme();

  return (
    <div className={`rounded-[20px] ${ct('bg-white', 'bg-zinc-900/50')} border ${ct('border-slate-200', 'border-zinc-800/60')} overflow-hidden`}>
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <Icon className="w-4 h-4 text-yellow-400" />
        </div>
        <span className={`${ct('text-slate-900', 'text-white')} font-semibold text-sm`}>{title}</span>
      </div>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </div>
  );
}

// --- Logo Upload Slot ---
function LogoSlot({ logo, logoType, label, description, onUpload, onRemove, uploading }) {
  const { ct } = useTheme();
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) onUpload({ target: { files: [file] } }, logoType);
  };

  return (
    <div className="space-y-2">
      <p className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-400')}`}>{label}</p>
      {logo ? (
        <div className={`relative group aspect-video ${ct('bg-slate-50', 'bg-zinc-800/50')} rounded-xl border ${ct('border-slate-200', 'border-zinc-700/50')} flex items-center justify-center overflow-hidden`}>
          <img src={logo.url} alt={logo.name} className="max-w-full max-h-full object-contain" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={(e) => onUpload(e, logoType)} className="hidden" disabled={uploading} />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-zinc-700 text-white hover:bg-zinc-600 transition-colors">
                Replace
              </span>
            </label>
            <button
              onClick={() => onRemove(logoType)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <label
          className="cursor-pointer block"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input type="file" accept="image/*" onChange={(e) => onUpload(e, logoType)} className="hidden" disabled={uploading} />
          <div className={`aspect-video ${ct('bg-slate-50', 'bg-zinc-800/30')} rounded-xl border-2 border-dashed ${ct('border-slate-300', 'border-zinc-700/60')} hover:border-yellow-500/40 transition-colors flex flex-col items-center justify-center gap-2`}>
            <Camera className={`w-5 h-5 ${ct('text-slate-400', 'text-zinc-600')}`} />
            <span className={`text-xs ${ct('text-slate-500', 'text-zinc-500')}`}>{uploading ? 'Uploading...' : 'Drop or click'}</span>
          </div>
        </label>
      )}
      <p className={`text-[11px] ${ct('text-slate-400', 'text-zinc-600')}`}>{description}</p>
    </div>
  );
}

// --- Font Picker Popover ---
function FontPicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const { ct } = useTheme();

  return (
    <div className="space-y-2">
      <p className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-400')}`}>{label}</p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl ${ct('bg-slate-50', 'bg-zinc-800/50')} border ${ct('border-slate-200', 'border-zinc-700/60')} ${ct('hover:border-slate-300', 'hover:border-zinc-600')} transition-colors text-left`}
        >
          <span className={`${ct('text-slate-900', 'text-white')} text-sm`} style={{ fontFamily: value }}>{value}</span>
          <ChevronDown className={`w-4 h-4 ${ct('text-slate-500', 'text-zinc-500')}`} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className={`absolute z-30 top-full mt-1 w-full max-h-56 overflow-y-auto rounded-xl ${ct('bg-white', 'bg-zinc-900')} border ${ct('border-slate-200', 'border-zinc-700/60')} shadow-xl`}
            >
              {FONT_OPTIONS.map(font => (
                <button
                  key={font}
                  type="button"
                  onClick={() => { onChange(font); setOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm ${ct('hover:bg-slate-50', 'hover:bg-white/[0.04]')} transition-colors ${font === value ? 'text-yellow-400 bg-yellow-500/5' : ct('text-slate-600', 'text-zinc-300')}`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Pill Select ---
function PillSelect({ options, value, onChange }) {
  const { ct } = useTheme();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all ${
            value === opt.value
              ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400'
              : `${ct('bg-slate-50', 'bg-zinc-800/40')} ${ct('border-slate-200', 'border-zinc-700/50')} ${ct('text-slate-500', 'text-zinc-400')} ${ct('hover:border-slate-300', 'hover:border-zinc-600')} ${ct('hover:text-slate-700', 'hover:text-zinc-300')}`
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// --- Chip Input ---
function ChipInput({ items, onAdd, onRemove, placeholder, variant = 'yellow' }) {
  const [val, setVal] = useState('');
  const { ct } = useTheme();
  const colors = variant === 'red'
    ? 'bg-red-500/10 text-red-400 border-red-500/20'
    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';

  const handleAdd = () => {
    if (!val.trim()) return;
    onAdd(val.trim());
    setVal('');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder={placeholder}
          className={`${ct('bg-slate-50', 'bg-zinc-800/50')} ${ct('border-slate-200', 'border-zinc-700/60')} ${ct('text-slate-900', 'text-white')} text-sm focus:border-yellow-500/40 rounded-xl`}
        />
        <button
          type="button"
          onClick={handleAdd}
          className={`shrink-0 p-2.5 rounded-xl ${ct('bg-slate-50', 'bg-zinc-800/50')} border ${ct('border-slate-200', 'border-zinc-700/60')} ${ct('text-slate-500', 'text-zinc-400')} ${ct('hover:text-slate-900', 'hover:text-white')} ${ct('hover:border-slate-300', 'hover:border-zinc-600')} transition-colors`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {items?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map(item => (
            <span
              key={item}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${colors}`}
              onClick={() => onRemove(item)}
            >
              {item}
              <X className="w-3 h-3" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Google Font Loader ---
function useGoogleFont(fontName) {
  const loadedRef = useRef(new Set());
  useEffect(() => {
    if (!fontName || loadedRef.current.has(fontName)) return;
    const id = `gfont-${fontName.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) {
      loadedRef.current.add(fontName);
      return;
    }
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
    document.head.appendChild(link);
    loadedRef.current.add(fontName);
  }, [fontName]);
}

// =====================
// MAIN COMPONENT
// =====================
export default function CreateBranding() {
  const { user } = useUser();
  const { theme, toggleTheme, ct } = useTheme();
  const [brandAsset, setBrandAsset] = useState(null);
  const [brandData, setBrandData] = useState(DEFAULT_BRAND_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Load Google Fonts for live preview
  useGoogleFont(brandData.typography.primary_font);
  useGoogleFont(brandData.typography.secondary_font);

  // Load brand assets
  useEffect(() => {
    const loadBrandAssets = async () => {
      if (!user?.company_id) return;
      try {
        setLoading(true);
        const assets = await BrandAssets.filter({ company_id: user.company_id });
        if (assets && assets.length > 0) {
          setBrandAsset(assets[0]);
          setBrandData({
            logos: assets[0].logos || [],
            colors: { ...DEFAULT_BRAND_DATA.colors, ...assets[0].colors },
            typography: { ...DEFAULT_BRAND_DATA.typography, ...assets[0].typography },
            voice: { ...DEFAULT_BRAND_DATA.voice, ...assets[0].voice },
            visual_style: { ...DEFAULT_BRAND_DATA.visual_style, ...assets[0].visual_style }
          });
        }
      } catch (error) {
        console.error('Failed to load brand assets:', error);
        toast.error('Failed to load brand assets');
      } finally {
        setLoading(false);
      }
    };
    loadBrandAssets();
  }, [user?.company_id]);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasChanges || !user?.company_id) return;
    const timer = setTimeout(async () => {
      await saveBrandAssets();
    }, 2000);
    return () => clearTimeout(timer);
  }, [brandData, hasChanges]);

  const saveBrandAssets = async () => {
    if (!user?.company_id) return;
    try {
      setSaving(true);
      const data = {
        company_id: user.company_id,
        logos: brandData.logos,
        colors: brandData.colors,
        typography: brandData.typography,
        voice: brandData.voice,
        visual_style: brandData.visual_style
      };
      if (brandAsset?.id) {
        await BrandAssets.update(brandAsset.id, data);
      } else {
        const newAsset = await BrandAssets.create(data);
        setBrandAsset(newAsset);
      }
      setHasChanges(false);
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2500);
    } catch (error) {
      console.error('Failed to save brand assets:', error);
      toast.error('Failed to save brand settings');
    } finally {
      setSaving(false);
    }
  };

  const updateField = useCallback((section, field, value) => {
    setBrandData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
    setHasChanges(true);
  }, []);

  const handleLogoUpload = async (e, logoType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File size must be less than 5MB'); return; }
    try {
      setUploadingLogo(true);
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const ext = file.name.split('.').pop();
      const path = `${user?.company_id || 'public'}/logos/${logoType}/${fileId}.${ext}`;
      const result = await storage.upload(BRAND_BUCKET, path, file);
      const newLogo = { id: fileId, type: logoType, name: file.name, url: result.url, path: result.path, uploadedAt: new Date().toISOString() };
      const existingIndex = brandData.logos.findIndex(l => l.type === logoType);
      let updatedLogos;
      if (existingIndex >= 0) { updatedLogos = [...brandData.logos]; updatedLogos[existingIndex] = newLogo; }
      else { updatedLogos = [...brandData.logos, newLogo]; }
      setBrandData(prev => ({ ...prev, logos: updatedLogos }));
      setHasChanges(true);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = (logoType) => {
    const updatedLogos = brandData.logos.filter(l => l.type !== logoType);
    setBrandData(prev => ({ ...prev, logos: updatedLogos }));
    setHasChanges(true);
    toast.success('Logo removed');
  };

  const addKeyword = (keyword) => {
    const keywords = [...(brandData.voice.keywords || []), keyword];
    updateField('voice', 'keywords', keywords);
  };
  const removeKeyword = (keyword) => {
    updateField('voice', 'keywords', brandData.voice.keywords.filter(k => k !== keyword));
  };

  const addTheme = (theme, isAvoid = false) => {
    const field = isAvoid ? 'avoid_themes' : 'preferred_themes';
    const themes = [...(brandData.visual_style[field] || []), theme];
    updateField('visual_style', field, themes);
  };
  const removeTheme = (theme, isAvoid = false) => {
    const field = isAvoid ? 'avoid_themes' : 'preferred_themes';
    updateField('visual_style', field, brandData.visual_style[field].filter(t => t !== theme));
  };

  const getLogo = (type) => brandData.logos.find(l => l.type === type);

  if (loading) {
    return (
      <div className={`min-h-screen ${ct('bg-slate-50', 'bg-[#09090b]')} flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    );
  }

  const primaryLogo = getLogo('primary');
  const toneLabel = TONE_OPTIONS.find(t => t.value === brandData.voice.tone)?.label || brandData.voice.tone;

  return (
    <CreatePageTransition>
      <div className={`min-h-screen ${ct('bg-slate-50', 'bg-[#09090b]')}`}>
        <div className="w-full px-4 lg:px-6 py-5 space-y-5">

          {/* ---- Header Row ---- */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href={createPageUrl('Create')}
                className={`flex items-center gap-1.5 text-xs ${ct('text-slate-500', 'text-zinc-500')} ${ct('hover:text-slate-700', 'hover:text-zinc-300')} transition-colors`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Create Studio
              </a>
              <div className={`w-px h-5 ${ct('bg-slate-200', 'bg-zinc-800')}`} />
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <Paintbrush className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h1 className={`text-base font-semibold ${ct('text-slate-900', 'text-white')} leading-tight`}>Brand Identity Designer</h1>
                  <p className={`text-[11px] ${ct('text-slate-500', 'text-zinc-500')}`}>Complete Brand Kits</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className={ct('p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200', 'p-2 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}>
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <AnimatePresence mode="wait">
                {saving && (
                  <motion.span
                    key="saving"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="text-xs text-yellow-400/80 flex items-center gap-1.5"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </motion.span>
                )}
                {!saving && savedIndicator && (
                  <motion.span
                    key="saved"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="text-xs text-emerald-400/80 flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3" />
                    Saved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ---- AI Brand Builder CTA ---- */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <a
              href="/create/brand-builder/new"
              className={`group block rounded-[20px] ${ct('bg-gradient-to-r from-yellow-50 to-amber-50', 'bg-gradient-to-r from-yellow-400/[0.06] to-amber-400/[0.04]')} border ${ct('border-yellow-200', 'border-yellow-500/20')} p-5 transition-all hover:border-yellow-400/40 hover:shadow-[0_0_30px_-10px_rgba(234,179,8,0.15)]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/15 border border-yellow-400/25 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${ct('text-slate-900', 'text-white')} flex items-center gap-2`}>
                      AI Brand Builder
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-yellow-400 text-black rounded-full">New</span>
                    </h3>
                    <p className={`text-xs ${ct('text-slate-500', 'text-zinc-400')} mt-0.5`}>
                      Generate a complete brand identity in 8 steps — colors, typography, logo system, voice, and more.
                    </p>
                  </div>
                </div>
                <ChevronLeft className={`w-4 h-4 ${ct('text-slate-400', 'text-zinc-500')} rotate-180 group-hover:translate-x-1 transition-transform`} />
              </div>
            </a>
          </motion.div>

          {/* ---- Live Brand Preview ---- */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`rounded-[20px] ${ct('bg-white', 'bg-zinc-900/50')} border border-yellow-500/10 shadow-[0_0_40px_-12px_rgba(234,179,8,0.06)] p-5`}
          >
            <div className="flex items-center gap-6 flex-wrap">
              {/* Logo */}
              <div className={`w-16 h-16 rounded-xl ${ct('bg-slate-100', 'bg-zinc-800/60')} border ${ct('border-slate-200', 'border-zinc-700/40')} flex items-center justify-center overflow-hidden shrink-0`}>
                {primaryLogo ? (
                  <img src={primaryLogo.url} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <ImageIcon className={`w-5 h-5 ${ct('text-slate-400', 'text-zinc-600')}`} />
                )}
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-2">
                {Object.entries(brandData.colors).map(([key, color]) => (
                  <div
                    key={key}
                    className={`w-8 h-8 rounded-full border-2 ${ct('border-slate-200', 'border-zinc-800')}`}
                    style={{ backgroundColor: color }}
                    title={`${COLOR_LABELS[key]}: ${color}`}
                  />
                ))}
              </div>

              {/* Typography preview */}
              <div className="flex-1 min-w-[180px]">
                <p className={`text-sm font-bold ${ct('text-slate-900', 'text-white')} truncate`} style={{ fontFamily: brandData.typography.primary_font }}>
                  {brandData.typography.primary_font}
                </p>
                <p className={`text-xs ${ct('text-slate-500', 'text-zinc-400')} truncate`} style={{ fontFamily: brandData.typography.secondary_font }}>
                  Body text in {brandData.typography.secondary_font}
                </p>
              </div>

              {/* Tone badge */}
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 capitalize shrink-0">
                {toneLabel}
              </span>
            </div>
          </motion.div>

          {/* ---- Section 1: Logos ---- */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Section icon={ImageIcon} title="Brand Identity (Logos)">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <LogoSlot logo={getLogo('primary')} logoType="primary" label="Primary Logo" description="Main logo for headers and documents" onUpload={handleLogoUpload} onRemove={removeLogo} uploading={uploadingLogo} />
                <LogoSlot logo={getLogo('secondary')} logoType="secondary" label="Secondary Logo" description="Alternative for dark/light backgrounds" onUpload={handleLogoUpload} onRemove={removeLogo} uploading={uploadingLogo} />
                <LogoSlot logo={getLogo('icon')} logoType="icon" label="Icon" description="Square icon for favicons and apps" onUpload={handleLogoUpload} onRemove={removeLogo} uploading={uploadingLogo} />
              </div>
            </Section>
          </motion.div>

          {/* ---- Section 2: Colors ---- */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Section icon={Palette} title="Color Palette">
              <div className="flex items-start gap-5 flex-wrap">
                {Object.entries(brandData.colors).map(([key, color]) => (
                  <div key={key} className="flex flex-col items-center gap-2 min-w-[72px]">
                    <label className="relative cursor-pointer group">
                      <div
                        className={`w-14 h-14 rounded-full border-2 ${ct('border-slate-200', 'border-zinc-700/60')} ${ct('group-hover:border-slate-400', 'group-hover:border-zinc-500')} transition-colors shadow-lg`}
                        style={{ backgroundColor: color }}
                      />
                      <input
                        type="color"
                        value={color}
                        onChange={e => updateField('colors', key, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <span className={`text-[11px] ${ct('text-slate-500', 'text-zinc-500')} capitalize`}>{COLOR_LABELS[key]}</span>
                    <Input
                      value={color}
                      onChange={e => updateField('colors', key, e.target.value)}
                      className={`w-20 text-center text-[11px] font-mono ${ct('bg-slate-50', 'bg-zinc-800/50')} ${ct('border-slate-200', 'border-zinc-700/40')} ${ct('text-slate-600', 'text-zinc-300')} rounded-lg px-1.5 py-1 h-auto focus:border-yellow-500/40`}
                    />
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className={`mt-5 p-4 rounded-xl border ${ct('border-slate-200', 'border-zinc-700/40')} ${ct('bg-slate-50', 'bg-zinc-800/30')}`}>
                <h4 className={`text-sm font-bold mb-2 ${ct('text-slate-800', 'text-white')}`}>Preview Header</h4>
                <p className={`text-xs mb-3 ${ct('text-slate-500', 'text-zinc-400')}`}>This is how your brand colors will look in generated content.</p>
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
            </Section>
          </motion.div>

          {/* ---- Section 3: Typography ---- */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Section icon={Type} title="Typography">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FontPicker
                  label="Heading Font"
                  value={brandData.typography.primary_font}
                  onChange={v => updateField('typography', 'primary_font', v)}
                />
                <FontPicker
                  label="Body Font"
                  value={brandData.typography.secondary_font}
                  onChange={v => updateField('typography', 'secondary_font', v)}
                />
              </div>
              <div className={`mt-4 p-4 ${ct('bg-slate-50', 'bg-zinc-800/30')} rounded-xl border ${ct('border-slate-200', 'border-zinc-700/40')} space-y-1.5`}>
                <h4
                  className={`text-lg font-bold ${ct('text-slate-900', 'text-white')}`}
                  style={{ fontFamily: brandData.typography.primary_font }}
                >
                  Your Heading
                </h4>
                <p
                  className={`text-sm ${ct('text-slate-500', 'text-zinc-400')} leading-relaxed`}
                  style={{ fontFamily: brandData.typography.secondary_font }}
                >
                  Your body text looks like this. It should be easy to read and reflect your brand personality across all generated content.
                </p>
              </div>
            </Section>
          </motion.div>

          {/* ---- Section 4: Voice & Tone ---- */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Section icon={MessageSquare} title="Voice & Tone">
              <div className="space-y-4">
                <div>
                  <p className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-400')} mb-2`}>Tone</p>
                  <PillSelect
                    options={TONE_OPTIONS}
                    value={brandData.voice.tone}
                    onChange={v => updateField('voice', 'tone', v)}
                  />
                </div>
                <div>
                  <p className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-400')} mb-2`}>Keywords</p>
                  <ChipInput
                    items={brandData.voice.keywords}
                    onAdd={addKeyword}
                    onRemove={removeKeyword}
                    placeholder="Add a keyword..."
                  />
                </div>
                <div>
                  <p className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-400')} mb-1.5`}>Style Guide</p>
                  <Textarea
                    value={brandData.voice.style_guide}
                    onChange={e => updateField('voice', 'style_guide', e.target.value)}
                    placeholder="Describe your brand's writing style, preferred phrases, things to avoid..."
                    className={`${ct('bg-slate-50', 'bg-zinc-800/50')} ${ct('border-slate-200', 'border-zinc-700/60')} ${ct('text-slate-900', 'text-white')} text-sm min-h-[80px] rounded-xl focus:border-yellow-500/40`}
                  />
                </div>
                <div>
                  <p className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-400')} mb-1.5`}>Sample Copy</p>
                  <Textarea
                    value={brandData.voice.sample_copy}
                    onChange={e => updateField('voice', 'sample_copy', e.target.value)}
                    placeholder="Paste examples of your brand's writing that represent the ideal tone..."
                    className={`${ct('bg-slate-50', 'bg-zinc-800/50')} ${ct('border-slate-200', 'border-zinc-700/60')} ${ct('text-slate-900', 'text-white')} text-sm min-h-[100px] rounded-xl focus:border-yellow-500/40`}
                  />
                </div>
              </div>
            </Section>
          </motion.div>

          {/* ---- Section 5: Visual Style ---- */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Section icon={Sparkles} title="Visual Style">
              <div className="space-y-4">
                <div>
                  <p className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-400')} mb-2`}>Mood</p>
                  <PillSelect
                    options={MOOD_OPTIONS}
                    value={brandData.visual_style.mood}
                    onChange={v => updateField('visual_style', 'mood', v)}
                  />
                </div>
                <div>
                  <p className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-400')} mb-1.5`}>Image Style</p>
                  <Input
                    value={brandData.visual_style.image_style}
                    onChange={e => updateField('visual_style', 'image_style', e.target.value)}
                    placeholder="e.g., clean, minimal, vibrant..."
                    className={`${ct('bg-slate-50', 'bg-zinc-800/50')} ${ct('border-slate-200', 'border-zinc-700/60')} ${ct('text-slate-900', 'text-white')} text-sm rounded-xl focus:border-yellow-500/40`}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-400')} mb-2`}>Preferred Themes</p>
                    <ChipInput
                      items={brandData.visual_style.preferred_themes}
                      onAdd={t => addTheme(t, false)}
                      onRemove={t => removeTheme(t, false)}
                      placeholder="Add a theme..."
                    />
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${ct('text-slate-500', 'text-zinc-400')} mb-2`}>Themes to Avoid</p>
                    <ChipInput
                      items={brandData.visual_style.avoid_themes}
                      onAdd={t => addTheme(t, true)}
                      onRemove={t => removeTheme(t, true)}
                      placeholder="Add a theme to avoid..."
                      variant="red"
                    />
                  </div>
                </div>
              </div>
            </Section>
          </motion.div>

          {/* Bottom spacer */}
          <div className="h-8" />
        </div>
      </div>
    </CreatePageTransition>
  );
}
