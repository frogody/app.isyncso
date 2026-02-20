import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Search,
  Play,
  Tag,
  Package,
  ImageIcon,
  Pencil,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  GripVertical,
  FileText,
  Star,
  Crown,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wand2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { supabase } from '@/api/supabaseClient';
import ListingGenerationView from './ListingGenerationView';

// ---------------------------------------------------------------------------
// Debounce helper
// ---------------------------------------------------------------------------

function useDebounce(callback, delay) {
  const timer = useRef(null);
  const latestCallback = useRef(callback);
  latestCallback.current = callback;

  const debounced = useCallback((...args) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => latestCallback.current(...args), delay);
  }, [delay]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return debounced;
}

// ---------------------------------------------------------------------------
// Image Template Guide — advised marketplace image order
// ---------------------------------------------------------------------------

const IMAGE_TEMPLATE = [
  { slot: 1, type: 'studio', label: 'Studio', desc: 'Front view, white BG' },
  { slot: 2, type: 'studio', label: 'Studio', desc: 'Angle view, white BG' },
  { slot: 3, type: 'studio', label: 'Studio', desc: 'Detail/close-up, white BG' },
  { slot: 4, type: 'lifestyle', label: 'Lifestyle', desc: 'Product in use' },
  { slot: 5, type: 'lifestyle', label: 'Lifestyle', desc: 'Context / setting' },
  { slot: 6, type: 'lifestyle', label: 'Lifestyle', desc: 'Scale / hands' },
  { slot: 7, type: 'lifestyle', label: 'Lifestyle', desc: 'Styled flat lay' },
  { slot: 8, type: 'graphic', label: 'USP', desc: 'Feature highlight #1' },
  { slot: 9, type: 'graphic', label: 'USP', desc: 'Feature highlight #2' },
  { slot: 10, type: 'graphic', label: 'USP', desc: 'Specs / comparison' },
  { slot: 11, type: 'graphic', label: 'USP', desc: 'Awards / certifications' },
];

const TYPE_COLORS = {
  studio: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  lifestyle: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  graphic: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
};

const TEMPLATE_GROUPS = [
  { type: 'studio', label: 'Studio (white BG)', slots: IMAGE_TEMPLATE.filter(s => s.type === 'studio') },
  { type: 'lifestyle', label: 'Lifestyle', slots: IMAGE_TEMPLATE.filter(s => s.type === 'lifestyle') },
  { type: 'graphic', label: 'USP Graphics', slots: IMAGE_TEMPLATE.filter(s => s.type === 'graphic') },
];

