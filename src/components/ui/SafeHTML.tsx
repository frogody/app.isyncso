import DOMPurify from 'dompurify';
import { forwardRef, type ElementType, type HTMLAttributes } from 'react';

// Configure DOMPurify defaults
const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'table',
    'thead', 'tbody', 'tr', 'td', 'th', 'img', 'pre', 'code',
    'blockquote', 'hr', 'dl', 'dt', 'dd', 'sub', 'sup', 'small',
    'mark', 'del', 'ins', 'figure', 'figcaption', 'details', 'summary',
  ],
  ALLOWED_ATTR: [
    'class', 'href', 'src', 'alt', 'title', 'target', 'rel',
    'style', 'id', 'colspan', 'rowspan', 'width', 'height',
    'loading', 'decoding',
  ],
  ALLOW_DATA_ATTR: false,
};

// SVG-safe config for rendering SVG content (brand builder, mermaid, etc.)
const SVG_PURIFY_CONFIG: DOMPurify.Config = {
  ADD_TAGS: ['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline',
    'polygon', 'ellipse', 'text', 'tspan', 'defs', 'clipPath',
    'mask', 'pattern', 'linearGradient', 'radialGradient', 'stop',
    'use', 'symbol', 'marker', 'title', 'desc', 'foreignObject',
    'image', 'switch', 'textPath',
  ],
  ADD_ATTR: ['viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width',
    'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'points', 'transform', 'opacity', 'fill-opacity', 'stroke-opacity',
    'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'font-size',
    'font-family', 'font-weight', 'text-anchor', 'dominant-baseline',
    'letter-spacing', 'gradientUnits', 'gradientTransform', 'offset',
    'stop-color', 'stop-opacity', 'clip-path', 'mask', 'marker-end',
    'marker-start', 'marker-mid', 'preserveAspectRatio',
  ],
  ...PURIFY_CONFIG,
};

// Add hook to force rel="noopener noreferrer" on all links
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    if (node.getAttribute('target') !== '_self') {
      node.setAttribute('target', '_blank');
    }
  }
});

interface SafeHTMLProps extends HTMLAttributes<HTMLElement> {
  html: string;
  as?: ElementType;
  svg?: boolean;
}

export const SafeHTML = forwardRef<HTMLElement, SafeHTMLProps>(
  ({ html, as: Component = 'div', svg = false, ...rest }, ref) => {
    const config = svg ? SVG_PURIFY_CONFIG : PURIFY_CONFIG;
    const clean = DOMPurify.sanitize(html || '', config);

    return (
      <Component
        ref={ref}
        dangerouslySetInnerHTML={{ __html: clean }}
        {...rest}
      />
    );
  }
);

SafeHTML.displayName = 'SafeHTML';
export default SafeHTML;
