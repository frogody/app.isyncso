/**
 * GuestListPanel - Slide-in panel for managing guests in a channel
 * Follows the same pattern as MembersPanel and ChannelDetailsPanel.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, UserPlus, ExternalLink, Shield, Clock, Eye,
  MoreHorizontal, Loader2, MessageSquare, Upload,
  Phone, Ban, Settings2, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useGuestAccess } from './useGuestAccess';

const STATUS_STYLES = {
  pending: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    label: 'Pending',
  },
  accepted: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-400',
    label: 'Accepted',
  },
  expired: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
    dot: 'bg-zinc-400',
    label: 'Expired',
  },
  revoked: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: 'bg-red-400',
    label: 'Revoked',
  },
};

export default function GuestListPanel({
  channel,
  onClose,
  onInviteGuest,
}) {
  const { guests, loading, revokeGuest, updateGuestPermissions } = useGuestAccess(channel?.id);
  const [editingGuest, setEditingGuest] = useState(null);
  const [editPermissions, setEditPermissions] = useState({});

  const activeGuests = guests.filter(g => g.status === 'pending' || g.status === 'accepted');
  const inactiveGuests = guests.filter(g => g.status === 'expired' || g.status === 'revoked');

  const handleEditPermissions = useCallback((guest) => {
    setEditingGuest(guest.id);
    setEditPermissions(guest.permissions || { can_message: true, can_upload: false, can_call: false });
  }, []);

  const handleSavePermissions = useCallback(async () => {
    if (!editingGuest) return;
    await updateGuestPermissions(editingGuest, editPermissions);
    setEditingGuest(null);
    setEditPermissions({});
  }, [editingGuest, editPermissions, updateGuestPermissions]);

  const handleRevoke = useCallback(async (guestId) => {
    await revokeGuest(guestId);
  }, [revokeGuest]);

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-72 sm:w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col h-full"
    >
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-amber-400" />
          Guests
        </h3>
        <div className="flex items-center gap-1">
          {onInviteGuest && (
            <button
              onClick={onInviteGuest}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Invite guest"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
        ) : guests.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-dashed border-amber-500/30 flex items-center justify-center mb-4">
              <UserPlus className="w-7 h-7 text-amber-400" />
            </div>
            <h4 className="text-sm font-medium text-white mb-1">No guests yet</h4>
            <p className="text-xs text-zinc-500 mb-4">
              Invite external collaborators to join this channel.
            </p>
            {onInviteGuest && (
              <Button
                size="sm"
                onClick={onInviteGuest}
                className="bg-amber-500 hover:bg-amber-400 text-black"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Invite Guest
              </Button>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {/* Active Guests */}
            {activeGuests.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-2">
                  Active ({activeGuests.length})
                </div>
                <AnimatePresence mode="popLayout">
                  {activeGuests.map((guest) => (
                    <GuestRow
                      key={guest.id}
                      guest={guest}
                      isEditing={editingGuest === guest.id}
                      editPermissions={editPermissions}
                      onEditPermissions={() => handleEditPermissions(guest)}
                      onSavePermissions={handleSavePermissions}
                      onCancelEdit={() => setEditingGuest(null)}
                      onTogglePermission={(key) => setEditPermissions(prev => ({ ...prev, [key]: !prev[key] }))}
                      onRevoke={() => handleRevoke(guest.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Inactive Guests */}
            {inactiveGuests.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-2">
                  Inactive ({inactiveGuests.length})
                </div>
                <AnimatePresence mode="popLayout">
                  {inactiveGuests.map((guest) => (
                    <GuestRow
                      key={guest.id}
                      guest={guest}
                      inactive
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 text-center">
          {activeGuests.length} active guest{activeGuests.length !== 1 ? 's' : ''}
        </div>
      </div>
    </motion.div>
  );
}

function GuestRow({
  guest,
  inactive = false,
  isEditing = false,
  editPermissions = {},
  onEditPermissions,
  onSavePermissions,
  onCancelEdit,
  onTogglePermission,
  onRevoke,
}) {
  const status = STATUS_STYLES[guest.status] || STATUS_STYLES.pending;
  const permissions = guest.permissions || {};

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`p-3 rounded-xl border border-dashed mb-2 transition-colors ${
        inactive
          ? 'border-zinc-800 bg-zinc-900/30 opacity-60'
          : 'border-zinc-600 bg-zinc-900/50 hover:bg-zinc-800/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border border-dashed ${
          inactive ? 'bg-zinc-800 border-zinc-700' : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <ExternalLink className={`w-4 h-4 ${inactive ? 'text-zinc-500' : 'text-amber-400'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {guest.name || guest.email.split('@')[0]}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${status.bg} ${status.text} ${status.border}`}>
              {status.label}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            <Mail className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500 truncate">{guest.email}</span>
          </div>

          {/* Permissions row */}
          {!isEditing && !inactive && (
            <div className="flex items-center gap-2 mt-2">
              {permissions.can_message && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                  <MessageSquare className="w-2.5 h-2.5" /> Msg
                </span>
              )}
              {permissions.can_upload && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                  <Upload className="w-2.5 h-2.5" /> Files
                </span>
              )}
              {permissions.can_call && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                  <Phone className="w-2.5 h-2.5" /> Calls
                </span>
              )}
            </div>
          )}

          {/* Last seen / invited */}
          <div className="flex items-center gap-3 mt-1.5">
            {guest.last_seen_at ? (
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <Eye className="w-2.5 h-2.5" />
                Last seen {format(new Date(guest.last_seen_at), 'MMM d')}
              </span>
            ) : (
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Invited {format(new Date(guest.invited_at), 'MMM d')}
              </span>
            )}
            {guest.expires_at && (
              <span className="text-[10px] text-zinc-600">
                Expires {format(new Date(guest.expires_at), 'MMM d')}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!inactive && !isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-zinc-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-700 min-w-[160px]" align="end">
              <DropdownMenuItem
                onClick={onEditPermissions}
                className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Edit Permissions
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-700" />
              <DropdownMenuItem
                onClick={onRevoke}
                className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-950/30"
              >
                <Ban className="w-4 h-4 mr-2" />
                Revoke Access
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Edit Permissions Inline */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
              <div className="text-xs font-medium text-zinc-400 mb-2">
                <Shield className="w-3 h-3 inline mr-1" />
                Edit Permissions
              </div>

              <MiniPermissionToggle
                label="Can Message"
                checked={editPermissions.can_message}
                onChange={() => onTogglePermission('can_message')}
              />
              <MiniPermissionToggle
                label="Can Upload Files"
                checked={editPermissions.can_upload}
                onChange={() => onTogglePermission('can_upload')}
              />
              <MiniPermissionToggle
                label="Can Join Calls"
                checked={editPermissions.can_call}
                onChange={() => onTogglePermission('can_call')}
              />

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancelEdit}
                  className="flex-1 text-zinc-400 h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={onSavePermissions}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black h-7 text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MiniPermissionToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer">
      <span className="text-xs text-zinc-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
          checked ? 'bg-amber-500' : 'bg-zinc-600'
        }`}
      >
        <span
          className="inline-block h-2.5 w-2.5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(14px)' : 'translateX(2px)' }}
        />
      </button>
    </label>
  );
}
