// ---------------------------------------------------------------------------
// StorePreview.jsx -- Full-fidelity preview page for the B2B Store Builder.
// Loaded inside the builder's iframe. Receives config via postMessage,
// bypassing the full portal/wholesale infrastructure. Renders the complete
// storefront experience: nav bar, sections, footer, and chat widget.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { WholesaleContext } from '@/components/portal/wholesale/WholesaleProvider';

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

// ---------------------------------------------------------------------------
// Preview NavBar — mirrors WholesaleLayout's NavBar without real navigation
// ---------------------------------------------------------------------------
function PreviewNavBar({ config }) {
  const nav = config?.navigation || {};
  const items = nav.items || [];
  const logoPos = nav.logoPosition || 'left';

  return (
    <header
      className="w-full z-30"
      style={{
        backgroundColor: 'var(--ws-bg, #09090b)',
        borderBottom: '1px solid var(--ws-border, #27272a)',
        position: nav.sticky ? 'sticky' : 'relative',
        top: 0,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          {logoPos === 'left' && (
            <div className="flex-shrink-0 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
              >
                {(config?.seo?.title || 'S')[0]?.toUpperCase()}
              </div>
              <span
                className="text-sm font-semibold truncate max-w-[160px]"
                style={{ color: 'var(--ws-text, #fafafa)', fontFamily: 'var(--ws-heading-font)' }}
              >
                {config?.seo?.title || 'Your Store'}
              </span>
            </div>
          )}

          {/* Center logo */}
          {logoPos === 'center' && <div className="flex-1" />}

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {logoPos === 'center' && (
              <div className="flex items-center gap-2 mr-6">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
                >
                  {(config?.seo?.title || 'S')[0]?.toUpperCase()}
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--ws-text, #fafafa)', fontFamily: 'var(--ws-heading-font)' }}
                >
                  {config?.seo?.title || 'Your Store'}
                </span>
              </div>
            )}
            {items.map((item) => (
              <span
                key={item.id}
                className="px-3 py-2 rounded-md text-sm cursor-default transition-colors"
                style={{ color: 'var(--ws-muted, #a1a1aa)' }}
              >
                {item.label}
              </span>
            ))}
          </nav>

          {logoPos === 'center' && <div className="flex-1" />}

          {/* Right Icons */}
          <div className="flex items-center gap-3">
            {nav.showSearch !== false && (
              <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--ws-muted, #a1a1aa)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </button>
            )}
            {nav.showCart !== false && (
              <button className="p-2 rounded-lg transition-colors relative" style={{ color: 'var(--ws-muted, #a1a1aa)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
                >
                  0
                </span>
              </button>
            )}
            {nav.showAccount !== false && (
              <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--ws-muted, #a1a1aa)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </button>
            )}
            {/* Mobile hamburger */}
            <button className="md:hidden p-2 rounded-lg" style={{ color: 'var(--ws-muted, #a1a1aa)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Preview Footer — mirrors WholesaleLayout's Footer
// ---------------------------------------------------------------------------
function PreviewFooter({ config }) {
  const footer = config?.footer || {};
  const year = new Date().getFullYear();
  const copyright = (footer.copyrightText || '\u00a9 {year} Your Company. All rights reserved.').replace('{year}', year);
  const socialLinks = footer.socialLinks || [];

  const SocialIcon = ({ platform }) => {
    const icons = {
      facebook: <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />,
      twitter: <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />,
      instagram: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>,
      linkedin: <><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></>,
      youtube: <><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.35 29 29 0 00-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></>,
    };
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {icons[platform] || null}
      </svg>
    );
  };

  return (
    <footer
      style={{
        backgroundColor: 'var(--ws-surface, #18181b)',
        borderTop: '1px solid var(--ws-border, #27272a)',
        color: 'var(--ws-muted, #a1a1aa)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Columns if configured */}
        {footer.columns?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {footer.columns.map((col, i) => (
              <div key={i}>
                <h4
                  className="text-sm font-semibold mb-3"
                  style={{ color: 'var(--ws-text, #fafafa)', fontFamily: 'var(--ws-heading-font)' }}
                >
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {(col.links || []).map((link, j) => (
                    <li key={j}>
                      <span className="text-sm cursor-default hover:opacity-80 transition-opacity">
                        {link.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Newsletter */}
        {footer.showNewsletter && (
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-8 pb-8" style={{ borderBottom: '1px solid var(--ws-border, #27272a)' }}>
            <span className="text-sm" style={{ color: 'var(--ws-text, #fafafa)' }}>Stay updated</span>
            <div className="flex gap-2 flex-1 max-w-md">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--ws-bg, #09090b)',
                  border: '1px solid var(--ws-border, #27272a)',
                  color: 'var(--ws-text, #fafafa)',
                }}
                readOnly
              />
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
              >
                Subscribe
              </button>
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">{copyright}</p>
          {footer.showSocial && socialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              {socialLinks.map((link, i) => (
                <span key={i} className="opacity-60 hover:opacity-100 transition-opacity cursor-default">
                  <SocialIcon platform={link.platform} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Preview Chat Widget — visual-only floating chat bubble
// ---------------------------------------------------------------------------
function PreviewChatWidget() {
  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-default"
      style={{ backgroundColor: 'var(--ws-primary, #06b6d4)' }}
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ws-bg, #000)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {/* Unread badge */}
      <span
        className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
        style={{ backgroundColor: '#ef4444', color: '#fff' }}
      >
        1
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main StorePreview Component
// ---------------------------------------------------------------------------
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

  // Mock WholesaleContext so FeaturedProductsRenderer doesn't crash.
  // With orgId: null it falls back to placeholder products (no DB calls).
  const mockWholesaleValue = useMemo(() => ({
    config: config || { theme: {}, sections: [], navigation: [], footer: {} },
    storePublished: true, configLoading: false, configError: null,
    orgId: null, client: null, clientLoading: false, isAuthenticated: false,
    themeVars, cartItems: [], addToCart: () => {}, removeFromCart: () => {},
    updateQuantity: () => {}, clearCart: () => {}, cartTotal: 0, cartCount: 0,
  }), [config, themeVars]);

  // Inject customHead into document head (Google Fonts, external styles, etc.)
  useEffect(() => {
    const head = config?.customHead;
    if (!head) return;
    const container = document.createElement('div');
    container.id = 'store-custom-head';
    container.innerHTML = head;
    const nodes = Array.from(container.childNodes);
    nodes.forEach((node) => document.head.appendChild(node));
    return () => { nodes.forEach((node) => { try { document.head.removeChild(node); } catch {} }); };
  }, [config?.customHead]);

  // Inject customCss as a <style> tag
  useEffect(() => {
    const css = config?.customCss;
    if (!css) return;
    const style = document.createElement('style');
    style.id = 'store-custom-css';
    style.textContent = css;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch {} };
  }, [config?.customCss]);

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
    <WholesaleContext.Provider value={mockWholesaleValue}>
      <div
        style={{
          ...themeVars,
          backgroundColor: 'var(--ws-bg, #09090b)',
          minHeight: '100vh',
          fontFamily: 'var(--ws-font, Inter, system-ui, sans-serif)',
          color: 'var(--ws-text, #fafafa)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Navigation Bar */}
        <PreviewNavBar config={config} />

        {/* Sections */}
        <main className="flex-1">
          {sections.map((section) => {
            const Component = SECTION_MAP[section.type];
            if (!Component) return null;

            const paddingClass = PADDING_MAP[section.padding] || PADDING_MAP.md;
            const bgStyle = getBackgroundStyle(section.background);
            const isHovered = hoveredSectionId === section.id;

            return (
              <div
                key={section.id}
                className={`relative section-${section.type} ${section.customClass || ''} ${paddingClass} transition-all cursor-pointer`}
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
        </main>

        {/* Footer */}
        <PreviewFooter config={config} />

        {/* Chat Widget */}
        <PreviewChatWidget />
      </div>
    </WholesaleContext.Provider>
  );
}
