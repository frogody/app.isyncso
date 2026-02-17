import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Calendar, Video, Phone,
  ChevronRight, Clock, Users as UsersIcon,
  Loader2, ArrowDownLeft, ArrowUpRight,
  Link2, Copy, Check, ExternalLink, Settings, X
} from 'lucide-react';
import CalendarMiniMonth from './calendar/CalendarMiniMonth';
import CalendarView from './calendar/CalendarView';
import { useCalendar } from './calendar/useCalendar';
import { BookingSettings } from './booking';
import { useUser } from '@/components/context/UserContext';
import { useSyncPhone } from './phone/useSyncPhone';
import PhoneDashboard from './phone/PhoneDashboard';
import { useVideoCall } from './video';
import { VideoCallRoom } from './video';

// Tab definitions for Communication Hub
const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'calls', label: 'Calls', icon: Video },
  { id: 'phone', label: 'Phone', icon: Phone },
];

// Full-width view switcher (matches CRM contacts tab bar pattern)
const TabBar = memo(function TabBar({ activeTab, onTabChange, callCount = 0, phoneCount = 0 }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/60 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const badge = tab.id === 'calls' ? callCount : tab.id === 'phone' ? phoneCount : 0;

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

// Dialpad for the phone sidebar
const DIALPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

const DialpadMini = memo(function DialpadMini({ onDial }) {
  const [number, setNumber] = useState('');

  const handleKey = (key) => setNumber(prev => prev + key);
  const handleBackspace = () => setNumber(prev => prev.slice(0, -1));
  const handleCall = () => {
    if (number.length >= 3 && onDial) onDial(number);
  };

  return (
    <div className="space-y-3">
      {/* Number display */}
      <div className="relative">
        <input
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/[^\d+*#]/g, ''))}
          placeholder="Enter number"
          className="w-full text-center text-lg font-mono font-semibold text-white bg-zinc-800/50 border border-zinc-700/40 rounded-xl py-3 px-4 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
        />
        {number && (
          <button
            onClick={handleBackspace}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
          >
            DEL
          </button>
        )}
      </div>

      {/* Dialpad grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {DIALPAD_KEYS.flat().map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            className="h-11 rounded-lg bg-zinc-800/50 border border-zinc-700/30 text-white font-medium text-base hover:bg-zinc-700/60 active:bg-zinc-700 transition-colors"
          >
            {key}
          </button>
        ))}
      </div>

      {/* Call button */}
      <button
        onClick={handleCall}
        disabled={number.length < 3}
        className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
      >
        <Phone className="w-4 h-4" />
        Call
      </button>
    </div>
  );
});

// Real Phone tab sidebar with live data
const PhoneSidebarContent = memo(function PhoneSidebarContent() {
  const { phoneNumber, loading, callHistory, smsHistory, requestPhoneNumber, provisioning } = useSyncPhone();
  const [sidebarView, setSidebarView] = useState('overview'); // 'overview' | 'dialpad' | 'sms'

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const callsToday = callHistory.filter(
    (c) => new Date(c.started_at || c.created_at) >= todayStart
  ).length;

  const smsToday = smsHistory.filter(
    (s) => new Date(s.last_message_at || s.created_at) >= todayStart
  ).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // No phone number yet — setup prompt
  if (!phoneNumber) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mb-5">
          <Phone className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-base font-semibold text-white mb-2">Set Up Sync Phone</h3>
        <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
          Get a dedicated phone number. Sync answers calls, takes messages, and handles SMS for you.
        </p>
        <button
          onClick={() => requestPhoneNumber()}
          disabled={provisioning}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          {provisioning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Setting up...</>
          ) : (
            <><Phone className="w-4 h-4" /> Get Phone Number</>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Hero: Phone Number Card */}
      <div className="px-4 pt-4 pb-3">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-medium text-cyan-400 uppercase tracking-wider">Active</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-wide">
            {phoneNumber.phone_number?.replace(/(\+\d)(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4') || phoneNumber.phone_number}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="text-center">
              <div className="text-sm font-bold text-white">{callsToday}</div>
              <div className="text-[9px] text-zinc-500">Calls</div>
            </div>
            <div className="w-px h-6 bg-zinc-700/50" />
            <div className="text-center">
              <div className="text-sm font-bold text-white">{smsToday}</div>
              <div className="text-[9px] text-zinc-500">SMS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mini tab bar */}
      <div className="flex items-center gap-1 px-4 mb-3">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'dialpad', label: 'Dialpad' },
          { id: 'sms', label: 'SMS' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarView(tab.id)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              sidebarView === tab.id
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {sidebarView === 'overview' && (
          <div className="space-y-4">
            {/* Recent Calls */}
            <div>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Recent Calls
              </div>
              {callHistory.length > 0 ? (
                <div className="space-y-1">
                  {callHistory.slice(0, 5).map((call) => (
                    <div
                      key={call.id}
                      className="p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30 flex items-center gap-2"
                    >
                      {call.direction === 'inbound' ? (
                        <ArrowDownLeft className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-zinc-300 truncate block">
                          {call.direction === 'inbound' ? call.caller_number : call.callee_number}
                        </span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        call.status === 'completed' ? 'bg-cyan-500/10 text-cyan-400' :
                        call.status === 'missed' ? 'bg-red-500/10 text-red-400' :
                        'bg-zinc-800 text-zinc-500'
                      }`}>
                        {call.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30 text-center">
                  <span className="text-xs text-zinc-500">No calls yet</span>
                </div>
              )}
            </div>

            {/* SMS Preview */}
            <div>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                SMS Conversations
              </div>
              {smsHistory.length > 0 ? (
                <div className="space-y-1">
                  {smsHistory.slice(0, 3).map((conv) => {
                    const lastMsg = conv.messages?.[conv.messages.length - 1];
                    return (
                      <div key={conv.id} className="p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                        <div className="text-xs text-zinc-300 truncate">{conv.phone_number}</div>
                        <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                          {lastMsg?.content || 'No messages'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30 text-center">
                  <span className="text-xs text-zinc-500">No messages yet</span>
                </div>
              )}
            </div>
          </div>
        )}

        {sidebarView === 'dialpad' && (
          <DialpadMini onDial={(num) => console.log('Dial:', num)} />
        )}

        {sidebarView === 'sms' && (
          <div className="space-y-3">
            <input
              type="tel"
              placeholder="Phone number"
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/40 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
            />
            <textarea
              placeholder="Type your message..."
              rows={3}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/40 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
            <button className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Send SMS
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

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

function PhoneMainContent() {
  const syncPhone = useSyncPhone();

  return (
    <PhoneDashboard
      phoneNumber={syncPhone.phoneNumber}
      loading={syncPhone.loading}
      provisioning={syncPhone.provisioning}
      callHistory={syncPhone.callHistory}
      smsHistory={syncPhone.smsHistory}
      callsLoading={syncPhone.callsLoading}
      smsLoading={syncPhone.smsLoading}
      requestPhoneNumber={syncPhone.requestPhoneNumber}
      updateSettings={syncPhone.updateSettings}
      refetch={syncPhone.refetch}
    />
  );
}

export {
  TABS,
  TabBar,
  CalendarSidebarContent,
  CallsSidebarContent,
  PhoneSidebarContent,
  CalendarMainContent,
  CallsMainContent,
  PhoneMainContent,
};

export default function InboxHub({ children }) {
  // This is a layout wrapper - actual tab state is managed in Inbox.jsx
  return children;
}
