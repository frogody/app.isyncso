/**
 * BookingConfirmation - Confirmation form after slot selection
 *
 * Collects booker's name, email, and optional notes.
 * On submit, creates a calendar_events entry and shows success state.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

// Format date for display: "Monday, February 17, 2026"
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

// Format time for display: "09:00 - 09:30"
function formatTimeRange(start, end) {
  const fmt = (d) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(start)} - ${fmt(end)}`;
}

// Generate Google Calendar add link
function googleCalendarUrl(title, start, end, description, location) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description || '',
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate .ics file content
function generateICS(title, start, end, description, location) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//iSyncSO//Booking//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${location || ''}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export default function BookingConfirmation({
  slot,
  duration,
  hostUser,
  onBack,
  onSuccess,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [booked, setBooked] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!slot) return null;

  const meetingTitle = `Meeting with ${hostUser?.full_name || 'Host'}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Create the calendar event
      const eventData = {
        company_id: hostUser?.company_id,
        created_by: hostUser?.id,
        title: meetingTitle,
        description: notes.trim()
          ? `Booked by ${name.trim()} (${email.trim()})\n\nNotes: ${notes.trim()}`
          : `Booked by ${name.trim()} (${email.trim()})`,
        event_type: 'meeting',
        start_time: slot.start.toISOString(),
        end_time: slot.end.toISOString(),
        all_day: false,
        color: '#06b6d4', // cyan
        status: 'confirmed',
        metadata: {
          booking: true,
          booker_name: name.trim(),
          booker_email: email.trim(),
          booker_notes: notes.trim() || null,
          duration,
        },
      };

      const { data: newEvent, error: insertError } = await supabase
        .from('calendar_events')
        .insert(eventData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Add the booker as an attendee
      await supabase.from('calendar_attendees').insert({
        event_id: newEvent.id,
        email: email.trim(),
        name: name.trim(),
        response_status: 'accepted',
        is_organizer: false,
      });

      setCreatedEvent(newEvent);
      setBooked(true);
      onSuccess?.(newEvent);
    } catch (err) {
      console.error('[BookingConfirmation] Failed to create event:', err);
      setError('Failed to book the meeting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyDetails = () => {
    const details = `${meetingTitle}\n${formatDate(slot.start)}\n${formatTimeRange(slot.start, slot.end)}`;
    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadICS = () => {
    const ics = generateICS(
      meetingTitle,
      slot.start,
      slot.end,
      notes.trim() ? `Notes: ${notes.trim()}` : '',
      ''
    );
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meeting.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Success state
  if (booked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Success header */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto"
          >
            <CheckCircle2 className="w-8 h-8 text-cyan-400" />
          </motion.div>
          <h3 className="text-xl font-semibold text-white">Meeting Confirmed</h3>
          <p className="text-sm text-zinc-400">
            A calendar invitation has been created.
          </p>
        </div>

        {/* Event details card */}
        <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-white">{meetingTitle}</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{formatDate(slot.start)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                {formatTimeRange(slot.start, slot.end)} ({duration} min)
              </span>
            </div>
            {notes.trim() && (
              <div className="flex items-start gap-2 text-sm text-zinc-300">
                <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span className="text-zinc-400">{notes.trim()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Calendar add links */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Add to your calendar
          </p>
          <div className="flex flex-col gap-2">
            <a
              href={googleCalendarUrl(meetingTitle, slot.start, slot.end, notes, '')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Google Calendar
            </a>
            <button
              onClick={handleDownloadICS}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Download .ics file
            </button>
            <button
              onClick={handleCopyDetails}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-cyan-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy details
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Booking form
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      {/* Back button + selected time summary */}
      <div className="space-y-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to time slots
        </button>

        <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-medium">{formatDate(slot.start)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {formatTimeRange(slot.start, slot.end)} ({duration} min)
            </span>
          </div>
        </div>
      </div>

      {/* Booking form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            <User className="w-3.5 h-3.5 inline mr-1" />
            Your name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            <Mail className="w-3.5 h-3.5 inline mr-1" />
            Email address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            required
            className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share anything that will help prepare for the meeting..."
            rows={3}
            className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!name.trim() || !email.trim() || submitting}
          className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Booking...
            </>
          ) : (
            'Confirm Booking'
          )}
        </button>
      </form>
    </motion.div>
  );
}
