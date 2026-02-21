/**
 * PortalChatWidget - Floating chat bubble bottom-right.
 *
 * MessageCircle icon + unread badge. Click toggles PortalChatWindow.
 * framer-motion scale animation. Fixed position.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import PortalChatWindow from './PortalChatWindow';

export default function PortalChatWidget() {
  const { client, config } = useWholesale();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const organizationId = config?.organization_id;
  const clientId = client?.id;

  // Fetch unread count
  const fetchUnread = useCallback(async () => {
    if (!clientId || !organizationId) return;
    try {
      const { count } = await supabase
        .from('b2b_chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .eq('sender', 'admin')
        .eq('read', false);

      setUnreadCount(count || 0);
    } catch (err) {
      // Silently fail
    }
  }, [clientId, organizationId]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Clear unread when chat opens
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  return (
    <>
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <PortalChatWindow onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 flex items-center justify-center transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </>
        )}
      </motion.button>
    </>
  );
}
