import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setPermissionGranted(true);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          setPermissionGranted(permission === "granted");
        });
      }
    }
  }, []);

  // Fetch existing notifications on mount
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show browser notification if permitted
          if (permissionGranted && "Notification" in window) {
            try {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: "/favicon.ico",
                tag: newNotification.id,
              });
            } catch (e) {
              console.warn("Browser notification failed:", e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, permissionGranted]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = useCallback(
    async (id) => {
      if (!user?.id) return;

      // Optimistically update UI
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await supabase
          .from("user_notifications")
          .update({ read: true })
          .eq("id", id)
          .eq("user_id", user.id);
      } catch (err) {
        console.error("Error marking notification as read:", err);
        // Revert on error
        fetchNotifications();
      }
    },
    [user?.id]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await supabase
        .from("user_notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .in("id", unreadIds);
    } catch (err) {
      console.error("Error marking all as read:", err);
      fetchNotifications();
    }
  }, [notifications, user?.id]);

  const clearAll = useCallback(async () => {
    if (!user?.id) return;

    // Optimistically update UI
    setNotifications([]);
    setUnreadCount(0);

    try {
      await supabase
        .from("user_notifications")
        .delete()
        .eq("user_id", user.id);
    } catch (err) {
      console.error("Error clearing notifications:", err);
      fetchNotifications();
    }
  }, [user?.id]);

  const deleteNotification = useCallback(
    async (id) => {
      if (!user?.id) return;

      const notification = notifications.find((n) => n.id === id);

      // Optimistically update UI
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        await supabase
          .from("user_notifications")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
      } catch (err) {
        console.error("Error deleting notification:", err);
        fetchNotifications();
      }
    },
    [notifications, user?.id]
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        clearAll,
        deleteNotification,
        refresh: fetchNotifications,
        requestPermission: () => {
          if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission().then((permission) => {
              setPermissionGranted(permission === "granted");
            });
          }
        },
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    // Return a no-op version if not wrapped in provider
    return {
      notifications: [],
      unreadCount: 0,
      loading: false,
      markAsRead: () => {},
      markAllAsRead: () => {},
      clearAll: () => {},
      deleteNotification: () => {},
      refresh: () => {},
      requestPermission: () => {},
    };
  }
  return context;
};
