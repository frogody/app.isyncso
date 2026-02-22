// ---------------------------------------------------------------------------
// StorePreview.jsx -- Full-fidelity preview page for the B2B Store Builder.
// Loaded inside the builder's iframe. Receives config via postMessage,
// bypassing the full portal/wholesale infrastructure. Renders the complete
// storefront experience: nav bar, sections, footer, and chat widget.
//
// All navigation is intercepted — links scroll to sections or open overlays
// rather than navigating, preventing the iframe from escaping to the main app.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
import { listB2BProducts, getB2BProduct } from '@/lib/db/queries/b2b';
import supabase from '@/api/supabaseClient';

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

// Map common nav label / href patterns to section types for scroll-to
const NAV_SECTION_MAP = {
  products: 'featured_products',
  catalog: 'featured_products',
  shop: 'featured_products',
  about: 'about',
  'about us': 'about',
  contact: 'contact',
  'contact us': 'contact',
  faq: 'faq',
  testimonials: 'testimonials',
  reviews: 'testimonials',
  categories: 'category_grid',
  stats: 'stats',
  partners: 'logo_grid',
};

function scrollToSection(sectionType, sections) {
  const match = sections.find((s) => s.type === sectionType && s.visible !== false);
  if (match) {
    const el = document.querySelector(`.section-${match.type}[data-section-id="${match.id}"]`)
      || document.querySelector(`.section-${match.type}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Search Overlay
// ---------------------------------------------------------------------------
function SearchOverlay({ isOpen, onClose }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--ws-surface, #18181b)',
              border: '1px solid var(--ws-border, #27272a)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex items-center gap-3 px-5 py-4">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ws-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search products, categories..."
                className="flex-1 bg-transparent text-base outline-none"
                style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-font)' }}
              />
              <button
                onClick={onClose}
                className="text-xs px-2 py-1 rounded-md"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--ws-muted)' }}
              >
                ESC
              </button>
            </div>
            <div
              className="px-5 py-6 text-center text-sm"
              style={{ color: 'var(--ws-muted)', borderTop: '1px solid var(--ws-border, #27272a)' }}
            >
              Start typing to search the catalog...
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Cart Drawer
// ---------------------------------------------------------------------------
function CartDrawer({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60]"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-[61] h-full w-full max-w-[22rem] flex flex-col"
            style={{
              backgroundColor: 'var(--ws-bg, #09090b)',
              borderLeft: '1px solid var(--ws-border, #27272a)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--ws-border, #27272a)' }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ws-primary)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
                >
                  Cart
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                style={{ color: 'var(--ws-muted)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Empty state */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ws-muted)', opacity: 0.5 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <h3
                className="text-sm font-semibold mb-1"
                style={{ color: 'var(--ws-text)' }}
              >
                Your cart is empty
              </h3>
              <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                Browse the catalog to add products.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid var(--ws-border, #27272a)' }}>
              <button
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all opacity-50 cursor-not-allowed"
                style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-bg)' }}
                disabled
              >
                Checkout
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Account Dropdown
// ---------------------------------------------------------------------------
function AccountDropdown({ isOpen, onClose, anchorRef }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !anchorRef?.current?.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose, anchorRef]);

  const items = [
    { label: 'My Account', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
    { label: 'Order History', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z' },
    { label: 'Inquiries', icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { label: 'Settings', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z' },
    { divider: true },
    { label: 'Sign Out', icon: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9', danger: true },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full right-0 mt-2 w-56 rounded-xl overflow-hidden z-[60]"
          style={{
            backgroundColor: 'var(--ws-surface, #18181b)',
            border: '1px solid var(--ws-border, #27272a)',
            boxShadow: '0 20px 40px -8px rgba(0,0,0,0.5)',
          }}
        >
          {/* User info header */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--ws-border, #27272a)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>John Doe</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>john@company.com</p>
          </div>

          <div className="py-1.5">
            {items.map((item, i) => {
              if (item.divider) {
                return <div key={i} className="my-1" style={{ borderTop: '1px solid var(--ws-border, #27272a)' }} />;
              }
              return (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.04]"
                  style={{ color: item.danger ? '#ef4444' : 'var(--ws-muted)' }}
                  onClick={onClose}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Mobile Menu Drawer
// ---------------------------------------------------------------------------
function MobileMenuDrawer({ isOpen, onClose, config, sections, onOpenSearch, onOpenCart }) {
  const nav = config?.navigation || {};
  const items = nav.items || [];

  const handleNavClick = useCallback((item) => {
    const key = (item.label || '').toLowerCase().trim();
    const href = (item.href || '').replace(/^\//, '').toLowerCase().trim();
    const sectionType = NAV_SECTION_MAP[key] || NAV_SECTION_MAP[href];
    if (sectionType) {
      scrollToSection(sectionType, sections);
    }
    onClose();
  }, [sections, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55]"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-[56] h-full w-72 flex flex-col"
            style={{
              backgroundColor: 'var(--ws-bg, #09090b)',
              borderLeft: '1px solid var(--ws-border, #27272a)',
            }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--ws-border, #27272a)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>Menu</span>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06]" style={{ color: 'var(--ws-muted)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.04]"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="px-3 py-4 space-y-2" style={{ borderTop: '1px solid var(--ws-border, #27272a)' }}>
              <button
                onClick={() => { onClose(); onOpenSearch(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors hover:bg-white/[0.04]"
                style={{ color: 'var(--ws-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Search
              </button>
              <button
                onClick={() => { onClose(); onOpenCart(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors hover:bg-white/[0.04]"
                style={{ color: 'var(--ws-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                Cart
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Preview NavBar — fully interactive: search overlay, cart drawer, account
// ---------------------------------------------------------------------------
function PreviewNavBar({ config, sections, onOpenSearch, onOpenCart, onOpenAccount, accountBtnRef }) {
  const nav = config?.navigation || {};
  const items = nav.items || [];
  const logoPos = nav.logoPosition || 'left';
  const [activeNavId, setActiveNavId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = useCallback((item) => {
    const key = (item.label || '').toLowerCase().trim();
    const href = (item.href || '').replace(/^\//, '').toLowerCase().trim();
    const sectionType = NAV_SECTION_MAP[key] || NAV_SECTION_MAP[href];
    if (sectionType) {
      scrollToSection(sectionType, sections);
    }
    setActiveNavId(item.id);
  }, [sections]);

  const LogoBrand = (
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
  );

  return (
    <>
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
            {logoPos === 'left' && LogoBrand}
            {logoPos === 'center' && <div className="flex-1" />}

            {/* Nav Items */}
            <nav className="hidden md:flex items-center gap-1">
              {logoPos === 'center' && <div className="mr-6">{LogoBrand}</div>}
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    activeNavId === item.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                  }`}
                  style={{ color: activeNavId === item.id ? 'var(--ws-primary)' : 'var(--ws-muted, #a1a1aa)' }}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {logoPos === 'center' && <div className="flex-1" />}

            {/* Right Icons */}
            <div className="flex items-center gap-1.5 relative">
              {nav.showSearch !== false && (
                <button
                  onClick={onOpenSearch}
                  className="p-2 rounded-lg transition-colors hover:bg-white/[0.06]"
                  style={{ color: 'var(--ws-muted, #a1a1aa)' }}
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </button>
              )}
              {nav.showCart !== false && (
                <button
                  onClick={onOpenCart}
                  className="p-2 rounded-lg transition-colors hover:bg-white/[0.06] relative"
                  style={{ color: 'var(--ws-muted, #a1a1aa)' }}
                  aria-label="Cart"
                >
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
                <button
                  ref={accountBtnRef}
                  onClick={onOpenAccount}
                  className="p-2 rounded-lg transition-colors hover:bg-white/[0.06]"
                  style={{ color: 'var(--ws-muted, #a1a1aa)' }}
                  aria-label="Account"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </button>
              )}
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-white/[0.06]"
                style={{ color: 'var(--ws-muted, #a1a1aa)' }}
                aria-label="Menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenuDrawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        config={config}
        sections={sections}
        onOpenSearch={onOpenSearch}
        onOpenCart={onOpenCart}
      />
    </>
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
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Chat bubble */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: 'var(--ws-primary, #06b6d4)' }}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ws-bg, #000)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ws-bg, #000)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {!open && (
          <span
            className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ backgroundColor: '#ef4444', color: '#fff' }}
          >
            1
          </span>
        )}
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-50 w-80 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--ws-surface, #18181b)',
              border: '1px solid var(--ws-border, #27272a)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              height: '360px',
            }}
          >
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--ws-border, #27272a)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-bg)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>Support</p>
                <p className="text-[11px]" style={{ color: 'var(--ws-muted)' }}>Usually replies in a few minutes</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 text-center" style={{ height: 'calc(100% - 120px)' }}>
              <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                Chat preview — messages will work in the live store.
              </p>
            </div>
            <div className="px-3 py-3" style={{ borderTop: '1px solid var(--ws-border, #27272a)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--ws-bg)',
                    border: '1px solid var(--ws-border)',
                    color: 'var(--ws-text)',
                  }}
                  readOnly
                />
                <button
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-bg)' }}
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main StorePreview Component
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Page placeholders for pages not yet fully built
// ---------------------------------------------------------------------------

