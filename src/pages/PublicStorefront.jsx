// ---------------------------------------------------------------------------
// PublicStorefront.jsx -- Standalone public B2B storefront page.
// Loads a store by subdomain from the database. Unlike StorePreview (which
// lives inside the builder iframe and receives config via postMessage), this
// component fetches everything from the database and renders a fully
// independent customer-facing storefront.
//
// Cart state is persisted to localStorage keyed by subdomain.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getStoreBySubdomain } from '@/lib/db/queries/b2b';
import supabase from '@/api/supabaseClient';
import { supabase as supabaseAuth } from '@/api/supabaseClient';
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

// Preview page components
import usePreviewCart from '@/components/portal/wholesale/preview/usePreviewCart';
import usePreviewNavigation from '@/components/portal/wholesale/preview/usePreviewNavigation';
import PreviewCartDrawer from '@/components/portal/wholesale/preview/PreviewCartDrawer';
import PreviewSearchOverlay from '@/components/portal/wholesale/preview/PreviewSearchOverlay';
import PreviewCatalogPage from '@/components/portal/wholesale/preview/PreviewCatalogPage';
import PreviewProductDetailPage from '@/components/portal/wholesale/preview/PreviewProductDetailPage';
import PreviewCartPage from '@/components/portal/wholesale/preview/PreviewCartPage';
import PreviewCheckoutPage from '@/components/portal/wholesale/preview/PreviewCheckoutPage';
import PreviewOrdersPage from '@/components/portal/wholesale/preview/PreviewOrdersPage';
import PreviewOrderDetailPage from '@/components/portal/wholesale/preview/PreviewOrderDetailPage';
import PreviewAccountPage from '@/components/portal/wholesale/preview/PreviewAccountPage';
import PreviewInquiriesPage from '@/components/portal/wholesale/preview/PreviewInquiriesPage';
import PreviewSettingsPage from '@/components/portal/wholesale/preview/PreviewSettingsPage';
import PreviewInvoicesPage from '@/components/portal/wholesale/preview/PreviewInvoicesPage';
import PreviewInvoiceDetailPage from '@/components/portal/wholesale/preview/PreviewInvoiceDetailPage';
import StoreHomePage from '@/components/portal/wholesale/preview/StoreHomePage';

// ---------------------------------------------------------------------------
// Constants & Helpers
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
// AccountDropdown
// ---------------------------------------------------------------------------

