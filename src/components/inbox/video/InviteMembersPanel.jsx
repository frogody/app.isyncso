/**
 * InviteMembersPanel - Slide-out panel for inviting company members to an active call.
 *
 * Fetches team members from the `users` table (same company_id), allows search,
 * and sends call-invite notifications via `user_notifications`.
 */

import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Search, UserPlus, Check, Copy, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

const InviteMembersPanel = memo(function InviteMembersPanel({
  companyId,
  userId,
  userName,
  callId,
  joinCode,
  joinUrl,
  callTitle,
  participantUserIds = [],
  onClose,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [sendingId, setSendingId] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch company members (excluding current user and existing participants)
  useEffect(() => {
    if (!companyId) return;

    async function fetchMembers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .eq('company_id', companyId)
        .neq('id', userId)
        .order('full_name');

      if (!error && data) {
        setMembers(data);
      }
      setLoading(false);
    }

    fetchMembers();
  }, [companyId, userId]);

  // Filter by search
  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    );
  }, [members, search]);

  // Check if member is already a participant
  const isParticipant = useCallback(
    (memberId) => participantUserIds.includes(memberId),
    [participantUserIds]
  );

  // Send invite notification
  const handleInvite = useCallback(
    async (member) => {
      setSendingId(member.id);
      try {
        const { error } = await supabase.from('user_notifications').insert({
          user_id: member.id,
          type: 'call_invite',
          title: `${userName || 'Someone'} invited you to a call`,
          message: callTitle || 'Meeting',
          action_url: `/Inbox?tab=calls&call=${joinCode}`,
          read: false,
          metadata: {
            call_id: callId,
            join_code: joinCode,
            join_url: joinUrl || `${window.location.origin}/call/${joinCode}`,
            invited_by: userId,
            invited_by_name: userName,
            call_title: callTitle,
          },
        });

        if (error) throw error;

        setInvitedIds((prev) => new Set([...prev, member.id]));
        toast.success(`Invite sent to ${member.full_name || member.email}`);
      } catch (err) {
        console.error('[InviteMembersPanel] Failed to send invite:', err);
        toast.error('Failed to send invite');
      } finally {
        setSendingId(null);
      }
    },
    [userId, userName, callId, joinCode, joinUrl, callTitle]
  );

  // Copy join link
  const handleCopyLink = useCallback(() => {
    const url = joinUrl || `${window.location.origin}/call/${joinCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Meeting link copied');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [joinUrl, joinCode]);

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-700/50 flex flex-col z-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50">
        <h3 className="text-sm font-semibold text-white">Invite Members</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-zinc-700/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-8 pr-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-zinc-500">
              {search ? 'No members match your search' : 'No team members found'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filteredMembers.map((member) => {
              const alreadyInCall = isParticipant(member.id);
              const alreadyInvited = invitedIds.has(member.id);
              const isSending = sendingId === member.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  {/* Avatar */}
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-zinc-300">
                        {(member.full_name || member.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Name & email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {member.full_name || 'Unknown'}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">{member.email}</p>
                  </div>

                  {/* Action button */}
                  {alreadyInCall ? (
                    <span className="text-[11px] text-cyan-400 font-medium flex-shrink-0">
                      In call
                    </span>
                  ) : alreadyInvited ? (
                    <span className="flex items-center gap-1 text-[11px] text-cyan-400 font-medium flex-shrink-0">
                      <Check className="w-3 h-3" /> Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => handleInvite(member)}
                      disabled={isSending}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-600/20 text-cyan-400 text-[11px] font-medium hover:bg-cyan-600/30 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      Invite
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer — copy link */}
      <div className="px-3 py-3 border-t border-zinc-700/50">
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700/40 transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? 'Copied!' : 'Copy Meeting Link'}
        </button>
      </div>
    </motion.div>
  );
});

export default InviteMembersPanel;
