import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

export default function NotificationBell({ clientId, organizationId, orgSlug }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!clientId || !organizationId) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('portal_activity')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && data) {
          setNotifications(data);
          const dayAgo = new Date(Date.now() - 86400000).toISOString();
          setUnreadCount(data.filter((n) => n.created_at > dayAgo).length);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
  }, [clientId, organizationId]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="p-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className="px-3 py-2.5 hover:bg-white/5 border-b border-zinc-800/50 last:border-0">
                    <p className="text-sm text-zinc-300 line-clamp-2">{n.description || n.action_type}</p>
                    <p className="text-xs text-zinc-600 mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-zinc-500">No notifications yet</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
