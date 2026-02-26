import React, { useState, useCallback } from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import {
  Menu,
  X,
  Search,
  ShoppingCart,
  User,
  Send,
  LayoutDashboard,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { useWholesale } from './WholesaleProvider';
import NotificationCenter from './notifications/NotificationCenter';
import AnnouncementsBanner from './AnnouncementsBanner';

// ---------------------------------------------------------------------------
// Navigation Bar
// ---------------------------------------------------------------------------

function NavBar({ config }) {
  const { cartCount, isAuthenticated } = useWholesale();
  const { org } = useParams();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const basePath = `/portal/${org}/shop`;

  const nav = config?.navigation ?? {};
  const items = nav.items ?? [];
  const logoPosition = nav.logoPosition || 'left';
  const sticky = nav.sticky === true;
  const showSearch = nav.showSearch === true;
  const showCart = nav.showCart === true;
  const showAccount = nav.showAccount === true;
  const companyName = config?.company?.name || config?.name || 'Store';
  const logoUrl = config?.company?.logo || config?.logo;

  // Resolve a nav href to a full path. Config items may store relative
  // paths like "/catalog" — prefix with basePath when they don't already
  // include the portal prefix.
  const resolveHref = useCallback(
    (href) => {
      if (!href || href === '#') return href;
      if (href.startsWith('/portal/')) return href;
      // Ensure single leading slash then prepend basePath
      const clean = href.startsWith('/') ? href : `/${href}`;
      return `${basePath}${clean}`;
    },
    [basePath],
  );

  const isActive = useCallback(
    (href) => {
      if (!href || href === '#') return false;
      const resolved = href.startsWith('/portal/') ? href : resolveHref(href);
      if (resolved === basePath || resolved === `${basePath}/`) {
        return location.pathname === basePath || location.pathname === `${basePath}/`;
      }
      return location.pathname.startsWith(resolved);
    },
    [location.pathname, basePath, resolveHref],
  );

  const closeMobile = () => setMobileMenuOpen(false);

  // ---- Logo element ----
  const Logo = (
    <Link to={basePath} className="flex items-center gap-2 shrink-0" onClick={closeMobile}>
      {logoUrl ? (
        <img src={logoUrl} alt={companyName} className="h-8 w-auto"  loading="lazy" decoding="async" />
      ) : (
        <span
          className="text-lg font-bold tracking-tight"
          style={{ color: 'var(--ws-text)' }}
        >
          {companyName}
        </span>
      )}
    </Link>
  );

  return (
    <header
      className={`z-30 border-b transition-colors ${sticky ? 'sticky top-0' : ''}`}
      style={{
        backgroundColor: 'var(--ws-bg)',
        borderColor: 'var(--ws-border, rgba(255,255,255,0.08))',
      }}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo (default position) */}
          {logoPosition === 'left' && Logo}

          {/* Desktop nav items */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {items.map((item) => {
              const href = resolveHref(item.href);
              const active = isActive(item.href);
              return (
                <Link
                  key={item.id}
                  to={href || '#'}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white/[0.08]'
                      : 'hover:bg-white/[0.04]'
                  }`}
                  style={{
                    color: active
                      ? 'var(--ws-primary)'
                      : 'var(--ws-muted, rgba(255,255,255,0.6))',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}

            {isAuthenticated && (
              <>
                {[
                  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
                  { href: '/orders', label: 'Orders', Icon: ClipboardList },
                  { href: '/templates', label: 'Templates', Icon: FileText },
                ].map(({ href, label, Icon }) => {
                  const resolved = resolveHref(href);
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      to={resolved}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                      }`}
                      style={{
                        color: active
                          ? 'var(--ws-primary)'
                          : 'var(--ws-muted, rgba(255,255,255,0.6))',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Right side icons */}
          <div className="flex items-center gap-2">
            {showSearch && (
              <button
                className="p-2 rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.6))' }}
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {isAuthenticated && <NotificationCenter />}

            {showCart && (
              <Link
                to={`${basePath}/cart`}
                className="relative p-2 rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.6))' }}
                aria-label="Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-1"
                    style={{
                      backgroundColor: 'var(--ws-primary)',
                      color: 'var(--ws-bg, #000)',
                    }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {showAccount && (
              <Link
                to={`${basePath}/account`}
                className="p-2 rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.6))' }}
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg transition-colors hover:bg-white/[0.06]"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.6))' }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-t"
          style={{
            backgroundColor: 'var(--ws-bg)',
            borderColor: 'var(--ws-border, rgba(255,255,255,0.08))',
          }}
        >
          <nav className="px-4 py-3 space-y-1">
            {items.map((item) => {
              const href = resolveHref(item.href);
              const active = isActive(item.href);
              return (
                <Link
                  key={item.id}
                  to={href || '#'}
                  onClick={closeMobile}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                  }`}
                  style={{
                    color: active
                      ? 'var(--ws-primary)'
                      : 'var(--ws-muted, rgba(255,255,255,0.6))',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}

            {isAuthenticated && (
              <>
                <div
                  className="my-2 border-t"
                  style={{ borderColor: 'var(--ws-border, rgba(255,255,255,0.08))' }}
                />
                {[
                  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
                  { href: '/orders', label: 'Orders', Icon: ClipboardList },
                  { href: '/templates', label: 'Templates', Icon: FileText },
                ].map(({ href, label, Icon }) => {
                  const resolved = resolveHref(href);
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      to={resolved}
                      onClick={closeMobile}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                      }`}
                      style={{
                        color: active
                          ? 'var(--ws-primary)'
                          : 'var(--ws-muted, rgba(255,255,255,0.6))',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

const SOCIAL_ICONS = {
  facebook: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
  ),
  twitter: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
  ),
  instagram: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
  ),
  linkedin: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
  ),
};

function SocialLink({ platform, url }) {
  const icon = SOCIAL_ICONS[platform] || null;
  if (!icon || !url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="p-2 rounded-lg transition-colors hover:bg-white/[0.06]"
      style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
      aria-label={platform}
    >
      {icon}
    </a>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    // Placeholder -- actual subscription logic would live in the provider
    setSubmitted(true);
    setEmail('');
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
        style={{
          backgroundColor: 'var(--ws-input-bg, rgba(255,255,255,0.06))',
          color: 'var(--ws-text)',
          border: '1px solid var(--ws-border, rgba(255,255,255,0.1))',
        }}
      />
      <button
        type="submit"
        disabled={submitted}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
        style={{
          backgroundColor: submitted
            ? 'var(--ws-success, #22c55e)'
            : 'var(--ws-primary)',
          color: 'var(--ws-bg, #000)',
        }}
      >
        {submitted ? (
          'Subscribed'
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            Subscribe
          </>
        )}
      </button>
    </form>
  );
}

function Footer({ config }) {
  const footerConfig = config?.footer;
  if (!footerConfig) return null;

  const style = footerConfig.style || 'simple';
  const copyrightText = (footerConfig.copyrightText || '')
    .replace('{year}', new Date().getFullYear().toString());
  const showSocial = footerConfig.showSocial === true;
  const socialLinks = footerConfig.socialLinks ?? [];
  const columns = footerConfig.columns ?? [];
  const showNewsletter = footerConfig.showNewsletter === true;

  // -- Minimal footer ---
  if (style === 'minimal') {
    return (
      <footer
        className="border-t py-6"
        style={{
          backgroundColor: 'var(--ws-bg)',
          borderColor: 'var(--ws-border, rgba(255,255,255,0.08))',
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {copyrightText && (
            <p
              className="text-xs"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
            >
              {copyrightText}
            </p>
          )}
          {showSocial && socialLinks.length > 0 && (
            <div className="flex items-center gap-1">
              {socialLinks.map((link) => (
                <SocialLink key={link.platform} platform={link.platform} url={link.url} />
              ))}
            </div>
          )}
        </div>
      </footer>
    );
  }

  // -- Multi-column footer ---
  if (style === 'multi-column') {
    return (
      <footer
        className="border-t"
        style={{
          backgroundColor: 'var(--ws-bg)',
          borderColor: 'var(--ws-border, rgba(255,255,255,0.08))',
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {columns.map((col, idx) => (
              <div key={idx}>
                <h4
                  className="text-sm font-semibold mb-4"
                  style={{ color: 'var(--ws-text)' }}
                >
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {(col.links ?? []).map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <Link
                        to={link.href || '#'}
                        className="text-sm transition-colors hover:underline"
                        style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {showNewsletter && (
            <div className="mt-10 pt-8 border-t" style={{ borderColor: 'var(--ws-border, rgba(255,255,255,0.08))' }}>
              <h4
                className="text-sm font-semibold mb-3"
                style={{ color: 'var(--ws-text)' }}
              >
                Stay up to date
              </h4>
              <NewsletterForm />
            </div>
          )}

          <div
            className="mt-10 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderColor: 'var(--ws-border, rgba(255,255,255,0.08))' }}
          >
            {copyrightText && (
              <p
                className="text-xs"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
              >
                {copyrightText}
              </p>
            )}
            {showSocial && socialLinks.length > 0 && (
              <div className="flex items-center gap-1">
                {socialLinks.map((link) => (
                  <SocialLink key={link.platform} platform={link.platform} url={link.url} />
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>
    );
  }

  // -- Simple footer (default) ---
  return (
    <footer
      className="border-t py-8"
      style={{
        backgroundColor: 'var(--ws-bg)',
        borderColor: 'var(--ws-border, rgba(255,255,255,0.08))',
      }}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showNewsletter && (
          <div className="mb-8">
            <h4
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--ws-text)' }}
            >
              Subscribe to our newsletter
            </h4>
            <NewsletterForm />
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {copyrightText && (
            <p
              className="text-xs"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
            >
              {copyrightText}
            </p>
          )}

          <div className="flex items-center gap-4">
            {columns.length > 0 &&
              columns.flatMap((col) => col.links ?? []).map((link, idx) => (
                <Link
                  key={idx}
                  to={link.href || '#'}
                  className="text-xs transition-colors hover:underline"
                  style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
                >
                  {link.label}
                </Link>
              ))}

            {showSocial && socialLinks.length > 0 && (
              <div className="flex items-center gap-1">
                {socialLinks.map((link) => (
                  <SocialLink key={link.platform} platform={link.platform} url={link.url} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Layout wrapper
// ---------------------------------------------------------------------------

export default function WholesaleLayout({ children }) {
  const { config, configLoading } = useWholesale();

  // In preview mode (builder iframe), skip the loading gate entirely.
  // The StorefrontRenderer handles its own config via postMessage from the builder.
  const isPreview = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === 'true';

  if (!isPreview && (configLoading || !config)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
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
            Loading storefront...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ws-bg)' }}>
      <NavBar config={config} />
      <AnnouncementsBanner />

      <main className="flex-1">
        {children || <Outlet />}
      </main>

      <Footer config={config} />
    </div>
  );
}
