import React from 'react';
import { MessageSquare, Calendar, Video, Hash, Clock } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_CONFIG = {
  messages: {
    icon: MessageSquare,
    iconColor: 'text-cyan-400',
  },
  events: {
    icon: Calendar,
    iconColor: 'text-blue-400',
  },
  calls: {
    icon: Video,
    iconColor: 'text-purple-400',
  },
  channels: {
    icon: Hash,
    iconColor: 'text-zinc-400',
  },
};

function highlightMatch(text, query) {
  if (!text || !query) return text;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = String(text).split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="text-cyan-400 font-medium">
          {part}
        </span>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

function formatTimestamp(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return format(date, 'h:mm a');
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return format(date, 'EEEE');
    return format(date, 'MMM d');
  } catch {
    return '';
  }
}

function getTitle(type, data) {
  switch (type) {
    case 'messages':
      return data.sender_name || 'Unknown';
    case 'events':
      return data.title || 'Untitled Event';
    case 'calls':
      return data.title || 'Untitled Call';
    case 'channels':
      return data.name || 'Unknown Channel';
    default:
      return '';
  }
}

function getSubtitle(type, data, query) {
  switch (type) {
    case 'messages': {
      const content = data.content || '';
      const preview = content.length > 120 ? content.slice(0, 120) + '...' : content;
      return highlightMatch(preview, query);
    }
    case 'events': {
      const desc = data.description || '';
      const preview = desc.length > 100 ? desc.slice(0, 100) + '...' : desc;
      const dateStr = data.start_time
        ? format(new Date(data.start_time), 'MMM d, h:mm a')
        : '';
      const attendeeCount =
        Array.isArray(data.attendees) ? data.attendees.length : 0;
      const parts = [];
      if (dateStr) parts.push(dateStr);
      if (attendeeCount > 0) parts.push(`${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}`);
      if (preview) parts.push(preview);
      return parts.length > 0 ? parts.join(' \u00B7 ') : 'No details';
    }
    case 'calls': {
      const parts = [];
      if (data.duration) {
        const mins = Math.round(data.duration / 60);
        parts.push(`${mins} min`);
      }
      if (Array.isArray(data.participants)) {
        parts.push(`${data.participants.length} participant${data.participants.length !== 1 ? 's' : ''}`);
      }
      if (data.status) parts.push(data.status);
      return parts.join(' \u00B7 ') || 'No details';
    }
    case 'channels': {
      const parts = [];
      if (data.member_count) parts.push(`${data.member_count} members`);
      if (data.description) {
        const desc = data.description.length > 80
          ? data.description.slice(0, 80) + '...'
          : data.description;
        parts.push(desc);
      }
      return parts.join(' \u00B7 ') || 'Channel';
    }
    default:
      return '';
  }
}

function getTimestamp(type, data) {
  switch (type) {
    case 'messages':
      return formatTimestamp(data.created_date);
    case 'events':
      return formatTimestamp(data.start_time);
    case 'calls':
      return formatTimestamp(data.started_at);
    case 'channels':
      return '';
    default:
      return '';
  }
}

export default function SearchResultItem({ type, data, query, isSelected, onClick }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.messages;
  const Icon = config.icon;
  const title = getTitle(type, data);
  const subtitle = getSubtitle(type, data, query);
  const timestamp = getTimestamp(type, data);

  return (
    <button
      onClick={() => onClick?.(type, data)}
      className={`w-full text-left flex items-start gap-3 px-4 py-2.5 rounded-lg transition-colors cursor-pointer group ${
        isSelected
          ? 'bg-cyan-500/10 border-l-2 border-cyan-500 pl-3.5'
          : 'hover:bg-zinc-800/60 border-l-2 border-transparent pl-3.5'
      }`}
    >
      <div
        className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
          isSelected ? 'bg-cyan-500/20' : 'bg-zinc-800/80'
        }`}
      >
        <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {type === 'messages' || type === 'channels'
              ? highlightMatch(title, query)
              : title}
          </span>
          {timestamp && (
            <span className="flex-shrink-0 flex items-center gap-1 text-[11px] text-zinc-500">
              <Clock className="w-3 h-3" />
              {timestamp}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400 truncate mt-0.5">{subtitle}</p>
      </div>
    </button>
  );
}
