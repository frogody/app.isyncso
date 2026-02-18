import React, { useState, useCallback } from 'react';
import { RefreshCw, Check, ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PLATFORMS, VARIANT_STATUSES } from '@/lib/reach-constants';

const STATUS_COLOR_MAP = {
  zinc: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  green: 'bg-green-500/15 text-green-400 border-green-500/25',
};

function EditableField({ value, onChange, multiline = false, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const startEdit = useCallback(() => {
    setDraft(value || '');
    setEditing(true);
  }, [value]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    if (draft !== value) {
      onChange(draft);
    }
  }, [draft, value, onChange]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        commitEdit();
      }
      if (e.key === 'Escape') {
        setDraft(value || '');
        setEditing(false);
      }
    },
    [commitEdit, multiline, value]
  );

  if (editing) {
    if (multiline) {
      return (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={3}
          className={cn(
            'w-full bg-zinc-800/80 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none resize-none',
            className
          )}
        />
      );
    }
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={handleKeyDown}
        autoFocus
        className={cn(
          'w-full bg-zinc-800/80 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none',
          className
        )}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={startEdit}
      onKeyDown={(e) => e.key === 'Enter' && startEdit()}
      className={cn(
        'cursor-text rounded-lg px-2.5 py-1.5 -mx-2.5 -my-1.5 hover:bg-white/[0.04] transition-colors',
        className
      )}
    >
      {value || <span className="text-zinc-600 italic">Click to edit</span>}
    </div>
  );
}

export default function AdVariantCard({
  variant,
  onUpdate,
  onRegenerate,
  onApprove,
  platform,
  className,
}) {
  if (!variant) return null;

  const { headline, primary_text, cta_label, image_url, status } = variant;
  const statusConfig = VARIANT_STATUSES[status];
  const statusColor = statusConfig
    ? STATUS_COLOR_MAP[statusConfig.color] || STATUS_COLOR_MAP.zinc
    : STATUS_COLOR_MAP.zinc;
  const platformData = platform ? PLATFORMS[platform] : null;

  const handleFieldUpdate = useCallback(
    (field, value) => {
      if (onUpdate) {
        onUpdate({ ...variant, [field]: value });
      }
    },
    [variant, onUpdate]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden',
        className
      )}
    >
      {/* Image preview area */}
      <div className="relative aspect-[4/3] bg-zinc-800/60 flex items-center justify-center">
        {image_url ? (
          <img
            src={image_url}
            alt={headline || 'Ad variant'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-600">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs">Image preview</span>
          </div>
        )}

        {/* Status badge overlaid on image */}
        {statusConfig && (
          <span
            className={cn(
              'absolute top-2.5 right-2.5 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold',
              statusColor
            )}
          >
            {statusConfig.label}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="p-4 space-y-3">
        {/* Headline */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            Headline
          </label>
          <EditableField
            value={headline}
            onChange={(val) => handleFieldUpdate('headline', val)}
            className="text-sm font-medium text-white"
          />
        </div>

        {/* Primary text */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            Primary text
          </label>
          <EditableField
            value={primary_text}
            onChange={(val) => handleFieldUpdate('primary_text', val)}
            multiline
            className="text-xs text-zinc-300 leading-relaxed"
          />
        </div>

        {/* CTA */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            CTA
          </label>
          <EditableField
            value={cta_label}
            onChange={(val) => handleFieldUpdate('cta_label', val)}
            className="text-xs text-cyan-400 font-medium"
          />
        </div>

        {/* Platform dimensions */}
        {platformData && platformData.width && platformData.height && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-zinc-500">
              {platformData.name}
            </span>
            <span className="text-[10px] text-zinc-600 tabular-nums">
              {platformData.width} x {platformData.height}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
          {onRegenerate && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onRegenerate(variant)}
              className="text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Regenerate
            </Button>
          )}
          {onApprove && status !== 'approved' && status !== 'published' && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onApprove(variant)}
              className="text-cyan-400 hover:text-cyan-300 ml-auto"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Approve
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
