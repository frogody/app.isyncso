import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  MessageSquare,
  CheckCircle2,
  FileText,
  Clock,
  X,
  Check,
} from 'lucide-react';
import usePortalNotifications from '@/hooks/usePortalNotifications';

export default function NotificationBell({ clientId, organizationId, orgSlug }) {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = usePortalNotifications(clientId, organizationId);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
        return MessageSquare;
      case 'approval_request':
      case 'approval_decision':
        return CheckCircle2;
      case 'file_upload':
        return FileText;
      case 'mention':
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return then.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-medium bg-cyan-500 text-white rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-500 hover:text-white rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {notifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markAsRead}
                    onClose={() => setIsOpen(false)}
                    getIcon={getNotificationIcon}
                    formatTime={formatTimeAgo}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                <p className="text-sm text-zinc-500">No notifications yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="border-t border-zinc-800 px-4 py-3">
              <Link
                to={orgSlug ? `/portal/${orgSlug}/activity` : '/portal'}
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification, onRead, onClose, getIcon, formatTime }) {
  const Icon = getIcon(notification.notification_type);
  const isUnread = !notification.is_read;

  const handleClick = () => {
    if (isUnread) {
      onRead(notification.id);
    }
    onClose();
  };

  const content = (
    <div
      className={`flex gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors cursor-pointer ${
        isUnread ? 'bg-cyan-500/5' : ''
      }`}
      onClick={handleClick}
    >
      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isUnread ? 'bg-cyan-500/10' : 'bg-zinc-800'
        }`}
      >
        <Icon className={`w-4 h-4 ${isUnread ? 'text-cyan-400' : 'text-zinc-500'}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm line-clamp-2 ${isUnread ? 'text-white' : 'text-zinc-400'}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{notification.body}</p>
        )}
        <p className="text-xs text-zinc-600 mt-1">{formatTime(notification.created_at)}</p>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <div className="w-2 h-2 bg-cyan-400 rounded-full shrink-0 mt-2" />
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link to={notification.link} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return content;
}
