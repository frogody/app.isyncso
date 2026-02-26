import React from 'react';
import DOMPurify from 'dompurify';

export function SafeHTML({ html, className = '', as: Tag = 'div', ...props }) {
  if (!html) return null;

  const clean = typeof DOMPurify !== 'undefined'
    ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
    : html;

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
      {...props}
    />
  );
}

export default SafeHTML;
