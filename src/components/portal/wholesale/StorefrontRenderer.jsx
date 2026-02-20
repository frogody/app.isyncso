import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWholesale } from './WholesaleProvider';

// Section renderers
import HeroRenderer from './sections/HeroRenderer';
import FeaturedProductsRenderer from './sections/FeaturedProductsRenderer';
import CategoryGridRenderer from './sections/CategoryGridRenderer';
import AboutRenderer from './sections/AboutRenderer';
import TestimonialsRenderer from './sections/TestimonialsRenderer';
import CTARenderer from './sections/CTARenderer';
import FAQRenderer from './sections/FAQRenderer';
import ContactRenderer from './sections/ContactRenderer';
import BannerRenderer from './sections/BannerRenderer';
import StatsRenderer from './sections/StatsRenderer';
import RichTextRenderer from './sections/RichTextRenderer';
import LogoGridRenderer from './sections/LogoGridRenderer';

// ---------------------------------------------------------------------------
// Section type to component mapping
// ---------------------------------------------------------------------------

const SECTION_MAP = {
  hero: HeroRenderer,
  featured_products: FeaturedProductsRenderer,
  category_grid: CategoryGridRenderer,
  about: AboutRenderer,
  testimonials: TestimonialsRenderer,
  cta: CTARenderer,
  faq: FAQRenderer,
  contact: ContactRenderer,
  banner: BannerRenderer,
  stats: StatsRenderer,
  rich_text: RichTextRenderer,
  logo_grid: LogoGridRenderer,
};

// ---------------------------------------------------------------------------
// Padding and background helpers
// ---------------------------------------------------------------------------

const PADDING_MAP = {
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-16 md:py-20',
  xl: 'py-20 md:py-28',
};

function getBackgroundStyle(bg) {
  switch (bg) {
    case 'alt':
      return { backgroundColor: 'var(--ws-bg-alt, rgba(255,255,255,0.02))' };
    case 'primary':
      return { backgroundColor: 'var(--ws-primary-bg, rgba(var(--ws-primary-rgb, 6,182,212), 0.06))' };
    case 'dark':
      return { backgroundColor: 'var(--ws-bg-dark, #000)' };
    case 'default':
    default:
      return { backgroundColor: 'transparent' };
  }
}

// ---------------------------------------------------------------------------
// StorefrontRenderer
// ---------------------------------------------------------------------------

export default function StorefrontRenderer() {
  const { config: providerConfig, configLoading } = useWholesale();
  const [searchParams] = useSearchParams();
  const [overrideConfig, setOverrideConfig] = useState(null);
  const [hoveredSectionId, setHoveredSectionId] = useState(null);

  const isPreview = searchParams.get('preview') === 'true';

  // Effective config: override from builder postMessage takes priority
  const config = overrideConfig || providerConfig;

  // Listen for CONFIG_UPDATE from the parent builder window
  useEffect(() => {
    function handleMessage(event) {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'CONFIG_UPDATE' && event.data.config) {
        setOverrideConfig(event.data.config);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Post section click back to parent in preview mode
  const handleSectionClick = useCallback(
    (sectionId) => {
      if (!isPreview || !window.parent) return;
      window.parent.postMessage({ type: 'SECTION_CLICK', sectionId }, '*');
    },
    [isPreview],
  );

  // Derive visible, sorted sections
  const sections = useMemo(() => {
    if (!config?.sections) return [];
    return [...config.sections]
      .filter((s) => s.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config?.sections]);

  const theme = config?.theme ?? {};

  // --- Loading state ---
  if (configLoading && !config) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        style={{ backgroundColor: 'var(--ws-bg, #09090b)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--ws-primary, #06b6d4)', borderTopColor: 'transparent' }}
          />
          <span
            className="text-sm"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (!config) return null;

  if (sections.length === 0) {
    return (
      <div
        className="min-h-[40vh] flex items-center justify-center"
        style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
      >
        <p className="text-sm">No sections configured yet.</p>
      </div>
    );
  }

  return (
    <div>
      {sections.map((section) => {
        const Component = SECTION_MAP[section.type];
        if (!Component) return null;

        const paddingClass = PADDING_MAP[section.padding] || PADDING_MAP.md;
        const bgStyle = getBackgroundStyle(section.background);
        const isHovered = isPreview && hoveredSectionId === section.id;

        return (
          <div
            key={section.id}
            className={`relative ${paddingClass} transition-all ${
              isPreview ? 'cursor-pointer' : ''
            }`}
            style={{
              ...bgStyle,
              ...(isHovered
                ? {
                    outline: '2px solid var(--ws-primary, #06b6d4)',
                    outlineOffset: '-2px',
                  }
                : {}),
            }}
            onClick={isPreview ? () => handleSectionClick(section.id) : undefined}
            onMouseEnter={isPreview ? () => setHoveredSectionId(section.id) : undefined}
            onMouseLeave={isPreview ? () => setHoveredSectionId(null) : undefined}
          >
            {/* Preview hover label */}
            {isPreview && isHovered && (
              <div
                className="absolute top-2 left-2 z-20 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: 'var(--ws-primary, #06b6d4)',
                  color: 'var(--ws-bg, #000)',
                }}
              >
                {section.type.replace(/_/g, ' ')}
              </div>
            )}

            <Component section={section} theme={theme} />
          </div>
        );
      })}
    </div>
  );
}
