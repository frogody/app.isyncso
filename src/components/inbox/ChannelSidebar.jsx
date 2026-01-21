import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, Lock, Plus, ChevronDown, MessageSquare,
  Search, Settings, BellOff, Bell, Star, StarOff, MoreHorizontal,
  Archive, Trash2, UserPlus, Sparkles, Bookmark, AtSign,
  Circle, Clock, MinusCircle, Moon, X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Status options
const STATUS_OPTIONS = [
  { id: 'active', label: 'Active', color: 'bg-emerald-500', textColor: 'text-emerald-400', icon: Circle },
  { id: 'away', label: 'Away', color: 'bg-amber-500', textColor: 'text-amber-400', icon: Clock },
  { id: 'dnd', label: 'Do Not Disturb', color: 'bg-rose-500', textColor: 'text-rose-400', icon: MinusCircle },
  { id: 'offline', label: 'Offline', color: 'bg-zinc-500', textColor: 'text-zinc-400', icon: Moon },
];

// Section Header Component - moved outside to prevent recreation on each render
const SectionHeader = memo(function SectionHeader({ title, count, expanded, onToggle, action }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider transition-colors"
      >
        <motion.div
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
        {title}
        <span className="text-cyan-500/70 font-normal">{count}</span>
      </button>
      {action && (
        <button
          onClick={action.onClick}
          className="p-1 text-zinc-600 hover:text-cyan-400 hover:bg-zinc-800/50 rounded-lg transition-all"
          title={action.title}
        >
          <action.icon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

// Channel Item Component - moved outside and memoized to prevent flickering
const ChannelItem = memo(function ChannelItem({
  channel,
  isDM = false,
  isSelected,
  unread,
  isStarred,
  isMuted,
  onSelectChannel,
  onToggleStar,
  onToggleMute,
  onArchiveChannel,
  onDeleteChannel,
  user
}) {
  const Icon = isDM ? MessageSquare : channel.type === 'private' ? Lock : Hash;

  return (
    <div
      onClick={() => onSelectChannel(channel)}
      className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-zinc-800/80 text-white'
          : isMuted
          ? 'text-zinc-600 hover:bg-zinc-800/30 hover:text-zinc-500'
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
      }`}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-500/70 rounded-r-full" />
      )}

      {/* Avatar / Icon */}
      {isDM ? (
        <div className="relative flex-shrink-0">
          <div className={`w-7 h-7 rounded-lg ${
            isSelected
              ? 'bg-zinc-700 border-zinc-600'
              : 'bg-zinc-800 border-zinc-700'
          } border flex items-center justify-center text-xs font-bold ${
            isSelected ? 'text-zinc-200' : 'text-zinc-500'
          }`}>
            {channel.name?.charAt(0)?.toUpperCase()}
          </div>
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-zinc-500 border-2 border-zinc-950" />
        </div>
      ) : (
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isSelected
            ? 'bg-zinc-700 border border-zinc-600'
            : 'bg-zinc-800/80 border border-zinc-700/50'
        }`}>
          <Icon className={`w-4 h-4 ${
            isSelected ? 'text-zinc-300' : 'text-zinc-500'
          }`} />
        </div>
      )}

      {/* Channel Name */}
      <span className={`flex-1 text-sm truncate font-medium ${
        unread > 0 && !isMuted ? 'text-white font-semibold' : ''
      }`}>
        {channel.name}
      </span>

      {/* Indicators */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Star */}
        {isStarred && (
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
        )}

        {/* Muted */}
        {isMuted && (
          <BellOff className="w-3 h-3 text-zinc-600" />
        )}

        {/* Unread Badge */}
        {unread > 0 && !isMuted && (
          <span className="min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold bg-cyan-600/80 text-white rounded-full flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}

        {/* Context Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-700/50 rounded-lg transition-all"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-700 min-w-[180px]" align="end">
            <DropdownMenuItem
              onClick={(e) => onToggleStar(channel.id, e)}
              className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
            >
              {isStarred ? (
                <>
                  <StarOff className="w-4 h-4 mr-2" /> Unstar channel
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" /> Star channel
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => onToggleMute(channel.id, e)}
              className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
            >
              {isMuted ? (
                <>
                  <Bell className="w-4 h-4 mr-2" /> Unmute notifications
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 mr-2" /> Mute notifications
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-700" />
            {!isDM && (
              <>
                <DropdownMenuItem
                  onClick={() => onArchiveChannel?.(channel)}
                  className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
                >
                  <Archive className="w-4 h-4 mr-2" /> Archive channel
                </DropdownMenuItem>
                {channel.created_by === user?.email && (
                  <DropdownMenuItem
                    onClick={() => onDeleteChannel?.(channel)}
                    className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete channel
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export default function ChannelSidebar({
  channels,
  directMessages,
  selectedChannel,
  onSelectChannel,
  onCreateChannel,
  onCreateDM,
  user,
  unreadCounts = {},
  onArchiveChannel,
  onDeleteChannel,
  onOpenSettings,
  onClose,
}) {
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [starredChannels, setStarredChannels] = useState(() => {
    try {
      const stored = localStorage.getItem('inbox_starred_channels');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [mutedChannels, setMutedChannels] = useState(() => {
    try {
      const stored = localStorage.getItem('inbox_muted_channels');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [userStatus, setUserStatus] = useState(() => {
    try {
      const stored = localStorage.getItem('inbox_user_status');
      return stored || 'active';
    } catch {
      return 'active';
    }
  });

  const searchInputRef = useRef(null);

  // Update status
  const updateStatus = useCallback((statusId) => {
    setUserStatus(statusId);
    localStorage.setItem('inbox_user_status', statusId);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Memoize filtered channels to prevent unnecessary re-renders
  const publicChannels = useMemo(() =>
    channels.filter(c => c.type === 'public' && !c.is_archived),
    [channels]
  );

  const privateChannels = useMemo(() =>
    channels.filter(c => c.type === 'private' && !c.is_archived),
    [channels]
  );

  const filteredPublicChannels = useMemo(() =>
    publicChannels.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [publicChannels, searchTerm]
  );

  const filteredPrivateChannels = useMemo(() =>
    privateChannels.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [privateChannels, searchTerm]
  );

  const filteredDMs = useMemo(() =>
    directMessages.filter(dm => dm.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [directMessages, searchTerm]
  );

  // Toggle star
  const toggleStar = useCallback((channelId, e) => {
    e?.stopPropagation();
    setStarredChannels(prev => {
      const newStarred = prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId];

      localStorage.setItem('inbox_starred_channels', JSON.stringify(newStarred));
      return newStarred;
    });
  }, []);

  // Toggle mute
  const toggleMute = useCallback((channelId, e) => {
    e?.stopPropagation();
    setMutedChannels(prev => {
      const newMuted = prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId];

      localStorage.setItem('inbox_muted_channels', JSON.stringify(newMuted));
      return newMuted;
    });
  }, []);

  // Get starred channels - memoized
  const starredPublicChannels = useMemo(() =>
    filteredPublicChannels.filter(c => starredChannels.includes(c.id)),
    [filteredPublicChannels, starredChannels]
  );

  const starredDMs = useMemo(() =>
    filteredDMs.filter(c => starredChannels.includes(c.id)),
    [filteredDMs, starredChannels]
  );

  const hasStarred = starredPublicChannels.length > 0 || starredDMs.length > 0;

  // Helper function to render a channel item with all required props
  const renderChannelItem = useCallback((channel, isDM = false) => (
    <ChannelItem
      key={channel.id}
      channel={channel}
      isDM={isDM}
      isSelected={selectedChannel?.id === channel.id}
      unread={unreadCounts[channel.id] || 0}
      isStarred={starredChannels.includes(channel.id)}
      isMuted={mutedChannels.includes(channel.id)}
      onSelectChannel={onSelectChannel}
      onToggleStar={toggleStar}
      onToggleMute={toggleMute}
      onArchiveChannel={onArchiveChannel}
      onDeleteChannel={onDeleteChannel}
      user={user}
    />
  ), [selectedChannel?.id, unreadCounts, starredChannels, mutedChannels, onSelectChannel, toggleStar, toggleMute, onArchiveChannel, onDeleteChannel, user]);

  return (
    <div className="w-72 bg-gradient-to-b from-zinc-950 via-zinc-900 to-cyan-950/5 border-r border-zinc-800/50 flex flex-col h-full">
      {/* Workspace Header */}
      <div className="p-4 border-b border-zinc-800/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">ISYNCSO</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              className="p-2 hover:bg-zinc-800/80 rounded-xl transition-all group"
              title="Workspace settings"
            >
              <Settings className="w-5 h-5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
            </button>
            {/* Mobile close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800/80 rounded-xl transition-all group lg:hidden"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search channels (⌘K)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-zinc-800/50 border border-zinc-700/60 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-cyan-600/50 focus:ring-1 focus:ring-cyan-600/30 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Quick Access */}
      <div className="px-3 py-3 border-b border-zinc-800/40">
        <div className="space-y-1">
          <button
            onClick={() => onSelectChannel({ id: 'threads', name: 'All Threads', type: 'special' })}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all text-sm group"
          >
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center transition-colors">
              <MessageSquare className="w-4 h-4 text-zinc-500" />
            </div>
            <span>Threads</span>
          </button>
          <button
            onClick={() => onSelectChannel({ id: 'mentions', name: 'Mentions & Reactions', type: 'special' })}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all text-sm group"
          >
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center transition-colors">
              <AtSign className="w-4 h-4 text-zinc-500" />
            </div>
            <span>Mentions & Reactions</span>
          </button>
          <button
            onClick={() => onSelectChannel({ id: 'saved', name: 'Saved Items', type: 'special' })}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all text-sm group"
          >
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center transition-colors">
              <Bookmark className="w-4 h-4 text-zinc-500" />
            </div>
            <span>Saved Items</span>
          </button>
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide">
        {/* Starred Section */}
        {hasStarred && (
          <div>
            <SectionHeader
              title="Starred"
              count={starredPublicChannels.length + starredDMs.length}
              expanded={true}
              onToggle={() => {}}
            />
            <div className="space-y-0.5">
              {starredPublicChannels.map(channel => renderChannelItem(channel, false))}
              {starredDMs.map(dm => renderChannelItem(dm, true))}
            </div>
          </div>
        )}

        {/* Channels Section */}
        <div>
          <SectionHeader
            title="Channels"
            count={filteredPublicChannels.length + filteredPrivateChannels.length}
            expanded={channelsExpanded}
            onToggle={() => setChannelsExpanded(!channelsExpanded)}
            action={{
              icon: Plus,
              onClick: onCreateChannel,
              title: 'Create channel'
            }}
          />
          <AnimatePresence>
            {channelsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-0.5"
              >
                {filteredPublicChannels.filter(c => !starredChannels.includes(c.id)).map(channel =>
                  renderChannelItem(channel, false)
                )}
                {filteredPrivateChannels.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-800/50 space-y-0.5">
                    {filteredPrivateChannels.map(channel => renderChannelItem(channel, false))}
                  </div>
                )}
                {filteredPublicChannels.length === 0 && filteredPrivateChannels.length === 0 && (
                  <p className="text-xs text-zinc-600 px-2.5 py-2">No channels found</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Direct Messages Section */}
        <div>
          <SectionHeader
            title="Direct Messages"
            count={filteredDMs.length}
            expanded={dmsExpanded}
            onToggle={() => setDmsExpanded(!dmsExpanded)}
            action={{
              icon: UserPlus,
              onClick: onCreateDM,
              title: 'New message'
            }}
          />
          <AnimatePresence>
            {dmsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-0.5"
              >
                {filteredDMs.filter(c => !starredChannels.includes(c.id)).map(dm =>
                  renderChannelItem(dm, true)
                )}
                {filteredDMs.length === 0 && (
                  <p className="text-xs text-zinc-600 px-2.5 py-2">No conversations yet</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User Status */}
      <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 -m-2 rounded-xl hover:bg-zinc-800/50 transition-all group">
              <div className="relative">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-xl border-2 border-zinc-700/50 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-sm font-bold text-cyan-300">
                    {user?.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 shadow-lg ${
                  STATUS_OPTIONS.find(s => s.id === userStatus)?.color || 'bg-emerald-500'
                } ${userStatus === 'active' ? 'shadow-emerald-500/50' : ''}`} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-semibold text-white truncate">{user?.full_name || 'User'}</div>
                <div className={`text-xs flex items-center gap-1.5 ${
                  STATUS_OPTIONS.find(s => s.id === userStatus)?.textColor || 'text-emerald-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    STATUS_OPTIONS.find(s => s.id === userStatus)?.color || 'bg-emerald-400'
                  } ${userStatus === 'active' ? 'animate-pulse' : ''}`} />
                  {STATUS_OPTIONS.find(s => s.id === userStatus)?.label || 'Active'}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-700 w-56" align="start" side="top">
            <div className="px-2 py-1.5 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              Set Status
            </div>
            {STATUS_OPTIONS.map((status) => {
              const StatusIcon = status.icon;
              return (
                <DropdownMenuItem
                  key={status.id}
                  onClick={() => updateStatus(status.id)}
                  className={`text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800 ${
                    userStatus === status.id ? 'bg-zinc-800/50' : ''
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full mr-3 ${status.color}`} />
                  <span className="flex-1">{status.label}</span>
                  {userStatus === status.id && (
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem
              onClick={onOpenSettings}
              className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
            >
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}