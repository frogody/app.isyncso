import React, { useState, useEffect, useRef } from 'react';

export default function DemoOverlay({ highlights = [], onDismiss }) {
  const [rects, setRects] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!highlights.length) {
      setVisible(false);
      setRects([]);
      return;
    }

    // Small delay for page to render
    const timer = setTimeout(() => {
      const newRects = highlights.map(h => {
        const el = document.querySelector(`[data-demo="${h.selector}"]`) || document.querySelector(h.selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { ...h, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } };
      }).filter(Boolean);
      setRects(newRects);
      setVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [highlights]);

  if (!visible || !rects.length) return null;

  const primary = rects[0];
  const pad = 8;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none" style={{ transition: 'opacity 0.3s', opacity: visible ? 1 : 0 }}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Spotlight cutouts */}
      {rects.map((item, i) => (
        <React.Fragment key={i}>
          <div
            className="absolute rounded-xl border-2 border-cyan-400/60"
            style={{
              top: item.rect.top - pad,
              left: item.rect.left - pad,
              width: item.rect.width + pad * 2,
              height: item.rect.height + pad * 2,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
              transition: 'all 0.4s ease',
            }}
          />
          {/* Tooltip */}
          {item.tooltip && (
            <div
              className="absolute bg-zinc-900 border border-cyan-500/30 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl max-w-xs pointer-events-auto"
              style={{
                top: item.rect.top + item.rect.height + pad + 12,
                left: Math.max(16, item.rect.left),
                transition: 'all 0.4s ease 0.2s',
              }}
            >
              <div className="w-3 h-3 bg-zinc-900 border-l border-t border-cyan-500/30 absolute -top-1.5 left-6 rotate-45" />
              {item.tooltip}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
