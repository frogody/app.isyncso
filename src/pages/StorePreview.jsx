// ---------------------------------------------------------------------------
// StorePreview.jsx -- Lightweight preview page for the B2B Store Builder.
// Loaded inside the builder's iframe. Receives config via postMessage,
// bypassing the full portal/wholesale infrastructure.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

// Section renderers
import HeroRenderer from '@/components/portal/wholesale/sections/HeroRenderer';
import FeaturedProductsRenderer from '@/components/portal/wholesale/sections/FeaturedProductsRenderer';
import CategoryGridRenderer from '@/components/portal/wholesale/sections/CategoryGridRenderer';
import AboutRenderer from '@/components/portal/wholesale/sections/AboutRenderer';
import TestimonialsRenderer from '@/components/portal/wholesale/sections/TestimonialsRenderer';
import CTARenderer from '@/components/portal/wholesale/sections/CTARenderer';
import FAQRenderer from '@/components/portal/wholesale/sections/FAQRenderer';
import ContactRenderer from '@/components/portal/wholesale/sections/ContactRenderer';
import BannerRenderer from '@/components/portal/wholesale/sections/BannerRenderer';
import StatsRenderer from '@/components/portal/wholesale/sections/StatsRenderer';
import RichTextRenderer from '@/components/portal/wholesale/sections/RichTextRenderer';
import LogoGridRenderer from '@/components/portal/wholesale/sections/LogoGridRenderer';

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
    default:
      return { backgroundColor: 'transparent' };
  }
}

function buildThemeVars(theme) {
  if (!theme) return {};
  return {
    '--ws-primary': theme.primaryColor || '#06b6d4',
    '--ws-bg': theme.backgroundColor || '#09090b',
    '--ws-text': theme.textColor || '#fafafa',
    '--ws-surface': theme.surfaceColor || '#18181b',
    '--ws-border': theme.borderColor || '#27272a',
    '--ws-muted': theme.mutedTextColor || '#a1a1aa',
    '--ws-font': theme.font || 'Inter, system-ui, sans-serif',
    '--ws-heading-font': theme.headingFont || 'Inter, system-ui, sans-serif',
  };
}

export default function StorePreview() {
  const [config, setConfig] = useState(null);
  const [hoveredSectionId, setHoveredSectionId] = useState(null);

  // Listen for CONFIG_UPDATE from the parent builder window
  useEffect(() => {
    function handleMessage(event) {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'CONFIG_UPDATE' && event.data.config) {
        setConfig(event.data.config);
      }
    }

    window.addEventListener('message', handleMessage);

    // Signal to parent that we're ready to receive config
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'PREVIEW_LOADED' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Post section click back to parent
  const handleSectionClick = useCallback((sectionId) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'SECTION_CLICK', sectionId }, '*');
    }
  }, []);

  // Derive visible, sorted sections
  const sections = useMemo(() => {
    if (!config?.sections) return [];
    return [...config.sections]
      .filter((s) => s.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config?.sections]);

  const theme = config?.theme ?? {};
  const themeVars = useMemo(() => buildThemeVars(theme), [theme]);

  // Waiting for config from builder
  if (!config) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#09090b' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }}
          />
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Connecting to builder...
          </span>
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ ...themeVars, backgroundColor: 'var(--ws-bg, #09090b)', color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
      >
        <p className="text-sm">No sections configured yet.</p>
      </div>
    );
  }

  return (
    <div style={{ ...themeVars, backgroundColor: 'var(--ws-bg, #09090b)', minHeight: '100vh' }}>
      {sections.map((section) => {
        const Component = SECTION_MAP[section.type];
        if (!Component) return null;

        const paddingClass = PADDING_MAP[section.padding] || PADDING_MAP.md;
        const bgStyle = getBackgroundStyle(section.background);
        const isHovered = hoveredSectionId === section.id;

        return (
          <div
            key={section.id}
            className={`relative ${paddingClass} transition-all cursor-pointer`}
            style={{
              ...bgStyle,
              ...(isHovered
                ? { outline: '2px solid var(--ws-primary, #06b6d4)', outlineOffset: '-2px' }
                : {}),
            }}
            onClick={() => handleSectionClick(section.id)}
            onMouseEnter={() => setHoveredSectionId(section.id)}
            onMouseLeave={() => setHoveredSectionId(null)}
          >
            {isHovered && (
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
