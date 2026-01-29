import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  Hash, Lock, Plus, ChevronDown, MessageSquare,
  Search, Settings, BellOff, Bell, Star, StarOff, MoreHorizontal,
  Archive, Trash2, UserPlus, Bookmark, AtSign,
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
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
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
      className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
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
          <div className={`w-5 h-5 rounded ${
            isSelected ? 'bg-zinc-700' : 'bg-zinc-800'
          } flex items-center justify-center text-[10px] font-bold ${
            isSelected ? 'text-zinc-200' : 'text-zinc-500'
          }`}>
            {channel.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-zinc-500 border border-zinc-950" />
        </div>
      ) : (
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${
          isSelected ? 'text-zinc-300' : 'text-zinc-500'
        }`} />
      )}

      {/* Channel Name */}
      <span className={`flex-1 text-xs truncate ${
        unread > 0 && !isMuted ? 'text-white font-semibold' : 'font-medium'
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
          <span className="min-w-[16px] h-[16px] px-1 text-[9px] font-bold bg-cyan-600/80 text-white rounded-full flex items-center justify-center">
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
    <div className="w-72 bg-zinc-950 border-r border-zinc-800/60 flex flex-col h-full">
      {/* Header + Search + Quick Access */}
      <div className="px-3 pt-3 pb-2 border-b border-zinc-800/60 space-y-2.5">
        {/* Title row */}
        <div className="flex items-center justify-between px-1">
          <h2 className="font-semibold text-white text-sm tracking-tight">Inbox</h2>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onOpenSettings}
              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors lg:hidden"
                aria-label="Close sidebar"
              >
                <X className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search (⌘K)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-800/50 border border-zinc-700/60 rounded-lg text-xs text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none transition-all"
          />
        </div>

        {/* Quick Access */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSelectChannel({ id: 'threads', name: 'All Threads', type: 'special' })}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all text-[11px]"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Threads</span>
          </button>
          <button
            onClick={() => onSelectChannel({ id: 'mentions', name: 'Mentions & Reactions', type: 'special' })}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all text-[11px]"
          >
            <AtSign className="w-3 h-3" />
            <span>Mentions</span>
          </button>
          <button
            onClick={() => onSelectChannel({ id: 'saved', name: 'Saved Items', type: 'special' })}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all text-[11px]"
          >
            <Bookmark className="w-3 h-3" />
            <span>Saved</span>
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
          {channelsExpanded && (
            <div className="space-y-0.5">
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
            </div>
          )}
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
          {dmsExpanded && (
            <div className="space-y-0.5">
              {filteredDMs.filter(c => !starredChannels.includes(c.id)).map(dm =>
                renderChannelItem(dm, true)
              )}
              {filteredDMs.length === 0 && (
                <p className="text-xs text-zinc-600 px-2.5 py-2">No conversations yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Status */}
      <div className="px-3 py-2.5 border-t border-zinc-800/60 bg-zinc-950/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 p-1.5 -m-1.5 rounded-lg hover:bg-zinc-800/50 transition-all group">
              <div className="relative">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-lg border border-zinc-700/50 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                    {user?.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                  STATUS_OPTIONS.find(s => s.id === userStatus)?.color || 'bg-emerald-500'
                } ${userStatus === 'active' ? 'shadow-emerald-500/50' : ''}`} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium text-white truncate">{user?.full_name || 'User'}</div>
                <div className={`text-[10px] flex items-center gap-1 ${
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