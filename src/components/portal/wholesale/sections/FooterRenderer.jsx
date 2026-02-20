import React, { useState } from 'react';

/**
 * FooterRenderer
 *
 * Renders the store footer for the B2B wholesale storefront.
 * Unlike other section renderers, this receives the full store config
 * rather than a section object. Footer settings come from config.footer,
 * theme from config.theme.
 *
 * Props:
 * - config: full store config object
 *
 * config.footer props:
 * - style: 'simple'|'multi-column'|'minimal'
 * - copyrightText: string (supports {year} placeholder)
 * - showSocial: boolean
 * - socialLinks: array of { platform, url }
 * - columns: array of { title, links: [{ label, href }] }
 * - showNewsletter: boolean
 */

const SOCIAL_ICONS = {
  twitter: '\u{1D54F}',
  linkedin: 'in',
  facebook: 'f',
  instagram: '\u{1D540}',
  youtube: '\u25B6',
};

const SOCIAL_LABELS = {
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

function SocialLinks({ links }) {
  if (!Array.isArray(links) || links.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {links.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={SOCIAL_LABELS[link.platform] || link.platform}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold transition-opacity duration-200 hover:opacity-80"
          style={{
            backgroundColor: 'var(--ws-border)',
            color: 'var(--ws-text)',
          }}
        >
          {SOCIAL_ICONS[link.platform] || link.platform?.charAt(0)?.toUpperCase() || '?'}
        </a>
      ))}
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none transition-colors duration-200 placeholder:opacity-50"
        style={{
          backgroundColor: 'var(--ws-bg)',
          color: 'var(--ws-text)',
          border: '1px solid var(--ws-border)',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--ws-primary)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--ws-border)'; }}
      />
      <button
        type="submit"
        className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity duration-200 hover:opacity-90 active:scale-[0.98] whitespace-nowrap"
        style={{
          backgroundColor: 'var(--ws-primary)',
          color: 'var(--ws-bg)',
        }}
      >
        {submitted ? 'Subscribed!' : 'Subscribe'}
      </button>
    </form>
  );
}

function CopyrightText({ text }) {
  const currentYear = new Date().getFullYear();
  const rendered = (text || '').replace(/\{year\}/gi, String(currentYear));

  return (
    <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
      {rendered || `\u00A9 ${currentYear} All rights reserved.`}
    </p>
  );
}

function SimpleFooter({ footer }) {
  const { copyrightText, showSocial, socialLinks, showNewsletter } = footer;

  return (
    <div className="max-w-6xl mx-auto flex flex-col items-center gap-6 text-center">
      {showNewsletter && (
        <div className="flex flex-col items-center gap-2">
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--ws-text)' }}
          >
            Stay updated
          </p>
          <NewsletterForm />
        </div>
      )}

      {showSocial && <SocialLinks links={socialLinks} />}

      <CopyrightText text={copyrightText} />
    </div>
  );
}

function MultiColumnFooter({ footer }) {
  const { copyrightText, showSocial, socialLinks, columns, showNewsletter } = footer;
  const footerColumns = Array.isArray(columns) ? columns : [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Columns + optional newsletter */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 mb-10">
        {/* Link columns */}
        {footerColumns.length > 0 && (
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-none gap-8" style={{
            gridTemplateColumns: footerColumns.length > 0
              ? `repeat(${Math.min(footerColumns.length, 4)}, minmax(0, 1fr))`
              : undefined,
          }}>
            {footerColumns.map((col, i) => (
              <div key={i}>
                <h4
                  className="text-sm font-semibold uppercase tracking-wider mb-4"
                  style={{ color: 'var(--ws-text)' }}
                >
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {(col.links || []).map((link, j) => (
                    <li key={j}>
                      <a
                        href={link.href}
                        className="text-sm transition-colors duration-200 hover:underline"
                        style={{ color: 'var(--ws-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ws-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ws-muted)'; }}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Newsletter sidebar */}
        {showNewsletter && (
          <div className="lg:w-72 flex-shrink-0">
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: 'var(--ws-text)' }}
            >
              Newsletter
            </h4>
            <p
              className="text-sm mb-3"
              style={{ color: 'var(--ws-muted)' }}
            >
              Subscribe for updates and exclusive offers.
            </p>
            <NewsletterForm />
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderTop: '1px solid var(--ws-border)' }}
      >
        <CopyrightText text={copyrightText} />
        {showSocial && <SocialLinks links={socialLinks} />}
      </div>
    </div>
  );
}

function MinimalFooter({ footer }) {
  const { copyrightText } = footer;

  return (
    <div className="max-w-6xl mx-auto text-center">
      <CopyrightText text={copyrightText} />
    </div>
  );
}

export default function FooterRenderer({ config }) {
  const footer = config?.footer || {};
  const { style = 'simple' } = footer;

  const footerRenderers = {
    simple: SimpleFooter,
    'multi-column': MultiColumnFooter,
    minimal: MinimalFooter,
  };

  const FooterComponent = footerRenderers[style] || SimpleFooter;

  return (
    <footer
      className="w-full py-10 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: 'var(--ws-surface)',
        color: 'var(--ws-text)',
        borderTop: '1px solid var(--ws-border)',
        fontFamily: 'var(--ws-font)',
      }}
    >
      <FooterComponent footer={footer} />
    </footer>
  );
}
