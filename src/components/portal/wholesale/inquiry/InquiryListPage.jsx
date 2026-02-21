/**
 * InquiryListPage - Client-facing inquiry list.
 *
 * Fetch from b2b_inquiries for current user. Show date, product, status badge,
 * message snippet. Click to expand full thread. Status colors: open=cyan,
 * replied=green, closed=zinc. Empty state.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
  Inbox,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS = {
  open: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  replied: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  closed: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30',
};

const STATUS_ICONS = {
  open: Clock,
  replied: CheckCircle2,
  closed: XCircle,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const colorClass = STATUS_COLORS[status] || 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30';
  const Icon = STATUS_ICONS[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function InquiryItem({ inquiry }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const snippet = inquiry.message
    ? inquiry.message.length > 120
      ? inquiry.message.substring(0, 120) + '...'
      : inquiry.message
    : 'No message';

  return (
    <div
      className={`rounded-2xl border bg-zinc-900/60 overflow-hidden transition-colors ${
        expanded ? 'border-zinc-700' : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-5 py-4 flex items-start gap-3 text-left"
      >
        <div className="p-2 rounded-xl bg-cyan-500/10 mt-0.5 shrink-0">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium text-white">{inquiry.subject || 'Inquiry'}</span>
            <StatusBadge status={inquiry.status || 'open'} />
          </div>
          {!expanded && (
            <p className="text-xs text-zinc-500 line-clamp-1">{snippet}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1.5">
            <span>{formatDate(inquiry.created_at)}</span>
            {inquiry.product_name && (
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {inquiry.product_name}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3 border-t border-zinc-800/60">
              {/* Client message */}
              <div className="mt-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">Your message</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{inquiry.message}</p>
              </div>

              {/* Admin reply */}
              {inquiry.reply && (
                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                  <p className="text-xs text-cyan-500 mb-2">Reply</p>
                  <p className="text-sm text-cyan-300 whitespace-pre-wrap">{inquiry.reply}</p>
                  {inquiry.replied_at && (
                    <p className="text-xs text-zinc-600 mt-2">{formatDate(inquiry.replied_at)}</p>
                  )}
                </div>
              )}

              {/* Status hint */}
              {inquiry.status === 'open' && !inquiry.reply && (
                <p className="text-xs text-zinc-500 italic">Awaiting reply...</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InquiryListPage() {
  const { client, config } = useWholesale();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInquiries = useCallback(async () => {
    if (!client?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('b2b_product_inquiries')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (err) {
      console.error('[InquiryListPage] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold text-white mb-6">My Inquiries</h1>
        <div className="py-16 text-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <Inbox className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No inquiries yet</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            When you submit product inquiries, they will appear here with any replies from the team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-6">My Inquiries</h1>
      <div className="space-y-3">
        {inquiries.map((inquiry) => (
          <InquiryItem key={inquiry.id} inquiry={inquiry} />
        ))}
      </div>
    </div>
  );
}
