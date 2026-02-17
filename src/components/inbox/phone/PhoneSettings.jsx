import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Phone, Copy, Check, Save, Loader2,
  PhoneForwarded, Clock, VoicemailIcon, ToggleLeft, ToggleRight,
  Settings2, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

export default function PhoneSettings({ phoneNumber, onSave }) {
  const metadata = phoneNumber?.metadata || {};

  const [greeting, setGreeting] = useState(metadata.greeting || '');
  const [autoAnswer, setAutoAnswer] = useState(metadata.auto_answer ?? false);
  const [forwardNumber, setForwardNumber] = useState(metadata.forward_number || '');
  const [businessHoursStart, setBusinessHoursStart] = useState(metadata.business_hours_start || '09:00');
  const [businessHoursEnd, setBusinessHoursEnd] = useState(metadata.business_hours_end || '17:00');
  const [afterHoursBehavior, setAfterHoursBehavior] = useState(metadata.after_hours || 'voicemail');
  const [voicemailGreeting, setVoicemailGreeting] = useState(metadata.voicemail_greeting || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (phoneNumber?.metadata) {
      const m = phoneNumber.metadata;
      setGreeting(m.greeting || '');
      setAutoAnswer(m.auto_answer ?? false);
      setForwardNumber(m.forward_number || '');
      setBusinessHoursStart(m.business_hours_start || '09:00');
      setBusinessHoursEnd(m.business_hours_end || '17:00');
      setAfterHoursBehavior(m.after_hours || 'voicemail');
      setVoicemailGreeting(m.voicemail_greeting || '');
    }
  }, [phoneNumber?.metadata]);

  const handleCopy = () => {
    if (!phoneNumber?.phone_number) return;
    navigator.clipboard.writeText(phoneNumber.phone_number);
    setCopied(true);
    toast.success('Number copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    const newMetadata = {
      ...metadata,
      greeting,
      auto_answer: autoAnswer,
      forward_number: forwardNumber,
      business_hours_start: businessHoursStart,
      business_hours_end: businessHoursEnd,
      after_hours: afterHoursBehavior,
      voicemail_greeting: voicemailGreeting,
    };

    const success = await onSave(newMetadata);
    if (success) {
      toast.success('Phone settings saved');
    }
    setSaving(false);
  };

  if (!phoneNumber) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Phone Number Display */}
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Phone className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">Your Sync Number</h3>
            <p className="text-xs text-zinc-500">This is the number Sync uses for calls and SMS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono font-bold text-white tracking-wider">
            {phoneNumber.phone_number}
          </span>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Copy number"
          >
            {copied ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {phoneNumber.friendly_name && (
          <p className="text-xs text-zinc-500 mt-2">{phoneNumber.friendly_name}</p>
        )}

        <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
          <span className={`px-2 py-0.5 rounded-full ${
            phoneNumber.status === 'active'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
          }`}>
            {phoneNumber.status || 'active'}
          </span>
          {phoneNumber.capabilities?.sms && <span>SMS</span>}
          {phoneNumber.capabilities?.voice && <span>Voice</span>}
          {phoneNumber.capabilities?.mms && <span>MMS</span>}
        </div>
      </div>

      {/* Greeting Message */}
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Greeting Message</h3>
        </div>
        <p className="text-xs text-zinc-500 mb-3">What Sync says when answering calls on your behalf</p>
        <textarea
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="Hello, you've reached the office of [your name]. How can I help you today?"
          className="w-full h-24 px-4 py-3 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-cyan-500/40 transition-colors"
        />
      </div>

      {/* Call Handling Rules */}
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Call Handling</h3>
        </div>

        <div className="space-y-5">
          {/* Auto-answer toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">Auto-answer calls</p>
              <p className="text-xs text-zinc-500">Sync picks up automatically when someone calls</p>
            </div>
            <button
              onClick={() => setAutoAnswer(!autoAnswer)}
              className="text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              {autoAnswer ? (
                <ToggleRight className="w-8 h-8 text-cyan-400" />
              ) : (
                <ToggleLeft className="w-8 h-8" />
              )}
            </button>
          </div>

          {/* Forward to personal number */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PhoneForwarded className="w-4 h-4 text-zinc-500" />
              <p className="text-sm text-zinc-300">Forward to personal number</p>
            </div>
            <input
              type="tel"
              value={forwardNumber}
              onChange={(e) => setForwardNumber(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
            />
          </div>

          {/* Business Hours */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <p className="text-sm text-zinc-300">Business Hours</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={businessHoursStart}
                onChange={(e) => setBusinessHoursStart(e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/40 transition-colors"
              />
              <span className="text-zinc-500 text-sm">to</span>
              <input
                type="time"
                value={businessHoursEnd}
                onChange={(e) => setBusinessHoursEnd(e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/40 transition-colors"
              />
            </div>
          </div>

          {/* After-hours behavior */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <VoicemailIcon className="w-4 h-4 text-zinc-500" />
              <p className="text-sm text-zinc-300">After-hours behavior</p>
            </div>
            <div className="flex gap-2">
              {[
                { id: 'voicemail', label: 'Voicemail' },
                { id: 'forward', label: 'Forward' },
                { id: 'reject', label: 'Reject' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAfterHoursBehavior(opt.id)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    afterHoursBehavior === opt.id
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Voicemail Greeting */}
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-6">
        <div className="flex items-center gap-2 mb-3">
          <VoicemailIcon className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Voicemail Greeting</h3>
        </div>
        <textarea
          value={voicemailGreeting}
          onChange={(e) => setVoicemailGreeting(e.target.value)}
          placeholder="Please leave a message after the tone and I'll get back to you as soon as possible."
          className="w-full h-20 px-4 py-3 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-cyan-500/40 transition-colors"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-cyan-600/80 hover:bg-cyan-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Settings
          </>
        )}
      </button>
    </motion.div>
  );
}
