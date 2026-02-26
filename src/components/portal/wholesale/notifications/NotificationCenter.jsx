import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bell, Package, MessageSquare, Megaphone, Loader2 } from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_CONFIG = {
  order_status: { Icon: Package, color: 'rgb(34, 211, 238)' },   // cyan-400
  message:      { Icon: MessageSquare, color: 'rgb(96, 165, 250)' }, // blue-400
  announcement: { Icon: Megaphone, color: 'rgb(251, 191, 36)' },    // amber-400
};

const DEFAULT_TYPE = { Icon: Bell, color: 'rgb(161, 161, 170)' };  // zinc-400

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || DEFAULT_TYPE;
}

/**
 * Produce a human-readable relative time string.
 */
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// NotificationItem
// ---------------------------------------------------------------------------

function NotificationItem({ notification, onRead }) {
  const { Icon, color } = getTypeConfig(notification.type);
  const isUnread = !notification.read_at;

  return (
    <button
      onClick={() => onRead(notification)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] border-b"
      style={{ borderColor: 'rgba(39, 39, 42, 0.5)' }}
    >
      {/* Unread dot */}
      <div className="pt-1.5 w-2 shrink-0 flex justify-center">
        {isUnread && (
          <span
            className="block w-2 h-2 rounded-full"
            style={{ backgroundColor: 'rgb(34, 211, 238)' }}
          />
        )}
      </div>

      {/* Type icon */}
      <div
        className="mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-medium truncate"
            style={{ color: isUnread ? 'var(--ws-text, #fff)' : 'var(--ws-muted, rgba(255,255,255,0.6))' }}
          >
            {notification.title}
          </span>
          <span
            className="text-[11px] whitespace-nowrap shrink-0"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
          >
            {relativeTime(notification.created_at)}
          </span>
        </div>
        {notification.message && (
          <p
            className="text-xs mt-0.5 line-clamp-2"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            {notification.message}
          </p>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// NotificationCenter
// ---------------------------------------------------------------------------

export default function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    notificationsLoading,
    fetchNotifications,
    markNotificationRead,
  } = useWholesale();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { org } = useParams();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Refresh when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Mark all unread as read
  const handleMarkAllRead = useCallback(async () => {
    const unread = (notifications || []).filter((n) => !n.read_at);
    await Promise.all(unread.map((n) => markNotificationRead(n.id)));
  }, [notifications, markNotificationRead]);

  // Click a single notification: mark read + optionally navigate
  const handleNotificationClick = useCallback(
    async (notification) => {
      if (!notification.read_at) {
        await markNotificationRead(notification.id);
      }
      // Navigate if there is an order_id in data
      const orderId = notification.data?.order_id;
      if (orderId && org) {
        setIsOpen(false);
        navigate(`/portal/${org}/shop/orders/${orderId}`);
      }
    },
    [markNotificationRead, navigate, org],
  );

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg transition-colors hover:bg-white/[0.06]"
        style={{ color: 'var(--ws-muted, rgba(255,255,255,0.6))' }}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-1 bg-red-500 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-96 z-50 rounded-xl border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--ws-bg, #18181b)',
            borderColor: 'var(--ws-border, rgba(255,255,255,0.08))',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--ws-border, rgba(255,255,255,0.08))' }}
          >
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--ws-text, #fff)' }}
            >
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--ws-primary, rgb(34, 211, 238))' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[400px] overflow-y-auto">
            {notificationsLoading && (!notifications || notifications.length === 0) ? (
              /* Loading state */
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2
                  className="w-6 h-6 animate-spin"
                  style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
                />
                <span
                  className="text-xs"
                  style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
                >
                  Loading notifications...
                </span>
              </div>
            ) : !notifications || notifications.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Bell
                  className="w-10 h-10"
                  style={{ color: 'var(--ws-muted, rgba(255,255,255,0.15))' }}
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
                >
                  No notifications yet
                </span>
              </div>
            ) : (
              /* Notification list */
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleNotificationClick}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
