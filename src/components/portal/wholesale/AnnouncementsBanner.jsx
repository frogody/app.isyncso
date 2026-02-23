import React, { useState, useMemo } from 'react';
import { X, Info, AlertTriangle, Megaphone, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWholesale } from './WholesaleProvider';

const TYPE_CONFIG = {
  info: { icon: Info, bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', text: '#06b6d4' },
  warning: { icon: AlertTriangle, bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
  promo: { icon: Megaphone, bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', text: '#8b5cf6' },
  urgent: { icon: AlertCircle, bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' },
};

export default function AnnouncementsBanner() {
  const { announcements } = useWholesale();
  const [dismissed, setDismissed] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  const visible = useMemo(
    () => (announcements || []).filter((a) => !dismissed.has(a.id)),
    [announcements, dismissed]
  );

  if (!visible.length) return null;

  const current = visible[Math.min(currentIndex, visible.length - 1)];
  if (!current) return null;

  const cfg = TYPE_CONFIG[current.type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;

  const dismiss = (id) => {
    setDismissed((prev) => new Set([...prev, id]));
    if (currentIndex >= visible.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  return (
    <div
      className="border-b"
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.text }} />

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold mr-2" style={{ color: cfg.text }}>
            {current.title}
          </span>
          <span className="text-sm" style={{ color: 'var(--ws-text, #fafafa)', opacity: 0.8 }}>
            {current.message}
          </span>
        </div>

        {visible.length > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setCurrentIndex((i) => (i - 1 + visible.length) % visible.length)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--ws-muted)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs tabular-nums" style={{ color: 'var(--ws-muted)' }}>
              {Math.min(currentIndex, visible.length - 1) + 1}/{visible.length}
            </span>
            <button
              onClick={() => setCurrentIndex((i) => (i + 1) % visible.length)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--ws-muted)' }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={() => dismiss(current.id)}
          className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: 'var(--ws-muted)' }}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
