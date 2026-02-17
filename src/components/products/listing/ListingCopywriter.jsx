import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Wand2, RefreshCw, Copy, Check, ChevronDown, Globe, Sparkles,
  Type, AlignLeft, List, Search, Loader2, Save, X, Plus, GripVertical,
  Eye, Code, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { code: 'EN', label: 'English', flag: 'EN' },
  { code: 'NL', label: 'Nederlands', flag: 'NL' },
  { code: 'DE', label: 'Deutsch', flag: 'DE' },
  { code: 'FR', label: 'Francais', flag: 'FR' },
];

const TONES = [
  { code: 'professional', label: 'Professional' },
  { code: 'casual', label: 'Casual' },
  { code: 'technical', label: 'Technical' },
  { code: 'luxury', label: 'Luxury' },
];

const MAX_BULLETS = 8;
const SEO_TITLE_MAX = 70;
const SEO_TITLE_IDEAL_MIN = 50;
const SEO_DESC_MAX = 160;
const SEO_DESC_IDEAL_MIN = 120;
const SEO_KEYWORDS_IDEAL = 5;

// ---------------------------------------------------------------------------
// Helper: clipboard copy with feedback
// ---------------------------------------------------------------------------

function useCopyToClipboard(timeout = 2000) {
  const [copiedField, setCopiedField] = useState(null);
  const timerRef = useRef(null);

  const copyToClipboard = useCallback((text, fieldName) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopiedField(null), timeout);
    });
  }, [timeout]);

  return { copiedField, copyToClipboard };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PillSelector({ options, value, onChange, label }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-medium text-zinc-400">{label}</span>
      )}
      <div className="flex items-center gap-1 rounded-lg bg-zinc-900/60 border border-white/10 p-0.5">
        {options.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => onChange(opt.code)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
              value === opt.code
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            )}
          >
            {opt.flag || opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CharCount({ current, max, idealMin }) {
  const isOver = max && current > max;
  const isIdeal = idealMin ? current >= idealMin && current <= max : !isOver;
  return (
    <span
      className={cn(
        'text-xs font-mono tabular-nums',
        isOver
          ? 'text-red-400'
          : isIdeal
            ? 'text-cyan-400'
            : 'text-zinc-500'
      )}
    >
      {current}{max ? `/${max}` : ''}
    </span>
  );
}

function WordCount({ text }) {
  const count = useMemo(() => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }, [text]);
  return (
    <span className="text-xs font-mono tabular-nums text-zinc-500">
      {count} words
    </span>
  );
}

function SectionHeader({ icon: Icon, label, right, className }) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-cyan-400" />
        <Label className="text-sm font-semibold text-zinc-200">{label}</Label>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

function TitleVariantCard({ variant, isSelected, onClick }) {
  const text = typeof variant === 'string' ? variant : variant.text || variant.title || '';
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all duration-200',
        'bg-zinc-900/40 backdrop-blur-sm',
        isSelected
          ? 'border-cyan-500/60 bg-cyan-500/5 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
          : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
      )}
    >
      <p className="text-sm text-zinc-200 leading-relaxed">{text}</p>
      <div className="mt-1.5 flex items-center justify-between">
        <CharCount current={text.length} max={SEO_TITLE_MAX} />
        {isSelected && (
          <Badge variant="info" size="xs">Selected</Badge>
        )}
      </div>
    </button>
  );
}

