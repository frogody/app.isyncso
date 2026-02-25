/**
 * Sub-step 1: Logo Type Selection.
 * User picks logo style, icon keywords, and icon style preference.
 */
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { getRelevantKeywords } from '../../../lib/logo-engine/index.js';

const LOGO_TYPES = [
  {
    id: 'icon_wordmark',
    label: 'Icon + Wordmark',
    description: 'Classic combination of symbol and text. Most versatile.',
    needsIcon: true,
  },
  {
    id: 'wordmark_only',
    label: 'Wordmark Only',
    description: 'Text-based logo with distinctive typography.',
    needsIcon: false,
  },
  {
    id: 'lettermark',
    label: 'Lettermark',
    description: 'Initials or first letter as the primary mark.',
    needsIcon: false,
  },
  {
    id: 'abstract',
    label: 'Abstract Mark',
    description: 'Abstract geometric symbol paired with your name.',
    needsIcon: true,
  },
];

const ICON_STYLES = [
  { id: 'geometric', label: 'Geometric', description: 'Clean geometric shapes' },
  { id: 'outlined', label: 'Outlined', description: 'Light, outlined strokes' },
  { id: 'filled', label: 'Filled', description: 'Bold, solid fills' },
];

export default function LogoTypeSelection({ brandDna, palette, typography, onChange }) {
  const [selectedType, setSelectedType] = useState(brandDna?._logoType || null);
  const [keywords, setKeywords] = useState(brandDna?._iconKeywords || []);
  const [iconStyle, setIconStyle] = useState(brandDna?._iconStyle || 'geometric');

  const industry = brandDna?.industry?.primary || '';
  const personalityVector = brandDna?.personality_vector || [50, 50, 50, 50, 50];

  const keywordOptions = useMemo(
    () => getRelevantKeywords(industry, personalityVector),
    [industry, personalityVector],
  );

  const needsIcon = useMemo(() => {
    const type = LOGO_TYPES.find(t => t.id === selectedType);
    return type?.needsIcon ?? false;
  }, [selectedType]);

  const handleTypeSelect = useCallback((typeId) => {
    setSelectedType(typeId);
    onChange({ _logoType: typeId, _iconKeywords: keywords, _iconStyle: iconStyle });
  }, [onChange, keywords, iconStyle]);

  const handleKeywordToggle = useCallback((kw) => {
    setKeywords(prev => {
      const next = prev.includes(kw)
        ? prev.filter(k => k !== kw)
        : prev.length < 5 ? [...prev, kw] : prev;
      onChange({ _logoType: selectedType, _iconKeywords: next, _iconStyle: iconStyle });
      return next;
    });
  }, [onChange, selectedType, iconStyle]);

  const handleStyleSelect = useCallback((style) => {
    setIconStyle(style);
    onChange({ _logoType: selectedType, _iconKeywords: keywords, _iconStyle: style });
  }, [onChange, selectedType, keywords]);

  const primaryColor = palette?.primary?.base || '#000000';
  const fontFamily = typography?.primary_font?.family || 'Inter';
  const companyName = brandDna?.company_name || 'Brand';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Choose Your Logo Style</h2>
        <p className="text-sm text-zinc-400">Select the type that best represents your brand.</p>
      </div>

      {/* Type Cards */}
      <div className="grid grid-cols-2 gap-4">
        {LOGO_TYPES.map((type) => (
          <motion.button
            key={type.id}
            onClick={() => handleTypeSelect(type.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative text-left rounded-[20px] border-2 p-5 transition-colors ${
              selectedType === type.id
                ? 'border-yellow-400 bg-yellow-400/10'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            {/* Preview area */}
            <div className="flex items-center justify-center h-20 mb-4 rounded-xl bg-white/[0.05]">
              <TypePreviewThumb
                type={type.id}
                companyName={companyName}
                fontFamily={fontFamily}
                color={primaryColor}
              />
            </div>

            <h3 className="text-sm font-semibold text-white mb-1">{type.label}</h3>
            <p className="text-xs text-zinc-500">{type.description}</p>

            {selectedType === type.id && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                <Check className="w-4 h-4 text-black" />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Icon Keywords + Style (if icon-based) */}
      <AnimatePresence>
        {selectedType && needsIcon && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Keyword chips */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Icon Keywords</h3>
              <p className="text-xs text-zinc-500 mb-3">Select 3-5 concepts that represent your brand</p>
              <div className="flex flex-wrap gap-2">
                {keywordOptions.map((kw) => (
                  <button
                    key={kw}
                    onClick={() => handleKeywordToggle(kw)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      keywords.includes(kw)
                        ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                        : 'bg-zinc-800/60 text-zinc-400 border border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    {kw}
                  </button>
                ))}
              </div>
              {keywords.length > 0 && (
                <p className="text-xs text-zinc-600 mt-2">{keywords.length}/5 selected</p>
              )}
            </div>

            {/* Icon style */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Icon Style</h3>
              <p className="text-xs text-zinc-500 mb-3">Preferred visual weight for your icon</p>
              <div className="flex gap-3">
                {ICON_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleSelect(style.id)}
                    className={`flex-1 px-4 py-3 rounded-xl text-xs font-medium transition-colors text-center ${
                      iconStyle === style.id
                        ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                        : 'bg-zinc-800/60 text-zinc-400 border border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold mb-0.5">{style.label}</div>
                    <div className="text-zinc-500">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mini preview thumbnails for type cards
function TypePreviewThumb({ type, companyName, fontFamily, color }) {
  const name = companyName.length > 8 ? companyName.slice(0, 8) : companyName;
  const initial = companyName[0]?.toUpperCase() || 'B';

  const textStyle = {
    fontFamily: `'${fontFamily}', sans-serif`,
    color,
  };

  if (type === 'icon_wordmark') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg border border-current flex items-center justify-center" style={{ borderColor: color }}>
          <svg viewBox="0 0 100 100" className="w-5 h-5">
            <path d="M50 10L87 30v40L50 90 13 70V30z" fill={color} />
          </svg>
        </div>
        <span className="text-sm font-bold uppercase tracking-wider" style={textStyle}>{name}</span>
      </div>
    );
  }

  if (type === 'wordmark_only') {
    return <span className="text-lg font-bold uppercase tracking-widest" style={textStyle}>{name}</span>;
  }

  if (type === 'lettermark') {
    return <span className="text-3xl font-black" style={textStyle}>{initial}</span>;
  }

  // abstract
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 100" className="w-8 h-8">
        <circle cx="50" cy="50" r="35" fill="none" stroke={color} strokeWidth="8" />
        <circle cx="50" cy="50" r="12" fill={color} />
      </svg>
      <span className="text-sm font-bold uppercase tracking-wider" style={textStyle}>{name}</span>
    </div>
  );
}