const PAGE_LABELS = {
  home: 'Homepage',
  catalog: 'Catalog',
  cart: 'Cart',
  orders: 'Orders',
  account: 'Account',
};

function PlaceholderPage({ pageId, theme }) {
  const label = PAGE_LABELS[pageId] || pageId;
  return (
    <div className="flex-1 flex items-center justify-center py-32 px-6">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'color-mix(in srgb, var(--ws-primary, #06b6d4) 10%, transparent)' }}
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ws-primary, #06b6d4)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <h2
          className="text-xl font-semibold"
          style={{ color: 'var(--ws-text, #fafafa)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {label}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ws-muted, #a1a1aa)' }}>
          This page will display your store's {label.toLowerCase()} once published.
          Use the AI chat to customize how it looks and feels.
        </p>
        <div
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
          style={{
            border: '1px solid color-mix(in srgb, var(--ws-primary, #06b6d4) 30%, transparent)',
            color: 'var(--ws-primary, #06b6d4)',
            backgroundColor: 'color-mix(in srgb, var(--ws-primary, #06b6d4) 5%, transparent)',
          }}
        >
          Preview — {label}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog Page — renders a product grid from config.catalog
// ---------------------------------------------------------------------------

const SAMPLE_PRODUCTS = [
  { id: 1, name: 'Premium Widget A', sku: 'WDG-001', price: 24.99, moq: 10, image: null, category: 'Hardware', stock: 'In Stock' },
  { id: 2, name: 'Industrial Component B', sku: 'IND-002', price: 89.50, moq: 25, image: null, category: 'Components', stock: 'In Stock' },
  { id: 3, name: 'Bulk Fastener Set', sku: 'FST-003', price: 12.75, moq: 5, image: null, category: 'Fasteners', stock: 'Low Stock' },
  { id: 4, name: 'Precision Tool Kit', sku: 'TLK-004', price: 149.00, moq: 50, image: null, category: 'Tools', stock: 'In Stock' },
  { id: 5, name: 'Safety Valve Assembly', sku: 'SVA-005', price: 312.00, moq: 3, image: null, category: 'Safety', stock: 'In Stock' },
  { id: 6, name: 'Multi-Purpose Sealant', sku: 'SLT-006', price: 24.99, moq: 100, image: null, category: 'Consumables', stock: 'In Stock' },
];

