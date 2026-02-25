/**
 * Sub-step 3: Logo Refinement.
 * Tabbed edit panel with live SVG preview and multi-context strip.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { ICON_LIBRARY, getIconById } from '../../../lib/logo-engine/index.js';
import {
  buildFontImport,
  buildWordmarkText,
  buildLettermarkText,
  buildIconElement,
  composeHorizontalLogo,
  composeStackedLogo,
  composeWordmarkOnly,
  composeIconOnly,
  composeLettermark,
  estimateTextWidth,
} from '../../../lib/logo-engine/svg-builder.js';

const TABS = [
  { id: 'typography', label: 'Typography' },
  { id: 'layout', label: 'Layout' },
  { id: 'icon', label: 'Icon' },
];

const BG_MODES = [
  { id: 'white', label: 'Light', className: 'bg-white' },
  { id: 'dark', label: 'Dark', className: 'bg-zinc-900' },
  { id: 'brand', label: 'Brand' },
];

export default function LogoRefinement({
  concept,
  onChange,
  typography,
  palette,
  companyName,
  brandDna,
}) {
  const params = concept?._params || {};
  const hasIcon = params.icon != null;
  const isLettermark = concept?.style === 'lettermark';

  // Editable params
  const [fontWeight, setFontWeight] = useState(params.fontWeight || 700);
  const [letterSpacing, setLetterSpacing] = useState(parseFloat(params.letterSpacing) || 0);
  const [textCase, setTextCase] = useState(params.textTransform || 'uppercase');
  const [layout, setLayout] = useState(params.layout || 'horizontal');
  const [iconSize, setIconSize] = useState(50);
  const [spacing, setSpacing] = useState(16);
  const [iconId, setIconId] = useState(params.icon?.id || null);
  const [iconScale, setIconScale] = useState(1);
  const [activeTab, setActiveTab] = useState('typography');
  const [bgMode, setBgMode] = useState('white');

  const fontFamily = params.fontFamily || typography?.primary_font?.family || 'Inter';
  const googleFontsUrl = typography?.primary_font?.google_fonts_url || '';
  const fill = params.fill || palette?.primary?.base || '#000000';
  const fontImport = buildFontImport(fontFamily, googleFontsUrl);
  const fontSize = params.fontSize || 42;

  // Get current icon
  const currentIcon = useMemo(() => iconId ? getIconById(iconId) : params.icon, [iconId, params.icon]);

  // Get icon alternatives
  const iconAlternatives = useMemo(() => {
    if (!currentIcon) return [];
    return ICON_LIBRARY
      .filter(i => i.category === currentIcon.category && i.id !== currentIcon.id)
      .slice(0, 8);
  }, [currentIcon]);

  // Rebuild SVG on param change
  const liveSvg = useMemo(() => {
    const spacingStr = `${letterSpacing}em`;
    const wordmark = buildWordmarkText(companyName, fontFamily, {
      fontSize, fontWeight, letterSpacing: spacingStr, textTransform: textCase, fill,
    });
    const iconEl = currentIcon ? buildIconElement(currentIcon, { fill, scale: iconScale }) : null;
    const letterEl = buildLettermarkText(companyName, fontFamily, { fontSize: 60, fontWeight, fill });

    const displayText = textCase === 'uppercase' ? companyName.toUpperCase()
      : textCase === 'lowercase' ? companyName.toLowerCase()
      : companyName;
    const tw = estimateTextWidth(displayText, fontSize, letterSpacing);

    if (isLettermark) {
      return composeLettermark(letterEl, fontImport, { size: 100 });
    }

    if (!hasIcon || concept?.style === 'wordmark_only') {
      return composeWordmarkOnly(wordmark, fontImport, { textWidth: tw, height: 70 });
    }

    if (layout === 'stacked') {
      return composeStackedLogo(wordmark, iconEl, fontImport, { iconSize, spacing, textWidth: tw, fontSize });
    }

    return composeHorizontalLogo(wordmark, iconEl, fontImport, { iconSize, spacing, textWidth: tw, height: 70 });
  }, [companyName, fontFamily, fontImport, fontSize, fontWeight, letterSpacing, textCase, fill, currentIcon, iconScale, layout, iconSize, spacing, hasIcon, isLettermark, concept?.style]);

  // Propagate changes back
  useEffect(() => {
    if (!concept) return;
    const spacingStr = `${letterSpacing}em`;
    onChange({
      ...concept,
      svg_source: liveSvg,
      _params: {
        ...params,
        fontWeight,
        letterSpacing: spacingStr,
        textTransform: textCase,
        layout,
        icon: currentIcon || params.icon,
        fontSize,
      },
    });
  }, [liveSvg]); // eslint-disable-line react-hooks/exhaustive-deps

  const brandBg = palette?.primary?.base || '#3B82F6';

  // Available weights from font
  const availableWeights = typography?.primary_font?.weights_available || [400, 500, 600, 700, 800];
  const minWeight = Math.min(...availableWeights);
  const maxWeight = Math.max(...availableWeights);

  // Filter tabs: hide icon tab if no icon
  const visibleTabs = useMemo(() => {
    if (!hasIcon || isLettermark) return TABS.filter(t => t.id !== 'icon' && t.id !== 'layout');
    return TABS;
  }, [hasIcon, isLettermark]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Refine Your Logo</h2>
        <p className="text-sm text-zinc-400">Adjust typography, layout, and icon. Everything updates live.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Live preview */}
        <div className="space-y-3">
          <div
            className={`aspect-square rounded-[20px] flex items-center justify-center p-10 transition-colors ${
              bgMode === 'white' ? 'bg-white' : bgMode === 'dark' ? 'bg-zinc-900 border border-white/10' : ''
            }`}
            style={bgMode === 'brand' ? { backgroundColor: brandBg } : undefined}
          >
            <div
              dangerouslySetInnerHTML={{ __html: liveSvg }}
              className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
            />
          </div>

          <div className="flex gap-2">
            {BG_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setBgMode(mode.id)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                  bgMode === mode.id
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                    : 'bg-zinc-800/60 text-zinc-500 border border-white/[0.06] hover:border-white/20'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Tabbed controls */}
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-white/10 pb-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-5"
            >
              {activeTab === 'typography' && (
                <>
                  <ControlGroup label="Font Weight" value={fontWeight}>
                    <Slider
                      value={[fontWeight]}
                      onValueChange={([v]) => setFontWeight(v)}
                      min={minWeight}
                      max={maxWeight}
                      step={100}
                    />
                  </ControlGroup>

                  <ControlGroup label="Letter Spacing" value={`${letterSpacing.toFixed(2)}em`}>
                    <Slider
                      value={[letterSpacing]}
                      onValueChange={([v]) => setLetterSpacing(v)}
                      min={-0.05}
                      max={0.15}
                      step={0.01}
                    />
                  </ControlGroup>

                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-2 block">Text Transform</label>
                    <div className="flex gap-2">
                      {['uppercase', 'lowercase', 'capitalize'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setTextCase(c)}
                          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                            textCase === c
                              ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                              : 'bg-zinc-800/60 text-zinc-400 border border-white/[0.06] hover:border-white/20'
                          }`}
                        >
                          {c === 'capitalize' ? 'Title' : c.charAt(0).toUpperCase() + c.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'layout' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-2 block">Layout</label>
                    <div className="flex gap-2">
                      {['horizontal', 'stacked'].map((l) => (
                        <button
                          key={l}
                          onClick={() => setLayout(l)}
                          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                            layout === l
                              ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                              : 'bg-zinc-800/60 text-zinc-400 border border-white/[0.06] hover:border-white/20'
                          }`}
                        >
                          {l.charAt(0).toUpperCase() + l.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ControlGroup label="Icon Size" value={`${iconSize}px`}>
                    <Slider
                      value={[iconSize]}
                      onValueChange={([v]) => setIconSize(v)}
                      min={30}
                      max={100}
                      step={5}
                    />
                  </ControlGroup>

                  <ControlGroup label="Spacing" value={`${spacing}px`}>
                    <Slider
                      value={[spacing]}
                      onValueChange={([v]) => setSpacing(v)}
                      min={5}
                      max={50}
                      step={5}
                    />
                  </ControlGroup>
                </>
              )}

              {activeTab === 'icon' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-2 block">Swap Icon</label>
                    <div className="grid grid-cols-4 gap-2">
                      {iconAlternatives.map((icon) => (
                        <button
                          key={icon.id}
                          onClick={() => setIconId(icon.id)}
                          className={`aspect-square rounded-lg border p-2 flex items-center justify-center transition-colors ${
                            iconId === icon.id
                              ? 'border-yellow-400 bg-yellow-400/10'
                              : 'border-white/[0.06] bg-zinc-800/40 hover:border-white/20'
                          }`}
                        >
                          <svg viewBox={icon.viewBox} className="w-full h-full">
                            <path d={icon.svgPath} fill={fill} fillRule="evenodd" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  <ControlGroup label="Icon Scale" value={`${Math.round(iconScale * 100)}%`}>
                    <Slider
                      value={[iconScale]}
                      onValueChange={([v]) => setIconScale(v)}
                      min={0.6}
                      max={1.4}
                      step={0.1}
                    />
                  </ControlGroup>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Multi-context preview strip */}
      <div className="grid grid-cols-4 gap-3 pt-6 border-t border-white/10">
        <ContextMockup label="Business Card" svg={liveSvg} bgClass="bg-white" aspect="aspect-[3/2]" />
        <ContextMockup label="Website Header" svg={liveSvg} bgClass="bg-zinc-50" aspect="aspect-[4/1]" />
        <ContextMockup label="Social Avatar" svg={liveSvg} bgClass="bg-white" aspect="aspect-square" round />
        <ContextMockup label="App Icon" svg={liveSvg} bgClass="bg-zinc-900" aspect="aspect-square" />
      </div>
    </div>
  );
}

function ControlGroup({ label, value, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-zinc-400">{label}</label>
        <span className="text-xs text-zinc-500 font-mono">{value}</span>
      </div>
      {children}
    </div>
  );
}

function ContextMockup({ label, svg, bgClass, aspect, round }) {
  return (
    <div className="text-center">
      <div className={`${bgClass} ${aspect} ${round ? 'rounded-full' : 'rounded-xl'} overflow-hidden flex items-center justify-center p-3`}>
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="w-full h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
          style={{ transform: 'scale(0.4)', transformOrigin: 'center' }}
        />
      </div>
      <span className="text-[10px] text-zinc-600 mt-1 block">{label}</span>
    </div>
  );
}
