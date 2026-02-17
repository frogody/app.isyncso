/**
 * CalendarEventModal - Create/edit calendar event dialog
 *
 * Animated modal with form fields for all event properties including
 * attendees, reminders, and color selection.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  Video,
  Type,
  AlignLeft,
  Palette,
  Plus,
  Trash2,
  Search,
  Check,
  Loader2,
  Repeat,
  Mail,
} from 'lucide-react';
import { EVENT_TYPES, EVENT_COLORS, PRESET_COLORS, REMINDER_PRESETS } from './useCalendar';

// Recurrence options
const RECURRENCE_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// Format a Date to YYYY-MM-DD for date inputs
function formatDateInput(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format a Date to HH:MM for time inputs
function formatTimeInput(date) {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Combine date string and time string into a Date
function combineDateAndTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

export default function CalendarEventModal({
  isOpen,
  onClose,
  event = null,
  onSave,
  users = [],
  currentDate,
}) {
  const isEditing = !!event;

  // Default start: current date at next round hour
  const defaultStart = useMemo(() => {
    const d = new Date(currentDate || new Date());
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  }, [currentDate]);

  // Default end: 1 hour after start
  const defaultEnd = useMemo(() => {
    const d = new Date(defaultStart);
    d.setHours(d.getHours() + 1);
    return d;
  }, [defaultStart]);

  // Form state
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(EVENT_COLORS.meeting);
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [reminders, setReminders] = useState([15]);
  const [videoCall, setVideoCall] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize/reset form when modal opens or event changes
  useEffect(() => {
    if (!isOpen) return;

    if (event) {
      setTitle(event.title || '');
      setEventType(event.event_type || 'meeting');
      setStartDate(formatDateInput(event.start_time));
      setStartTime(formatTimeInput(event.start_time));
      setEndDate(formatDateInput(event.end_time));
      setEndTime(formatTimeInput(event.end_time));
      setAllDay(event.all_day || false);
      setLocation(event.location || '');
      setDescription(event.description || '');
      setColor(event.color || EVENT_COLORS[event.event_type] || EVENT_COLORS.meeting);
      setVideoCall(!!event.video_call_id);

      // Load attendees from event
      if (event.calendar_attendees?.length) {
        setSelectedAttendees(
          event.calendar_attendees.map((att) => ({
            user_id: att.user_id,
            email: att.email,
            name: att.name,
          }))
        );
      } else {
        setSelectedAttendees([]);
      }

      // Load recurrence from event metadata
      setRecurrenceRule(event.metadata?.recurrence_rule || '');
      setRecurrenceEnd(event.metadata?.recurrence_end ? formatDateInput(event.metadata.recurrence_end) : '');

      // Load reminders from event (convert remind_at to minutes before)
      if (event.calendar_reminders?.length) {
        const eventStart = new Date(event.start_time).getTime();
        setReminders(
          event.calendar_reminders.map((rem) => {
            const remAt = new Date(rem.remind_at).getTime();
            return Math.round((eventStart - remAt) / 60000);
          })
        );
      } else {
        setReminders([15]);
      }
    } else {
      // New event defaults
      setTitle('');
      setEventType('meeting');
      setStartDate(formatDateInput(defaultStart));
      setStartTime(formatTimeInput(defaultStart));
      setEndDate(formatDateInput(defaultEnd));
      setEndTime(formatTimeInput(defaultEnd));
      setAllDay(false);
      setLocation('');
      setDescription('');
      setColor(EVENT_COLORS.meeting);
      setSelectedAttendees([]);
      setReminders([15]);
      setVideoCall(false);
      setRecurrenceRule('');
      setRecurrenceEnd('');
    }
    setAttendeeSearch('');
    setExternalEmail('');
  }, [isOpen, event, defaultStart, defaultEnd]);

  // Update color when event type changes (only for new events)
  useEffect(() => {
    if (!isEditing) {
      setColor(EVENT_COLORS[eventType] || EVENT_COLORS.meeting);
    }
  }, [eventType, isEditing]);

  // Filtered users for attendee search
  const filteredUsers = useMemo(() => {
    if (!attendeeSearch.trim()) return users;
    const query = attendeeSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query)
    );
  }, [users, attendeeSearch]);

  // Add attendee
  const addAttendee = (user) => {
    if (selectedAttendees.some((a) => a.user_id === user.id)) return;
    setSelectedAttendees((prev) => [
      ...prev,
      { user_id: user.id, name: user.full_name, email: user.email },
    ]);
    setAttendeeSearch('');
  };

  // Add external email attendee
  const addExternalAttendee = () => {
    const email = externalEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (selectedAttendees.some((a) => a.email === email)) return;
    setSelectedAttendees((prev) => [
      ...prev,
      { user_id: null, name: email.split('@')[0], email },
    ]);
    setExternalEmail('');
  };

  // Remove attendee
  const removeAttendee = (idOrEmail) => {
    setSelectedAttendees((prev) => prev.filter((a) =>
      a.user_id ? a.user_id !== idOrEmail : a.email !== idOrEmail
    ));
  };

  // Add reminder
  const addReminder = (minutes) => {
    if (reminders.includes(minutes)) return;
    setReminders((prev) => [...prev, minutes].sort((a, b) => a - b));
  };

  // Remove reminder
  const removeReminder = (minutes) => {
    setReminders((prev) => prev.filter((r) => r !== minutes));
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        start_time: allDay
          ? new Date(`${startDate}T00:00:00`).toISOString()
          : combineDateAndTime(startDate, startTime).toISOString(),
        end_time: allDay
          ? new Date(`${endDate}T23:59:59`).toISOString()
          : combineDateAndTime(endDate, endTime).toISOString(),
        all_day: allDay,
        location: location.trim() || null,
        color,
        attendees: selectedAttendees,
        reminders,
        video_call: videoCall,
        recurrence_rule: recurrenceRule || null,
        recurrence_end: recurrenceEnd || null,
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('[CalendarEventModal] Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  // Available reminders not yet selected
  const availableReminders = REMINDER_PRESETS.filter(
    (r) => !reminders.includes(r.value)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-700/50 bg-zinc-900/95 backdrop-blur-xl rounded-t-2xl">
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? 'Edit Event' : 'New Event'}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <Type className="w-3.5 h-3.5 inline mr-1" />
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Event Type
                </label>
                <div className="relative">
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white appearance-none focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {/* Color dot preview */}
                  <div
                    className="absolute right-10 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                    style={{ backgroundColor: EVENT_COLORS[eventType] }}
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Date & Time
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-zinc-400">All day</span>
                    <button
                      type="button"
                      onClick={() => setAllDay(!allDay)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        allDay ? 'bg-cyan-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          allDay ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </label>
                </div>

                {/* Start */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-500 mb-1">Start</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                  {!allDay && (
                    <div className="w-28">
                      <label className="block text-xs text-zinc-500 mb-1">Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>

                {/* End */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-500 mb-1">End</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                  {!allDay && (
                    <div className="w-28">
                      <label className="block text-xs text-zinc-500 mb-1">Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location"
                  className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <AlignLeft className="w-3.5 h-3.5 inline mr-1" />
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <Palette className="w-3.5 h-3.5 inline mr-1" />
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        color === c
                          ? 'border-white scale-110'
                          : 'border-transparent hover:border-zinc-500'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && (
                        <Check className="w-4 h-4 text-white mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attendees */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Attendees
                </label>

                {/* Selected attendees pills */}
                {selectedAttendees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedAttendees.map((att) => {
                      const isExternal = !att.user_id;
                      return (
                        <span
                          key={att.user_id || att.email}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
                            isExternal
                              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                              : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            isExternal ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-cyan-500 to-indigo-500'
                          }`}>
                            {isExternal ? <Mail className="w-3 h-3" /> : (att.name || '?').charAt(0)}
                          </span>
                          {att.name || att.email}
                          <button
                            type="button"
                            onClick={() => removeAttendee(att.user_id || att.email)}
                            className={`ml-0.5 ${isExternal ? 'text-amber-400' : 'text-cyan-400'} hover:text-white`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    placeholder="Search team members..."
                    className="w-full pl-9 pr-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white text-sm placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* User dropdown */}
                {attendeeSearch.trim() && filteredUsers.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-y-auto bg-zinc-800 border border-zinc-700/50 rounded-xl">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedAttendees.some(
                        (a) => a.user_id === user.id
                      );
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => addAttendee(user)}
                          disabled={isSelected}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? 'text-zinc-500 cursor-not-allowed'
                              : 'text-white hover:bg-zinc-700/50'
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {(user.full_name || '?').charAt(0)}
                          </span>
                          <span className="truncate">{user.full_name}</span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-cyan-400 ml-auto shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* External email attendee */}
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      value={externalEmail}
                      onChange={(e) => setExternalEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addExternalAttendee();
                        }
                      }}
                      placeholder="Add external email..."
                      className="w-full pl-9 pr-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white text-sm placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addExternalAttendee}
                    className="px-3 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-sm hover:bg-amber-500/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reminders */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <Bell className="w-3.5 h-3.5 inline mr-1" />
                  Reminders
                </label>

                {/* Active reminders */}
                <div className="space-y-1.5 mb-2">
                  {reminders.map((mins) => {
                    const preset = REMINDER_PRESETS.find((r) => r.value === mins);
                    return (
                      <div
                        key={mins}
                        className="flex items-center justify-between px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg"
                      >
                        <span className="text-sm text-zinc-300">
                          {preset ? preset.label : `${mins} minutes before`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeReminder(mins)}
                          className="text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add reminder dropdown */}
                {availableReminders.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) addReminder(Number(e.target.value));
                    }}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-400 text-sm appearance-none focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="">+ Add reminder</option>
                    {availableReminders.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Recurrence */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  <Repeat className="w-3.5 h-3.5 inline mr-1" />
                  Recurrence
                </label>
                <select
                  value={recurrenceRule}
                  onChange={(e) => setRecurrenceRule(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white appearance-none focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
                >
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {recurrenceRule && (
                  <div className="mt-2">
                    <label className="block text-xs text-zinc-500 mb-1">Repeat until</label>
                    <input
                      type="date"
                      value={recurrenceEnd}
                      onChange={(e) => setRecurrenceEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                )}
              </div>

              {/* Video Call Toggle */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-white">Create video call link</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVideoCall(!videoCall)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    videoCall ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      videoCall ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || saving}
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : isEditing ? (
                    'Update Event'
                  ) : (
                    'Create Event'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