function AccountDropdown({ isOpen, onClose, anchorRef, onNavigate, client, onSignOut }) {
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
    { label: 'My Account', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z', page: 'account' },
    { label: 'Order History', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z', page: 'orders' },
    { label: 'Inquiries', icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', page: 'inquiries' },
    { label: 'Settings', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z', page: 'settings' },
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
            <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
              {client?.full_name || client?.client_name || 'Account'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
              {client?.email || client?.company_name || ''}
            </p>
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
                  onClick={() => {
                    if (item.danger && onSignOut) {
                      onSignOut();
                    } else if (item.page && onNavigate) {
                      onNavigate(item.page);
                    }
                    onClose();
                  }}
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
// MobileMenuDrawer
// ---------------------------------------------------------------------------

function MobileMenuDrawer({ isOpen, onClose, currentPage, onNavigate, onOpenSearch, onOpenCart }) {
  const MOBILE_NAV = [
    { id: 'home', label: 'Home', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
    { id: 'catalog', label: 'Product Catalog', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
    { id: 'orders', label: 'Order History', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z' },
    { id: 'account', label: 'Company Account', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
  ];

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
              {MOBILE_NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); onClose(); }}
                  className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: currentPage === item.id ? 'var(--ws-primary)' : 'var(--ws-muted)',
                    backgroundColor: currentPage === item.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                  }}
                >
                  <svg className="w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
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
                Search Products
              </button>
              <button
                onClick={() => { onClose(); onOpenCart(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors hover:bg-white/[0.04]"
                style={{ color: 'var(--ws-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                Current Order
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// PublicNavBar -- same as PreviewNavBar but with logo_url support
// ---------------------------------------------------------------------------

function PublicNavBar({ config, currentPage, onNavigate, onOpenSearch, onOpenCart, onOpenAccount, accountBtnRef, cartItemCount = 0, logoUrl }) {
  const navConfig = config?.navigation || {};
  const logoPos = navConfig.logoPosition || 'left';
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV_LINKS = [
    { id: 'catalog', label: 'Catalog' },
    { id: 'orders', label: 'Orders' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'account', label: 'Account' },
  ];

  const LogoBrand = (
    <button onClick={() => onNavigate('home')} className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={config?.seo?.title || 'Store'}
          className="w-8 h-8 rounded-lg object-contain"
         loading="lazy" decoding="async" />
      ) : (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
        >
          {(config?.seo?.title || 'S')[0]?.toUpperCase()}
        </div>
      )}
      <span
        className="text-sm font-semibold truncate max-w-[160px]"
        style={{ color: 'var(--ws-text, #fafafa)', fontFamily: 'var(--ws-heading-font)' }}
      >
        {config?.seo?.title || 'Your Store'}
      </span>
    </button>
  );

  return (
    <>
      <header
        className="w-full z-30"
        style={{
          backgroundColor: 'var(--ws-bg, #09090b)',
          borderBottom: '1px solid var(--ws-border, #27272a)',
          position: navConfig.sticky ? 'sticky' : 'relative',
          top: 0,
        }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            {logoPos === 'left' && LogoBrand}
            {logoPos === 'center' && <div className="flex-1" />}

            {/* Nav Items */}
            <nav className="hidden md:flex items-center gap-1">
              {logoPos === 'center' && <div className="mr-6">{LogoBrand}</div>}
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    currentPage === link.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                  }`}
                  style={{ color: currentPage === link.id ? 'var(--ws-primary)' : 'var(--ws-muted, #a1a1aa)' }}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {logoPos === 'center' && <div className="flex-1" />}

            {/* Right Icons */}
            <div className="flex items-center gap-1.5 relative">
              {navConfig.showSearch !== false && (
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
              {navConfig.showCart !== false && (
                <button
                  onClick={onOpenCart}
                  className="p-2 rounded-lg transition-colors hover:bg-white/[0.06] relative"
                  style={{ color: 'var(--ws-muted, #a1a1aa)' }}
                  aria-label="Order"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
                  >
                    {cartItemCount}
                  </span>
                </button>
              )}
              {navConfig.showAccount !== false && (
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
        currentPage={currentPage}
        onNavigate={onNavigate}
        onOpenSearch={onOpenSearch}
        onOpenCart={onOpenCart}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// PublicFooter
// ---------------------------------------------------------------------------

function PublicFooter({ config }) {
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
      <div className="w-full px-4 sm:px-6 lg:px-10 py-10">
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
// StoreLoginPage -- Auth gate login screen themed with store CSS vars
// ---------------------------------------------------------------------------

function StoreLoginPage({ storeData, themeVars, onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const config = storeData?.store_config || {};
  const storeName = config?.seo?.title || config?.navigation?.companyName || 'Store';
  const logoUrl = storeData?.logo_url;
  const orgId = storeData?.organization_id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setError(null);

    try {
      // Verify email exists in portal_clients for this org
      const { data: clientData, error: clientErr } = await supabaseAuth
        .from('portal_clients')
        .select('id, email, organization_id, status')
        .eq('email', email.toLowerCase().trim())
        .eq('organization_id', orgId)
        .in('status', ['active', 'invited'])
        .single();

      if (clientErr || !clientData) {
        setError('No account found with this email. Please contact your supplier.');
        setSending(false);
        return;
      }

      // Send magic link OTP
      const { error: authErr } = await supabaseAuth.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname,
          data: {
            portal_client_id: clientData.id,
            organization_id: clientData.organization_id,
          },
        },
      });

      if (authErr) throw authErr;
      setSent(true);
    } catch (err) {
      console.error('[StoreLogin] error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        ...themeVars,
        backgroundColor: 'var(--ws-bg, #09090b)',
        minHeight: '100vh',
        fontFamily: 'var(--ws-font, Inter, system-ui, sans-serif)',
        color: 'var(--ws-text, #fafafa)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo & Store Name */}
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="w-16 h-16 rounded-2xl object-contain mb-4"  loading="lazy" decoding="async" />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4"
              style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
            >
              {storeName[0]?.toUpperCase()}
            </div>
          )}
          <h1
            className="text-xl font-semibold"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
          >
            {storeName}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ws-muted, #a1a1aa)' }}>
            Sign in to access the wholesale store
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--ws-surface, #18181b)',
            border: '1px solid var(--ws-border, #27272a)',
          }}
        >
          {sent ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ws-text)' }}>
                Check your email
              </h3>
              <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                We sent a login link to <strong style={{ color: 'var(--ws-text)' }}>{email}</strong>
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-4 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--ws-primary, #06b6d4)' }}
              >
                Use a different email
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ws-text)' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--ws-bg, #09090b)',
                  border: '1px solid var(--ws-border, #27272a)',
                  color: 'var(--ws-text, #fafafa)',
                }}
                autoFocus
              />
              {error && (
                <p className="text-sm mt-2" style={{ color: '#ef4444' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full mt-4 px-4 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--ws-primary, #06b6d4)',
                  color: 'var(--ws-bg, #000)',
                }}
              >
                {sending ? 'Sending...' : 'Continue with Email'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--ws-muted, #a1a1aa)', opacity: 0.6 }}>
          Don't have an account? Contact your supplier for access.
        </p>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main PublicStorefront Component
// ---------------------------------------------------------------------------

export default function PublicStorefront({ subdomain }) {
  // Store data from DB
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Navigation
  const [currentPage, setCurrentPage] = useState('home');
  const [pageData, setPageData] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountBtnRef = useRef(null);

  // Auth state
  const [portalClient, setPortalClient] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const portalClientRef = useRef(null); // Track resolved client for auth-change handler

  // Company and products
  const [companyId, setCompanyId] = useState(null);
  const [allProducts, setAllProducts] = useState([]);

  // Cart with localStorage persistence (keyed by subdomain)
  const cart = usePreviewCart({ storageKey: `store-cart-${subdomain}` });
  const nav = usePreviewNavigation(setCurrentPage, setPageData);

  // -----------------------------------------------------------------------
  // 1. Load store config by subdomain
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getStoreBySubdomain(subdomain)
      .then((data) => {
        if (cancelled) return;
        if (!data || !data.store_published) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setStoreData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PublicStorefront] Failed to load store:', err);
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [subdomain]);

  // -----------------------------------------------------------------------
  // 1b. Auth gate -- check session and resolve portal_client for this org
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!storeData?.organization_id) return;
    let cancelled = false;
    const orgId = storeData.organization_id;

    const resolveClient = async (userId, userEmail) => {
      const selectFields = '*, organization:organizations(id, name, slug, logo_url)';

      // Try by auth_user_id first
      let { data, error: fetchErr } = await supabaseAuth
        .from('portal_clients')
        .select(selectFields)
        .eq('auth_user_id', userId)
        .eq('organization_id', orgId)
        .in('status', ['active', 'invited'])
        .single();

      // Fallback: try by email and link account
      if (fetchErr?.code === 'PGRST116' && userEmail) {
        const { data: emailMatch } = await supabaseAuth
          .from('portal_clients')
          .select(selectFields)
          .eq('email', userEmail.toLowerCase())
          .eq('organization_id', orgId)
          .in('status', ['active', 'invited'])
          .single();

        if (emailMatch) {
          await supabaseAuth
            .from('portal_clients')
            .update({ auth_user_id: userId, status: 'active', last_login_at: new Date().toISOString() })
            .eq('id', emailMatch.id);
          data = { ...emailMatch, auth_user_id: userId, status: 'active' };
        }
      }

      return data || null;
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabaseAuth.auth.getSession();
        if (cancelled) return;

        if (session?.user) {
          const client = await resolveClient(session.user.id, session.user.email);
          if (!cancelled) {
            setPortalClient(client);
            portalClientRef.current = client;
            if (client) {
              // Update last login
              supabaseAuth.from('portal_clients')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', client.id)
                .then(() => {});
            }
          }
        }
      } catch (err) {
        console.error('[PublicStorefront] Auth init error:', err);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes (magic link callback)
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(async (event, newSession) => {
      if (cancelled) return;
      if (event === 'SIGNED_IN' && newSession?.user) {
        // Only show loading spinner on first sign-in (magic link callback).
        // Skip for tab-focus token refreshes to preserve checkout/OTP state.
        const alreadyResolved = !!portalClientRef.current;
        if (!alreadyResolved) {
          setAuthLoading(true);
        }
        const client = await resolveClient(newSession.user.id, newSession.user.email);
        if (!cancelled) {
          setPortalClient(client);
          portalClientRef.current = client;
          setAuthLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        if (!cancelled) {
          setPortalClient(null);
          portalClientRef.current = null;
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [storeData?.organization_id]);

  // -----------------------------------------------------------------------
  // 2. Resolve company_id from organization_id
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!storeData?.organization_id) return;
    let cancelled = false;
    supabase
      .from('companies')
      .select('id')
      .eq('organization_id', storeData.organization_id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!cancelled) setCompanyId(data?.id || storeData.organization_id);
      });
    return () => { cancelled = true; };
  }, [storeData?.organization_id]);

  // -----------------------------------------------------------------------
  // 3. Load products (same query as StorePreview)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    async function fetchAllProducts() {
      const PAGE_SIZE = 1000;
      let allData = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, sku, featured_image, gallery, category, category_id, description, short_description, tags, ean, type, slug, inventory(quantity_on_hand, quantity_reserved, quantity_incoming), expected_deliveries(quantity_expected, quantity_received, status), physical_products(pricing)')
          .eq('company_id', companyId)
          .eq('status', 'published')
          .eq('type', 'physical')
          .order('name')
          .range(offset, offset + PAGE_SIZE - 1);

        if (cancelled) return;
        if (error) {
          console.warn('[PublicStorefront] Failed to load products:', error);
          return;
        }
        if (data?.length) {
          allData = allData.concat(data);
          offset += data.length;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      if (cancelled || !allData.length) return;

      const enriched = allData.map((p) => {
        const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
        const qtyOnHand = inv?.quantity_on_hand ?? null;
        const qtyReserved = inv?.quantity_reserved ?? 0;
        const qtyIncoming = inv?.quantity_incoming ?? 0;
        const deliveries = Array.isArray(p.expected_deliveries) ? p.expected_deliveries : [];
        const expectedIncoming = deliveries
          .filter((d) => d.status === 'pending' || d.status === 'in_transit' || d.status === 'ordered')
          .reduce((sum, d) => sum + (Math.max(0, (d.quantity_expected ?? 0) - (d.quantity_received ?? 0))), 0);
        const totalIncoming = qtyIncoming + expectedIncoming;
        const pp = Array.isArray(p.physical_products) ? p.physical_products[0] : p.physical_products;
        const pricing = pp?.pricing || {};
        const effectivePrice = p.price || pricing.wholesale_price || pricing.base_price || 0;
        return {
          ...p,
          price: effectivePrice,
          pricing,
          stock_quantity: qtyOnHand != null ? Math.max(0, qtyOnHand - qtyReserved) : null,
          incoming_stock: totalIncoming > 0 ? totalIncoming : 0,
          inventory: undefined,
          expected_deliveries: undefined,
          physical_products: undefined,
        };
      });
      setAllProducts(enriched);
    }

    fetchAllProducts();
    return () => { cancelled = true; };
  }, [companyId]);

  // -----------------------------------------------------------------------
  // Derived config / memoised values
  // -----------------------------------------------------------------------
  const config = useMemo(() => storeData?.store_config || {}, [storeData?.store_config]);

  const sections = useMemo(() => {
    if (!config?.sections) return [];
    return [...config.sections]
      .filter((s) => s.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config?.sections]);

  const theme = config?.theme ?? {};
  const themeVars = useMemo(() => buildThemeVars(theme), [theme]);

  const orgId = storeData?.organization_id;

  // -----------------------------------------------------------------------
  // SEO -- set document title & meta description
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!config) return;
    const seo = config.seo || {};
    document.title = seo.title || config?.navigation?.companyName || 'Store';
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = seo.description || '';
  }, [config, storeData]);

  // -----------------------------------------------------------------------
  // Custom head / CSS injection
  // -----------------------------------------------------------------------
  useEffect(() => {
    const head = config?.customHead;
    if (!head) return;
    const container = document.createElement('div');
    container.id = 'store-custom-head';
    container.innerHTML = head;
    const nodes = Array.from(container.childNodes);
    nodes.forEach((node) => document.head.appendChild(node));
    return () => {
      nodes.forEach((node) => {
        try { document.head.removeChild(node); } catch { /* already removed */ }
      });
    };
  }, [config?.customHead]);

  useEffect(() => {
    const css = config?.customCss;
    if (!css) return;
    const style = document.createElement('style');
    style.id = 'store-custom-css';
    style.textContent = css;
    document.head.appendChild(style);
    return () => {
      try { document.head.removeChild(style); } catch { /* already removed */ }
    };
  }, [config?.customCss]);

  // -----------------------------------------------------------------------
  // WholesaleContext value (memoised)
  // -----------------------------------------------------------------------
  // Sign out handler
  const handleSignOut = useCallback(async () => {
    await supabaseAuth.auth.signOut();
    setPortalClient(null);
  }, []);

  const wholesaleValue = useMemo(() => ({
    config: config || { theme: {}, sections: [], navigation: [], footer: {} },
    storePublished: true,
    configLoading: false,
    configError: null,
    orgId,
    companyId: companyId || orgId,
    client: portalClient,
    clientLoading: authLoading,
    isAuthenticated: !!portalClient,
    themeVars,
    // Navigation functions for section renderers
    goToProduct: (productId) => nav.navigateTo('product', { productId }),
    goToCatalog: (filters) => {
      nav.navigateTo('catalog');
      if (filters?.category) setPageData(filters);
    },
    goToHome: () => nav.navigateTo('home'),
    // Cart
    cartItems: cart.items,
    addToCart: cart.addItem,
    removeFromCart: cart.removeItem,
    updateQuantity: cart.updateQuantity,
    clearCart: cart.clearCart,
    cartTotal: cart.total,
    cartSubtotal: cart.subtotal,
    cartVat: cart.vat,
    cartVolumeDiscount: cart.volumeDiscount,
    cartCount: cart.itemCount,
    poNumber: cart.poNumber,
    setPoNumber: cart.setPoNumber,
    deliveryDate: cart.deliveryDate,
    setDeliveryDate: cart.setDeliveryDate,
    orderNotes: cart.orderNotes,
    setOrderNotes: cart.setOrderNotes,
    moqViolations: cart.moqViolations,
    hasValidOrder: cart.hasValidOrder,
  }), [config, themeVars, orgId, companyId, portalClient, authLoading, nav, cart.items, cart.total, cart.itemCount, cart.subtotal, cart.poNumber, cart.deliveryDate, cart.orderNotes, cart.vat, cart.volumeDiscount, cart.moqViolations, cart.hasValidOrder, cart.addItem, cart.removeItem, cart.updateQuantity, cart.clearCart, cart.setPoNumber, cart.setDeliveryDate, cart.setOrderNotes]);

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#09090b' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }}
          />
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading store...</span>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Not found state
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // Auth loading state
  // -----------------------------------------------------------------------
  if (!notFound && storeData && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#09090b' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }}
          />
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Checking access...</span>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Auth gate -- show login if not authenticated
  // -----------------------------------------------------------------------
  if (!notFound && storeData && !authLoading && !portalClient) {
    return (
      <StoreLoginPage
        storeData={storeData}
        themeVars={themeVars}
      />
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#09090b' }}>
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.3)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75v-2.25a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v2.25c0 .414.336.75.75.75z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: '#fafafa' }}>Store Not Found</h1>
          <p className="text-sm max-w-md" style={{ color: 'rgba(255,255,255,0.4)' }}>
            The store at <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{subdomain}.syncstore.business</strong> doesn't exist or isn't published yet.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  return (
    <WholesaleContext.Provider value={wholesaleValue}>
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
        <PublicNavBar
          config={config}
          currentPage={currentPage}
          onNavigate={(page) => nav.navigateTo(page)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenCart={() => setCartOpen(true)}
          onOpenAccount={() => setAccountOpen((prev) => !prev)}
          accountBtnRef={accountBtnRef}
          cartItemCount={cart.itemCount}
          logoUrl={storeData?.logo_url}
        />

        {/* Account dropdown */}
        <div className="relative">
          <div className="absolute top-0 right-4 sm:right-6 lg:right-8 z-[60]" style={{ maxWidth: '100vw' }}>
            <AccountDropdown
              isOpen={accountOpen}
              onClose={() => setAccountOpen(false)}
              anchorRef={accountBtnRef}
              onNavigate={(page) => nav.navigateTo(page)}
              client={portalClient}
              onSignOut={handleSignOut}
            />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {currentPage === 'catalog' ? (
            <PreviewCatalogPage config={config} products={allProducts} cart={cart} nav={nav} />
          ) : currentPage === 'product' ? (
            <PreviewProductDetailPage config={config} products={allProducts} pageData={pageData} orgId={orgId} cart={cart} nav={nav} />
          ) : currentPage === 'cart' ? (
            <PreviewCartPage config={config} cart={cart} nav={nav} />
          ) : currentPage === 'checkout' ? (
            <PreviewCheckoutPage config={config} cart={cart} nav={nav} />
          ) : currentPage === 'orders' ? (
            <PreviewOrdersPage config={config} nav={nav} />
          ) : currentPage === 'order-detail' ? (
            <PreviewOrderDetailPage config={config} nav={nav} pageData={pageData} />
          ) : currentPage === 'invoices' ? (
            <PreviewInvoicesPage config={config} nav={nav} />
          ) : currentPage === 'invoice-detail' ? (
            <PreviewInvoiceDetailPage config={config} nav={nav} pageData={pageData} />
          ) : currentPage === 'account' ? (
            <PreviewAccountPage config={config} nav={nav} />
          ) : currentPage === 'inquiries' ? (
            <PreviewInquiriesPage config={config} nav={nav} />
          ) : currentPage === 'settings' ? (
            <PreviewSettingsPage config={config} nav={nav} />
          ) : (
            <StoreHomePage
              config={config}
              products={allProducts}
              sections={sections}
              logoUrl={storeData?.logo_url}
              nav={nav}
              cart={cart}
              sectionMap={SECTION_MAP}
              paddingMap={PADDING_MAP}
              getBackgroundStyle={getBackgroundStyle}
            />
          )}
        </main>

        {/* Footer */}
        <PublicFooter config={config} />

        {/* Overlays */}
        <PreviewSearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} products={allProducts} nav={nav} cart={cart} />
        <PreviewCartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} cart={cart} nav={nav} />

      </div>
    </WholesaleContext.Provider>
  );
}