function SeoScoreBar({ label, value, min, max, unit = 'chars' }) {
  const isGood = value >= min && value <= max;
  const isOver = value > max;
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isGood ? 'bg-cyan-500' : isOver ? 'bg-red-500' : 'bg-zinc-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span
        className={cn(
          'text-xs font-mono tabular-nums w-16 text-right',
          isGood ? 'text-cyan-400' : isOver ? 'text-red-400' : 'text-zinc-500'
        )}
      >
        {value} {unit}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ListingCopywriter({
  product,
  details,
  listing,
  onSave,
  selectedChannel,
}) {
  const { t } = useTheme();
  const { copiedField, copyToClipboard } = useCopyToClipboard();

  // -- Controls state --
  const [language, setLanguage] = useState('EN');
  const [tone, setTone] = useState('professional');

  // -- Content state --
  const [title, setTitle] = useState(listing?.listing_title || '');
  const [titleVariants, setTitleVariants] = useState([]);
  const [description, setDescription] = useState(listing?.listing_description || '');
  const [descriptionMode, setDescriptionMode] = useState('edit'); // 'edit' | 'preview'
  const [bullets, setBullets] = useState(listing?.bullet_points || []);
  const [seoTitle, setSeoTitle] = useState(listing?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(listing?.seo_description || '');
  const [keywords, setKeywords] = useState(listing?.search_keywords || []);
  const [keywordInput, setKeywordInput] = useState('');

  // -- SEO section collapsed --
  const [seoExpanded, setSeoExpanded] = useState(false);

  // -- Loading states --
  const [generating, setGenerating] = useState(false);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingBullets, setGeneratingBullets] = useState(false);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [saving, setSaving] = useState(false);

  // -- Change tracking --
  const [hasChanges, setHasChanges] = useState(false);

  // Sync from listing prop when it changes
  useEffect(() => {
    if (listing) {
      setTitle(listing.listing_title || '');
      setDescription(listing.listing_description || '');
      setBullets(listing.bullet_points || []);
      setSeoTitle(listing.seo_title || '');
      setSeoDescription(listing.seo_description || '');
      setKeywords(listing.search_keywords || []);
      setHasChanges(false);
    }
  }, [listing]);

  // Track changes
  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  // -- Edge function request body builder --
  const buildRequestBody = useCallback(() => ({
    product_name: product?.name || '',
    product_description: product?.description || '',
    product_category: product?.category || '',
    product_specs: details?.specifications || details || {},
    product_price: product?.price,
    product_currency: product?.currency || 'EUR',
    product_brand: product?.brand || '',
    product_tags: product?.tags || [],
    product_ean: details?.ean || details?.barcode || '',
    channel: selectedChannel || 'generic',
    language,
    tone,
  }), [product, details, selectedChannel, language, tone]);

  // -----------------------------------------------------------------------
  // Generation handlers
  // -----------------------------------------------------------------------

  const generateCopy = useCallback(async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-listing-copy', {
        body: buildRequestBody(),
      });
      if (error) throw error;
      if (data?.listing) {
        const ai = data.listing;
        setTitleVariants(ai.titles || []);
        if (ai.titles?.[0]) {
          const firstTitle = typeof ai.titles[0] === 'string' ? ai.titles[0] : ai.titles[0].text || '';
          setTitle(firstTitle);
        }
        setDescription(ai.description || '');
        setBullets(ai.bullet_points || []);
        setSeoTitle(ai.seo_title || '');
        setSeoDescription(ai.seo_description || '');
        setKeywords(ai.search_keywords || []);
        setHasChanges(true);
        toast.success('AI copy generated successfully!');
      }
    } catch (err) {
      console.error('Copy generation failed:', err);
      toast.error('Failed to generate copy: ' + (err.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  }, [buildRequestBody]);

  const generateTitles = useCallback(async () => {
    setGeneratingTitles(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-listing-copy', {
        body: buildRequestBody(),
      });
      if (error) throw error;
      if (data?.listing?.titles) {
        setTitleVariants(data.listing.titles);
        toast.success('Title variants generated!');
      }
    } catch (err) {
      toast.error('Failed to generate titles: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingTitles(false);
    }
  }, [buildRequestBody]);

  const generateDescription = useCallback(async () => {
    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-listing-copy', {
        body: buildRequestBody(),
      });
      if (error) throw error;
      if (data?.listing?.description) {
        setDescription(data.listing.description);
        markChanged();
        toast.success('Description generated!');
      }
    } catch (err) {
      toast.error('Failed to generate description: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingDescription(false);
    }
  }, [buildRequestBody, markChanged]);

  const generateBullets = useCallback(async () => {
    setGeneratingBullets(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-listing-copy', {
        body: buildRequestBody(),
      });
      if (error) throw error;
      if (data?.listing?.bullet_points) {
        setBullets(data.listing.bullet_points);
        markChanged();
        toast.success('Bullet points generated!');
      }
    } catch (err) {
      toast.error('Failed to generate bullets: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingBullets(false);
    }
  }, [buildRequestBody, markChanged]);

  const generateSeo = useCallback(async () => {
    setGeneratingSeo(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-listing-copy', {
        body: buildRequestBody(),
      });
      if (error) throw error;
      if (data?.listing) {
        const ai = data.listing;
        if (ai.seo_title) setSeoTitle(ai.seo_title);
        if (ai.seo_description) setSeoDescription(ai.seo_description);
        if (ai.search_keywords) setKeywords(ai.search_keywords);
        markChanged();
        toast.success('SEO content generated!');
      }
    } catch (err) {
      toast.error('Failed to generate SEO: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingSeo(false);
    }
  }, [buildRequestBody, markChanged]);

  // -----------------------------------------------------------------------
  // Save / Discard
  // -----------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave({
        listing_title: title,
        listing_description: description,
        bullet_points: bullets,
        seo_title: seoTitle,
        seo_description: seoDescription,
        search_keywords: keywords,
      });
      setHasChanges(false);
      toast.success('Listing copy saved');
    } catch (err) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }, [title, description, bullets, seoTitle, seoDescription, keywords, onSave]);

  const handleDiscard = useCallback(() => {
    setTitle(listing?.listing_title || '');
    setDescription(listing?.listing_description || '');
    setBullets(listing?.bullet_points || []);
    setSeoTitle(listing?.seo_title || '');
    setSeoDescription(listing?.seo_description || '');
    setKeywords(listing?.search_keywords || []);
    setTitleVariants([]);
    setHasChanges(false);
  }, [listing]);

  // -----------------------------------------------------------------------
  // Bullet handlers
  // -----------------------------------------------------------------------

  const updateBullet = useCallback((index, value) => {
    setBullets((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    markChanged();
  }, [markChanged]);

  const removeBullet = useCallback((index) => {
    setBullets((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  }, [markChanged]);

  const addBullet = useCallback(() => {
    if (bullets.length >= MAX_BULLETS) return;
    setBullets((prev) => [...prev, '']);
    markChanged();
  }, [bullets.length, markChanged]);

  // -----------------------------------------------------------------------
  // Keyword handlers
  // -----------------------------------------------------------------------

  const addKeyword = useCallback((kw) => {
    const cleaned = kw.trim().toLowerCase();
    if (!cleaned) return;
    if (keywords.includes(cleaned)) return;
    setKeywords((prev) => [...prev, cleaned]);
    setKeywordInput('');
    markChanged();
  }, [keywords, markChanged]);

  const removeKeyword = useCallback((index) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  }, [markChanged]);

  const handleKeywordKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword(keywordInput);
    }
  }, [keywordInput, addKeyword]);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const isAnyGenerating = generating || generatingTitles || generatingDescription || generatingBullets || generatingSeo;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================
          1. Controls Bar
          ================================================================ */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-4">
        <PillSelector
          label="Language"
          options={LANGUAGES}
          value={language}
          onChange={setLanguage}
        />
        <PillSelector
          label="Tone"
          options={TONES}
          value={tone}
          onChange={setTone}
        />
        <div className="ml-auto">
          <Button
            variant="glow"
            onClick={generateCopy}
            disabled={isAnyGenerating}
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Generate All Copy
          </Button>
        </div>
      </div>

      {/* ================================================================
          2. Title Section
          ================================================================ */}
      <div className="rounded-xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-5 space-y-4">
        <SectionHeader
          icon={Type}
          label="Product Title"
          right={
            <div className="flex items-center gap-2">
              <CharCount current={title.length} max={SEO_TITLE_MAX} idealMin={SEO_TITLE_IDEAL_MIN} />
              <Button
                variant="glass"
                size="sm"
                onClick={() => copyToClipboard(title, 'title')}
                className="gap-1.5"
              >
                {copiedField === 'title' ? (
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={generateTitles}
                disabled={isAnyGenerating}
                className="gap-1.5"
              >
                {generatingTitles ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Generate Titles
              </Button>
            </div>
          }
        />

        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); markChanged(); }}
          placeholder="Enter product title..."
          className="bg-zinc-900/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-cyan-500/40"
        />

        {/* Title Variants */}
        {titleVariants.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              AI Suggestions
            </span>
            <div className="grid gap-2">
              {titleVariants.map((variant, i) => {
                const text = typeof variant === 'string' ? variant : variant.text || variant.title || '';
                return (
                  <TitleVariantCard
                    key={i}
                    variant={variant}
                    isSelected={title === text}
                    onClick={(t) => { setTitle(t); markChanged(); }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          3. Description Section
          ================================================================ */}
      <div className="rounded-xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-5 space-y-4">
        <SectionHeader
          icon={AlignLeft}
          label="Product Description"
          right={
            <div className="flex items-center gap-2">
              <WordCount text={description} />
              <div className="flex items-center rounded-md bg-zinc-800/60 border border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setDescriptionMode('edit')}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    descriptionMode === 'edit'
                      ? 'bg-cyan-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <Code className="w-3.5 h-3.5 inline mr-1" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDescriptionMode('preview')}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    descriptionMode === 'preview'
                      ? 'bg-cyan-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <Eye className="w-3.5 h-3.5 inline mr-1" />
                  Preview
                </button>
              </div>
              <Button
                variant="glass"
                size="sm"
                onClick={() => copyToClipboard(description, 'description')}
                className="gap-1.5"
              >
                {copiedField === 'description' ? (
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={generateDescription}
                disabled={isAnyGenerating}
                className="gap-1.5"
              >
                {generatingDescription ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Generate
              </Button>
            </div>
          }
        />

        {descriptionMode === 'edit' ? (
          <Textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); markChanged(); }}
            placeholder="Enter product description..."
            rows={6}
            className="bg-zinc-900/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-cyan-500/40 min-h-[160px]"
          />
        ) : (
          <div
            className="prose prose-invert prose-sm max-w-none rounded-lg bg-zinc-900/40 border border-white/10 p-4 min-h-[160px]"
            dangerouslySetInnerHTML={{ __html: description || '<p class="text-zinc-500">No description yet.</p>' }}
          />
        )}
      </div>

      {/* ================================================================
          4. Bullet Points Section
          ================================================================ */}
      <div className="rounded-xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-5 space-y-4">
        <SectionHeader
          icon={List}
          label="Key Features"
          right={
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tabular-nums text-zinc-500">
                {bullets.length} bullet{bullets.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="glass"
                size="sm"
                onClick={generateBullets}
                disabled={isAnyGenerating}
                className="gap-1.5"
              >
                {generatingBullets ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Generate Bullets
              </Button>
            </div>
          }
        />

        <div className="space-y-2">
          {bullets.map((bullet, index) => (
            <div key={index} className="flex items-center gap-2 group">
              <GripVertical className="w-4 h-4 text-zinc-600 shrink-0 cursor-grab" />
              <Input
                value={bullet}
                onChange={(e) => updateBullet(index, e.target.value)}
                placeholder={`Feature ${index + 1}...`}
                className="bg-zinc-900/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-cyan-500/40"
              />
              <button
                type="button"
                onClick={() => removeBullet(index)}
                className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {bullets.length < MAX_BULLETS && (
          <Button
            variant="ghost"
            size="sm"
            onClick={addBullet}
            className="gap-1.5 text-zinc-400 hover:text-cyan-400"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Bullet
          </Button>
        )}
      </div>

      {/* ================================================================
          5. SEO Section (Collapsible)
          ================================================================ */}
      <div className="rounded-xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setSeoExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-zinc-200">
              SEO Optimization
            </span>
          </div>
          {seoExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {seoExpanded && (
          <div className="px-5 pb-5 space-y-5 border-t border-white/5 pt-4">
            {/* Generate SEO button */}
            <div className="flex justify-end">
              <Button
                variant="glass"
                size="sm"
                onClick={generateSeo}
                disabled={isAnyGenerating}
                className="gap-1.5"
              >
                {generatingSeo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Generate SEO
              </Button>
            </div>

            {/* SEO Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-zinc-400">SEO Title</Label>
                <CharCount
                  current={seoTitle.length}
                  max={SEO_TITLE_MAX}
                  idealMin={SEO_TITLE_IDEAL_MIN}
                />
              </div>
              <Input
                value={seoTitle}
                onChange={(e) => { setSeoTitle(e.target.value); markChanged(); }}
                placeholder="SEO title for search engines..."
                className={cn(
                  'bg-zinc-900/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-cyan-500/40',
                  seoTitle.length > SEO_TITLE_MAX && 'border-red-500/50 focus-visible:ring-red-500/40'
                )}
              />
            </div>

            {/* SEO Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-zinc-400">SEO Description</Label>
                <CharCount
                  current={seoDescription.length}
                  max={SEO_DESC_MAX}
                  idealMin={SEO_DESC_IDEAL_MIN}
                />
              </div>
              <Textarea
                value={seoDescription}
                onChange={(e) => { setSeoDescription(e.target.value); markChanged(); }}
                placeholder="Meta description for search results..."
                rows={3}
                className={cn(
                  'bg-zinc-900/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-cyan-500/40',
                  seoDescription.length > SEO_DESC_MAX && 'border-red-500/50 focus-visible:ring-red-500/40'
                )}
              />
            </div>

            {/* Search Keywords */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-zinc-400">Search Keywords</Label>
                <span className={cn(
                  'text-xs font-mono tabular-nums',
                  keywords.length >= SEO_KEYWORDS_IDEAL ? 'text-cyan-400' : 'text-zinc-500'
                )}>
                  {keywords.length} keyword{keywords.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-lg bg-zinc-900/40 border border-white/10 min-h-[44px]">
                {keywords.map((kw, index) => (
                  <Badge
                    key={index}
                    variant="info"
                    size="sm"
                    className="gap-1 cursor-default"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(index)}
                      className="ml-0.5 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  onBlur={() => { if (keywordInput.trim()) addKeyword(keywordInput); }}
                  placeholder={keywords.length === 0 ? 'Add keywords...' : ''}
                  className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* SEO Score Preview */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                SEO Score
              </span>
              <SeoScoreBar
                label="Title length"
                value={seoTitle.length}
                min={SEO_TITLE_IDEAL_MIN}
                max={SEO_TITLE_MAX}
              />
              <SeoScoreBar
                label="Description"
                value={seoDescription.length}
                min={SEO_DESC_IDEAL_MIN}
                max={SEO_DESC_MAX}
              />
              <SeoScoreBar
                label="Keywords"
                value={keywords.length}
                min={SEO_KEYWORDS_IDEAL}
                max={15}
                unit=""
              />
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          6. Save Bar (sticky)
          ================================================================ */}
      {hasChanges && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-4 shadow-lg shadow-black/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm text-zinc-300">Unsaved changes</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={saving}
              className="text-zinc-400 hover:text-white"
            >
              Discard Changes
            </Button>
            <Button
              variant="glow"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
