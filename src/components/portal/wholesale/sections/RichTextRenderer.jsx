import React from 'react';
import { SafeHTML } from '@/components/ui/SafeHTML';

/**
 * RichTextRenderer
 *
 * Renders a rich text / HTML content section for the B2B wholesale storefront.
 * Content is sanitized via SafeHTML (DOMPurify) before rendering.
 * Prose-like styling is applied to child HTML elements.
 *
 * Props from section.props:
 * - heading: string|null
 * - content: string (HTML string)
 * - alignment: 'left'|'center'|'right'
 * - maxWidth: string (e.g., '800px')
 */

const ALIGNMENT_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * Inline prose styles applied to the HTML content wrapper.
 * These target child elements to provide consistent typography
 * without requiring external CSS or a prose plugin.
 */
function buildProseStyles() {
  return `
    .ws-prose h1 { font-size: 2.25rem; font-weight: 700; margin: 1.5rem 0 1rem; line-height: 1.2; color: var(--ws-text); font-family: var(--ws-heading-font); }
    .ws-prose h2 { font-size: 1.875rem; font-weight: 700; margin: 1.5rem 0 0.75rem; line-height: 1.25; color: var(--ws-text); font-family: var(--ws-heading-font); }
    .ws-prose h3 { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.5rem; line-height: 1.3; color: var(--ws-text); font-family: var(--ws-heading-font); }
    .ws-prose h4 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; line-height: 1.35; color: var(--ws-text); font-family: var(--ws-heading-font); }
    .ws-prose h5 { font-size: 1.125rem; font-weight: 600; margin: 1rem 0 0.5rem; line-height: 1.4; color: var(--ws-text); font-family: var(--ws-heading-font); }
    .ws-prose h6 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.5rem; line-height: 1.4; color: var(--ws-text); font-family: var(--ws-heading-font); }
    .ws-prose p { margin: 0.75rem 0; line-height: 1.75; color: var(--ws-muted); }
    .ws-prose ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.75rem 0; color: var(--ws-muted); }
    .ws-prose ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.75rem 0; color: var(--ws-muted); }
    .ws-prose li { margin: 0.25rem 0; line-height: 1.75; }
    .ws-prose a { color: var(--ws-primary); text-decoration: underline; text-underline-offset: 2px; transition: opacity 0.15s; }
    .ws-prose a:hover { opacity: 0.8; }
    .ws-prose blockquote { border-left: 3px solid var(--ws-primary); padding: 0.5rem 0 0.5rem 1.25rem; margin: 1rem 0; font-style: italic; color: var(--ws-muted); }
    .ws-prose img { max-width: 100%; height: auto; border-radius: 0.75rem; margin: 1rem 0; }
    .ws-prose code { background-color: var(--ws-surface); padding: 0.15rem 0.4rem; border-radius: 0.25rem; font-size: 0.875em; }
    .ws-prose pre { background-color: var(--ws-surface); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; border: 1px solid var(--ws-border); }
    .ws-prose pre code { background: none; padding: 0; }
    .ws-prose hr { border: none; border-top: 1px solid var(--ws-border); margin: 1.5rem 0; }
    .ws-prose table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    .ws-prose th, .ws-prose td { padding: 0.5rem 0.75rem; border: 1px solid var(--ws-border); text-align: left; }
    .ws-prose th { font-weight: 600; color: var(--ws-text); background-color: var(--ws-surface); }
    .ws-prose strong { color: var(--ws-text); font-weight: 600; }
    .ws-prose em { font-style: italic; }
  `;
}

export default function RichTextRenderer({ section, theme }) {
  const {
    heading = null,
    content = '',
    alignment = 'left',
    maxWidth = '800px',
  } = section?.props || {};

  const alignClass = ALIGNMENT_CLASSES[alignment] || ALIGNMENT_CLASSES.left;

  if (!content && !heading) return null;

  return (
    <section
      className="w-full py-16 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: 'var(--ws-bg)',
        color: 'var(--ws-text)',
        fontFamily: 'var(--ws-font)',
      }}
    >
      {/* Inject prose styles */}
      <style>{buildProseStyles()}</style>

      <div
        className={`mx-auto ${alignClass}`}
        style={{ maxWidth }}
      >
        {/* Optional heading */}
        {heading && (
          <h2
            className="text-3xl sm:text-4xl font-bold mb-8 leading-tight"
            style={{ fontFamily: 'var(--ws-heading-font)' }}
          >
            {heading}
          </h2>
        )}

        {/* HTML content */}
        {content && (
          <SafeHTML
            className="ws-prose"
            html={content}
          />
        )}
      </div>
    </section>
  );
}