function CatalogPage({ config, orgId }) {
  const catalog = config?.catalog || {};
  const columns = catalog.columns || 3;
  const cardStyle = catalog.cardStyle || 'detailed';
  const showFilters = catalog.showFilters !== false;
  const showPricing = catalog.showPricing !== false;
  const showStock = catalog.showStock !== false;

  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setLoading(true);

    listB2BProducts(orgId, { limit: 24 })
      .then((data) => {
        if (cancelled || !data?.length) return;
        const mapped = data.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.physical_products?.[0]?.sku || p.sku || '',
          price: p.b2b_price || p.wholesale_price || p.price || 0,
          moq: p.min_order_quantity || 1,
          image: p.featured_image || null,
          category: p.product_categories?.name || 'Uncategorized',
          stock: p.inventory?.[0]?.quantity_on_hand > 0 ? 'In Stock' : (p.inventory?.[0]?.quantity_on_hand === 0 ? 'Out of Stock' : 'In Stock'),
        }));
        setProducts(mapped);
      })
      .catch((err) => console.warn('[CatalogPage] Failed to fetch products:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [orgId]);

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}>
          Product Catalog
        </h1>
        <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
          Browse our full range of wholesale products
        </p>
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar */}
        {showFilters && (
          <div className="w-56 shrink-0 hidden lg:block">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ws-text)' }}>Categories</h3>
              {categories.map((cat) => (
                <label key={cat} className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <div className="w-4 h-4 rounded border" style={{ borderColor: 'var(--ws-border)' }} />
                  <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>{cat}</span>
                </label>
              ))}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--ws-border)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ws-text)' }}>Price Range</h3>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--ws-border)' }}>
                  <div className="h-full w-3/5 rounded-full" style={{ backgroundColor: 'var(--ws-primary)' }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--ws-muted)' }}>$0</span>
                  <span className="text-[10px]" style={{ color: 'var(--ws-muted)' }}>$500+</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1">
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--ws-border)' }}>
            <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>{products.length} products</span>
            <select className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--ws-surface)', color: 'var(--ws-text)', border: '1px solid var(--ws-border)' }}>
              <option>Sort by Name</option>
              <option>Sort by Price</option>
              <option>Newest First</option>
            </select>
          </div>

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
              >
                {/* Product image */}
                <div
                  className="aspect-square flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--ws-primary) 5%, var(--ws-bg))' }}
                >
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--ws-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  )}
                </div>

                <div className={`p-3 ${cardStyle === 'compact' ? '' : 'space-y-2'}`}>
                  {cardStyle !== 'minimal' && (
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ws-primary)' }}>{product.category}</span>
                  )}
                  <h3 className="text-sm font-medium leading-tight" style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}>
                    {product.name}
                  </h3>
                  {cardStyle === 'detailed' && product.sku && (
                    <p className="text-[10px]" style={{ color: 'var(--ws-muted)' }}>SKU: {product.sku}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    {showPricing && (
                      <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                        ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                      </span>
                    )}
                    {showStock && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          color: product.stock === 'In Stock' ? 'var(--ws-primary)' : 'var(--ws-muted)',
                          backgroundColor: product.stock === 'In Stock'
                            ? 'color-mix(in srgb, var(--ws-primary) 10%, transparent)'
                            : 'color-mix(in srgb, var(--ws-muted) 10%, transparent)',
                        }}
                      >
                        {product.stock}
                      </span>
                    )}
                  </div>
                  {cardStyle === 'detailed' && (
                    <p className="text-[10px]" style={{ color: 'var(--ws-muted)' }}>MOQ: {product.moq} units</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product Detail Page — renders from config.productDetail
// ---------------------------------------------------------------------------

function ProductDetailPage({ config, orgId }) {
  const pd = config?.productDetail || {};
  const imagePosition = pd.imagePosition || 'left';
  const showSpecifications = pd.showSpecifications !== false;
  const showRelatedProducts = pd.showRelatedProducts !== false;
  const showInquiryButton = pd.showInquiryButton !== false;
  const showBulkPricing = pd.showBulkPricing !== false;
  const showSKU = pd.showSKU !== false;
  const showCategories = pd.showCategories !== false;

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch a real product for preview
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setLoading(true);

    listB2BProducts(orgId, { limit: 5 })
      .then((data) => {
        if (cancelled || !data?.length) return;
        const first = data[0];
        setProduct({
          name: first.name,
          sku: first.physical_products?.[0]?.sku || first.sku || 'N/A',
          price: first.b2b_price || first.wholesale_price || first.price || 0,
          description: first.description || 'High-quality product designed for professional use.',
          image: first.featured_image || null,
          gallery: Array.isArray(first.gallery) ? first.gallery : [],
          category: first.product_categories?.name || 'Products',
          stock: first.inventory?.[0]?.quantity_on_hand,
          specifications: first.physical_products?.[0]?.specifications || null,
          moq: first.min_order_quantity || 1,
        });
        // Rest as related
        if (data.length > 1) {
          setRelatedProducts(data.slice(1).map((p) => ({
            id: p.id,
            name: p.name,
            price: p.b2b_price || p.wholesale_price || p.price || 0,
            image: p.featured_image || null,
          })));
        }
      })
      .catch((err) => console.warn('[ProductDetailPage] Failed to fetch product:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [orgId]);

  // Fallback data when no real product
  const p = product || {
    name: 'Professional Widget Pro',
    sku: 'WDG-PRO-001',
    price: 149.99,
    description: 'Industrial-grade precision widget designed for high-volume manufacturing environments. Built with premium stainless steel construction and backed by a 24-month warranty.',
    image: null,
    gallery: [],
    category: 'Hardware',
    stock: null,
    specifications: null,
    moq: 10,
  };

  const specs = p.specifications
    ? Object.entries(p.specifications).map(([label, value]) => ({ label, value: String(value) }))
    : [
        { label: 'Material', value: 'Stainless Steel 304' },
        { label: 'Weight', value: '2.4 kg' },
        { label: 'Dimensions', value: '240 x 180 x 55 mm' },
        { label: 'Operating Temp', value: '-20°C to 85°C' },
        { label: 'Certification', value: 'ISO 9001, CE' },
        { label: 'Warranty', value: '24 months' },
      ];

  const bulkPricing = [
    { qty: '1-9', price: `$${p.price.toFixed(2)}` },
    { qty: '10-49', price: `$${(p.price * 0.9).toFixed(2)}` },
    { qty: '50-99', price: `$${(p.price * 0.8).toFixed(2)}` },
    { qty: '100+', price: `$${(p.price * 0.67).toFixed(2)}` },
  ];

  const allImages = [p.image, ...(p.gallery || [])].filter(Boolean);

  const stockLabel = p.stock != null
    ? (p.stock > 0 ? 'In Stock' : 'Out of Stock')
    : 'In Stock';
  const stockColor = stockLabel === 'In Stock' ? 'var(--ws-primary)' : 'var(--ws-muted)';

  const imageBlock = (
    <div className="space-y-3">
      {/* Main image */}
      <div
        className="aspect-square rounded-xl flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: 'color-mix(in srgb, var(--ws-primary) 5%, var(--ws-bg))', border: '1px solid var(--ws-border)' }}
      >
        {allImages.length > 0 ? (
          <img src={allImages[0]} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-24 h-24 opacity-15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5} style={{ color: 'var(--ws-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
        )}
      </div>
      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-2">
        {(allImages.length > 1 ? allImages.slice(0, 4) : [null, null, null, null]).map((img, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg overflow-hidden"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--ws-primary) 5%, var(--ws-bg))',
              border: i === 0 ? '2px solid var(--ws-primary)' : '1px solid var(--ws-border)',
            }}
          >
            {img && <img src={img} alt="" className="w-full h-full object-cover" />}
          </div>
        ))}
      </div>
    </div>
  );

  const detailBlock = (
    <div className="space-y-6">
      {showCategories && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ws-muted)' }}>
          <span>Home</span>
          <span>/</span>
          <span>{p.category}</span>
          <span>/</span>
          <span style={{ color: 'var(--ws-primary)' }}>{p.name}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}>
          {p.name}
        </h1>
        {showSKU && (
          <p className="text-xs mb-3" style={{ color: 'var(--ws-muted)' }}>SKU: {p.sku}</p>
        )}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold" style={{ color: 'var(--ws-text)' }}>${typeof p.price === 'number' ? p.price.toFixed(2) : p.price}</span>
          <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>per unit</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stockColor }} />
        <span className="text-sm font-medium" style={{ color: stockColor }}>{stockLabel}</span>
        {stockLabel === 'In Stock' && (
          <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>-- Ships in 1-2 business days</span>
        )}
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--ws-muted)' }}>
        {p.description}
      </p>

      {showBulkPricing && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ws-border)' }}>
          <div className="px-4 py-2.5" style={{ backgroundColor: 'color-mix(in srgb, var(--ws-primary) 5%, var(--ws-bg))' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ws-text)' }}>Volume Pricing</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--ws-border)' }}>
            {bulkPricing.map((tier) => (
              <div key={tier.qty} className="flex justify-between px-4 py-2.5" style={{ borderColor: 'var(--ws-border)' }}>
                <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>{tier.qty} units</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>{tier.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--ws-border)' }}>
          <button className="px-3 py-2 text-sm" style={{ color: 'var(--ws-text)', backgroundColor: 'var(--ws-surface)' }}>-</button>
          <span className="px-4 py-2 text-sm font-medium" style={{ color: 'var(--ws-text)', backgroundColor: 'var(--ws-surface)', borderLeft: '1px solid var(--ws-border)', borderRight: '1px solid var(--ws-border)' }}>{p.moq}</span>
          <button className="px-3 py-2 text-sm" style={{ color: 'var(--ws-text)', backgroundColor: 'var(--ws-surface)' }}>+</button>
        </div>
        <button
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-bg)' }}
        >
          Add to Cart -- ${(p.price * p.moq).toFixed(2)}
        </button>
      </div>

      {showInquiryButton && (
        <button
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ border: '1px solid var(--ws-primary)', color: 'var(--ws-primary)', backgroundColor: 'transparent' }}
        >
          Request Custom Quote
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 ${imagePosition === 'right' ? 'direction-rtl' : ''}`}>
        <div style={{ direction: 'ltr' }}>{imagePosition === 'right' ? detailBlock : imageBlock}</div>
        <div style={{ direction: 'ltr' }}>{imagePosition === 'right' ? imageBlock : detailBlock}</div>
      </div>

      {showSpecifications && (
        <div className="mb-12">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}>
            Specifications
          </h2>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ws-border)' }}>
            {specs.map((spec, i) => (
              <div
                key={spec.label}
                className="flex"
                style={{
                  borderTop: i > 0 ? '1px solid var(--ws-border)' : 'none',
                  backgroundColor: i % 2 === 0 ? 'var(--ws-surface)' : 'transparent',
                }}
              >
                <div className="w-40 px-4 py-3 text-sm font-medium" style={{ color: 'var(--ws-text)' }}>{spec.label}</div>
                <div className="flex-1 px-4 py-3 text-sm" style={{ color: 'var(--ws-muted)' }}>{spec.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showRelatedProducts && (
        <div>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}>
            Related Products
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(relatedProducts.length > 0 ? relatedProducts.slice(0, 4) : SAMPLE_PRODUCTS.slice(0, 4)).map((rp) => (
              <div
                key={rp.id}
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
              >
                <div
                  className="aspect-square flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--ws-primary) 5%, var(--ws-bg))' }}
                >
                  {rp.image ? (
                    <img src={rp.image} alt={rp.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 opacity-15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--ws-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-xs font-medium truncate" style={{ color: 'var(--ws-text)' }}>{rp.name}</h3>
                  <span className="text-xs font-semibold" style={{ color: 'var(--ws-text)' }}>${typeof rp.price === 'number' ? rp.price.toFixed(2) : rp.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Preview Component
// ---------------------------------------------------------------------------
export default function StorePreview() {
  const { orgId: urlOrgId } = useParams();
  const [config, setConfig] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [hoveredSectionId, setHoveredSectionId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountBtnRef = useRef(null);
  const [messageOrgId, setMessageOrgId] = useState(null);
  const orgId = urlOrgId || messageOrgId || null;

  // Listen for messages from the parent builder window
  useEffect(() => {
    function handleMessage(event) {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'CONFIG_UPDATE' && event.data.config) {
        setConfig(event.data.config);
        if (event.data.organizationId) {
          setMessageOrgId(event.data.organizationId);
        }
      }
      if (event.data.type === 'NAVIGATE_TO_PAGE' && event.data.pageId) {
        setCurrentPage(event.data.pageId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    window.addEventListener('message', handleMessage);

    // Signal to parent that we're ready to receive config
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'PREVIEW_LOADED' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // CRITICAL: Intercept ALL anchor/link clicks to prevent iframe navigation
  // escape which causes the endless builder-in-builder loop.
  useEffect(() => {
    function handleClick(e) {
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      // Allow same-page anchors and javascript:void(0)
      if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      // Prevent all other navigation — this is a preview
      e.preventDefault();
      e.stopPropagation();

      // Try to scroll to a matching section based on the href
      const cleanHref = href.replace(/^\//, '').toLowerCase().trim();
      if (config?.sections) {
        const sectionType = NAV_SECTION_MAP[cleanHref];
        if (sectionType) {
          const sorted = [...config.sections].filter((s) => s.visible !== false);
          scrollToSection(sectionType, sorted);
        }
      }
    }

    document.addEventListener('click', handleClick, true); // capture phase
    return () => document.removeEventListener('click', handleClick, true);
  }, [config?.sections]);

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
  const mockWholesaleValue = useMemo(() => ({
    config: config || { theme: {}, sections: [], navigation: [], footer: {} },
    storePublished: true, configLoading: false, configError: null,
    orgId: orgId, client: null, clientLoading: false, isAuthenticated: false,
    themeVars, cartItems: [], addToCart: () => {}, removeFromCart: () => {},
    updateQuantity: () => {}, clearCart: () => {}, cartTotal: 0, cartCount: 0,
  }), [config, themeVars, orgId]);

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
        <PreviewNavBar
          config={config}
          sections={sections}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenCart={() => setCartOpen(true)}
          onOpenAccount={() => setAccountOpen((prev) => !prev)}
          accountBtnRef={accountBtnRef}
        />

        {/* Account dropdown (positioned relative to the right icons area) */}
        <div className="relative">
          <div className="absolute top-0 right-4 sm:right-6 lg:right-8 z-[60]" style={{ maxWidth: '100vw' }}>
            <AccountDropdown
              isOpen={accountOpen}
              onClose={() => setAccountOpen(false)}
              anchorRef={accountBtnRef}
            />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {currentPage === 'catalog' ? (
            <CatalogPage config={config} orgId={orgId} />
          ) : currentPage === 'product' ? (
            <ProductDetailPage config={config} orgId={orgId} />
          ) : currentPage !== 'home' ? (
            <PlaceholderPage pageId={currentPage} theme={theme} />
          ) : (
            sections.map((section) => {
              const Component = SECTION_MAP[section.type];
              if (!Component) return null;

              const paddingClass = PADDING_MAP[section.padding] || PADDING_MAP.md;
              const bgStyle = getBackgroundStyle(section.background);
              const isHovered = hoveredSectionId === section.id;

              return (
                <div
                  key={section.id}
                  data-section-id={section.id}
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
          })
          )}
        </main>

        {/* Footer */}
        <PreviewFooter config={config} />

        {/* Overlays */}
        <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />

        {/* Chat Widget */}
        <PreviewChatWidget />
      </div>
    </WholesaleContext.Provider>
  );
}
