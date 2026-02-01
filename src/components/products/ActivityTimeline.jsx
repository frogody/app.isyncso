import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Package, Edit, Euro, Truck, Upload, Archive,
  CheckCircle, AlertTriangle, Plus, Minus, FileText, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';

const ACTIVITY_ICONS = {
  created: Plus,
  updated: Edit,
  stock_adjusted: Package,
  price_changed: Euro,
  shipped: Truck,
  image_added: Upload,
  archived: Archive,
  published: CheckCircle,
  low_stock: AlertTriangle,
  document_added: FileText,
  default: Edit
};

const ACTIVITY_COLORS = {
  created: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  updated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  stock_adjusted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  price_changed: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  shipped: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  image_added: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  archived: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  published: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  low_stock: 'bg-red-500/20 text-red-400 border-red-500/30',
  document_added: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  default: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
};

function ActivityItem({ activity, t }) {
  const Icon = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.default;
  const colorClass = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.default;

  return (
    <div className="flex gap-3 group">
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center",
        colorClass
      )}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-sm ${t('text-slate-900', 'text-white')} font-medium`}>{activity.title}</p>
            {activity.description && (
              <p className={`text-xs ${t('text-slate-500', 'text-zinc-500')} mt-0.5`}>{activity.description}</p>
            )}
          </div>
          <span className={`text-xs ${t('text-slate-400', 'text-zinc-600')} whitespace-nowrap`}>
            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
          </span>
        </div>

        {activity.user && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <User className={`w-3 h-3 ${t('text-slate-400', 'text-zinc-600')}`} />
            <span className={`text-xs ${t('text-slate-400', 'text-zinc-600')}`}>{activity.user}</span>
          </div>
        )}

        {activity.changes && (
          <div className={`mt-2 p-2 rounded-lg ${t('bg-slate-50', 'bg-zinc-900/50')} border ${t('border-slate-200', 'border-white/5')}`}>
            {Object.entries(activity.changes).map(([field, change]) => (
              <div key={field} className="flex items-center gap-2 text-xs">
                <span className={t('text-slate-500', 'text-zinc-500')}>{field}:</span>
                <span className={`${t('text-slate-400', 'text-zinc-600')} line-through`}>{change.old}</span>
                <span className={t('text-slate-400', 'text-zinc-400')}>→</span>
                <span className={t('text-slate-900', 'text-white')}>{change.new}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivityTimeline({
  activities = [],
  maxItems = 10,
  showEmpty = true,
  className
}) {
  const { t } = useTheme();
  const displayActivities = activities.slice(0, maxItems);

  if (displayActivities.length === 0 && showEmpty) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className={`w-12 h-12 rounded-full ${t('bg-slate-100', 'bg-zinc-800')} border ${t('border-slate-200', 'border-white/5')} flex items-center justify-center mx-auto mb-3`}>
          <FileText className={`w-6 h-6 ${t('text-slate-400', 'text-zinc-600')}`} />
        </div>
        <p className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>No activity yet</p>
        <p className={`text-xs ${t('text-slate-400', 'text-zinc-600')} mt-1`}>Changes to this product will appear here</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className={`absolute left-4 top-8 bottom-0 w-px bg-gradient-to-b ${t('from-slate-200', 'from-white/10')} to-transparent`} />

      <div className="space-y-0">
        {displayActivities.map((activity, index) => (
          <ActivityItem key={activity.id || index} activity={activity} t={t} />
        ))}
      </div>

      {activities.length > maxItems && (
        <div className={`pl-11 text-xs ${t('text-slate-500', 'text-zinc-500')}`}>
          +{activities.length - maxItems} more activities
        </div>
      )}
    </div>
  );
}

// Helper to generate mock activities for demo
export function generateMockActivities(product, details) {
  const activities = [];
  const now = new Date();

  if (product?.created_at) {
    activities.push({
      id: 'created',
      type: 'created',
      title: 'Product created',
      timestamp: product.created_at,
    });
  }

  if (product?.updated_at && product.updated_at !== product.created_at) {
    activities.push({
      id: 'updated',
      type: 'updated',
      title: 'Product updated',
      timestamp: product.updated_at,
    });
  }

  if (product?.published_at) {
    activities.push({
      id: 'published',
      type: 'published',
      title: 'Product published',
      timestamp: product.published_at,
    });
  }

  if (details?.inventory?.quantity <= (details?.inventory?.low_stock_threshold || 10)) {
    activities.push({
      id: 'low_stock',
      type: 'low_stock',
      title: 'Low stock warning',
      description: `Only ${details.inventory.quantity} units remaining`,
      timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    });
  }

  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
