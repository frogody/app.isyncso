import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Calendar, Video,
  Users as UsersIcon, Loader2,
  Link2, Copy, Check, ExternalLink, Settings, X, Clock, Phone
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import CalendarMiniMonth from './calendar/CalendarMiniMonth';
import CalendarView from './calendar/CalendarView';
import { useCalendar } from './calendar/useCalendar';
import { BookingSettings } from './booking';
import { useUser } from '@/components/context/UserContext';
import { useVideoCall, VideoCallRoom, MeetingLinkModal } from './video';
import { toast } from 'sonner';

// Tab definitions for Communication Hub (Phone/PA features live on the Sync page)
const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'calls', label: 'Calls', icon: Video },
];

// Full-width view switcher (matches CRM contacts tab bar pattern)
const TabBar = memo(function TabBar({ activeTab, onTabChange, callCount = 0 }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/60 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const badge = tab.id === 'calls' ? callCount : 0;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <div className="relative">
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold bg-cyan-500 text-white rounded-full px-0.5">
                  {badge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
});

// Compact booking card for the sidebar — opens full settings in a modal
const BookingCard = memo(function BookingCard({ userId, username }) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const bookingUrl = `${window.location.origin}/book/${username || 'your-username'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-zinc-200">Booking Page</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
            title="Booking settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0 px-2 py-1 bg-zinc-900/60 rounded-md">
            <span className="text-[10px] text-zinc-500 truncate block">{bookingUrl}</span>
          </div>
          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-zinc-500 hover:text-white transition-colors shrink-0"
          >
            {copied ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-md text-zinc-500 hover:text-white transition-colors shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Full settings modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-800/60 shadow-2xl p-6"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Booking Settings</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <BookingSettings userId={userId} username={username} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

// Calendar sidebar with mini month navigation and today's events
const CalendarSidebarContent = memo(function CalendarSidebarContent({ calendarState }) {
  const { user } = useUser();
  // Use own calendar state when no external state is provided
  const ownCalendar = useCalendar(user?.id, user?.company_id);
  const calendar = calendarState || ownCalendar;
  const events = calendar?.events || [];
  const currentDate = calendar?.currentDate || new Date();
  const setCurrentDate = calendar?.setCurrentDate || (() => {});
  const setView = calendar?.setView || (() => {});

  const handleDateSelect = (date) => {
    setCurrentDate(date);
    setView('day');
  };

  // Get today's events
  const todayEvents = events.filter((ev) => {
    const start = new Date(ev.start_time || ev.start);
    const today = new Date();
    return (
      start.getFullYear() === today.getFullYear() &&
      start.getMonth() === today.getMonth() &&
      start.getDate() === today.getDate()
    );
  });

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4">
      <CalendarMiniMonth
        currentDate={currentDate}
        onDateSelect={handleDateSelect}
        events={events}
      />

      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-5 mb-3">
        Today's Events ({todayEvents.length})
      </div>
      {todayEvents.length > 0 ? (
        <div className="space-y-1.5">
          {todayEvents.slice(0, 5).map((ev) => {
            const start = new Date(ev.start_time || ev.start);
            const time = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const color = ev.color || '#06b6d4';
            return (
              <div
                key={ev.id}
                className="p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/40 cursor-pointer hover:bg-zinc-800/60 transition-colors"
                style={{ borderLeftColor: color, borderLeftWidth: 3 }}
              >
                <div className="text-xs font-medium text-zinc-200 truncate">{ev.title}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{time}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
          <div className="flex items-center gap-2 text-zinc-500">
            <Calendar className="w-4 h-4 text-cyan-400/60" />
            <span className="text-xs text-zinc-400">No events today</span>
          </div>
        </div>
      )}

      {/* Compact booking card — full settings in modal */}
      <div className="mt-4">
        <BookingCard
          userId={user?.id}
          username={user?.username || user?.email?.split('@')[0]}
        />
      </div>
    </div>
  );
});

// Calls tab sidebar with live call state
const CallsSidebarContent = memo(function CallsSidebarContent() {
  const { user } = useUser();
  const videoCall = useVideoCall(user?.id, user?.company_id, user?.full_name);
  const [meetingLinks, setMeetingLinks] = useState([]);
  const [linkModalCall, setLinkModalCall] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [callInvites, setCallInvites] = useState([]);

  // Subscribe to call invite notifications
  useEffect(() => {
    if (!user?.id) return;

    // Fetch existing unread call invites
    supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'call_invite')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setCallInvites(data);
      });

    // Listen for new call invites in realtime
    const channel = supabase
      .channel(`call-invites-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.type === 'call_invite') {
            setCallInvites((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const dismissInvite = useCallback(async (inviteId) => {
    await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', inviteId);
    setCallInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }, []);

  const acceptInvite = useCallback(async (invite) => {
    const joinCode = invite.metadata?.join_code;
    if (!joinCode) return;
    await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', invite.id);
    setCallInvites((prev) => prev.filter((i) => i.id !== invite.id));
    videoCall.joinCall(joinCode);
  }, [videoCall]);

  const loadLinks = useCallback(async () => {
    const links = await videoCall.getMyMeetingLinks();
    setMeetingLinks(links);
  }, [videoCall.getMyMeetingLinks]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const handleCreateLink = useCallback(async () => {
    try {
      const call = await videoCall.createMeetingLink({ title: 'Meeting' });
      setLinkModalCall(call);
      loadLinks();
    } catch {}
  }, [videoCall.createMeetingLink, loadLinks]);

  const handleCopyLinkUrl = useCallback((link) => {
    navigator.clipboard.writeText(link.join_url).then(() => {
      setCopiedId(link.id);
      toast.success('Link copied');
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const statusDot = (status) => {
    if (status === 'active') return 'bg-cyan-400 animate-pulse';
    if (status === 'waiting') return 'bg-amber-400';
    return 'bg-zinc-500';
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Active Call
      </div>
      {videoCall.isInCall && videoCall.currentCall ? (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 mb-4">
          <div className="text-sm font-medium text-white">{videoCall.currentCall.title || 'Ongoing Call'}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <UsersIcon className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-zinc-400">{videoCall.participants.length} participant{videoCall.participants.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] text-cyan-400">In progress</span>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
          <div className="flex items-center gap-2 text-zinc-500">
            <Video className="w-4 h-4 text-zinc-600" />
            <span className="text-xs text-zinc-400">No active calls</span>
          </div>
        </div>
      )}

      {/* Incoming call invites */}
      {callInvites.length > 0 && (
        <div className="mt-4 space-y-2">
          {callInvites.map((invite) => (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 animate-pulse"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-cyan-300 truncate">{invite.title}</span>
              </div>
              <p className="text-[11px] text-zinc-400 mb-2 truncate">{invite.message}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => acceptInvite(invite)}
                  disabled={videoCall.isInCall}
                  className="flex-1 px-2 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Join
                </button>
                <button
                  onClick={() => dismissInvite(invite.id)}
                  className="flex-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium rounded-lg border border-zinc-700/40 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-6 mb-3">
        Quick Actions
      </div>
      <div className="space-y-2">
        <button
          onClick={() => videoCall.createCall({ title: 'Quick Call', channelId: null })}
          disabled={videoCall.loading || videoCall.isInCall}
          className="w-full flex items-center gap-2 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40 hover:bg-zinc-800/60 hover:border-cyan-500/30 transition-all disabled:opacity-50 text-left"
        >
          <Video className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-xs font-medium text-zinc-200">Start Quick Call</div>
            <div className="text-[10px] text-zinc-500">Start an instant video call</div>
          </div>
        </button>
        <button
          onClick={handleCreateLink}
          disabled={videoCall.loading}
          className="w-full flex items-center gap-2 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40 hover:bg-zinc-800/60 hover:border-cyan-500/30 transition-all disabled:opacity-50 text-left"
        >
          <Link2 className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-xs font-medium text-zinc-200">Create Meeting Link</div>
            <div className="text-[10px] text-zinc-500">Share a link without joining</div>
          </div>
        </button>
      </div>

      {/* Recent Links */}
      {meetingLinks.length > 0 && (
        <>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-6 mb-3">
            Recent Links ({meetingLinks.length})
          </div>
          <div className="space-y-1.5">
            {meetingLinks.slice(0, 5).map((link) => (
              <div
                key={link.id}
                className="p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/40 hover:bg-zinc-800/60 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(link.status)}`} />
                    <span className="text-xs font-medium text-zinc-200 truncate">{link.title || 'Meeting'}</span>
                  </div>
                  <button
                    onClick={() => handleCopyLinkUrl(link)}
                    className="p-1 rounded-md text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Copy link"
                  >
                    {copiedId === link.id ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-zinc-500">{link.join_code}</span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(link.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <MeetingLinkModal
        isOpen={!!linkModalCall}
        onClose={() => setLinkModalCall(null)}
        call={linkModalCall}
        onJoinNow={(joinCode) => videoCall.joinCall(joinCode)}
      />
    </div>
  );
});

// Phone sidebar and dialpad removed — Phone/PA features live on the Sync page

// Real calendar main content
function CalendarMainContent() {
  return <CalendarView />;
}

function CallsMainContent() {
  const { user } = useUser();
  const videoCall = useVideoCall(user?.id, user?.company_id, user?.full_name);
  const [meetingLinks, setMeetingLinks] = useState([]);
  const [linkModalCall, setLinkModalCall] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const loadLinks = useCallback(async () => {
    const links = await videoCall.getMyMeetingLinks();
    setMeetingLinks(links);
  }, [videoCall.getMyMeetingLinks]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const handleCreateLink = useCallback(async () => {
    try {
      const call = await videoCall.createMeetingLink({ title: 'Meeting' });
      setLinkModalCall(call);
      loadLinks();
    } catch {}
  }, [videoCall.createMeetingLink, loadLinks]);

  const handleCopyLinkUrl = useCallback((link) => {
    navigator.clipboard.writeText(link.join_url).then(() => {
      setCopiedId(link.id);
      toast.success('Link copied');
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  if (videoCall.isInCall && videoCall.currentCall) {
    return (
      <VideoCallRoom
        call={videoCall.currentCall}
        participants={videoCall.participants}
        user={user}
        isMuted={videoCall.isMuted}
        isCameraOff={videoCall.isCameraOff}
        isScreenSharing={videoCall.isScreenSharing}
        localStream={videoCall.localStream}
        screenStream={videoCall.screenStream}
        onToggleMute={videoCall.toggleMute}
        onToggleCamera={videoCall.toggleCamera}
        onToggleScreenShare={videoCall.toggleScreenShare}
        onLeave={videoCall.leaveCall}
        onEndCall={videoCall.endCall}
      />
    );
  }

  const statusLabel = (s) => s === 'active' ? 'Active' : s === 'waiting' ? 'Waiting' : 'Ended';
  const statusColor = (s) => s === 'active' ? 'text-cyan-400' : s === 'waiting' ? 'text-amber-400' : 'text-zinc-500';
  const statusDot = (s) => s === 'active' ? 'bg-cyan-400 animate-pulse' : s === 'waiting' ? 'bg-amber-400' : 'bg-zinc-500';

  return (
    <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
      <div className="text-center max-w-md mt-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-cyan-400/40" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Video Calls</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Start video calls with your team or external guests. Sync joins as a silent note-taker and can be activated on demand.
        </p>
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={() => videoCall.createCall({ title: 'New Call', channelId: null })}
            disabled={videoCall.loading}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {videoCall.loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Start a Call
              </span>
            )}
          </button>
          <button
            onClick={handleCreateLink}
            disabled={videoCall.loading}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg border border-zinc-700/40 transition-colors disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-cyan-400" />
              Create Link
            </span>
          </button>
        </div>
      </div>

      {/* Recent Meeting Links */}
      {meetingLinks.length > 0 && (
        <div className="w-full max-w-lg mt-10">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Recent Meeting Links
          </div>
          <div className="space-y-2">
            {meetingLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40 hover:bg-zinc-800/60 transition-colors group"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot(link.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200 truncate">{link.title || 'Meeting'}</span>
                    <span className={`text-[10px] font-medium ${statusColor(link.status)}`}>{statusLabel(link.status)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-mono text-zinc-500">{link.join_code}</span>
                    <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(link.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyLinkUrl(link)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy link"
                >
                  {copiedId === link.id ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
                </button>
                {(link.status === 'waiting' || link.status === 'active') && (
                  <button
                    onClick={() => videoCall.joinCall(link.join_code)}
                    disabled={videoCall.loading || videoCall.isInCall}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 text-xs font-medium hover:bg-cyan-600/30 transition-colors disabled:opacity-50"
                  >
                    Join
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <MeetingLinkModal
        isOpen={!!linkModalCall}
        onClose={() => setLinkModalCall(null)}
        call={linkModalCall}
        onJoinNow={(joinCode) => videoCall.joinCall(joinCode)}
      />
    </div>
  );
}

export {
  TABS,
  TabBar,
  CalendarSidebarContent,
  CallsSidebarContent,
  CalendarMainContent,
  CallsMainContent,
};

export default function InboxHub({ children }) {
  // This is a layout wrapper - actual tab state is managed in Inbox.jsx
  return children;
}
