import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Calendar, Plus,
  LayoutGrid, List, Clock, Sun
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { useCalendar, EVENT_COLORS } from './useCalendar';
import { useCalendarSync } from './useCalendarSync';
import CalendarWeekView from './CalendarWeekView';
import CalendarDayView from './CalendarDayView';
import CalendarMonthView from './CalendarMonthView';
import CalendarAgendaView from './CalendarAgendaView';
import CalendarEventModal from './CalendarEventModal';
import CalendarSyncButton from './CalendarSyncButton';

const VIEW_OPTIONS = [
  { id: 'day', label: 'Day', icon: Sun },
  { id: 'week', label: 'Week', icon: Calendar },
  { id: 'month', label: 'Month', icon: LayoutGrid },
  { id: 'agenda', label: 'Agenda', icon: List },
];

function formatHeaderDate(date, view) {
  const opts = { year: 'numeric' };
  switch (view) {
    case 'day':
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      }).format(date);
    case 'week': {
      const start = new Date(date);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
      const yearFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric' });
      return `${fmt.format(start)} - ${fmt.format(end)}, ${yearFmt.format(end)}`;
    }
    case 'month':
      return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
    case 'agenda':
      return 'Upcoming Events';
    default:
      return '';
  }
}

export default function CalendarView() {
  const { user } = useUser();
  const {
    events, loading, currentDate, setCurrentDate,
    view, setView,
    createEvent, updateEvent, deleteEvent, moveEvent,
    goToToday, goForward, goBack,
    refetch,
  } = useCalendar(user?.id, user?.company_id);

  // Google Calendar sync
  const calendarSync = useCalendarSync(user?.id, user?.company_id);

  // Wrap syncFromGoogle to also refetch local events after sync
  const handleSync = useCallback(async () => {
    await calendarSync.syncFromGoogle();
    refetch();
  }, [calendarSync, refetch]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [createDefaults, setCreateDefaults] = useState(null);

  // Team members for attendee picker
  const [teamMembers, setTeamMembers] = useState([]);
  React.useEffect(() => {
    if (!user?.company_id) return;
    const fetchTeam = async () => {
      const { supabase } = await import('@/api/supabaseClient');
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .eq('company_id', user.company_id)
        .limit(100);
      setTeamMembers(data || []);
    };
    fetchTeam();
  }, [user?.company_id]);

  // Event handlers
  const handleEventClick = useCallback((event) => {
    setEditingEvent(event);
    setCreateDefaults(null);
    setModalOpen(true);
  }, []);

  const handleCreateEvent = useCallback((defaults) => {
    setEditingEvent(null);
    setCreateDefaults(defaults || null);
    setModalOpen(true);
  }, []);

  const handleMoveEvent = useCallback((eventId, newStart) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    const oldStart = new Date(event.start_time);
    const oldEnd = new Date(event.end_time);
    const duration = oldEnd - oldStart;
    const newEnd = new Date(newStart.getTime() + duration);
    moveEvent(eventId, newStart, newEnd);
  }, [events, moveEvent]);

  const handleSave = useCallback(async (eventData) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, eventData);
    } else {
      await createEvent(eventData);
    }
    setModalOpen(false);
    setEditingEvent(null);
  }, [editingEvent, createEvent, updateEvent]);

  const handleDateSelect = useCallback((date) => {
    setCurrentDate(date);
    setView('day');
  }, [setCurrentDate, setView]);

  const headerLabel = useMemo(
    () => formatHeaderDate(currentDate, view),
    [currentDate, view]
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/80 flex-shrink-0">
        {/* Left: nav + date */}
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goForward}
            className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-medium text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 rounded-lg transition-colors"
          >
            Today
          </button>
          <h2 className="text-sm font-semibold text-white ml-2">{headerLabel}</h2>
        </div>

        {/* Right: view switcher + create */}
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-800/50 rounded-lg border border-zinc-700/50 p-0.5">
            {VIEW_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = view === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setView(opt.id)}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <CalendarSyncButton
            isConnected={calendarSync.isConnected}
            isSyncing={calendarSync.isSyncing}
            lastSyncAt={calendarSync.lastSyncAt}
            connectionLoading={calendarSync.connectionLoading}
            onConnect={calendarSync.connectGoogleCalendar}
            onSync={handleSync}
          />
          <button
            onClick={() => handleCreateEvent(null)}
            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Event</span>
          </button>
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-hidden">
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-zinc-500">
              <Clock className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading calendar...</span>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {view === 'week' && (
                <CalendarWeekView
                  events={events}
                  currentDate={currentDate}
                  onEventClick={handleEventClick}
                  onCreateEvent={handleCreateEvent}
                  onMoveEvent={handleMoveEvent}
                />
              )}
              {view === 'day' && (
                <CalendarDayView
                  events={events}
                  currentDate={currentDate}
                  onEventClick={handleEventClick}
                  onCreateEvent={handleCreateEvent}
                  onMoveEvent={handleMoveEvent}
                />
              )}
              {view === 'month' && (
                <CalendarMonthView
                  events={events}
                  currentDate={currentDate}
                  onEventClick={handleEventClick}
                  onCreateEvent={handleCreateEvent}
                  onDateSelect={handleDateSelect}
                />
              )}
              {view === 'agenda' && (
                <CalendarAgendaView
                  events={events}
                  currentDate={currentDate}
                  onEventClick={handleEventClick}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Event Modal */}
      <CalendarEventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEvent(null);
        }}
        event={editingEvent}
        onSave={handleSave}
        onDelete={editingEvent ? () => {
          deleteEvent(editingEvent.id);
          setModalOpen(false);
          setEditingEvent(null);
        } : undefined}
        users={teamMembers}
        currentDate={createDefaults?.date || currentDate}
      />
    </div>
  );
}
