import React, { useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Hash, Smile, Command, User, Bot, Shield, TrendingUp, BookOpen, Sparkles } from 'lucide-react';
import { AVAILABLE_AGENTS } from './AgentMentionHandler';

const EMOJI_SHORTCODES = {
  'smile': '😊', 'smiley': '😃', 'grin': '😁', 'joy': '😂',
  '+1': '👍', 'thumbsup': '👍', '-1': '👎', 'thumbsdown': '👎',
  'fire': '🔥', 'rocket': '🚀', 'heart': '❤️', 'eyes': '👀',
  '100': '💯', 'clap': '👏', 'tada': '🎉', 'party': '🎉',
  'thinking': '🤔', 'wave': '👋', 'ok': '👌', 'pray': '🙏',
  'muscle': '💪', 'star': '⭐', 'sparkles': '✨', 'check': '✅',
  'x': '❌', 'warning': '⚠️', 'bulb': '💡', 'zap': '⚡',
  'coffee': '☕', 'pizza': '🍕', 'beer': '🍺', 'cake': '🎂',
};

const SLASH_COMMANDS = [
  { command: '/giphy', description: 'Search for a GIF' },
  { command: '/remind', description: 'Set a reminder' },
  { command: '/status', description: 'Set your status' },
  { command: '/mute', description: 'Mute this channel' },
  { command: '/leave', description: 'Leave this channel' },
];

export default function AutocompletePopup({
  type,
  query,
  items = [],
  selectedIndex,
  onSelect,
  onClose,
  position = { bottom: '100%', left: 0 }
}) {
  const listRef = useRef(null);

  // Get agents list for mention autocomplete
  const agentItems = useMemo(() => {
    return Object.entries(AVAILABLE_AGENTS).map(([key, agent]) => ({
      id: `agent_${key}`,
      type: 'agent',
      agentType: key,
      full_name: agent.displayName,
      description: agent.description,
      icon: agent.icon,
      color: agent.color,
      bgColor: agent.bgColor
    }));
  }, []);

  // Filter items based on query and type
  const getFilteredItems = () => {
    const q = query.toLowerCase();

    switch (type) {
      case 'mention':
        // Filter agents
        const filteredAgents = agentItems.filter(agent =>
          agent.agentType.includes(q) ||
          agent.full_name?.toLowerCase().includes(q)
        ).slice(0, 3);

        // Filter users (items that don't have type: 'agent')
        const filteredUsers = items.filter(user =>
          !user.type && (
            user.full_name?.toLowerCase().includes(q) ||
            user.email?.toLowerCase().includes(q)
          )
        ).slice(0, 4);

        // Return agents first, then users
        return [...filteredAgents, ...filteredUsers];

      case 'channel':
        return items.filter(ch =>
          ch.name?.toLowerCase().includes(q)
        ).slice(0, 6);

      case 'emoji':
        return Object.entries(EMOJI_SHORTCODES)
          .filter(([code]) => code.includes(q))
          .map(([code, emoji]) => ({ code, emoji }))
          .slice(0, 6);

      case 'command':
        return SLASH_COMMANDS.filter(cmd =>
          cmd.command.includes(q)
        ).slice(0, 6);

      default:
        return [];
    }
  };

  const filteredItems = getFilteredItems();

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedEl = listRef.current.children[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (listRef.current && !listRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredItems.length === 0) return null;

  const renderItem = (item, index) => {
    const isSelected = index === selectedIndex;
    const baseClass = `flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
      isSelected 
        ? 'bg-cyan-500/20 border-l-2 border-cyan-500' 
        : 'hover:bg-zinc-800 border-l-2 border-transparent'
    }`;

    switch (type) {
      case 'mention':
        // Check if it's an agent item
        if (item.type === 'agent') {
          return (
            <div
              key={item.id}
              className={baseClass}
              onClick={() => onSelect(item)}
            >
              <div className={`w-6 h-6 rounded-full ${item.bgColor} flex items-center justify-center text-sm`}>
                {item.icon}
              </div>
              <span className={item.color}>{item.full_name}</span>
              <span className="text-zinc-500 text-xs">AI Assistant</span>
            </div>
          );
        }
        // Regular user mention
        return (
          <div
            key={item.id}
            className={baseClass}
            onClick={() => onSelect(item)}
          >
            {item.avatar_url ? (
              <img src={item.avatar_url} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                {item.full_name?.charAt(0) || item.email?.charAt(0)}
              </div>
            )}
            <span className="text-white">{item.full_name || item.email}</span>
            <span className="text-zinc-500 text-xs">@{item.email?.split('@')[0]}</span>
          </div>
        );

      case 'channel':
        return (
          <div
            key={item.id}
            className={baseClass}
            onClick={() => onSelect(item)}
          >
            <Hash className="w-4 h-4 text-zinc-400" />
            <span className="text-white">{item.name}</span>
            {item.description && (
              <span className="text-zinc-500 text-xs truncate">{item.description}</span>
            )}
          </div>
        );

      case 'emoji':
        return (
          <div
            key={item.code}
            className={baseClass}
            onClick={() => onSelect(item)}
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-white">:{item.code}:</span>
          </div>
        );

      case 'command':
        return (
          <div
            key={item.command}
            className={baseClass}
            onClick={() => onSelect(item)}
          >
            <Command className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-mono">{item.command}</span>
            <span className="text-zinc-400 text-sm">{item.description}</span>
          </div>
        );

      default:
        return null;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'mention': return <User className="w-4 h-4" />;
      case 'channel': return <Hash className="w-4 h-4" />;
      case 'emoji': return <Smile className="w-4 h-4" />;
      case 'command': return <Command className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'mention': return 'Mentions';
      case 'channel': return 'Channels';
      case 'emoji': return 'Emoji';
      case 'command': return 'Commands';
      default: return '';
    }
  };

  // For mentions, separate agents and people
  const agents = type === 'mention' ? filteredItems.filter(item => item.type === 'agent') : [];
  const people = type === 'mention' ? filteredItems.filter(item => item.type !== 'agent') : [];

  // Calculate the index offset for people (after agents)
  const renderMentionItems = () => {
    const items = [];
    let currentIndex = 0;

    if (agents.length > 0) {
      items.push(
        <div key="agents-header" className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/50">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            AI Agents
          </div>
        </div>
      );
      agents.forEach((agent) => {
        items.push(renderItem(agent, currentIndex));
        currentIndex++;
      });
    }

    if (people.length > 0) {
      items.push(
        <div key="people-header" className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/50">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            People
          </div>
        </div>
      );
      people.forEach((person) => {
        items.push(renderItem(person, currentIndex));
        currentIndex++;
      });
    }

    return items;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden"
      style={{ bottom: position.bottom, left: position.left }}
    >
      {/* Header - only show for non-mention types */}
      {type !== 'mention' && (
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2 text-xs text-zinc-400">
          {getIcon()}
          <span className="font-medium">{getTitle()}</span>
        </div>
      )}

      {/* Items */}
      <div ref={listRef} className="max-h-64 overflow-y-auto">
        {type === 'mention' ? (
          renderMentionItems()
        ) : (
          filteredItems.map((item, index) => renderItem(item, index))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-zinc-800 text-[10px] text-zinc-500">
        ↑↓ to navigate • Tab to select • Esc to close
      </div>
    </motion.div>
  );
}

export { EMOJI_SHORTCODES, SLASH_COMMANDS };