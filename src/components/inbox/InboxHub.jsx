import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Calendar, Video, Phone,
  ChevronRight, Clock, Users as UsersIcon,
  Loader2, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import CalendarMiniMonth from './calendar/CalendarMiniMonth';
import CalendarView from './calendar/CalendarView';
import { useCalendar } from './calendar/useCalendar';
import { useUser } from '@/components/context/UserContext';
import { useSyncPhone } from './phone/useSyncPhone';
import PhoneDashboard from './phone/PhoneDashboard';

// Tab definitions for Communication Hub
const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'calls', label: 'Calls', icon: Video },
  { id: 'phone', label: 'Phone', icon: Phone },
];

// Tab bar component for left sidebar
const TabBar = memo(function TabBar({ activeTab, onTabChange, callCount = 0, phoneCount = 0 }) {
  return (
    <div className="flex items-center border-b border-zinc-800/60 bg-zinc-900/80 px-1">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const badge = tab.id === 'calls' ? callCount : tab.id === 'phone' ? phoneCount : 0;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-all duration-200 ${
              isActive
                ? 'text-cyan-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4" />
              {badge > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold bg-cyan-500 text-white rounded-full px-0.5">
                  {badge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-1 right-1 h-0.5 bg-cyan-500 rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});

// Calendar sidebar with mini month navigation and today's events
const CalendarSidebarContent = memo(function CalendarSidebarContent({ calendarState }) {
  const { user } = useUser();
  // Use passed-in calendar state or create a basic one
  const events = calendarState?.events || [];
  const currentDate = calendarState?.currentDate || new Date();
  const setCurrentDate = calendarState?.setCurrentDate || (() => {});
  const setView = calendarState?.setView || (() => {});

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
    </div>
  );
});

// Placeholder content for Calls tab sidebar
const CallsSidebarContent = memo(function CallsSidebarContent() {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-4">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Active Calls
      </div>
      <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
        <div className="flex items-center gap-2 text-zinc-500">
          <Video className="w-4 h-4 text-zinc-600" />
          <span className="text-xs text-zinc-400">No active calls</span>
        </div>
      </div>

      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-6 mb-3">
        Scheduled Today
      </div>
      <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
        <span className="text-xs text-zinc-400">No scheduled calls</span>
      </div>

      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-6 mb-3">
        Recent
      </div>
      <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
        <span className="text-xs text-zinc-400">No recent calls</span>
      </div>
    </div>
  );
});

// Real Phone tab sidebar with live data
const PhoneSidebarContent = memo(function PhoneSidebarContent() {
  const { phoneNumber, loading, callHistory, smsHistory, requestPhoneNumber, provisioning } = useSyncPhone();

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

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4">
      {/* Phone Number or Setup */}
      {phoneNumber ? (
        <div className="p-3 rounded-xl bg-zinc-800/40 border border-cyan-500/20 mb-4">
          <div className="text-xs font-semibold text-zinc-400 mb-1">Your Sync Number</div>
          <div className="text-sm text-white font-mono font-bold">{phoneNumber.phone_number}</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-[10px] text-zinc-500">Active</span>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => requestPhoneNumber()}
          disabled={provisioning}
          className="w-full p-3 rounded-xl bg-zinc-800/40 border border-cyan-500/20 mb-4 hover:bg-zinc-800/60 transition-colors text-left"
        >
          <div className="text-xs font-semibold text-cyan-400 mb-1">
            {provisioning ? 'Setting up...' : 'Set Up Sync Phone'}
          </div>
          <p className="text-[11px] text-zinc-500">
            Get a number so Sync can answer calls for you.
          </p>
        </button>
      )}

      {/* Quick Stats */}
      {phoneNumber && (
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
            <div className="text-lg font-bold text-white">{callsToday}</div>
            <div className="text-[10px] text-zinc-500">Calls today</div>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
            <div className="text-lg font-bold text-white">{smsToday}</div>
            <div className="text-[10px] text-zinc-500">SMS today</div>
          </div>
        </div>
      )}

      {/* Recent Calls */}
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Recent Calls
      </div>
      {callHistory.length > 0 ? (
        <div className="space-y-1.5">
          {callHistory.slice(0, 5).map((call) => (
            <div
              key={call.id}
              className="p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/40 flex items-center gap-2"
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
              <span className={`text-[9px] px-1 py-0.5 rounded ${
                call.status === 'completed' ? 'text-cyan-400' :
                call.status === 'missed' ? 'text-red-400' :
                'text-zinc-500'
              }`}>
                {call.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
          <div className="flex items-center gap-2 text-zinc-500">
            <Phone className="w-4 h-4 text-zinc-600" />
            <span className="text-xs text-zinc-400">No calls yet</span>
          </div>
        </div>
      )}

      {/* SMS Messages */}
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-6 mb-3">
        SMS Messages
      </div>
      {smsHistory.length > 0 ? (
        <div className="space-y-1.5">
          {smsHistory.slice(0, 5).map((conv) => {
            const lastMsg = conv.messages?.[conv.messages.length - 1];
            return (
              <div
                key={conv.id}
                className="p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/40"
              >
                <div className="text-xs text-zinc-300 truncate">{conv.phone_number}</div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                  {lastMsg?.content || 'No messages'}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
          <span className="text-xs text-zinc-400">No messages yet</span>
        </div>
      )}
    </div>
  );
});

// Real calendar main content
function CalendarMainContent() {
  return <CalendarView />;
}

function CallsMainContent() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-cyan-400/40" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Video Calls</h2>
        <p className="text-sm text-zinc-500">
          Start video calls with your team or external guests. Sync joins as a silent note-taker and can be activated on demand.
        </p>
        <p className="text-xs text-zinc-600 mt-4">Coming in the next build phase.</p>
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
