/**
 * BookingSettings - Configuration panel for the user's booking page
 *
 * Allows configuring:
 * - Working hours per day
 * - Buffer time between meetings
 * - Available meeting durations
 * - Meeting title and description
 * - Booking page URL with copy button
 * - Toggle booking page on/off
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Link2,
  Type,
  AlignLeft,
  MapPin,
  Timer,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { DEFAULT_WORKING_HOURS, DEFAULT_BUFFER_MINUTES } from './useAvailability';

const DAYS_OF_WEEK = [
  { key: 1, label: 'Monday' },
  { key: 2, label: 'Tuesday' },
  { key: 3, label: 'Wednesday' },
  { key: 4, label: 'Thursday' },
  { key: 5, label: 'Friday' },
  { key: 6, label: 'Saturday' },
  { key: 0, label: 'Sunday' },
];

const ALL_DURATIONS = [15, 30, 45, 60];

const BUFFER_OPTIONS = [
  { value: 0, label: 'No buffer' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

const TIME_OPTIONS = [];
for (let h = 6; h <= 22; h++) {
  for (let m = 0; m < 60; m += 30) {
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    TIME_OPTIONS.push(time);
  }
}

export default function BookingSettings({ userId, username }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Settings state
  const [enabled, setEnabled] = useState(true);
  const [meetingTitle, setMeetingTitle] = useState('Book a Meeting');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [location, setLocation] = useState('Video call');
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [durations, setDurations] = useState([15, 30, 45, 60]);
  const [bufferMinutes, setBufferMinutes] = useState(DEFAULT_BUFFER_MINUTES);
  const [workingHours, setWorkingHours] = useState({ ...DEFAULT_WORKING_HOURS });

  const bookingUrl = `${window.location.origin}/book/${username || 'your-username'}`;

  // Load existing settings
  useEffect(() => {
    async function loadSettings() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('booking_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setEnabled(data.enabled ?? true);
          setMeetingTitle(data.meeting_title || 'Book a Meeting');
          setMeetingDescription(data.meeting_description || '');
          setLocation(data.location || 'Video call');
          setDefaultDuration(data.default_duration || 30);
          setDurations(data.durations || [15, 30, 45, 60]);
          setBufferMinutes(data.buffer_minutes ?? DEFAULT_BUFFER_MINUTES);
          if (data.working_hours) {
            setWorkingHours(data.working_hours);
          }
        }
      } catch (err) {
        console.error('[BookingSettings] Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [userId]);

  // Save settings
  const handleSave = useCallback(async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const settingsData = {
        user_id: userId,
        enabled,
        meeting_title: meetingTitle.trim(),
        meeting_description: meetingDescription.trim(),
        location: location.trim(),
        default_duration: defaultDuration,
        durations,
        buffer_minutes: bufferMinutes,
        working_hours: workingHours,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('booking_settings')
        .upsert(settingsData, { onConflict: 'user_id' });

      if (error) throw error;

      toast.success('Booking settings saved');
    } catch (err) {
      console.error('[BookingSettings] Failed to save:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [userId, enabled, meetingTitle, meetingDescription, location, defaultDuration, durations, bufferMinutes, workingHours]);

  // Toggle day on/off
  const toggleDay = (dayKey) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey] ? null : { start: '09:00', end: '17:00' },
    }));
  };

  // Update working hours for a day
  const updateDayHours = (dayKey, field, value) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  // Toggle duration
  const toggleDuration = (dur) => {
    setDurations((prev) => {
      if (prev.includes(dur)) {
        // Must keep at least one
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dur);
      }
      return [...prev, dur].sort((a, b) => a - b);
    });
  };

  // Copy booking URL
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Booking URL copied');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Booking Page</h2>
            <p className="text-xs text-zinc-500">
              Configure your personal booking page
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>

      {/* Enable/Disable toggle + URL */}
      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Booking page active</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {enabled
                ? 'People can book meetings with you'
                : 'Your booking page is disabled'}
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            {enabled ? (
              <ToggleRight className="w-10 h-10 text-cyan-400" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-zinc-600" />
            )}
          </button>
        </div>

        {/* URL */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
            <Link2 className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="text-sm text-zinc-300 truncate">{bookingUrl}</span>
          </div>
          <button
            onClick={handleCopyUrl}
            className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-cyan-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Meeting Details */}
      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Type className="w-4 h-4 text-cyan-400" />
          Meeting Details
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="Book a Meeting"
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              <AlignLeft className="w-3.5 h-3.5 inline mr-1" />
              Description (optional)
            </label>
            <textarea
              value={meetingDescription}
              onChange={(e) => setMeetingDescription(e.target.value)}
              placeholder="A brief intro to what this meeting is about..."
              rows={2}
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Video call, Phone, Office, etc."
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Duration Options */}
      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Timer className="w-4 h-4 text-cyan-400" />
          Duration Options
        </h3>

        <div className="flex flex-wrap gap-2">
          {ALL_DURATIONS.map((dur) => {
            const active = durations.includes(dur);
            return (
              <button
                key={dur}
                onClick={() => toggleDuration(dur)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all border
                  ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                  }
                `}
              >
                {dur} min
              </button>
            );
          })}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Default duration
          </label>
          <select
            value={defaultDuration}
            onChange={(e) => setDefaultDuration(Number(e.target.value))}
            className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white appearance-none focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
          >
            {durations.map((dur) => (
              <option key={dur} value={dur}>
                {dur} minutes
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Buffer Time */}
      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Buffer Time
        </h3>
        <p className="text-xs text-zinc-500">
          Add buffer time before and after meetings to prevent back-to-back bookings.
        </p>
        <div className="flex flex-wrap gap-2">
          {BUFFER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBufferMinutes(opt.value)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all border
                ${
                  bufferMinutes === opt.value
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          Working Hours
        </h3>
        <p className="text-xs text-zinc-500">
          Set the hours you are available for bookings.
        </p>

        <div className="space-y-2">
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const dayHours = workingHours[key];
            const isActive = dayHours !== null && dayHours !== undefined;

            return (
              <div
                key={key}
                className="flex items-center gap-3 py-2"
              >
                {/* Toggle */}
                <button
                  onClick={() => toggleDay(key)}
                  className={`w-8 h-5 rounded-full transition-colors relative shrink-0 ${
                    isActive ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>

                {/* Day label */}
                <span
                  className={`w-24 text-sm font-medium ${
                    isActive ? 'text-zinc-200' : 'text-zinc-600'
                  }`}
                >
                  {label}
                </span>

                {/* Time range */}
                {isActive ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={dayHours.start}
                      onChange={(e) =>
                        updateDayHours(key, 'start', e.target.value)
                      }
                      className="px-2 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 appearance-none focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <span className="text-zinc-600 text-xs">to</span>
                    <select
                      value={dayHours.end}
                      onChange={(e) =>
                        updateDayHours(key, 'end', e.target.value)
                      }
                      className="px-2 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 appearance-none focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-600">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
