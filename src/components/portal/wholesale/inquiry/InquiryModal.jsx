/**
 * InquiryModal - Modal for clients to submit product inquiries.
 *
 * Props: isOpen, onClose, product
 * Fields: subject (pre-filled with product name), message textarea,
 * preferred contact (email/phone toggle), urgency (low/normal/high).
 * Submit to b2b_inquiries. framer-motion animations. Success state with checkmark.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  Mail,
  Phone,
  AlertTriangle,
} from 'lucide-react';

const URGENCY_OPTIONS = [
  { key: 'low', label: 'Low', color: 'text-zinc-400 border-zinc-600 bg-zinc-800/50' },
  { key: 'normal', label: 'Normal', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  { key: 'high', label: 'High', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
];

const CONTACT_METHODS = [
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'phone', label: 'Phone', icon: Phone },
];

export default function InquiryModal({ isOpen, onClose, product }) {
  const { client, config } = useWholesale();
  const organizationId = config?.organization_id;

  const [subject, setSubject] = useState(product?.name ? `Inquiry about ${product.name}` : '');
  const [message, setMessage] = useState('');
  const [preferredContact, setPreferredContact] = useState('email');
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('b2b_product_inquiries').insert({
        organization_id: organizationId,
        client_id: client?.id || null,
        client_name: client?.name || client?.company_name || null,
        email: client?.email || null,
        product_id: product?.id || null,
        product_name: product?.name || null,
        subject: subject.trim(),
        message: message.trim(),
        preferred_contact: preferredContact,
        urgency,
        status: 'open',
      });

      if (insertError) throw insertError;
      setSuccess(true);
    } catch (err) {
      console.error('[InquiryModal] submit error:', err);
      setError(err.message || 'Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubject(product?.name ? `Inquiry about ${product.name}` : '');
    setMessage('');
    setPreferredContact('email');
    setUrgency('normal');
    setSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Product Inquiry</h2>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {success ? (
              /* Success state */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Inquiry Submitted</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  We'll get back to you as soon as possible.
                </p>
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </motion.div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What is your inquiry about?"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your inquiry in detail..."
                    rows={4}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors resize-none"
                  />
                </div>

                {/* Preferred contact */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Preferred Contact</label>
                  <div className="flex gap-2">
                    {CONTACT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const isActive = preferredContact === method.key;
                      return (
                        <button
                          key={method.key}
                          type="button"
                          onClick={() => setPreferredContact(method.key)}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                            isActive
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {method.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Urgency</label>
                  <div className="flex gap-2">
                    {URGENCY_OPTIONS.map((opt) => {
                      const isActive = urgency === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setUrgency(opt.key)}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                            isActive ? opt.color : 'bg-zinc-800/50 text-zinc-500 border-zinc-700 hover:border-zinc-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit Inquiry
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
