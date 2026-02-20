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
  ChevronLeft,
  ChevronRight,
  Check,
  GripVertical,
  FileText,
  Star,
  Crown,

} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
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

function ImageTemplateGuide({ selectedCount, hasVideo, t }) {
  const [expanded, setExpanded] = useState(false);

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
            <div className={cn('px-2.5 pb-2.5 pt-1 border-t', t('border-slate-100', 'border-white/5'))}>
              <div className="grid grid-cols-11 gap-1">
                {IMAGE_TEMPLATE.map((slot) => {
                  const colors = TYPE_COLORS[slot.type];
                  const isFilled = slot.slot <= selectedCount;

                  return (
                    <div
                      key={slot.slot}
                      className={cn(
                        'flex flex-col items-center rounded-md border p-1 transition-all',
                        isFilled
                          ? cn(colors.bg, colors.border)
                          : cn(t('border-slate-200 bg-white', 'border-white/5 bg-white/[0.02]'))
                      )}
                    >
                      <span className={cn(
                        'text-[8px] font-bold leading-none',
                        isFilled ? colors.text : t('text-slate-300', 'text-zinc-700')
                      )}>
                        {slot.slot}
                      </span>
                      <span className={cn(
                        'text-[7px] font-medium leading-tight mt-0.5 text-center',
                        isFilled ? colors.text : t('text-slate-400', 'text-zinc-600')
                      )}>
                        {slot.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-1.5">
                {[
                  { type: 'studio', label: '3 Studio (white BG)' },
                  { type: 'lifestyle', label: '4 Lifestyle' },
                  { type: 'graphic', label: '4 USP Graphics' },
                ].map(({ type, label }) => (
                  <div key={type} className="flex items-center gap-1">
                    <div className={cn('w-1.5 h-1.5 rounded-full', TYPE_COLORS[type].bg, 'ring-1', TYPE_COLORS[type].border)} />
                    <span className={cn('text-[9px]', t('text-slate-400', 'text-zinc-500'))}>{label}</span>
                  </div>
                ))}
              </div>
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

function ImageGalleryEditor({ product, listing, onUpdate, onTabChange, t }) {
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

  // Navigate main image
  const prevMain = () => setMainIdx((i) => (i - 1 + selectedUrls.length) % selectedUrls.length);
  const nextMain = () => setMainIdx((i) => (i + 1) % selectedUrls.length);

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
      {/* Main preview — image or video, compact 4:3 aspect */}
      {(mainImage || showingVideo) ? (
        <div className={cn(
          'relative rounded-xl overflow-hidden border group',
          t('bg-slate-50 border-slate-200', 'bg-zinc-800/30 border-white/5')
        )}>
          {showingVideo && videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full aspect-[4/3] object-contain bg-black"
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.img
                key={mainImage}
                src={mainImage}
                alt="Main product"
                className="w-full aspect-[4/3] object-contain"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </AnimatePresence>
          )}

          {/* Nav arrows (images only) */}
          {!showingVideo && selectedUrls.length > 1 && (
            <>
              <button
                onClick={prevMain}
                className={cn(
                  'absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  t('bg-white/90 shadow', 'bg-zinc-900/80 border border-white/10')
                )}
              >
                <ChevronLeft className={cn('w-3 h-3', t('text-slate-600', 'text-zinc-300'))} />
              </button>
              <button
                onClick={nextMain}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  t('bg-white/90 shadow', 'bg-zinc-900/80 border border-white/10')
                )}
              >
                <ChevronRight className={cn('w-3 h-3', t('text-slate-600', 'text-zinc-300'))} />
              </button>
            </>
          )}

          {/* Counter */}
          {totalMedia > 1 && (
            <div className={cn(
              'absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium',
              t('bg-white/90 text-slate-600', 'bg-zinc-900/80 text-zinc-400 border border-white/10')
            )}>
              {showingVideo ? 'Video' : `${mainIdx + 1} / ${selectedUrls.length}`}
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          'aspect-[4/3] rounded-xl border border-dashed flex items-center justify-center',
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
                    'relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all group/thumb',
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
                  'relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all',
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
                  'relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border transition-all opacity-50 hover:opacity-100',
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
      <ImageTemplateGuide selectedCount={selectedUrls.length} hasVideo={!!videoUrl} t={t} />
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
}) {
  const { t } = useTheme();
  const [saveStatus, setSaveStatus] = useState('idle');

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
        'flex items-center justify-between px-4 py-2 border-b',
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

      {/* ── Title (full width, top, like bol.com) ── */}
      <div className={cn('px-4 pt-3 pb-2 border-b', t('border-slate-100', 'border-white/[0.03]'))}>
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
        {(listing?.short_tagline || true) && (
          <EditableText
            value={listing?.short_tagline || ''}
            onChange={(text) => debouncedOnUpdate({ short_tagline: text })}
            placeholder="Short tagline..."
            className={cn('text-xs mt-1', t('text-slate-500', 'text-zinc-500'))}
            inputClassName={cn('text-xs', t('text-slate-500', 'text-zinc-500'))}
            t={t}
          />
        )}
      </div>

      {/* ── Two-column: Images left, Info right ── */}
      <div className={cn('grid grid-cols-1 lg:grid-cols-2 border-b', t('border-slate-100', 'border-white/[0.03]'))}>
        {/* Left: Image Gallery Editor */}
        <div className={cn('p-4 lg:border-r', t('lg:border-slate-100', 'lg:border-white/[0.03]'))}>
          <ImageGalleryEditor
            product={product}
            listing={listing}
            onUpdate={handleImageUpdate}
            onTabChange={onTabChange}
            t={t}
          />
        </div>

        {/* Right: Key Features */}
        <div className="p-4 space-y-4">
          {/* Key Features / Bullet Points */}
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

        </div>
      </div>

      {/* ── Description (full width, below fold) ── */}
      <div className={cn('px-4 py-3 border-b', t('border-slate-100', 'border-white/[0.03]'))}>
        <span className={cn('text-[11px] font-semibold uppercase tracking-wider block mb-1.5', t('text-slate-400', 'text-zinc-500'))}>
          Product Description
        </span>
        <EditableDescription
          value={listing?.listing_description || ''}
          onChange={(text) => debouncedOnUpdate({ listing_description: text })}
          t={t}
        />
      </div>

      {/* ── SEO Section (collapsible) ── */}
      <div className="px-4 py-3">
        <SEOSection listing={listing} onUpdate={debouncedOnUpdate} t={t} />
      </div>
    </div>
  );
}
