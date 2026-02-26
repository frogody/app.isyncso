/**
 * MembersPanel - Panel showing channel members with role management and moderation
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, Crown, Shield, Star, MessageSquare, MoreHorizontal,
  UserMinus, Loader2, VolumeX, Volume2, AlertTriangle, Clock, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { useChannelRoles } from './hooks/useChannelRoles';
import { useModeration } from './hooks/useModeration';

export default function MembersPanel({
  channel,
  members: legacyMembers = [],
  onClose,
  onStartDM,
  currentUserId
}) {
  const [warnDialogUser, setWarnDialogUser] = useState(null);
  const [warnReason, setWarnReason] = useState('');
  const [muteDialogUser, setMuteDialogUser] = useState(null);
  const [muteReason, setMuteReason] = useState('');
  const [muteDuration, setMuteDuration] = useState('');
  const [historyUser, setHistoryUser] = useState(null);
  const [moderationHistory, setModerationHistory] = useState([]);

  const {
    members,
    loading,
    userRole,
    isAdmin,
    isModerator,
    setMemberRole,
    kickMember,
    getRoleBadgeColor,
    getAvailableRoles,
  } = useChannelRoles(channel?.id, currentUserId);

  const {
    mutedUsers,
    muteUser,
    unmuteUser,
    warnUser,
    getModerationHistory,
    loading: moderationLoading,
  } = useModeration(channel?.id, currentUserId);

  // Use channel roles members if available, fallback to legacy
  const displayMembers = members.length > 0 ? members : legacyMembers.map(m => ({
    user_id: m.id,
    full_name: m.full_name,
    email: m.email,
    avatar_url: m.avatar_url,
    role: m.role || 'member'
  }));

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3 text-amber-400" />;
      case 'admin': return <Shield className="w-3 h-3 text-cyan-400" />;
      case 'moderator': return <Star className="w-3 h-3 text-purple-400" />;
      default: return null;
    }
  };

  const handleSetRole = async (userId, newRole) => {
    await setMemberRole(userId, newRole);
  };

  const handleKick = async (userId) => {
    await kickMember(userId);
  };

  // Check if a user is muted
  const isUserMuted = (userId) => {
    return mutedUsers.some(m => m.user_id === userId);
  };

  // Handle warn submission
  const handleWarnSubmit = async () => {
    if (!warnDialogUser || !warnReason.trim()) return;
    await warnUser(warnDialogUser.user_id, warnReason);
    setWarnDialogUser(null);
    setWarnReason('');
  };

  // Handle mute submission
  const handleMuteSubmit = async () => {
    if (!muteDialogUser) return;
    const duration = muteDuration ? parseInt(muteDuration) : null;
    await muteUser(muteDialogUser.user_id, muteReason || null, duration);
    setMuteDialogUser(null);
    setMuteReason('');
    setMuteDuration('');
  };

  // Load moderation history
  const handleViewHistory = async (member) => {
    setHistoryUser(member);
    const history = await getModerationHistory(member.user_id);
    setModerationHistory(history);
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-72 sm:w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col h-full"
    >
      <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Members
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* User's role indicator */}
      {userRole && (
        <div className="px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/30">
          <div className="text-xs text-zinc-500">Your role</div>
          <div className="flex items-center gap-2 mt-1">
            {getRoleIcon(userRole)}
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadgeColor(userRole)}`}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : displayMembers.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No members found
          </div>
        ) : (
          displayMembers.map(member => {
            const memberId = member.user_id || member.id;
            const isCurrentUser = memberId === currentUserId;
            const memberRole = member.role || 'member';
            const canManage = isAdmin && !isCurrentUser && memberRole !== 'owner';
            const canKick = isModerator && !isCurrentUser && memberRole === 'member';
            const availableRoles = getAvailableRoles(memberRole);

            return (
              <div
                key={memberId}
                className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group"
              >
                <div className="relative flex-shrink-0">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="w-8 h-8 rounded-full"  loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                      {member.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-zinc-950" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                    {member.full_name || 'Unknown'}
                    {isCurrentUser && (
                      <span className="text-[10px] text-zinc-500">(you)</span>
                    )}
                    {getRoleIcon(memberRole)}
                    {isUserMuted(memberId) && (
                      <VolumeX className="w-3 h-3 text-orange-400" title="Muted" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500 truncate">{member.email}</span>
                    {memberRole && memberRole !== 'member' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getRoleBadgeColor(memberRole)}`}>
                        {memberRole}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {/* DM Button */}
                  {!isCurrentUser && onStartDM && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onStartDM(member)}
                      className="h-7 w-7 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                      title="Send direct message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  )}

                  {/* Admin Actions */}
                  {(canManage || canKick) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-zinc-900 border-zinc-700 min-w-[160px]" align="end">
                        {canManage && availableRoles.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs text-zinc-500 font-semibold">
                              Change Role
                            </div>
                            {availableRoles.map(role => (
                              <DropdownMenuItem
                                key={role}
                                onClick={() => handleSetRole(memberId, role)}
                                className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
                              >
                                {role === 'admin' && <Shield className="w-4 h-4 mr-2 text-cyan-400" />}
                                {role === 'moderator' && <Star className="w-4 h-4 mr-2 text-purple-400" />}
                                {role === 'member' && <Users className="w-4 h-4 mr-2 text-zinc-400" />}
                                Make {role.charAt(0).toUpperCase() + role.slice(1)}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="bg-zinc-700" />
                          </>
                        )}

                        {/* Moderation Actions */}
                        {isModerator && !isCurrentUser && memberRole !== 'owner' && (
                          <>
                            <div className="px-2 py-1.5 text-xs text-zinc-500 font-semibold">
                              Moderation
                            </div>
                            <DropdownMenuItem
                              onClick={() => setWarnDialogUser(member)}
                              className="text-amber-400 hover:text-amber-300 focus:text-amber-300 focus:bg-amber-950/30"
                            >
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Warn User
                            </DropdownMenuItem>
                            {isUserMuted(memberId) ? (
                              <DropdownMenuItem
                                onClick={() => unmuteUser(memberId)}
                                className="text-green-400 hover:text-green-300 focus:text-green-300 focus:bg-green-950/30"
                              >
                                <Volume2 className="w-4 h-4 mr-2" />
                                Unmute User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setMuteDialogUser(member)}
                                className="text-orange-400 hover:text-orange-300 focus:text-orange-300 focus:bg-orange-950/30"
                              >
                                <VolumeX className="w-4 h-4 mr-2" />
                                Mute User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleViewHistory(member)}
                              className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
                            >
                              <History className="w-4 h-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-700" />
                          </>
                        )}

                        {(canManage || canKick) && (
                          <DropdownMenuItem
                            onClick={() => handleKick(memberId)}
                            className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-950/30"
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Remove from channel
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 text-center">
          {displayMembers.length} member{displayMembers.length !== 1 ? 's' : ''} in this {channel?.type === 'dm' ? 'conversation' : 'channel'}
        </div>
      </div>

      {/* Warn Dialog */}
      <AnimatePresence>
        {warnDialogUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setWarnDialogUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Warn {warnDialogUser.full_name}
              </h3>
              <textarea
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
                placeholder="Reason for warning (required)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                rows={3}
              />
              <div className="flex gap-2 mt-3">
                <Button
                  variant="ghost"
                  onClick={() => setWarnDialogUser(null)}
                  className="flex-1 text-zinc-400"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWarnSubmit}
                  disabled={!warnReason.trim() || moderationLoading}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {moderationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Warning'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute Dialog */}
      <AnimatePresence>
        {muteDialogUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setMuteDialogUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                <VolumeX className="w-5 h-5 text-orange-400" />
                Mute {muteDialogUser.full_name}
              </h3>
              <textarea
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
                placeholder="Reason for mute (optional)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none mb-3"
                rows={2}
              />
              <div className="mb-3">
                <label className="text-xs text-zinc-400 mb-1.5 block">Duration</label>
                <div className="flex gap-2">
                  {[
                    { label: '5 min', value: '5' },
                    { label: '30 min', value: '30' },
                    { label: '1 hour', value: '60' },
                    { label: '24 hours', value: '1440' },
                    { label: 'Permanent', value: '' },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setMuteDuration(option.value)}
                      className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                        muteDuration === option.value
                          ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setMuteDialogUser(null)}
                  className="flex-1 text-zinc-400"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMuteSubmit}
                  disabled={moderationLoading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-black"
                >
                  {moderationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mute User'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Dialog */}
      <AnimatePresence>
        {historyUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setHistoryUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 max-w-md w-full max-h-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                <History className="w-5 h-5 text-cyan-400" />
                Moderation History: {historyUser.full_name}
              </h3>
              <div className="overflow-y-auto max-h-64 space-y-2">
                {moderationHistory.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">No moderation history</p>
                ) : (
                  moderationHistory.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.action === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                          item.action === 'mute' ? 'bg-orange-500/20 text-orange-400' :
                          item.action === 'kick' ? 'bg-red-500/20 text-red-400' :
                          item.action === 'delete_message' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          {item.action}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {item.reason && (
                        <p className="text-sm text-zinc-300">{item.reason}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="ghost"
                onClick={() => setHistoryUser(null)}
                className="w-full mt-3 text-zinc-400"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
