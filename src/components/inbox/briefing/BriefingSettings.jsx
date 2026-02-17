/**
 * BriefingSettings - Configuration panel for Sync Morning Briefing
 *
 * Allows users to set briefing time, toggle sections, enable auto-generation,
 * and choose notification preferences.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Clock, Calendar, MessageSquare,
  CheckSquare, Sparkles, Users, Bell,
  BellRing, Mail, Monitor,
} from 'lucide-react';

const SECTION_TOGGLES = [
  { key: 'schedule', label: 'Schedule', icon: Calendar, description: "Today's meetings and events" },
  { key: 'messages', label: 'Priority Messages', icon: MessageSquare, description: 'Urgent unread messages' },
  { key: 'tasks', label: 'Tasks Due', icon: CheckSquare, description: 'Tasks due today' },
  { key: 'insights', label: 'Sync Insights', icon: Sparkles, description: 'AI-generated observations' },
  { key: 'preMeeting', label: 'Pre-Meeting Context', icon: Users, description: 'Attendee insights and open items' },
];

const NOTIFICATION_OPTIONS = [
  { value: 'in-app', label: 'In-App', icon: Monitor },
  { value: 'push', label: 'Push', icon: BellRing },
  { value: 'email', label: 'Email', icon: Mail },
];

export default function BriefingSettings({ preferences, onSave }) {
  const [localPrefs, setLocalPrefs] = useState({
    time: preferences?.time || '08:00',
    sections: {
      schedule: true,
      messages: true,
      tasks: true,
      insights: true,
      preMeeting: true,
      ...preferences?.sections,
    },
    autoGenerate: preferences?.autoGenerate || false,
    notification: preferences?.notification || 'in-app',
  });

  const handleSectionToggle = (key) => {
    setLocalPrefs((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [key]: !prev.sections[key],
      },
    }));
  };

  const handleSave = () => {
    onSave?.(localPrefs);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/60">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <Settings className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Briefing Settings</h3>
          <p className="text-[11px] text-zinc-500">Customize your morning briefing</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Briefing Time */}
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5" />
            Briefing Time
          </label>
          <input
            type="time"
            value={localPrefs.time}
            onChange={(e) => setLocalPrefs((prev) => ({ ...prev, time: e.target.value }))}
            className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-colors"
          />
        </div>

        {/* Section Toggles */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
            Sections
          </label>
          <div className="space-y-1">
            {SECTION_TOGGLES.map((section) => {
              const Icon = section.icon;
              const enabled = localPrefs.sections[section.key];

              return (
                <button
                  key={section.key}
                  onClick={() => handleSectionToggle(section.key)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/[0.03]"
                >
                  <Icon className={`w-4 h-4 ${enabled ? 'text-cyan-400' : 'text-zinc-600'}`} />
                  <div className="flex-1 text-left">
                    <div className={`text-sm ${enabled ? 'text-zinc-200' : 'text-zinc-500'}`}>
                      {section.label}
                    </div>
                    <div className="text-[10px] text-zinc-600">{section.description}</div>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      enabled ? 'bg-cyan-500' : 'bg-zinc-700'
                    }`}
                  >
                    <motion.div
                      animate={{ x: enabled ? 18 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto-Generate Toggle */}
        <div>
          <button
            onClick={() => setLocalPrefs((prev) => ({ ...prev, autoGenerate: !prev.autoGenerate }))}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40 transition-colors hover:bg-zinc-800/60"
          >
            <div className="flex items-center gap-3">
              <Sparkles className={`w-4 h-4 ${localPrefs.autoGenerate ? 'text-cyan-400' : 'text-zinc-600'}`} />
              <div className="text-left">
                <div className="text-sm text-zinc-200">Auto-generate daily</div>
                <div className="text-[10px] text-zinc-500">Briefing generated at {localPrefs.time} every day</div>
              </div>
            </div>
            <div
              className={`w-9 h-5 rounded-full transition-colors relative ${
                localPrefs.autoGenerate ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
            >
              <motion.div
                animate={{ x: localPrefs.autoGenerate ? 18 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm"
              />
            </div>
          </button>
        </div>

        {/* Notification Preference */}
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <Bell className="w-3.5 h-3.5" />
            Notification
          </label>
          <div className="flex gap-2">
            {NOTIFICATION_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = localPrefs.notification === opt.value;

              return (
                <button
                  key={opt.value}
                  onClick={() => setLocalPrefs((prev) => ({ ...prev, notification: opt.value }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    active
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold transition-colors"
        >
          Save Preferences
        </button>
      </div>
    </motion.div>
  );
}
