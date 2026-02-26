/**
 * GuestInviteModal - Modal for inviting external guests to a channel
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, UserPlus, Mail, Copy, Check, Loader2,
  MessageSquare, Upload, Phone, Clock, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useGuestAccess } from './useGuestAccess';

const EXPIRATION_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: 'Never', value: null },
];

const STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  accepted: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  expired: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  revoked: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function GuestInviteModal({ open, onClose, channel }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [canMessage, setCanMessage] = useState(true);
  const [canUpload, setCanUpload] = useState(false);
  const [canCall, setCanCall] = useState(false);
  const [expiration, setExpiration] = useState(30);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { guests, loading, inviteGuest } = useGuestAccess(channel?.id);

  const activeGuests = useMemo(() =>
    guests.filter(g => g.status === 'pending' || g.status === 'accepted'),
    [guests]
  );

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    const result = await inviteGuest({
      channelId: channel?.id,
      email: email.trim(),
      name: name.trim() || null,
      permissions: {
        can_message: canMessage,
        can_upload: canUpload,
        can_call: canCall,
      },
      expiresInDays: expiration,
    });

    if (result) {
      const link = `${window.location.origin}/guest/${result.access_token}`;
      setInviteLink(link);
    }
    setSubmitting(false);
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleReset = () => {
    setEmail('');
    setName('');
    setCanMessage(true);
    setCanUpload(false);
    setCanCall(false);
    setExpiration(30);
    setInviteLink(null);
    setCopied(false);
  };

  const handleClose = () => {
    handleReset();
    onClose?.();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Invite Guest
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Channel info */}
              <div className="text-sm text-zinc-400">
                Invite an external collaborator to{' '}
                <span className="text-white font-medium">#{channel?.name}</span>
              </div>

              {/* Invite Link Result */}
              {inviteLink ? (
                <div className="space-y-4">
                  <div className="p-4 bg-cyan-500/5 border border-dashed border-cyan-500/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-400">Invite Created</span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">
                      Share this link with your guest to give them access:
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 truncate font-mono">
                        {inviteLink}
                      </div>
                      <button
                        onClick={handleCopy}
                        className={`p-2 rounded-lg transition-colors ${
                          copied
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                        }`}
                        title="Copy link"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleReset}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Invite Another Guest
                  </button>
                </div>
              ) : (
                /* Invite Form */
                <form onSubmit={handleInvite} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="guest@company.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Name (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      Name <span className="text-zinc-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Guest name"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Permissions */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Permissions
                    </label>
                    <div className="space-y-2">
                      <PermissionToggle
                        icon={MessageSquare}
                        label="Can Message"
                        checked={canMessage}
                        onChange={setCanMessage}
                      />
                      <PermissionToggle
                        icon={Upload}
                        label="Can Upload Files"
                        checked={canUpload}
                        onChange={setCanUpload}
                      />
                      <PermissionToggle
                        icon={Phone}
                        label="Can Join Calls"
                        checked={canCall}
                        onChange={setCanCall}
                      />
                    </div>
                  </div>

                  {/* Expiration */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                      Expiration
                    </label>
                    <div className="flex gap-2">
                      {EXPIRATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setExpiration(opt.value)}
                          className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                            expiration === opt.value
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={!email.trim() || submitting}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Invite...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Send Invite
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Existing Guests */}
              {guests.length > 0 && (
                <div className="pt-4 border-t border-zinc-800">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Channel Guests ({activeGuests.length} active)
                  </h3>
                  <div className="space-y-2">
                    {guests.map((guest) => (
                      <div
                        key={guest.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/30 border border-dashed border-zinc-700/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-dashed border-amber-500/30 flex items-center justify-center">
                          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">
                            {guest.name || guest.email}
                          </div>
                          {guest.name && (
                            <div className="text-xs text-zinc-500 truncate">{guest.email}</div>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[guest.status] || STATUS_STYLES.pending}`}>
                          {guest.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact permission toggle switch
function PermissionToggle({ icon: Icon, label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 cursor-pointer hover:border-zinc-600 transition-colors">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-zinc-400" />
        <span className="text-sm text-zinc-300">{label}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-amber-500' : 'bg-zinc-600'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </button>
    </label>
  );
}
