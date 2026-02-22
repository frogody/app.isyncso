import React from 'react';
import { MapPin, Package, Truck, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_ICONS = {
  Pending:        Clock,
  InfoReceived:   Package,
  InTransit:      Truck,
  OutForDelivery: Truck,
  Delivered:      CheckCircle,
  AttemptFail:    AlertCircle,
  Exception:      AlertCircle,
  AvailableForPickup: Package,
};

export default function CheckpointItem({
  checkpoint,
  isLatest = false,
  isFirst = false,
  onClick,
}) {
  const Icon = STATUS_ICONS[checkpoint.status_tag] || MapPin;
  const hasLocation = checkpoint.latitude && checkpoint.longitude;

  return (
    <button
      onClick={() => hasLocation && onClick?.(checkpoint)}
      className={`
        relative flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors
        ${hasLocation ? 'cursor-pointer hover:bg-white/[0.05]' : 'cursor-default'}
        ${isLatest ? 'bg-white/[0.05]' : ''}
      `}
    >
      {/* Timeline line */}
      {!isFirst && (
        <div
          className="absolute left-[22px] -top-2.5 w-px h-2.5"
          style={{ backgroundColor: 'var(--ws-border, rgba(255,255,255,0.1))' }}
        />
      )}

      {/* Dot */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center ${
            isLatest ? 'ring-2' : ''
          }`}
          style={{
            backgroundColor: isLatest
              ? 'var(--ws-primary, rgb(34,211,238))'
              : 'var(--ws-border, rgba(255,255,255,0.15))',
            ringColor: isLatest
              ? 'rgba(34,211,238,0.3)'
              : undefined,
          }}
        >
          <Icon
            className="w-3 h-3"
            style={{
              color: isLatest ? 'var(--ws-surface, #111)' : 'var(--ws-text-muted, #999)',
            }}
          />
        </div>
        {isLatest && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              backgroundColor: 'var(--ws-primary, rgb(34,211,238))',
              opacity: 0.3,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium leading-tight"
          style={{ color: isLatest ? 'var(--ws-primary, rgb(34,211,238))' : 'var(--ws-text, #fff)' }}
        >
          {checkpoint.status_description || checkpoint.status_tag}
        </p>
        {checkpoint.location_name && (
          <p
            className="text-[11px] mt-0.5 truncate"
            style={{ color: 'var(--ws-text-muted, #999)' }}
          >
            {checkpoint.location_name}
          </p>
        )}
        {checkpoint.message && checkpoint.message !== checkpoint.status_description && (
          <p
            className="text-[11px] mt-0.5 truncate"
            style={{ color: 'var(--ws-text-muted, #777)' }}
          >
            {checkpoint.message}
          </p>
        )}
        <p
          className="text-[10px] mt-1"
          style={{ color: 'var(--ws-text-muted, #666)' }}
        >
          {format(new Date(checkpoint.checkpoint_time), 'dd MMM yyyy, HH:mm')}
        </p>
      </div>
    </button>
  );
}
