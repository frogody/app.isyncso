import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Calendar, Video,
  Users as UsersIcon, Loader2,
  Link2, Copy, Check, ExternalLink, Settings, X
} from 'lucide-react';
import CalendarMiniMonth from './calendar/CalendarMiniMonth';
import CalendarView from './calendar/CalendarView';
import { useCalendar } from './calendar/useCalendar';
import { BookingSettings } from './booking';
import { useUser } from '@/components/context/UserContext';
import { useVideoCall } from './video';
import { VideoCallRoom } from './video';

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
  const videoCall = useVideoCall(user?.id, user?.company_id);

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

      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-6 mb-3">
        Quick Actions
      </div>
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
  const videoCall = useVideoCall(user?.id, user?.company_id);

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

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-cyan-400/40" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Video Calls</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Start video calls with your team or external guests. Sync joins as a silent note-taker and can be activated on demand.
        </p>
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
      </div>
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
