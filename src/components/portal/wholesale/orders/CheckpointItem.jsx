import React from 'react';
import { MapPin, Package, Truck, CheckCircle, AlertCircle, Clock, Check } from 'lucide-react';
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
  isLast = false,
  onClick,
}) {
  const Icon = STATUS_ICONS[checkpoint.status_tag] || MapPin;
  const hasLocation = checkpoint.latitude && checkpoint.longitude;
  const isCompleted = !isLatest;

  return (
    <button
      onClick={() => hasLocation && onClick?.(checkpoint)}
      className={`
        relative flex items-start gap-3 w-full text-left px-3 py-2.5 transition-colors
        ${hasLocation ? 'cursor-pointer hover:bg-white/[0.05]' : 'cursor-default'}
      `}
    >
      {/* Timeline connector line — above */}
      {!isFirst && (
        <div
          className="absolute left-[22px] top-0 w-px"
          style={{
            height: '10px',
            backgroundColor: isCompleted
              ? 'var(--ws-primary, rgb(34,211,238))'
              : 'var(--ws-border, rgba(255,255,255,0.1))',
            opacity: isCompleted ? 0.4 : 1,
          }}
        />
      )}

      {/* Timeline connector line — below */}
      {!isLast && (
        <div
          className="absolute left-[22px] bottom-0 w-px"
          style={{
            height: 'calc(100% - 30px)',
            top: '30px',
            backgroundColor: isCompleted
              ? 'var(--ws-primary, rgb(34,211,238))'
              : 'var(--ws-border, rgba(255,255,255,0.1))',
            opacity: isCompleted ? 0.4 : 1,
          }}
        />
      )}

      {/* Circle indicator */}
      <div className="relative flex-shrink-0 mt-0.5 z-10">
        {isLatest ? (
          /* Latest: pulsing primary dot with status icon */
          <>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center ring-2"
              style={{
                backgroundColor: 'var(--ws-primary, rgb(34,211,238))',
                '--tw-ring-color': 'rgba(34,211,238,0.3)',
              }}
            >
              <Icon className="w-3 h-3" style={{ color: 'var(--ws-surface, #111)' }} />
            </div>
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{
                backgroundColor: 'var(--ws-primary, rgb(34,211,238))',
                opacity: 0.25,
              }}
            />
          </>
        ) : (
          /* Completed: checkmark in a filled circle */
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(34,211,238,0.15)',
              border: '1.5px solid rgba(34,211,238,0.4)',
            }}
          >
            <Check
              className="w-3 h-3"
              style={{ color: 'var(--ws-primary, rgb(34,211,238))' }}
              strokeWidth={3}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium leading-tight"
          style={{
            color: isLatest
              ? 'var(--ws-primary, rgb(34,211,238))'
              : 'var(--ws-text, #fff)',
          }}
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
