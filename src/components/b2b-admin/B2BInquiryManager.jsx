/**
 * B2BInquiryManager - Admin inquiry management for B2B wholesale.
 *
 * Lists from b2b_inquiries table. Shows date/client/product/message/status.
 * Expand to see full message + reply form. Reply updates status to 'replied'.
 * Filter by status (open/replied/closed). Quick archive action.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
  Archive,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Inbox,
  User,
  Package,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS = [
  { key: 'all', label: 'All', icon: Inbox },
  { key: 'open', label: 'Open', icon: Clock },
  { key: 'replied', label: 'Replied', icon: CheckCircle2 },
  { key: 'closed', label: 'Closed', icon: XCircle },
];

const STATUS_COLORS = {
  open: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  replied: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  closed: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const colorClass = STATUS_COLORS[status] || 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function InquiryCard({ inquiry, onReply, onArchive, replying }) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    await onReply(inquiry.id, replyText.trim());
    setReplyText('');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-colors hover:border-zinc-700">
      {/* Summary row */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-6 py-4 flex items-center gap-4 text-left"
      >
        <div className="p-2 rounded-xl bg-cyan-500/10 shrink-0">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white truncate">
              {inquiry.subject || 'No Subject'}
            </span>
            <StatusBadge status={inquiry.status || 'open'} />
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {inquiry.client_name || inquiry.email || 'Unknown'}
            </span>
            {inquiry.product_name && (
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {inquiry.product_name}
              </span>
            )}
            <span>{formatDate(inquiry.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {inquiry.status !== 'closed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(inquiry.id);
              }}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 border-t border-zinc-800/60">
              {/* Full message */}
              <div className="mt-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">Message</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{inquiry.message || 'No message content.'}</p>
              </div>

              {/* Contact preference */}
              {inquiry.preferred_contact && (
                <div className="mt-3 text-xs text-zinc-500">
                  Preferred contact: <span className="text-zinc-400">{inquiry.preferred_contact}</span>
                </div>
              )}

              {/* Urgency */}
              {inquiry.urgency && inquiry.urgency !== 'normal' && (
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                      inquiry.urgency === 'high'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {inquiry.urgency} urgency
                  </span>
                </div>
              )}

              {/* Reply from admin */}
              {inquiry.reply && (
                <div className="mt-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                  <p className="text-xs text-cyan-500 mb-2">Admin Reply</p>
                  <p className="text-sm text-cyan-300 whitespace-pre-wrap">{inquiry.reply}</p>
                  {inquiry.replied_at && (
                    <p className="text-xs text-zinc-600 mt-2">{formatDate(inquiry.replied_at)}</p>
                  )}
                </div>
              )}

              {/* Reply form */}
              {inquiry.status !== 'closed' && (
                <form onSubmit={handleSubmitReply} className="mt-4 flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={2}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors resize-none"
                  />
                  <button
                    type="submit"
                    disabled={replying || !replyText.trim()}
                    className="self-end px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Reply
                  </button>
                </form>
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

export default function B2BInquiryManager() {
  const { user } = useUser();
  const organizationId = user?.organization_id || user?.company_id;

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingId, setReplyingId] = useState(null);

  // -----------------------------------------------------------------------
  // Fetch inquiries
  // -----------------------------------------------------------------------
  const fetchInquiries = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('b2b_product_inquiries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      if (searchQuery.trim()) {
        query = query.or(
          `subject.ilike.%${searchQuery.trim()}%,client_name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%,product_name.ilike.%${searchQuery.trim()}%`
        );
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      setInquiries(data || []);
    } catch (err) {
      console.error('[B2BInquiryManager] fetch error:', err);
      setError(err.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [organizationId, activeTab, searchQuery]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // -----------------------------------------------------------------------
  // Reply to inquiry
  // -----------------------------------------------------------------------
  const handleReply = useCallback(
    async (inquiryId, replyText) => {
      setReplyingId(inquiryId);
      try {
        const { error: updateErr } = await supabase
          .from('b2b_product_inquiries')
          .update({
            reply: replyText,
            status: 'replied',
            replied_at: new Date().toISOString(),
            replied_by: user?.id || null,
          })
          .eq('id', inquiryId);

        if (updateErr) throw updateErr;
        await fetchInquiries();
      } catch (err) {
        console.error('[B2BInquiryManager] reply error:', err);
        setError(err.message);
      } finally {
        setReplyingId(null);
      }
    },
    [user, fetchInquiries]
  );

  // -----------------------------------------------------------------------
  // Archive (close) inquiry
  // -----------------------------------------------------------------------
  const handleArchive = useCallback(
    async (inquiryId) => {
      try {
        const { error: updateErr } = await supabase
          .from('b2b_product_inquiries')
          .update({ status: 'closed' })
          .eq('id', inquiryId);

        if (updateErr) throw updateErr;
        await fetchInquiries();
      } catch (err) {
        console.error('[B2BInquiryManager] archive error:', err);
        setError(err.message);
      }
    },
    [fetchInquiries]
  );

  // -----------------------------------------------------------------------
  // Counts per status
  // -----------------------------------------------------------------------
  const statusCounts = {
    all: inquiries.length,
    open: inquiries.filter((i) => i.status === 'open').length,
    replied: inquiries.filter((i) => i.status === 'replied').length,
    closed: inquiries.filter((i) => i.status === 'closed').length,
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Inquiries</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage product inquiries from wholesale clients
            </p>
          </div>
          <button
            onClick={fetchInquiries}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800">
            {STATUS_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <TabIcon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search inquiries..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            />
          </div>
        </div>

        {/* Inquiries list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <Inbox className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No inquiries found</p>
            <p className="text-zinc-500 text-xs mt-1">
              {activeTab !== 'all' ? 'Try a different status filter' : 'Client inquiries will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inquiry) => (
              <InquiryCard
                key={inquiry.id}
                inquiry={inquiry}
                onReply={handleReply}
                onArchive={handleArchive}
                replying={replyingId === inquiry.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
