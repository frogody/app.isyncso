import React from 'react';
import { Navigation, Package, X } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ShipmentTrackingMap from '@/components/portal/wholesale/orders/ShipmentTrackingMap';

const THEME_VARS = {
  dark: {
    '--ws-primary': 'rgb(34,211,238)',
    '--ws-surface': 'rgb(24,24,27)',
    '--ws-border': 'rgba(255,255,255,0.1)',
    '--ws-text': '#ffffff',
    '--ws-text-muted': '#a1a1aa',
  },
  light: {
    '--ws-primary': 'rgb(6,182,212)',
    '--ws-surface': '#ffffff',
    '--ws-border': 'rgba(0,0,0,0.1)',
    '--ws-text': '#18181b',
    '--ws-text-muted': '#71717a',
  },
};

export default function TrackingMapDrawer({ task, isOpen, onClose }) {
  const { theme } = useTheme();
  const vars = THEME_VARS[theme] || THEME_VARS.dark;

  if (!task) return null;

  const orderNumber =
    task.sales_orders?.order_number ||
    task.b2b_orders?.order_number ||
    task.task_number;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Navigation className="w-4 h-4 text-cyan-400" />
            Track Shipment &mdash; {orderNumber}
            {task.carrier && (
              <span className="text-xs text-zinc-500 ml-2">via {task.carrier}</span>
            )}
            {task.track_trace_code && (
              <code className="text-xs text-cyan-400 ml-auto font-mono">
                {task.track_trace_code}
              </code>
            )}
          </DialogTitle>
        </DialogHeader>

        <div style={vars}>
          <ShipmentTrackingMap trackingJobId={task.tracking_job_id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
