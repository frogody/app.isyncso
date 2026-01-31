import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@/components/context/UserContext';
import { BrandAssets } from '@/api/entities';
import { storage } from '@/api/supabaseClient';
import { toast } from 'sonner';
import {
  Palette,
  Upload,
  Type,
  MessageSquare,
  Sparkles,
  Save,
  Trash2,
  Plus,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreatePageTransition } from '@/components/create/ui';
import { MOTION_VARIANTS } from '@/tokens/create';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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
];

const MOOD_OPTIONS = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'bold', label: 'Bold' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'tech', label: 'Tech-focused' },
];

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat',
  'Source Sans Pro', 'Nunito', 'Raleway', 'Work Sans', 'Playfair Display',
  'Merriweather', 'DM Sans', 'Space Grotesk'
];

export default function CreateBranding() {
  const { user } = useUser();
  const [brandAsset, setBrandAsset] = useState(null);
  const [brandData, setBrandData] = useState(DEFAULT_BRAND_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [newAvoidTheme, setNewAvoidTheme] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
      toast.success('Brand settings saved');
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
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasChanges(true);
  }, []);

  const handleLogoUpload = async (e, logoType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const ext = file.name.split('.').pop();
      const path = `${user?.company_id || 'public'}/logos/${logoType}/${fileId}.${ext}`;

      const result = await storage.upload(BRAND_BUCKET, path, file);

      const newLogo = {
        id: fileId,
        type: logoType,
        name: file.name,
        url: result.url,
        path: result.path,
        uploadedAt: new Date().toISOString()
      };

      const existingIndex = brandData.logos.findIndex(l => l.type === logoType);
      let updatedLogos;
      if (existingIndex >= 0) {
        updatedLogos = [...brandData.logos];
        updatedLogos[existingIndex] = newLogo;
      } else {
        updatedLogos = [...brandData.logos, newLogo];
      }

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

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const keywords = [...(brandData.voice.keywords || []), newKeyword.trim()];
    updateField('voice', 'keywords', keywords);
    setNewKeyword('');
  };

  const removeKeyword = (keyword) => {
    const keywords = brandData.voice.keywords.filter(k => k !== keyword);
    updateField('voice', 'keywords', keywords);
  };

  const addTheme = (isAvoid = false) => {
    const theme = isAvoid ? newAvoidTheme : newTheme;
    if (!theme.trim()) return;

    const field = isAvoid ? 'avoid_themes' : 'preferred_themes';
    const themes = [...(brandData.visual_style[field] || []), theme.trim()];
    updateField('visual_style', field, themes);

    if (isAvoid) {
      setNewAvoidTheme('');
    } else {
      setNewTheme('');
    }
  };

  const removeTheme = (theme, isAvoid = false) => {
    const field = isAvoid ? 'avoid_themes' : 'preferred_themes';
    const themes = brandData.visual_style[field].filter(t => t !== theme);
    updateField('visual_style', field, themes);
  };

  const getLogo = (type) => brandData.logos.find(l => l.type === type);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <CreatePageTransition>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Palette className="w-5 h-5 text-cyan-400" />
              </div>
              Brand Assets
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Configure your brand identity for AI-generated content</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">Unsaved changes</span>}
            {saving && <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">Saving...</span>}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveBrandAssets}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-2 h-10 px-6 text-sm font-medium rounded-full bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </motion.button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Tabs defaultValue="logos" className="space-y-4">
            <TabsList className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-1">
              <TabsTrigger value="logos" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-lg">
                <ImageIcon className="w-4 h-4 mr-2" />
                Logos
              </TabsTrigger>
              <TabsTrigger value="colors" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-lg">
                <Palette className="w-4 h-4 mr-2" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="typography" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-lg">
                <Type className="w-4 h-4 mr-2" />
                Typography
              </TabsTrigger>
              <TabsTrigger value="voice" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-lg">
                <MessageSquare className="w-4 h-4 mr-2" />
                Voice & Tone
              </TabsTrigger>
              <TabsTrigger value="visual" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Visual Style
              </TabsTrigger>
            </TabsList>

            {/* Logos Tab */}
            <TabsContent value="logos">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['primary', 'secondary', 'icon'].map((logoType, index) => {
                  const logo = getLogo(logoType);
                  return (
                    <motion.div
                      key={logoType}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4"
                    >
                      <div className="mb-4">
                        <h3 className="text-white font-semibold capitalize">{logoType} Logo</h3>
                        <p className="text-zinc-500 text-xs mt-1">
                          {logoType === 'primary' && 'Main logo for headers and documents'}
                          {logoType === 'secondary' && 'Alternative version for dark/light backgrounds'}
                          {logoType === 'icon' && 'Square icon for favicons and apps'}
                        </p>
                      </div>
                      <div>
                        {logo ? (
                          <div className="relative group">
                            <div className="aspect-video bg-zinc-800/50 rounded-xl flex items-center justify-center overflow-hidden border border-zinc-700/50">
                              <img
                                src={logo.url}
                                alt={logo.name}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleLogoUpload(e, logoType)}
                                  className="hidden"
                                  disabled={uploadingLogo}
                                />
                                <Button size="sm" variant="secondary" className="bg-zinc-700 hover:bg-zinc-600">
                                  Replace
                                </Button>
                              </label>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeLogo(logoType)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleLogoUpload(e, logoType)}
                              className="hidden"
                              disabled={uploadingLogo}
                            />
                            <div className="aspect-video bg-zinc-800/50 rounded-xl border-2 border-dashed border-zinc-700 hover:border-cyan-500/30 transition-colors flex flex-col items-center justify-center gap-2">
                              <Upload className="w-4 h-4 text-zinc-600" />
                              <span className="text-xs text-zinc-500">
                                {uploadingLogo ? 'Uploading...' : 'Click to upload'}
                              </span>
                            </div>
                          </label>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4"
              >
                <div className="mb-4">
                  <h3 className="text-white font-semibold">Brand Colors</h3>
                  <p className="text-zinc-500 text-xs mt-1">
                    Define your brand's color palette for consistent AI-generated content
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(brandData.colors).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-zinc-400 capitalize">{key.replace('_', ' ')}</Label>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-xl border border-zinc-700/50"
                          style={{ backgroundColor: value }}
                        />
                        <Input
                          type="color"
                          value={value}
                          onChange={(e) => updateField('colors', key, e.target.value)}
                          className="w-8 h-8 p-1 cursor-pointer bg-transparent border-0"
                        />
                      </div>
                      <Input
                        value={value}
                        onChange={(e) => updateField('colors', key, e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 text-white font-mono text-sm focus:border-cyan-500/30"
                        placeholder="#000000"
                      />
                    </div>
                  ))}
                </div>

                {/* Preview */}
                <div className="mt-4 p-4 rounded-xl border border-zinc-700/50" style={{ backgroundColor: brandData.colors.background }}>
                  <h3 className="text-base font-bold mb-2" style={{ color: brandData.colors.primary }}>
                    Preview Header
                  </h3>
                  <p style={{ color: brandData.colors.text }}>
                    This is how your brand colors will look in content.
                  </p>
                  <div className="flex gap-1 mt-2">
                    <div
                      className="px-4 py-2 rounded-xl font-medium transition-transform"
                      style={{ backgroundColor: brandData.colors.primary, color: brandData.colors.background }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="px-4 py-2 rounded-xl font-medium transition-transform"
                      style={{ backgroundColor: brandData.colors.secondary, color: brandData.colors.background }}
                    >
                      Secondary Button
                    </div>
                    <div
                      className="px-4 py-2 rounded-xl font-medium transition-transform"
                      style={{ backgroundColor: brandData.colors.accent, color: brandData.colors.background }}
                    >
                      Accent Button
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Typography Tab */}
            <TabsContent value="typography">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4"
              >
                <div className="mb-4">
                  <h3 className="text-white font-semibold">Typography</h3>
                  <p className="text-zinc-500 text-xs mt-1">
                    Select fonts and styles for your brand
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400">Primary Font</Label>
                      <Select
                        value={brandData.typography.primary_font}
                        onValueChange={(value) => updateField('typography', 'primary_font', value)}
                      >
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {FONT_OPTIONS.map((font) => (
                            <SelectItem key={font} value={font} className="text-white hover:bg-zinc-800">
                              <span style={{ fontFamily: font }}>{font}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-zinc-400">Secondary Font</Label>
                      <Select
                        value={brandData.typography.secondary_font}
                        onValueChange={(value) => updateField('typography', 'secondary_font', value)}
                      >
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {FONT_OPTIONS.map((font) => (
                            <SelectItem key={font} value={font} className="text-white hover:bg-zinc-800">
                              <span style={{ fontFamily: font }}>{font}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50 space-y-2">
                    <h3
                      className="text-lg font-bold text-white"
                      style={{ fontFamily: brandData.typography.primary_font }}
                    >
                      Heading in {brandData.typography.primary_font}
                    </h3>
                    <p
                      className="text-zinc-300"
                      style={{ fontFamily: brandData.typography.secondary_font }}
                    >
                      Body text in {brandData.typography.secondary_font}. This is how your content will appear
                      when using these font selections.
                    </p>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Voice & Tone Tab */}
            <TabsContent value="voice">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4"
              >
                <div className="mb-4">
                  <h3 className="text-white font-semibold">Voice & Tone</h3>
                  <p className="text-zinc-500 text-xs mt-1">
                    Define how your brand should sound in AI-generated content
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400">Tone</Label>
                      <Select
                        value={brandData.voice.tone}
                        onValueChange={(value) => updateField('voice', 'tone', value)}
                      >
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {TONE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white hover:bg-zinc-800">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-zinc-400">Brand Keywords</Label>
                      <div className="flex gap-1">
                        <Input
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                          placeholder="Add a keyword..."
                          className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500/30"
                        />
                        <Button onClick={addKeyword} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {brandData.voice.keywords?.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="secondary"
                            className="bg-cyan-500/10 text-cyan-400 cursor-pointer hover:bg-cyan-500/20 transition-colors"
                            onClick={() => removeKeyword(keyword)}
                          >
                            {keyword}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400">Style Guide</Label>
                    <Textarea
                      value={brandData.voice.style_guide}
                      onChange={(e) => updateField('voice', 'style_guide', e.target.value)}
                      placeholder="Describe your brand's writing style, preferred phrases, things to avoid..."
                      className="bg-zinc-800/50 border-zinc-700 text-white min-h-[80px] focus:border-cyan-500/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400">Sample Copy</Label>
                    <Textarea
                      value={brandData.voice.sample_copy}
                      onChange={(e) => updateField('voice', 'sample_copy', e.target.value)}
                      placeholder="Paste examples of your brand's writing that represent the ideal tone..."
                      className="bg-zinc-800/50 border-zinc-700 text-white min-h-[120px] focus:border-cyan-500/30"
                    />
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Visual Style Tab */}
            <TabsContent value="visual">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4"
              >
                <div className="mb-4">
                  <h3 className="text-white font-semibold">Visual Style</h3>
                  <p className="text-zinc-500 text-xs mt-1">
                    Define the visual aesthetic for AI-generated images and videos
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400">Overall Mood</Label>
                      <Select
                        value={brandData.visual_style.mood}
                        onValueChange={(value) => updateField('visual_style', 'mood', value)}
                      >
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {MOOD_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white hover:bg-zinc-800">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-zinc-400">Image Style</Label>
                      <Input
                        value={brandData.visual_style.image_style}
                        onChange={(e) => updateField('visual_style', 'image_style', e.target.value)}
                        placeholder="e.g., clean, minimal, vibrant..."
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400">Preferred Themes</Label>
                      <div className="flex gap-1">
                        <Input
                          value={newTheme}
                          onChange={(e) => setNewTheme(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTheme(false)}
                          placeholder="Add a theme..."
                          className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500/30"
                        />
                        <Button onClick={() => addTheme(false)} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {brandData.visual_style.preferred_themes?.map((theme) => (
                          <Badge
                            key={theme}
                            variant="secondary"
                            className="bg-cyan-500/10 text-cyan-400 cursor-pointer hover:bg-cyan-500/20 transition-colors"
                            onClick={() => removeTheme(theme, false)}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            {theme}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-zinc-400">Themes to Avoid</Label>
                      <div className="flex gap-1">
                        <Input
                          value={newAvoidTheme}
                          onChange={(e) => setNewAvoidTheme(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTheme(true)}
                          placeholder="Add a theme to avoid..."
                          className="bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500/30"
                        />
                        <Button onClick={() => addTheme(true)} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {brandData.visual_style.avoid_themes?.map((theme) => (
                          <Badge
                            key={theme}
                            variant="secondary"
                            className="bg-red-500/20 text-red-400 cursor-pointer hover:bg-red-500/30 transition-colors"
                            onClick={() => removeTheme(theme, true)}
                          >
                            <X className="w-3 h-3 mr-1" />
                            {theme}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </CreatePageTransition>
  );
}
