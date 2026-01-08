import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle, XCircle, AlertTriangle, Loader2, Package,
  ExternalLink, RefreshCw, Check, X, Building2, Barcode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getExpenseResearchQueue,
  retryResearchItem,
  approveResearchResult,
  skipResearchItem,
} from '@/lib/db/queries';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  pending: {
    icon: Search,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/30',
    label: 'Pending',
  },
  researching: {
    icon: Loader2,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    label: 'Researching',
    animate: true,
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Failed',
  },
  manual_review: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Needs Review',
  },
};

function formatPrice(price, currency = 'EUR') {
  if (!price && price !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
}

function ResearchItemCard({ item, onRetry, onApprove, onSkip }) {
  const [expanding, setExpanding] = useState(false);
  const [processing, setProcessing] = useState(false);
  const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  const handleRetry = async () => {
    setProcessing(true);
    try {
      await onRetry(item.id);
      toast.success('Research restarted');
    } catch (err) {
      toast.error('Failed to restart research');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await onApprove(item.id);
      toast.success('Product created');
    } catch (err) {
      toast.error('Failed to create product');
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = async () => {
    setProcessing(true);
    try {
      await onSkip(item.id);
      toast.success('Item skipped');
    } catch (err) {
      toast.error('Failed to skip item');
    } finally {
      setProcessing(false);
    }
  };

  const productId = item.matched_product_id || item.created_product_id;
  const productName = item.matched_product?.name || item.created_product?.name;
  const productSlug = item.matched_product?.slug || item.created_product?.slug;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          config.bgColor
        )}>
          <StatusIcon className={cn(
            "w-5 h-5",
            config.color,
            config.animate && "animate-spin"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-white truncate pr-2">
                {item.product_description?.substring(0, 60)}
                {item.product_description?.length > 60 ? '...' : ''}
              </p>
              <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                <span>Qty: {item.quantity}</span>
                <span>·</span>
                <span>{formatPrice(item.unit_price, item.currency)}</span>
                {item.model_number && (
                  <>
                    <span>·</span>
                    <span className="font-mono">{item.model_number}</span>
                  </>
                )}
              </div>
            </div>
            <Badge variant="outline" className={cn("shrink-0", config.borderColor, config.color)}>
              {config.label}
            </Badge>
          </div>

          {/* Research Results */}
          {(item.researched_ean || item.researched_name) && (
            <div className="mt-3 p-3 rounded-md bg-black/20 space-y-2">
              {item.researched_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-300">{item.researched_name}</span>
                </div>
              )}
              {item.researched_ean && (
                <div className="flex items-center gap-2 text-sm">
                  <Barcode className="w-4 h-4 text-zinc-500" />
                  <span className="font-mono text-zinc-300">{item.researched_ean}</span>
                </div>
              )}
              {item.research_confidence && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">Confidence:</span>
                  <Progress
                    value={item.research_confidence * 100}
                    className="w-20 h-2"
                  />
                  <span className="text-zinc-400">{Math.round(item.research_confidence * 100)}%</span>
                </div>
              )}
            </div>
          )}

          {/* Completed - Show linked product */}
          {item.status === 'completed' && productId && (
            <div className="mt-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-zinc-400">
                {item.action_taken === 'matched_existing' ? 'Matched:' : 'Created:'}
              </span>
              <Link
                to={createPageUrl('ProductDetail') + `?type=physical&slug=${productSlug}`}
                className="text-sm text-cyan-400 hover:underline"
              >
                {productName}
              </Link>
            </div>
          )}

          {/* Error message */}
          {item.error_message && (
            <p className="mt-2 text-sm text-red-400">{item.error_message}</p>
          )}

          {/* Actions */}
          {(item.status === 'failed' || item.status === 'manual_review') && (
            <div className="mt-3 flex items-center gap-2">
              {item.status === 'failed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={processing}
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-1", processing && "animate-spin")} />
                  Retry
                </Button>
              )}
              {item.status === 'manual_review' && item.researched_name && (
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve & Create
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={processing}
                className="text-zinc-400 hover:text-zinc-300"
              >
                <X className="w-4 h-4 mr-1" />
                Skip
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductResearchStatus({ expenseId, className }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    if (!expenseId) return;
    try {
      const data = await getExpenseResearchQueue(expenseId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load research items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // Poll for updates every 5 seconds if there are pending/researching items
    const hasActive = items.some(i => ['pending', 'researching'].includes(i.status));
    if (hasActive) {
      const interval = setInterval(loadItems, 5000);
      return () => clearInterval(interval);
    }
  }, [expenseId, items.length]);

  const handleRetry = async (queueId) => {
    await retryResearchItem(queueId);
    loadItems();
  };

  const handleApprove = async (queueId) => {
    await approveResearchResult(queueId);
    loadItems();
  };

  const handleSkip = async (queueId) => {
    await skipResearchItem(queueId);
    loadItems();
  };

  if (loading) {
    return (
      <GlassCard className={cn("p-6", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      </GlassCard>
    );
  }

  if (items.length === 0) {
    return null; // Don't show if no research items
  }

  // Calculate stats
  const stats = {
    total: items.length,
    completed: items.filter(i => i.status === 'completed').length,
    pending: items.filter(i => ['pending', 'researching'].includes(i.status)).length,
    needsReview: items.filter(i => i.status === 'manual_review').length,
    failed: items.filter(i => i.status === 'failed').length,
  };

  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <GlassCard className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-white">Product Research</span>
          <Badge variant="secondary" className="ml-2 bg-zinc-800 text-zinc-300">
            {stats.completed}/{stats.total}
          </Badge>
        </div>
        {stats.pending > 0 && (
          <div className="flex items-center gap-2 text-sm text-cyan-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing {stats.pending} items...</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
          <span>{stats.completed} completed</span>
          {stats.needsReview > 0 && (
            <span className="text-amber-400">{stats.needsReview} need review</span>
          )}
          {stats.failed > 0 && (
            <span className="text-red-400">{stats.failed} failed</span>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-3">
        <AnimatePresence>
          {items.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ResearchItemCard
                item={item}
                onRetry={handleRetry}
                onApprove={handleApprove}
                onSkip={handleSkip}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
