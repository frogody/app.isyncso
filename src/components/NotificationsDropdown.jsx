import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Trash2,
  Brain,
  Mail,
  Target,
  Users,
  AlertCircle,
  X,
  MessageSquare,
  Zap,
  Clock,
} from "lucide-react";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useNavigate } from "react-router-dom";

// Format relative time
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
  } = useNotifications();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open]);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.action_url) {
      navigate(notification.action_url);
      setOpen(false);
    }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const getIcon = (type) => {
    const icons = {
      intel_complete: Brain,
      intel_queued: Clock,
      match_found: Target,
      outreach_response: MessageSquare,
      outreach_sent: Mail,
      campaign_update: Users,
      campaign_created: Zap,
      system: AlertCircle,
    };
    return icons[type] || Bell;
  };

  const getIconColor = (type) => {
    const colors = {
      intel_complete: "text-cyan-400 bg-cyan-500/20",
      intel_queued: "text-zinc-400 bg-zinc-700",
      match_found: "text-green-400 bg-green-500/20",
      outreach_response: "text-yellow-400 bg-yellow-500/20",
      outreach_sent: "text-blue-400 bg-blue-500/20",
      campaign_update: "text-purple-400 bg-purple-500/20",
      campaign_created: "text-red-400 bg-red-500/20",
      system: "text-zinc-400 bg-zinc-700",
    };
    return colors[type] || "text-zinc-400 bg-zinc-700";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? "text-white" : "text-zinc-400"}`} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold px-1"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[380px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-medium text-white">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-9 h-9 bg-zinc-800 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-800 rounded w-3/4" />
                        <div className="h-3 bg-zinc-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs mt-1 text-zinc-600">
                    We'll notify you when something important happens
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {notifications.map((notification) => {
                    const Icon = getIcon(notification.type);
                    return (
                      <motion.button
                        key={notification.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-800/50 transition-colors group ${
                          !notification.read ? "bg-red-500/5" : ""
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 ${getIconColor(
                            notification.type
                          )}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm font-medium ${
                                !notification.read ? "text-white" : "text-zinc-300"
                              }`}
                            >
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              {!notification.read && (
                                <span className="w-2 h-2 bg-red-500 rounded-full" />
                              )}
                              <button
                                onClick={(e) => handleDelete(e, notification.id)}
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded transition-all"
                              >
                                <X className="w-3 h-3 text-zinc-500" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1.5">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-800/30 text-center">
              <p className="text-xs text-zinc-500">
                Press <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-[10px]">N</kbd> to open
                notifications
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
