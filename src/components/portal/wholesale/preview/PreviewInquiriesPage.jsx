// ---------------------------------------------------------------------------
// PreviewInquiriesPage.jsx -- B2B wholesale storefront inquiries / messages.
// Shows conversations between the B2B client and supplier: product questions,
// order queries, quote requests, and support threads.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  Paperclip,
  Clock,
  CheckCheck,
  ChevronRight,
  Package,
  FileQuestion,
  HelpCircle,
  Receipt,
} from 'lucide-react';
import {
  GlassCard,
  SectionHeader,
  Breadcrumb,
  StatusBadge,
  EmptyState,
  PrimaryButton,
  GlassInput,
  motionVariants,
  glassCardStyle,
  gradientAccentBar,
} from './previewDesignSystem';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_THREADS = [
  {
    id: 'INQ-001',
    subject: 'Bulk pricing inquiry — Premium Coffee Beans',
    category: 'quote',
    status: 'open',
    lastMessage: 'We can offer 15% discount on orders above 500kg. Would you like to proceed with a formal quote?',
    lastSender: 'supplier',
    lastSenderName: 'Sarah — Account Manager',
    updatedAt: '2026-02-18T14:30:00Z',
    unread: 1,
    messages: 3,
  },
  {
    id: 'INQ-002',
    subject: 'Delivery delay — Order ORD-2026-00142',
    category: 'order',
    status: 'open',
    lastMessage: 'The shipment is now in transit and expected to arrive Thursday morning.',
    lastSender: 'supplier',
    lastSenderName: 'Logistics Team',
    updatedAt: '2026-02-17T09:15:00Z',
    unread: 0,
    messages: 5,
  },
  {
    id: 'INQ-003',
    subject: 'Product specifications — Organic Matcha Powder',
    category: 'product',
    status: 'resolved',
    lastMessage: 'Thank you for the detailed spec sheet. We\'ll place an order next week.',
    lastSender: 'client',
    lastSenderName: 'You',
    updatedAt: '2026-02-15T16:45:00Z',
    unread: 0,
    messages: 4,
  },
  {
    id: 'INQ-004',
    subject: 'Return request — Damaged items in last shipment',
    category: 'support',
    status: 'open',
    lastMessage: 'We\'ve initiated the return process. A prepaid shipping label has been sent to your email.',
    lastSender: 'supplier',
    lastSenderName: 'Support Team',
    updatedAt: '2026-02-14T11:20:00Z',
    unread: 2,
    messages: 6,
  },
  {
    id: 'INQ-005',
    subject: 'Payment terms extension request',
    category: 'order',
    status: 'resolved',
    lastMessage: 'Approved. Your payment terms have been updated to Net-60 effective immediately.',
    lastSender: 'supplier',
    lastSenderName: 'Finance Team',
    updatedAt: '2026-02-10T08:00:00Z',
    unread: 0,
    messages: 3,
  },
];