function ImageTemplateGuide({ selectedUrls, videoUrl, onGenerateForSlot, generatingSlot, t }) {
  const [expanded, setExpanded] = useState(false);
  const selectedCount = selectedUrls.length;
  const hasVideo = !!videoUrl;

  // Map images to template slots by position
  const slotImageMap = useMemo(() => {
    const map = {};
    IMAGE_TEMPLATE.forEach((tmpl, idx) => {
      map[tmpl.slot] = selectedUrls[idx] || null;
    });
    return map;
  }, [selectedUrls]);

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden',
      t('bg-slate-50/50 border-slate-200', 'bg-white/[0.015] border-white/5')
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-1.5 transition-colors',
          t('hover:bg-slate-100', 'hover:bg-white/[0.03]')
        )}
      >
        <div className="flex items-center gap-1.5">
          <Star className={cn('w-3 h-3', t('text-slate-400', 'text-amber-500/60'))} />
          <span className={cn('text-[10px] font-semibold', t('text-slate-500', 'text-zinc-500'))}>
            Advised template
          </span>
          <span className={cn(
            'text-[9px] font-medium px-1 py-px rounded',
            selectedCount >= 11 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'
          )}>
            {selectedCount}/11 images{hasVideo ? ' + video' : ''}
          </span>
        </div>
        {expanded
          ? <ChevronUp className={cn('w-3 h-3', t('text-slate-400', 'text-zinc-500'))} />
          : <ChevronDown className={cn('w-3 h-3', t('text-slate-400', 'text-zinc-500'))} />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className={cn('px-2.5 pb-2.5 pt-1.5 border-t space-y-2.5', t('border-slate-100', 'border-white/5'))}>
              {TEMPLATE_GROUPS.map((group) => {
                const colors = TYPE_COLORS[group.type];
                const filledCount = group.slots.filter(s => slotImageMap[s.slot]).length;
                const allFilled = filledCount === group.slots.length;

                return (
                  <div key={group.type}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full', colors.bg, 'ring-1', colors.border)} />
                      <span className={cn('text-[9px] font-semibold', t('text-slate-500', 'text-zinc-500'))}>
                        {group.label}
                      </span>
                      <span className={cn('text-[9px] font-medium', allFilled ? 'text-emerald-400' : t('text-slate-400', 'text-zinc-600'))}>
                        {filledCount}/{group.slots.length}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {group.slots.map((slot) => {
                        const imageUrl = slotImageMap[slot.slot];
                        const isGenerating = generatingSlot === slot.slot;

                        if (imageUrl) {
                          return (
                            <div key={slot.slot} className={cn(
                              'relative flex-1 aspect-square rounded-md overflow-hidden border',
                              colors.border
                            )}>
                              <img src={imageUrl} alt={slot.desc} className="w-full h-full object-cover" />
                              <div className={cn(
                                'absolute bottom-0 inset-x-0 py-px text-center text-[7px] font-bold',
                                'bg-gradient-to-t from-black/60 to-transparent text-white/90'
                              )}>
                                {slot.slot}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={slot.slot}
                            onClick={() => onGenerateForSlot?.(slot)}
                            disabled={!!generatingSlot}
                            className={cn(
                              'relative flex-1 aspect-square rounded-md border-2 border-dashed',
                              'flex flex-col items-center justify-center gap-0.5 transition-all',
                              colors.border,
                              isGenerating
                                ? cn('opacity-100', colors.bg)
                                : 'opacity-40 hover:opacity-100',
                              !!generatingSlot && !isGenerating && 'cursor-not-allowed'
                            )}
                          >
                            {isGenerating ? (
                              <Loader2 className={cn('w-3.5 h-3.5 animate-spin', colors.text)} />
                            ) : (
                              <>
                                <Sparkles className={cn('w-3 h-3', colors.text)} />
                                <span className={cn('text-[6px] font-semibold leading-tight text-center px-0.5', colors.text)}>
                                  {slot.desc.split(',')[0]}
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable Image Strip — marketplace-style main image + reorderable thumbs
// ---------------------------------------------------------------------------

function ImageGalleryEditor({ product, listing, onUpdate, onTabChange, onGenerateSlotImage, generatingSlot, t }) {
  const videoUrl = listing?.video_url || null;

  // Build image pool from all sources
  const imagePool = useMemo(() => {
    const pool = [];
    const seen = new Set();
    const addUrl = (url, source) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      pool.push({ url, source, type: 'image' });
    };

    const featured = typeof product?.featured_image === 'string'
      ? product.featured_image
      : product?.featured_image?.url || null;
    if (featured) addUrl(featured, 'product');

    if (Array.isArray(product?.gallery)) {
      product.gallery.forEach((img) => {
        const url = typeof img === 'string' ? img : img?.url;
        addUrl(url, 'product');
      });
    }

    if (listing?.hero_image_url) addUrl(listing.hero_image_url, 'listing');
    if (Array.isArray(listing?.gallery_urls)) {
      listing.gallery_urls.forEach((url) => addUrl(url, 'listing'));
    }

    return pool;
  }, [product, listing]);

  // Selected images in order — first = hero
  const [selectedUrls, setSelectedUrls] = useState(() => {
    const sel = [];
    if (listing?.hero_image_url) sel.push(listing.hero_image_url);
    if (Array.isArray(listing?.gallery_urls)) {
      listing.gallery_urls.forEach((url) => {
        if (url && !sel.includes(url)) sel.push(url);
      });
    }
    return sel;
  });

  useEffect(() => {
    const sel = [];
    if (listing?.hero_image_url) sel.push(listing.hero_image_url);
    if (Array.isArray(listing?.gallery_urls)) {
      listing.gallery_urls.forEach((url) => {
        if (url && !sel.includes(url)) sel.push(url);
      });
    }
    setSelectedUrls(sel);
  }, [listing?.hero_image_url, listing?.gallery_urls]);

  const [mainIdx, setMainIdx] = useState(0);
  const [showingVideo, setShowingVideo] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const mainImage = selectedUrls[mainIdx] || selectedUrls[0] || null;
  // Total media count (images + video)
  const totalMedia = selectedUrls.length + (videoUrl ? 1 : 0);

  const persistOrder = useCallback((urls) => {
    const hero = urls[0] || null;
    const gallery = urls.slice(1);
    onUpdate?.({ hero_image_url: hero, gallery_urls: gallery });
  }, [onUpdate]);

  const toggleImage = (url) => {
    setSelectedUrls((prev) => {
      const next = prev.includes(url)
        ? prev.filter((u) => u !== url)
        : [...prev, url];
      persistOrder(next);
      return next;
    });
  };

  const moveImage = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    setSelectedUrls((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      persistOrder(next);
      return next;
    });
  };

  const setAsHero = (url) => {
    setSelectedUrls((prev) => {
      const without = prev.filter((u) => u !== url);
      const next = [url, ...without];
      setMainIdx(0);
      persistOrder(next);
      return next;
    });
  };

  // Drag handlers for reorder
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      moveImage(dragIdx, dragOverIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  if (imagePool.length === 0) {
    return (
      <div className="space-y-2">
        <div className={cn(
          'aspect-square rounded-xl border border-dashed flex flex-col items-center justify-center',
          t('bg-slate-50 border-slate-300', 'bg-white/[0.02] border-white/10')
        )}>
          <ImageIcon className={cn('w-10 h-10 mb-2', t('text-slate-300', 'text-zinc-700'))} />
          <p className={cn('text-xs', t('text-slate-400', 'text-zinc-500'))}>No images available</p>
          {onTabChange && (
            <button
              onClick={() => onTabChange('images')}
              className="text-xs font-medium text-cyan-500 hover:text-cyan-400 mt-1"
            >
              Open Image Studio
            </button>
          )}
        </div>
      </div>
    );
  }

  const unselectedImages = imagePool.filter(({ url }) => !selectedUrls.includes(url));

  return (
    <div className="space-y-2">
      {/* Main preview — image or video */}
      {(mainImage || showingVideo) ? (
        <div className={cn(
          'relative rounded-lg overflow-hidden group',
          t('bg-slate-50', 'bg-zinc-800/30')
        )}>
          {showingVideo && videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full aspect-square object-contain bg-black"
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.img
                key={mainImage}
                src={mainImage}
                alt="Main product"
                className="w-full aspect-square object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </AnimatePresence>
          )}

          {/* Counter */}
          {totalMedia > 1 && (
            <div className={cn(
              'absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium',
              t('bg-white/90 text-slate-600', 'bg-zinc-900/80 text-zinc-400 border border-white/10')
            )}>
              {showingVideo ? 'Video' : `${mainIdx + 1} / ${selectedUrls.length}`}
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          'aspect-square rounded-lg border border-dashed flex items-center justify-center',
          t('bg-slate-50 border-slate-300', 'bg-white/[0.02] border-white/10')
        )}>
          <span className={cn('text-xs', t('text-slate-400', 'text-zinc-600'))}>Select images below</span>
        </div>
      )}

      {/* Selected media strip — draggable images + video thumbnail */}
      {(selectedUrls.length > 0 || videoUrl) && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={cn('text-[10px] font-medium uppercase tracking-wider', t('text-slate-400', 'text-zinc-600'))}>
              Listing media · Drag to reorder
            </span>
            <span className={cn('text-[10px]', t('text-slate-400', 'text-zinc-600'))}>
              {selectedUrls.length} img{videoUrl ? ' + video' : ''}
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {selectedUrls.map((url, idx) => {
              const isHero = idx === 0;
              const isViewing = idx === mainIdx && !showingVideo;

              return (
                <div
                  key={url}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => { setMainIdx(idx); setShowingVideo(false); }}
                  className={cn(
                    'relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all group/thumb',
                    'border-2',
                    isViewing
                      ? 'border-cyan-400 shadow-sm shadow-cyan-500/20'
                      : cn(t('border-slate-200', 'border-white/10')),
                    dragOverIdx === idx && 'ring-2 ring-cyan-400/40',
                    dragIdx === idx && 'opacity-40'
                  )}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />

                  {/* Hero crown */}
                  {isHero && (
                    <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-cyan-500/90 to-cyan-600/90 text-[8px] font-bold text-white text-center py-px leading-none flex items-center justify-center gap-0.5">
                      <Crown className="w-2 h-2" /> MAIN
                    </div>
                  )}

                  {/* Order badge */}
                  {!isHero && (
                    <div className={cn(
                      'absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold',
                      t('bg-slate-700/80 text-white', 'bg-zinc-800/90 text-zinc-300')
                    )}>
                      {idx + 1}
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleImage(url); }}
                    className={cn(
                      'absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center',
                      'opacity-0 group-hover/thumb:opacity-100 transition-opacity',
                      'bg-red-500/90 text-white'
                    )}
                  >
                    <X className="w-2 h-2" />
                  </button>

                  {/* Set as main (context action on non-hero) */}
                  {!isHero && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAsHero(url); }}
                      className={cn(
                        'absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center',
                        'opacity-0 group-hover/thumb:opacity-100 transition-opacity',
                        'bg-cyan-500/90 text-white'
                      )}
                      title="Set as main image"
                    >
                      <Crown className="w-2 h-2" />
                    </button>
                  )}

                  {/* Drag handle overlay */}
                  <div className={cn(
                    'absolute inset-x-0 bottom-0 h-3 flex items-center justify-center',
                    'opacity-0 group-hover/thumb:opacity-60 transition-opacity',
                    t('bg-gradient-to-t from-black/30', 'bg-gradient-to-t from-black/50')
                  )}>
                    <GripVertical className="w-2.5 h-2.5 text-white rotate-90" />
                  </div>
                </div>
              );
            })}

            {/* Video thumbnail at end of strip */}
            {videoUrl && (
              <button
                onClick={() => setShowingVideo(true)}
                className={cn(
                  'relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all',
                  'border-2',
                  showingVideo
                    ? 'border-cyan-400 shadow-sm shadow-cyan-500/20'
                    : cn(t('border-slate-200', 'border-white/10'))
                )}
              >
                <video src={videoUrl} muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-zinc-900/80 text-[7px] font-bold text-zinc-300 text-center py-px leading-none">
                  VIDEO
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unselected images pool */}
      {unselectedImages.length > 0 && (
        <div className="space-y-1">
          <span className={cn('text-[10px] font-medium uppercase tracking-wider', t('text-slate-400', 'text-zinc-600'))}>
            Available · Click to add
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {unselectedImages.map(({ url }, idx) => (
              <button
                key={idx}
                onClick={() => toggleImage(url)}
                className={cn(
                  'relative flex-shrink-0 w-10 h-10 rounded-md overflow-hidden border transition-all opacity-50 hover:opacity-100',
                  t('border-slate-200 hover:border-slate-400', 'border-white/5 hover:border-white/20')
                )}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advised image template */}
      <ImageTemplateGuide
        selectedUrls={selectedUrls}
        videoUrl={videoUrl}
        onGenerateForSlot={onGenerateSlotImage}
        generatingSlot={generatingSlot}
        t={t}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable Text Field (inline)
// ---------------------------------------------------------------------------

function EditableText({ value, onChange, placeholder, className, inputClassName, as = 'input', t }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const ref = useRef(null);

  useEffect(() => { setLocalValue(value || ''); }, [value]);

  const handleBlur = () => {
    setEditing(false);
    if (localValue !== (value || '')) onChange(localValue);
  };

  const handleKeyDown = (e) => {
    if (as === 'input' && e.key === 'Enter') { e.preventDefault(); ref.current?.blur(); }
    if (e.key === 'Escape') { setLocalValue(value || ''); setEditing(false); }
  };

  const Tag = as === 'textarea' ? 'textarea' : 'input';

  if (editing) {
    return (
      <Tag
        ref={ref}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder={placeholder}
        className={cn(
          'w-full bg-transparent border-b border-cyan-400/40 outline-none transition-colors',
          'placeholder:text-zinc-600',
          as === 'textarea' && 'resize-none min-h-[48px]',
          inputClassName, className
        )}
        rows={as === 'textarea' ? 2 : undefined}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn(
        'group cursor-text relative border-b border-transparent hover:border-dashed',
        t('hover:border-slate-300', 'hover:border-white/15'),
        className
      )}
    >
      <span className={cn(!localValue && t('text-slate-400 italic', 'text-zinc-600 italic'))}>
        {localValue || placeholder}
      </span>
      <Pencil className={cn(
        'inline-block w-3 h-3 ml-1 opacity-0 group-hover:opacity-40 transition-opacity',
        t('text-slate-400', 'text-zinc-500')
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable Bullet Points
// ---------------------------------------------------------------------------

function EditableBullets({ bullets = [], onChange, t }) {
  const [localBullets, setLocalBullets] = useState(bullets);
  useEffect(() => { setLocalBullets(bullets); }, [bullets]);

  const updateBullet = (idx, text) => {
    const next = [...localBullets];
    next[idx] = text;
    setLocalBullets(next);
    onChange(next);
  };

  const removeBullet = (idx) => {
    const next = localBullets.filter((_, i) => i !== idx);
    setLocalBullets(next);
    onChange(next);
  };

  const addBullet = () => {
    const next = [...localBullets, ''];
    setLocalBullets(next);
    onChange(next);
  };

  return (
    <div className="space-y-1">
      {localBullets.map((bullet, idx) => (
        <div key={idx} className="flex items-start gap-2 group">
          <div className="w-1 h-1 rounded-full bg-cyan-400 mt-[7px] flex-shrink-0" />
          <EditableText
            value={bullet}
            onChange={(text) => updateBullet(idx, text)}
            placeholder="Bullet point..."
            className={cn('flex-1 text-[13px] leading-snug', t('text-slate-600', 'text-zinc-300'))}
            inputClassName={cn('text-[13px] leading-snug', t('text-slate-600', 'text-zinc-300'))}
            t={t}
          />
          <button
            onClick={() => removeBullet(idx)}
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded mt-0.5',
              t('hover:bg-slate-100 text-slate-400', 'hover:bg-white/5 text-zinc-600')
            )}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
      <button
        onClick={addBullet}
        className="flex items-center gap-1 text-[11px] font-medium text-cyan-500 hover:text-cyan-400 transition-colors"
      >
        <Plus className="w-2.5 h-2.5" /> Add bullet
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable Description (HTML view / textarea edit)
// ---------------------------------------------------------------------------

function EditableDescription({ value, onChange, t }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  useEffect(() => { setLocalValue(value || ''); }, [value]);

  const handleBlur = () => {
    setEditing(false);
    if (localValue !== (value || '')) onChange(localValue);
  };

  if (editing) {
    return (
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        autoFocus
        rows={6}
        placeholder="Product description (supports HTML)..."
        className={cn(
          'w-full bg-transparent border border-cyan-400/30 rounded-lg p-3 outline-none resize-y',
          'text-[13px] leading-relaxed placeholder:text-zinc-600',
          t('text-slate-700', 'text-zinc-300')
        )}
      />
    );
  }

  if (!localValue) {
    return (
      <div
        onClick={() => setEditing(true)}
        className={cn(
          'cursor-text rounded-lg border border-dashed px-4 py-6 text-center',
          t('border-slate-300 text-slate-400', 'border-white/10 text-zinc-600')
        )}
      >
        <FileText className="w-4 h-4 mx-auto mb-1 opacity-40" />
        <span className="text-xs">Click to add description</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn(
        'cursor-text group relative rounded-lg p-2 -mx-2 transition-colors',
        t('hover:bg-slate-50', 'hover:bg-white/[0.02]')
      )}
    >
      <div
        className={cn(
          'prose prose-sm max-w-none text-[13px]',
          t(
            'prose-slate',
            'prose-invert prose-p:text-zinc-300 prose-strong:text-white prose-li:text-zinc-300 prose-headings:text-white'
          )
        )}
        dangerouslySetInnerHTML={{ __html: localValue }}
      />
      <div className={cn(
        'absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity',
        'flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded',
        t('bg-slate-200 text-slate-500', 'bg-white/10 text-zinc-400')
      )}>
        <Pencil className="w-2 h-2" /> Edit
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SEO Section (collapsible)
// ---------------------------------------------------------------------------

function SEOSection({ listing, onUpdate, t }) {
  const [expanded, setExpanded] = useState(false);
  const [seoTitle, setSeoTitle] = useState(listing?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(listing?.seo_description || '');
  const [keywords, setKeywords] = useState(listing?.search_keywords || []);
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    setSeoTitle(listing?.seo_title || '');
    setSeoDescription(listing?.seo_description || '');
    setKeywords(listing?.search_keywords || []);
  }, [listing?.seo_title, listing?.seo_description, listing?.search_keywords]);

  const handleSeoTitleBlur = () => {
    if (seoTitle !== (listing?.seo_title || '')) onUpdate?.({ seo_title: seoTitle });
  };
  const handleSeoDescriptionBlur = () => {
    if (seoDescription !== (listing?.seo_description || '')) onUpdate?.({ seo_description: seoDescription });
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw || keywords.includes(kw)) return;
    const next = [...keywords, kw];
    setKeywords(next);
    setKeywordInput('');
    onUpdate?.({ search_keywords: next });
  };

  const removeKeyword = (kw) => {
    const next = keywords.filter((k) => k !== kw);
    setKeywords(next);
    onUpdate?.({ search_keywords: next });
  };

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(); }
    if (e.key === 'Backspace' && !keywordInput && keywords.length > 0) {
      removeKeyword(keywords[keywords.length - 1]);
    }
  };

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-between py-1 transition-colors',
          t('hover:text-slate-900', 'hover:text-white')
        )}
      >
        <div className="flex items-center gap-1.5">
          <Search className={cn('w-3 h-3', t('text-slate-400', 'text-zinc-500'))} />
          <span className={cn('text-[11px] font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
            SEO & Keywords
          </span>
          {(seoTitle || keywords.length > 0) && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-cyan-500/10 text-cyan-400">
              {[seoTitle && 'Title', keywords.length > 0 && `${keywords.length} kw`].filter(Boolean).join(' + ')}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className={cn('w-3 h-3', t('text-slate-400', 'text-zinc-500'))} />
          : <ChevronDown className={cn('w-3 h-3', t('text-slate-400', 'text-zinc-500'))} />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-3">
              {/* SEO Title */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={cn('text-[11px] font-medium', t('text-slate-500', 'text-zinc-500'))}>SEO Title</label>
                  <span className={cn('text-[10px]', seoTitle.length > 60 ? 'text-red-400' : t('text-slate-400', 'text-zinc-600'))}>
                    {seoTitle.length}/60
                  </span>
                </div>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  onBlur={handleSeoTitleBlur}
                  placeholder="SEO title..."
                  className={cn(
                    'w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none transition-colors',
                    t('bg-white border-slate-200 text-slate-800 focus:border-cyan-400', 'bg-white/[0.04] border-white/10 text-zinc-200 focus:border-cyan-500/50')
                  )}
                />
              </div>

              {/* SEO Description */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={cn('text-[11px] font-medium', t('text-slate-500', 'text-zinc-500'))}>Meta Description</label>
                  <span className={cn('text-[10px]', seoDescription.length > 160 ? 'text-red-400' : t('text-slate-400', 'text-zinc-600'))}>
                    {seoDescription.length}/160
                  </span>
                </div>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  onBlur={handleSeoDescriptionBlur}
                  placeholder="Meta description..."
                  rows={2}
                  className={cn(
                    'w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none transition-colors resize-none',
                    t('bg-white border-slate-200 text-slate-800 focus:border-cyan-400', 'bg-white/[0.04] border-white/10 text-zinc-200 focus:border-cyan-500/50')
                  )}
                />
              </div>

              {/* Keywords */}
              <div className="space-y-1">
                <label className={cn('text-[11px] font-medium', t('text-slate-500', 'text-zinc-500'))}>Keywords</label>
                <div className={cn(
                  'flex flex-wrap items-center gap-1 px-2.5 py-1.5 rounded-lg border min-h-[32px] transition-colors',
                  t('bg-white border-slate-200 focus-within:border-cyan-400', 'bg-white/[0.04] border-white/10 focus-within:border-cyan-500/50')
                )}>
                  {keywords.map((kw, idx) => (
                    <span key={idx} className={cn(
                      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium',
                      t('bg-slate-100 text-slate-600', 'bg-white/[0.06] text-zinc-400')
                    )}>
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-red-400"><X className="w-2 h-2" /></button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    onBlur={addKeyword}
                    placeholder={keywords.length === 0 ? 'Type + Enter...' : ''}
                    className={cn(
                      'flex-1 min-w-[60px] bg-transparent outline-none text-[11px]',
                      t('text-slate-700', 'text-zinc-300')
                    )}
                  />
                </div>
              </div>

              {/* Google preview */}
              {(seoTitle || seoDescription) && (
                <div className={cn(
                  'rounded-lg border p-2.5 space-y-0.5',
                  t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
                )}>
                  <div className={cn('text-[10px]', t('text-green-700', 'text-green-400/80'))}>
                    www.yourstore.com &rsaquo; products
                  </div>
                  <div className={cn('text-xs font-medium leading-snug truncate', t('text-blue-700', 'text-blue-400'))}>
                    {seoTitle || 'Product Title'}
                  </div>
                  <div className={cn('text-[11px] leading-relaxed line-clamp-2', t('text-slate-500', 'text-zinc-400'))}>
                    {seoDescription || 'Description appears here.'}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ onGenerateAll, loading, t }) {
  return (
    <div className={cn(
      'relative rounded-xl border overflow-hidden',
      t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
    )}>
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn(
          'absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl',
          t('bg-cyan-100/30', 'bg-cyan-500/5')
        )} />
      </div>
      <div className="relative flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-3', t('bg-slate-100', 'bg-white/[0.04]'))}>
          <Package className={cn('w-6 h-6', t('text-slate-300', 'text-zinc-600'))} />
        </div>
        <h3 className={cn('text-sm font-semibold mb-1', t('text-slate-900', 'text-white'))}>No Listing Yet</h3>
        <p className={cn('text-xs max-w-xs mb-5', t('text-slate-500', 'text-zinc-500'))}>
          Generate a complete listing with AI — copy, images, SEO, and video in one click.
        </p>
        <button
          onClick={onGenerateAll}
          disabled={loading}
          className={cn(
            'group rounded-xl px-5 py-2.5 transition-all',
            'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white',
            'shadow-md shadow-cyan-500/15',
            loading && 'opacity-70 cursor-not-allowed'
          )}
        >
          <div className="flex items-center gap-2">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="text-xs font-semibold">{loading ? 'Generating...' : 'Generate Everything with AI'}</span>
            <ArrowRight className="w-3 h-3 text-white/60 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Report Panel
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  good: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Good' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Needs work' },
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Critical' },
};

function AuditSidebar({ audit, auditing, onRunAudit, onFixWithAI, fixing, fixPlan, t }) {
  const scoreColor = audit?.overall_score >= 80 ? 'text-emerald-400' : audit?.overall_score >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = audit?.overall_score >= 80 ? 'bg-emerald-500/10' : audit?.overall_score >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10';
  const scoreRingColor = audit?.overall_score >= 80 ? 'stroke-emerald-400' : audit?.overall_score >= 50 ? 'stroke-amber-400' : 'stroke-red-400';

  // Score ring
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const scoreOffset = audit ? circumference - (audit.overall_score / 100) * circumference : circumference;

  return (
    <div className={cn(
      'lg:border-l h-full overflow-y-auto',
      t('border-slate-100 bg-slate-50/50', 'border-white/[0.04] bg-white/[0.01]')
    )}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn('w-4 h-4', audit ? scoreColor : t('text-slate-400', 'text-zinc-600'))} />
          <span className={cn('text-xs font-semibold', t('text-slate-700', 'text-zinc-300'))}>Listing Audit</span>
        </div>

        {/* Empty / Loading / Score states */}
        {!audit && !auditing && (
          <div className="flex flex-col items-center text-center pt-4 pb-2">
            <div className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center mb-3',
              t('bg-slate-100', 'bg-white/[0.04]')
            )}>
              <ShieldCheck className={cn('w-8 h-8', t('text-slate-300', 'text-zinc-700'))} />
            </div>
            <p className={cn('text-xs font-medium mb-1', t('text-slate-600', 'text-zinc-400'))}>
              No audit yet
            </p>
            <p className={cn('text-[11px] mb-4 max-w-[200px]', t('text-slate-400', 'text-zinc-600'))}>
              Run an AI audit to score your listing quality and get suggestions.
            </p>
            <button
              onClick={onRunAudit}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all',
                'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white',
                'shadow-sm shadow-cyan-500/10'
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Run Audit
            </button>
          </div>
        )}

        {auditing && (
          <div className="flex flex-col items-center text-center pt-6 pb-2">
            <div className="relative w-20 h-20 mb-3">
              <svg className="w-20 h-20 -rotate-90 animate-pulse" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={radius} fill="none" className={t('stroke-slate-200', 'stroke-white/5')} strokeWidth="5" />
                <circle cx="40" cy="40" r={radius} fill="none" className="stroke-cyan-500/40" strokeWidth="5"
                  strokeDasharray={circumference} strokeDashoffset={circumference * 0.6}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            </div>
            <p className={cn('text-xs font-medium', t('text-slate-600', 'text-zinc-400'))}>
              Analyzing listing...
            </p>
            <p className={cn('text-[10px] mt-0.5', t('text-slate-400', 'text-zinc-600'))}>
              Inspecting images, copy & SEO
            </p>
          </div>
        )}

        {audit && !auditing && (
          <>
            {/* Score ring */}
            <div className="flex flex-col items-center pt-1 pb-2">
              <div className="relative w-24 h-24 mb-2">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r={radius} fill="none" className={t('stroke-slate-200', 'stroke-white/[0.06]')} strokeWidth="5" />
                  <circle cx="40" cy="40" r={radius} fill="none" className={scoreRingColor} strokeWidth="5"
                    strokeDasharray={circumference} strokeDashoffset={scoreOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-2xl font-bold tabular-nums', scoreColor)}>
                    {audit.overall_score}
                  </span>
                  <span className={cn('text-[9px] font-medium -mt-0.5', t('text-slate-400', 'text-zinc-600'))}>/ 100</span>
                </div>
              </div>

              {audit.summary && (
                <p className={cn('text-[11px] leading-relaxed text-center max-w-[240px]', t('text-slate-500', 'text-zinc-500'))}>
                  {audit.summary}
                </p>
              )}
            </div>

            {/* Category scores as compact bars */}
            <div className="space-y-2">
              {(audit.categories || []).map((cat, idx) => {
                const cfg = STATUS_CONFIG[cat.status] || STATUS_CONFIG.warning;
                const StatusIcon = cfg.icon;
                const hasDetails = cat.issues?.length > 0 || cat.suggestions?.length > 0;
                const barColor = cat.status === 'good' ? 'bg-emerald-400' : cat.status === 'warning' ? 'bg-amber-400' : 'bg-red-400';

                return (
                  <details key={idx} className="group">
                    <summary className={cn(
                      'flex items-center gap-2 cursor-pointer select-none py-1 transition-colors rounded-md px-1 -mx-1',
                      t('hover:bg-slate-100', 'hover:bg-white/[0.03]')
                    )}>
                      <StatusIcon className={cn('w-3 h-3 flex-shrink-0', cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={cn('text-[11px] font-medium truncate', t('text-slate-700', 'text-zinc-300'))}>{cat.name}</span>
                          <span className={cn('text-[10px] font-semibold tabular-nums ml-2', cfg.color)}>{cat.score}</span>
                        </div>
                        <div className={cn('h-1 rounded-full overflow-hidden', t('bg-slate-200', 'bg-white/[0.06]'))}>
                          <div className={cn('h-full rounded-full transition-all duration-500', barColor)}
                            style={{ width: `${cat.score}%` }}
                          />
                        </div>
                      </div>
                      <ChevronDown className={cn('w-2.5 h-2.5 flex-shrink-0 transition-transform group-open:rotate-180', t('text-slate-400', 'text-zinc-600'))} />
                    </summary>

                    {hasDetails && (
                      <div className={cn('pl-5 pr-1 pb-2 pt-1.5 space-y-1.5')}>
                        {cat.issues?.map((issue, i) => (
                          <div key={`i-${i}`} className="flex items-start gap-1.5">
                            <XCircle className="w-2.5 h-2.5 text-red-400/70 mt-0.5 flex-shrink-0" />
                            <span className={cn('text-[10px] leading-snug', t('text-slate-500', 'text-zinc-500'))}>{issue}</span>
                          </div>
                        ))}
                        {cat.suggestions?.map((sug, i) => (
                          <div key={`s-${i}`} className="flex items-start gap-1.5">
                            <Sparkles className="w-2.5 h-2.5 text-cyan-400/70 mt-0.5 flex-shrink-0" />
                            <span className={cn('text-[10px] leading-snug', t('text-slate-500', 'text-zinc-500'))}>{sug}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </details>
                );
              })}
            </div>

            {/* Missing USP visuals */}
            {audit.missing_usp_visuals?.length > 0 && (
              <div className={cn('rounded-lg border p-2.5', t('bg-red-50/50 border-red-200', 'bg-red-500/5 border-red-500/10'))}>
                <span className={cn('text-[9px] font-semibold uppercase tracking-wider block mb-1.5', 'text-red-400')}>
                  Missing From Images
                </span>
                <div className="space-y-1">
                  {audit.missing_usp_visuals.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <ImageIcon className="w-2.5 h-2.5 text-red-400/70 mt-0.5 flex-shrink-0" />
                      <span className={cn('text-[10px] leading-snug', t('text-slate-700', 'text-zinc-300'))}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top priorities */}
            {audit.top_priorities?.length > 0 && (
              <div className={cn('rounded-lg border p-2.5', t('bg-cyan-50/50 border-cyan-200', 'bg-cyan-500/5 border-cyan-500/10'))}>
                <span className={cn('text-[9px] font-semibold uppercase tracking-wider block mb-1.5', 'text-cyan-500')}>
                  Top Priorities
                </span>
                <ol className="space-y-1">
                  {audit.top_priorities.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className={cn('text-[9px] font-bold w-3 flex-shrink-0', 'text-cyan-400')}>{i + 1}.</span>
                      <span className={cn('text-[10px] leading-snug', t('text-slate-700', 'text-zinc-300'))}>{p}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* ── Fix with AI ── */}
            {fixing === 'planning' && (
              <div className={cn('rounded-lg border p-3 text-center', t('bg-cyan-50/50 border-cyan-200', 'bg-cyan-500/5 border-cyan-500/10'))}>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400 mx-auto mb-1.5" />
                <span className={cn('text-[11px] font-medium', 'text-cyan-400')}>Analyzing issues...</span>
              </div>
            )}

            {fixPlan && fixing === 'executing' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn('text-[9px] font-semibold uppercase tracking-wider', 'text-cyan-500')}>Fix Plan</span>
                  <span className={cn('text-[9px] font-medium', t('text-slate-400', 'text-zinc-600'))}>
                    {fixPlan.actions.filter((a) => a.status === 'done').length}/{fixPlan.actions.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {fixPlan.actions.map((action) => {
                    const StatusIcon = action.status === 'done'
                      ? CheckCircle2
                      : action.status === 'active'
                        ? Loader2
                        : action.status === 'failed'
                          ? XCircle
                          : Circle;
                    const statusColor = action.status === 'done'
                      ? 'text-emerald-400'
                      : action.status === 'active'
                        ? 'text-cyan-400 animate-spin'
                        : action.status === 'failed'
                          ? 'text-red-400'
                          : t('text-slate-300', 'text-zinc-700');

                    return (
                      <div key={action.id} className={cn(
                        'flex items-start gap-2 p-2 rounded-lg border transition-colors',
                        action.status === 'active'
                          ? t('bg-cyan-50/60 border-cyan-200', 'bg-cyan-500/5 border-cyan-500/15')
                          : t('bg-slate-50/50 border-slate-100', 'bg-white/[0.02] border-white/5')
                      )}>
                        <StatusIcon className={cn('w-3 h-3 flex-shrink-0 mt-0.5', statusColor)} />
                        <div className="min-w-0 flex-1">
                          <span className={cn('text-[10px] font-medium block truncate', t('text-slate-700', 'text-zinc-300'))}>
                            {action.label}
                          </span>
                          <span className={cn('text-[9px] block truncate', t('text-slate-400', 'text-zinc-600'))}>
                            {action.description}
                          </span>
                          {action.imageUrl && (
                            <img src={action.imageUrl} alt="" className="w-10 h-10 rounded mt-1 object-cover border border-white/10" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {fixing === 'done' && (
              <div className={cn('rounded-lg border p-3 text-center', t('bg-emerald-50/50 border-emerald-200', 'bg-emerald-500/5 border-emerald-500/10'))}>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className={cn('text-[11px] font-semibold block', 'text-emerald-400')}>Fixes applied!</span>
                <span className={cn('text-[9px]', t('text-slate-500', 'text-zinc-500'))}>Re-audit to check improvement</span>
              </div>
            )}

            {/* Fix with AI button — only when audit done and score < 90 */}
            {!fixing && audit.overall_score < 90 && (
              <button
                onClick={onFixWithAI}
                className={cn(
                  'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all',
                  'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white',
                  'shadow-sm shadow-cyan-500/10'
                )}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Fix with AI
              </button>
            )}

            {/* Re-audit button */}
            <button
              onClick={onRunAudit}
              disabled={!!fixing && fixing !== 'done'}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border',
                t('border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700', 'border-white/10 hover:border-white/20 text-zinc-500 hover:text-zinc-300'),
                fixing && fixing !== 'done' && 'opacity-40 cursor-not-allowed'
              )}
            >
              <ShieldCheck className="w-3 h-3" />
              Re-audit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component — Marketplace-Style Layout
// ---------------------------------------------------------------------------

export default function ListingPreview({
  product,
  details,
  listing,
  onGenerateAll,
  loading,
  generatingProgress,
  onTabChange,
  onUpdate,
  onGenerateSlotImage,
  onFixWithAI,
}) {
  const { t } = useTheme();
  const [saveStatus, setSaveStatus] = useState('idle');
  const [auditData, setAuditData] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [generatingSlot, setGeneratingSlot] = useState(null);
  const [fixing, setFixing] = useState(null); // null | 'planning' | 'executing' | 'done'
  const [fixPlan, setFixPlan] = useState(null);

  const handleGenerateSlot = useCallback(async (slot) => {
    if (!onGenerateSlotImage || generatingSlot) return;
    setGeneratingSlot(slot.slot);
    try {
      await onGenerateSlotImage(slot);
    } catch (err) {
      console.error('[ListingPreview] Slot generation failed:', err);
    } finally {
      setGeneratingSlot(null);
    }
  }, [onGenerateSlotImage, generatingSlot]);

  // Build specifications array from details prop
  const specs = useMemo(() => {
    const raw = details?.specifications;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  }, [details?.specifications]);

  const debouncedOnUpdate = useDebounce(async (updates) => {
    if (!onUpdate) return;
    setSaveStatus('saving');
    try {
      await onUpdate(updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch { setSaveStatus('idle'); }
  }, 600);

  const handleImageUpdate = useCallback((updates) => {
    if (!onUpdate) return;
    setSaveStatus('saving');
    onUpdate(updates)
      .then(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 1500); })
      .catch(() => setSaveStatus('idle'));
  }, [onUpdate]);

  const handleAudit = useCallback(async () => {
    setAuditing(true);
    setAuditData(null);
    try {
      const { data, error } = await supabase.functions.invoke('audit-listing', {
        body: {
          listing_title: listing?.listing_title || '',
          short_tagline: listing?.short_tagline || '',
          listing_description: listing?.listing_description || '',
          bullet_points: listing?.bullet_points || [],
          seo_title: listing?.seo_title || '',
          seo_description: listing?.seo_description || '',
          search_keywords: listing?.search_keywords || [],
          hero_image_url: listing?.hero_image_url || null,
          gallery_urls: listing?.gallery_urls || [],
          video_url: listing?.video_url || null,
          video_reference_frames: listing?.video_reference_frames || [],
          product_name: product?.name || '',
          product_brand: product?.brand || '',
          product_category: product?.category || details?.category || '',
          channel: listing?.channel || 'General marketplace',
        },
      });
      if (error) throw error;
      setAuditData(data);
    } catch (err) {
      console.error('[audit] Failed:', err);
    } finally {
      setAuditing(false);
    }
  }, [listing, product, details]);

  const handleFixWithAI = useCallback(async () => {
    if (!onFixWithAI || !auditData) return;
    setFixing('planning');
    setFixPlan(null);
    try {
      await onFixWithAI(auditData, { setFixing, setFixPlan });
    } catch (err) {
      console.error('[ListingPreview] Fix failed:', err);
      setFixing(null);
      setFixPlan(null);
    }
  }, [onFixWithAI, auditData]);

  // Show generation view
  if (generatingProgress) {
    return (
      <ListingGenerationView
        progress={generatingProgress}
        listing={listing}
        product={product}
        onNavigateToPublish={() => onTabChange?.('publish')}
      />
    );
  }

  const hasListingContent = !!(
    listing?.listing_title || listing?.listing_description || listing?.hero_image_url ||
    listing?.gallery_urls?.length || listing?.bullet_points?.length || listing?.video_url
  );

  if (!hasListingContent) {
    return <EmptyState onGenerateAll={onGenerateAll} loading={loading} t={t} />;
  }

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      t('bg-white border-slate-200', 'bg-zinc-900/40 border-white/5')
    )}>
      {/* Toolbar */}
      <div className={cn(
        'flex items-center justify-between px-5 py-2 border-b',
        t('bg-slate-50/80 border-slate-200', 'bg-white/[0.02] border-white/5')
      )}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className={cn('text-[11px] font-semibold', t('text-slate-600', 'text-zinc-400'))}>Listing Builder</span>
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' && (
              <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-[10px] text-zinc-500">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving
              </motion.span>
            )}
            {saveStatus === 'saved' && (
              <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-[10px] text-cyan-400">
                <Check className="w-2.5 h-2.5" /> Saved
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={onGenerateAll}
          disabled={loading}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
            'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white',
            loading && 'opacity-60 cursor-not-allowed'
          )}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {loading ? 'Generating...' : 'Regenerate'}
        </button>
      </div>

      {/* ── Three-column: Images | Content | Audit Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr_280px]">
        {/* Left: Image Gallery Editor */}
        <div className={cn('p-4 lg:border-r', t('lg:border-slate-100', 'lg:border-white/[0.03]'))}>
          <ImageGalleryEditor
            product={product}
            listing={listing}
            onUpdate={handleImageUpdate}
            onTabChange={onTabChange}
            onGenerateSlotImage={handleGenerateSlot}
            generatingSlot={generatingSlot}
            t={t}
          />
        </div>

        {/* Middle: Title + Key Features + Description */}
        <div className={cn('p-5 lg:p-6 space-y-5', t('', ''))}>
          {/* Title & Tagline */}
          <div>
            {product?.brand && (
              <span className={cn('text-[10px] font-semibold uppercase tracking-wider', 'text-cyan-500')}>
                {product.brand}
              </span>
            )}
            <EditableText
              value={listing?.listing_title || product?.name || ''}
              onChange={(text) => debouncedOnUpdate({ listing_title: text })}
              placeholder="Product listing title..."
              className={cn('text-base font-bold leading-snug mt-0.5', t('text-slate-900', 'text-white'))}
              inputClassName={cn('text-base font-bold leading-snug', t('text-slate-900', 'text-white'))}
              t={t}
            />
            <EditableText
              value={listing?.short_tagline || ''}
              onChange={(text) => debouncedOnUpdate({ short_tagline: text })}
              placeholder="Short tagline..."
              className={cn('text-xs mt-1', t('text-slate-500', 'text-zinc-500'))}
              inputClassName={cn('text-xs', t('text-slate-500', 'text-zinc-500'))}
              t={t}
            />
          </div>

          {/* Key Features */}
          <div className="space-y-1.5">
            <span className={cn('text-[11px] font-semibold uppercase tracking-wider', t('text-slate-400', 'text-zinc-500'))}>
              Key Features
            </span>
            <EditableBullets
              bullets={listing?.bullet_points || []}
              onChange={(bullets) => debouncedOnUpdate({ bullet_points: bullets })}
              t={t}
            />
          </div>

          {/* Description */}
          <div>
            <span className={cn('text-[11px] font-semibold uppercase tracking-wider block mb-1.5', t('text-slate-400', 'text-zinc-500'))}>
              Product Description
            </span>
            <EditableDescription
              value={listing?.listing_description || ''}
              onChange={(text) => debouncedOnUpdate({ listing_description: text })}
              t={t}
            />
          </div>
        </div>

        {/* Right: Audit Sidebar */}
        <AuditSidebar
          audit={auditData}
          auditing={auditing}
          onRunAudit={handleAudit}
          onFixWithAI={handleFixWithAI}
          fixing={fixing}
          fixPlan={fixPlan}
          t={t}
        />
      </div>

      {/* ── Product Specifications (below images, left-aligned) ── */}
      {specs.length > 0 && (
        <div className={cn('border-t', t('border-slate-100', 'border-white/[0.03]'))}>
          <div className="p-4 lg:w-[420px]">
            <button
              onClick={() => setSpecsExpanded(!specsExpanded)}
              className={cn(
                'w-full flex items-center justify-between py-1 transition-colors',
                t('hover:text-slate-900', 'hover:text-white')
              )}
            >
              <div className="flex items-center gap-1.5">
                <Package className={cn('w-3 h-3', t('text-slate-400', 'text-zinc-500'))} />
                <span className={cn('text-[11px] font-semibold uppercase tracking-wider', t('text-slate-500', 'text-zinc-500'))}>
                  Product Specifications
                </span>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-medium', t('bg-slate-100 text-slate-500', 'bg-white/5 text-zinc-500'))}>
                  {specs.length}
                </span>
              </div>
              {specsExpanded
                ? <ChevronUp className={cn('w-3 h-3', t('text-slate-400', 'text-zinc-500'))} />
                : <ChevronDown className={cn('w-3 h-3', t('text-slate-400', 'text-zinc-500'))} />
              }
            </button>
            <AnimatePresence>
              {specsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 space-y-1">
                    {specs.map((spec, idx) => (
                      <div key={idx} className={cn(
                        'flex items-start justify-between py-1.5 px-2 rounded text-xs',
                        idx % 2 === 0 ? t('bg-slate-50/50', 'bg-white/[0.02]') : ''
                      )}>
                        <span className={cn('font-medium', t('text-slate-500', 'text-zinc-500'))}>
                          {spec.name || spec.key || spec.label || 'Spec'}
                        </span>
                        <span className={cn('text-right ml-4', t('text-slate-700', 'text-zinc-300'))}>
                          {spec.value || spec.val || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── SEO Section (collapsible) ── */}
      <div className={cn('px-5 py-3 border-t', t('border-slate-100', 'border-white/[0.03]'))}>
        <SEOSection listing={listing} onUpdate={debouncedOnUpdate} t={t} />
      </div>
    </div>
  );
}