const CATEGORY_META = {
  quote: { label: 'Quote Request', icon: Receipt, color: 'var(--ws-primary)' },
  order: { label: 'Order Query', icon: Package, color: '#60a5fa' },
  product: { label: 'Product Question', icon: FileQuestion, color: '#a78bfa' },
  support: { label: 'Support', icon: HelpCircle, color: '#f59e0b' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PreviewInquiriesPage({ config, nav }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState(null);

  const filtered = MOCK_THREADS.filter((t) => {
    if (activeFilter !== 'all' && t.status !== activeFilter) return false;
    if (searchQuery && !t.subject.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full px-6 sm:px-10 lg:px-16 py-8">
      <Breadcrumb
        items={[
          { label: 'Home', onClick: () => nav?.goToHome?.() },
          { label: 'Inquiries' },
        ]}
        onNavigate={nav?.goToHome}
      />

      <div className="mt-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeader title="Inquiries" subtitle="Messages and conversations with your supplier" />
        <PrimaryButton icon={Plus} onClick={() => {}}>
          New Inquiry
        </PrimaryButton>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
          <GlassInput
            type="text"
            placeholder="Search inquiries..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeFilter === f.id
                  ? 'color-mix(in srgb, var(--ws-primary) 15%, transparent)'
                  : 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
                color: activeFilter === f.id ? 'var(--ws-primary)' : 'var(--ws-muted)',
                border: `1px solid ${activeFilter === f.id ? 'color-mix(in srgb, var(--ws-primary) 30%, transparent)' : 'var(--ws-border)'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <motion.div
        variants={motionVariants.container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
      >
        {[
          { label: 'Open', value: MOCK_THREADS.filter((t) => t.status === 'open').length, color: 'var(--ws-primary)' },
          { label: 'Unread', value: MOCK_THREADS.reduce((s, t) => s + t.unread, 0), color: '#f59e0b' },
          { label: 'Resolved', value: MOCK_THREADS.filter((t) => t.status === 'resolved').length, color: '#22c55e' },
          { label: 'Total', value: MOCK_THREADS.length, color: 'var(--ws-muted)' },
        ].map((stat) => (
          <motion.div key={stat.label} variants={motionVariants.card}>
            <GlassCard className="p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ws-muted)' }}>{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Thread List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No inquiries found"
          description="Start a new inquiry to contact your supplier."
        />
      ) : (
        <motion.div
          variants={motionVariants.container}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {filtered.map((thread) => {
            const cat = CATEGORY_META[thread.category] || CATEGORY_META.support;
            const CatIcon = cat.icon;

            return (
              <motion.div key={thread.id} variants={motionVariants.card}>
                <GlassCard
                  className="p-4 sm:p-5 cursor-pointer transition-all hover:translate-y-[-2px]"
                  onClick={() => setSelectedThread(thread.id === selectedThread ? null : thread.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Category icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `color-mix(in srgb, ${cat.color} 15%, transparent)` }}
                    >
                      <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${cat.color} 12%, transparent)`,
                            color: cat.color,
                          }}
                        >
                          {cat.label}
                        </span>
                        <StatusBadge
                          status={thread.status === 'open' ? 'active' : 'completed'}
                          label={thread.status}
                        />
                        {thread.unread > 0 && (
                          <span
                            className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                            style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-bg)' }}
                          >
                            {thread.unread}
                          </span>
                        )}
                      </div>

                      <h3
                        className="text-sm font-semibold truncate"
                        style={{ color: thread.unread > 0 ? 'var(--ws-text)' : 'var(--ws-muted)' }}
                      >
                        {thread.subject}
                      </h3>

                      <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--ws-muted)' }}>
                        <span className="font-medium" style={{ color: thread.lastSender === 'client' ? 'var(--ws-primary)' : 'var(--ws-muted)' }}>
                          {thread.lastSenderName}:
                        </span>{' '}
                        {thread.lastMessage}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px]" style={{ color: 'var(--ws-muted)' }}>
                        {formatTime(thread.updatedAt)}
                      </span>
                      <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--ws-muted)' }}>
                        <MessageSquare className="w-3 h-3" /> {thread.messages}
                      </span>
                    </div>
                  </div>

                  {/* Expanded preview */}
                  {selectedThread === thread.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 pt-4 overflow-hidden"
                      style={{ borderTop: '1px solid var(--ws-border)' }}
                    >
                      <div
                        className="rounded-xl p-4 mb-3"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-bg)' }}
                          >
                            {thread.lastSenderName[0]}
                          </div>
                          <span className="text-xs font-medium" style={{ color: 'var(--ws-text)' }}>{thread.lastSenderName}</span>
                          <span className="text-[10px]" style={{ color: 'var(--ws-muted)' }}>
                            {formatTime(thread.updatedAt)}
                          </span>
                          {thread.lastSender === 'supplier' && (
                            <CheckCheck className="w-3.5 h-3.5 ml-auto" style={{ color: 'var(--ws-primary)' }} />
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--ws-text)' }}>{thread.lastMessage}</p>
                      </div>

                      {/* Quick reply */}
                      <div className="flex gap-2">
                        <GlassInput
                          placeholder="Type a reply..."
                          className="flex-1 text-sm"
                        />
                        <button
                          className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors"
                          style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-bg)' }}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send
                        </button>
                      </div>
                    </motion.div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
