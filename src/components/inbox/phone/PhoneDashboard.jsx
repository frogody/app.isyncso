import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, MessageSquare, VoicemailIcon, ArrowDownLeft, ArrowUpRight,
  Clock, Loader2, PhoneOff, PhoneIncoming, PhoneOutgoing,
  ChevronRight, Play, RefreshCw, Settings, Users as UsersIcon,
  BarChart3, Send, Mic, MicOff, PhoneCall, X, Sparkles, Hash,
  Delete, Bot
} from 'lucide-react';
import PhoneSettings from './PhoneSettings';
import PhoneContactManager from './PhoneContactManager';

const TAB_ITEMS = [
  { id: 'dialer', label: 'Dialer', icon: Hash },
  { id: 'calls', label: 'Recent Calls', icon: Phone },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'voicemail', label: 'Voicemail', icon: VoicemailIcon },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'contacts', label: 'Contacts', icon: UsersIcon },
];

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDurationShort(seconds) {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTimestamp(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffHrs = diffMs / (1000 * 60 * 60);

  if (diffHrs < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return mins < 1 ? 'Just now' : `${mins}m ago`;
  }
  if (diffHrs < 24) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPhoneDisplay(number) {
  if (!number) return '';
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return number;
}

// ─── Phone Provision Card ─────────────────────────────────────────────────────

function PhoneProvisionCard({ onProvision, provisioning }) {
  const [areaCode, setAreaCode] = useState('');

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
          <Phone className="w-10 h-10 text-cyan-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Set Up Sync Phone</h2>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Get a dedicated phone number for Sync. It will answer calls, take messages,
          schedule meetings, and handle SMS on your behalf.
        </p>

        <div className="flex items-center gap-3 max-w-xs mx-auto mb-4">
          <input
            type="text"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="Area code (optional)"
            className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-700/50 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 text-center"
            maxLength={3}
          />
        </div>

        <button
          onClick={() => onProvision(areaCode || undefined)}
          disabled={provisioning}
          className="px-6 py-3 bg-cyan-600/80 hover:bg-cyan-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2 mx-auto"
        >
          {provisioning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Provisioning...
            </>
          ) : (
            <>
              <Phone className="w-4 h-4" />
              Get Phone Number
            </>
          )}
        </button>

        <p className="text-[11px] text-zinc-600 mt-4">
          $2.00/month per number. Cancel anytime.
        </p>
      </motion.div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ callHistory, smsHistory, phoneNumber, isDeviceReady }) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const callsToday = callHistory.filter(
    (c) => new Date(c.started_at || c.created_at) >= todayStart
  ).length;

  const smsToday = smsHistory.filter(
    (s) => new Date(s.last_message_at || s.created_at) >= todayStart
  ).length;

  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800/60 bg-zinc-900/50">
      <div className="flex items-center gap-2">
        <Phone className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs text-zinc-400">
          <span className="text-white font-medium">{callsToday}</span> calls today
        </span>
      </div>
      <div className="w-px h-4 bg-zinc-800" />
      <div className="flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs text-zinc-400">
          <span className="text-white font-medium">{smsToday}</span> SMS today
        </span>
      </div>
      <div className="w-px h-4 bg-zinc-800" />
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isDeviceReady ? 'bg-cyan-400 animate-pulse' : phoneNumber?.status === 'active' ? 'bg-zinc-500' : 'bg-zinc-600'}`} />
        <span className="text-xs text-zinc-400">
          {isDeviceReady ? 'Ready' : phoneNumber?.status === 'active' ? 'Connecting...' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}

// ─── Dialer ──────────────────────────────────────────────────────────────────

const DIALPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

const DIALPAD_SUB = {
  '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL',
  '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ',
  '0': '+',
};

function Dialer({ makeCall, callSync, isDeviceReady, phoneNumber, callHistory }) {
  const [dialNumber, setDialNumber] = useState('');

  const handleKeyPress = useCallback((key) => {
    setDialNumber(prev => prev + key);
  }, []);

  const handleBackspace = useCallback(() => {
    setDialNumber(prev => prev.slice(0, -1));
  }, []);

  const handleDial = useCallback(() => {
    if (!dialNumber.trim()) return;
    let number = dialNumber.trim();
    // Convert international 00 prefix to +
    if (number.startsWith('00') && number.length > 6) {
      number = '+' + number.slice(2);
    }
    // Assume US for bare 10-digit numbers
    if (!number.startsWith('+') && /^\d{10}$/.test(number)) {
      number = '+1' + number;
    }
    // Ensure + prefix for any remaining all-digit international numbers
    if (!number.startsWith('+') && /^\d{11,}$/.test(number)) {
      number = '+' + number;
    }
    makeCall(number);
  }, [dialNumber, makeCall]);

  // Recent numbers for quick dial
  const recentNumbers = useMemo(() => {
    const seen = new Set();
    return callHistory
      .filter(c => {
        const num = c.direction === 'outbound' ? c.callee_number : c.caller_number;
        if (!num || num === 'sync-ai' || seen.has(num)) return false;
        seen.add(num);
        return true;
      })
      .slice(0, 4)
      .map(c => ({
        number: c.direction === 'outbound' ? c.callee_number : c.caller_number,
        name: c.caller_name || null,
        direction: c.direction,
      }));
  }, [callHistory]);

  return (
    <div className="flex flex-col items-center py-6 px-4 max-w-sm mx-auto">
      {/* Number display — editable input for keyboard typing */}
      <div className="w-full mb-6">
        <div className="text-center min-h-[48px] flex items-center justify-center">
          <input
            type="tel"
            value={dialNumber}
            onChange={(e) => setDialNumber(e.target.value.replace(/[^0-9+*#]/g, ''))}
            placeholder="Enter number"
            className={`bg-transparent text-center w-full font-mono tracking-wider outline-none placeholder-zinc-600 ${
              dialNumber.length > 12 ? 'text-lg' : dialNumber.length > 0 ? 'text-2xl' : 'text-lg'
            } ${dialNumber ? 'text-white' : 'text-zinc-600'}`}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDial(); }}
          />
        </div>
        {phoneNumber?.phone_number && (
          <p className="text-center text-[10px] text-zinc-600 mt-1">
            Calling from {formatPhoneDisplay(phoneNumber.phone_number)}
          </p>
        )}
      </div>

      {/* Dialpad */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {DIALPAD_KEYS.map((row) =>
          row.map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="w-16 h-16 rounded-2xl bg-zinc-800/60 hover:bg-zinc-700/60 active:bg-zinc-600/60 transition-all flex flex-col items-center justify-center"
            >
              <span className="text-xl font-medium text-white">{key}</span>
              {DIALPAD_SUB[key] && (
                <span className="text-[9px] text-zinc-500 tracking-widest mt-0.5">{DIALPAD_SUB[key]}</span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4 mb-8">
        {/* Backspace */}
        <button
          onClick={handleBackspace}
          disabled={!dialNumber}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
        >
          <Delete className="w-5 h-5" />
        </button>

        {/* Dial button */}
        <button
          onClick={handleDial}
          disabled={!isDeviceReady || !dialNumber.trim()}
          className="w-16 h-16 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all shadow-lg shadow-cyan-600/20 hover:shadow-cyan-500/30 disabled:shadow-none"
        >
          <Phone className="w-6 h-6" />
        </button>

        {/* Call Sync */}
        <button
          onClick={callSync}
          disabled={!isDeviceReady}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:border-cyan-400/50 disabled:opacity-30 transition-all"
          title="Call Sync AI"
        >
          <Bot className="w-5 h-5" />
        </button>
      </div>

      {/* Quick dial: recent numbers */}
      {recentNumbers.length > 0 && (
        <div className="w-full">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2 px-1">Recent</p>
          <div className="space-y-1">
            {recentNumbers.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  setDialNumber(r.number.replace('+1', ''));
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-800/40 transition-colors text-left"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  r.direction === 'inbound' ? 'bg-cyan-500/10' : 'bg-blue-500/10'
                }`}>
                  {r.direction === 'inbound' ? (
                    <PhoneIncoming className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <PhoneOutgoing className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-zinc-300 truncate block">{r.name || formatPhoneDisplay(r.number)}</span>
                  {r.name && <span className="text-[10px] text-zinc-600">{formatPhoneDisplay(r.number)}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Active Call Overlay ─────────────────────────────────────────────────────

function ActiveCallOverlay({ callStatus, callDuration, isMuted, toggleMute, hangupCall, activeCall, incomingCall }) {
  // Determine display info
  const isIncoming = !!incomingCall && callStatus === 'ringing';
  const callParams = activeCall?.parameters || activeCall?.customParameters || {};
  const incomingFrom = incomingCall?.parameters?.From || incomingCall?.parameters?.from || 'Unknown';

  let displayNumber = 'Unknown';
  let statusLabel = 'Connecting...';

  if (isIncoming) {
    displayNumber = incomingFrom;
    statusLabel = 'Incoming Call';
  } else if (activeCall) {
    displayNumber = callParams.To || callParams.to || 'Unknown';
    if (displayNumber === 'sync-ai') displayNumber = 'Sync AI';
  }

  if (callStatus === 'connecting') statusLabel = 'Connecting...';
  else if (callStatus === 'ringing') statusLabel = isIncoming ? 'Incoming Call' : 'Ringing...';
  else if (callStatus === 'connected') statusLabel = formatDuration(callDuration);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[380px]"
    >
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/50 p-5">
        {/* Call info */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3">
            {callStatus === 'connected' ? (
              <PhoneCall className="w-6 h-6 text-cyan-400" />
            ) : isIncoming ? (
              <PhoneIncoming className="w-6 h-6 text-cyan-400 animate-pulse" />
            ) : (
              <Phone className="w-6 h-6 text-cyan-400 animate-pulse" />
            )}
          </div>
          <p className="text-lg font-medium text-white">
            {displayNumber === 'Sync AI' ? 'Sync AI' : formatPhoneDisplay(displayNumber)}
          </p>
          <p className={`text-sm mt-1 ${
            callStatus === 'connected' ? 'text-cyan-400 font-mono' : 'text-zinc-400'
          }`}>
            {statusLabel}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <button
            onClick={toggleMute}
            disabled={callStatus !== 'connected'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                : 'bg-zinc-800 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
            } disabled:opacity-30`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Hang up */}
          <button
            onClick={hangupCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-red-600/30"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Incoming Call Banner ────────────────────────────────────────────────────

function IncomingCallBanner({ incomingCall, acceptCall, rejectCall }) {
  const callerNumber = incomingCall?.parameters?.From || 'Unknown';

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-r from-cyan-900/90 to-blue-900/90 backdrop-blur-xl border-b border-cyan-500/30 px-5 py-4"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center animate-pulse">
          <PhoneIncoming className="w-5 h-5 text-cyan-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Incoming Call</p>
          <p className="text-xs text-cyan-300/70">{formatPhoneDisplay(callerNumber)}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={rejectCall}
            className="w-10 h-10 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
            title="Decline"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
          <button
            onClick={acceptCall}
            className="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors"
            title="Answer"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Calls List ─────────────────────────────────────────────────────────────

function CallsList({ calls, loading, makeCall }) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Phone className="w-10 h-10 text-zinc-800 mb-3" />
        <p className="text-sm text-zinc-500">No calls yet</p>
        <p className="text-xs text-zinc-600 mt-1">Use the Dialer tab to make your first call</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800/60">
      <AnimatePresence>
        {calls.map((call, i) => {
          const isInbound = call.direction === 'inbound';
          const expanded = expandedId === call.id;
          const displayNumber = isInbound ? call.caller_number : call.callee_number;

          return (
            <motion.div
              key={call.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="hover:bg-zinc-800/20 transition-colors cursor-pointer"
              onClick={() => setExpandedId(expanded ? null : call.id)}
            >
              <div className="px-5 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  call.status === 'missed' || call.status === 'no-answer'
                    ? 'bg-red-500/10 text-red-400'
                    : isInbound
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {call.status === 'missed' || call.status === 'no-answer' ? (
                    <PhoneOff className="w-4 h-4" />
                  ) : isInbound ? (
                    <PhoneIncoming className="w-4 h-4" />
                  ) : (
                    <PhoneOutgoing className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200 truncate">
                      {call.caller_name || (displayNumber === 'sync-ai' ? 'Sync AI' : formatPhoneDisplay(displayNumber) || 'Unknown')}
                    </span>
                    {isInbound ? (
                      <ArrowDownLeft className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      call.status === 'completed' ? 'bg-cyan-500/10 text-cyan-400' :
                      call.status === 'missed' || call.status === 'no-answer' ? 'bg-red-500/10 text-red-400' :
                      call.status === 'voicemail' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-zinc-800 text-zinc-500'
                    }`}>
                      {call.status || 'unknown'}
                    </span>
                    {call.duration_seconds > 0 && (
                      <span className="text-[10px] text-zinc-600">{formatDurationShort(call.duration_seconds)}</span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{formatTimestamp(call.started_at || call.created_at)}</span>
                  {displayNumber && displayNumber !== 'sync-ai' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        makeCall(displayNumber);
                      }}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      title="Call back"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-3 pl-16 space-y-2">
                      {call.sync_summary && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Summary</p>
                          <p className="text-xs text-zinc-400 leading-relaxed">{call.sync_summary}</p>
                        </div>
                      )}
                      {call.transcript && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Transcript</p>
                          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">{call.transcript}</p>
                        </div>
                      )}
                      {call.recording_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(call.recording_url, '_blank');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-lg text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Play Recording
                        </button>
                      )}
                      {!call.transcript && !call.recording_url && !call.sync_summary && (
                        <p className="text-xs text-zinc-600 italic">No additional details</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── SMS List ───────────────────────────────────────────────────────────────

function SMSList({ conversations, loading }) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <MessageSquare className="w-10 h-10 text-zinc-800 mb-3" />
        <p className="text-sm text-zinc-500">No SMS conversations</p>
        <p className="text-xs text-zinc-600 mt-1">Messages will appear here when your Sync number is active</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800/60">
      <AnimatePresence>
        {conversations.map((conv, i) => {
          const lastMsg = conv.messages?.[conv.messages.length - 1];
          const expanded = expandedId === conv.id;

          return (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="hover:bg-zinc-800/20 transition-colors cursor-pointer"
              onClick={() => setExpandedId(expanded ? null : conv.id)}
            >
              <div className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-zinc-200 truncate block">
                    {conv.phone_number || 'Unknown'}
                  </span>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {lastMsg?.content || 'No messages'}
                  </p>
                </div>

                <div className="text-right flex-shrink-0 space-y-1">
                  <span className="text-xs text-zinc-500 block">
                    {formatTimestamp(conv.last_message_at || conv.created_at)}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    conv.status === 'responded' || conv.status === 'interested' ? 'bg-cyan-500/10 text-cyan-400' :
                    conv.status === 'declined' ? 'bg-red-500/10 text-red-400' :
                    conv.status === 'opted_out' ? 'bg-zinc-800 text-zinc-500' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    {conv.status || 'sent'}
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {expanded && conv.messages?.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-3 pl-16 space-y-2 max-h-48 overflow-y-auto">
                      {conv.messages.map((msg, mi) => (
                        <div
                          key={mi}
                          className={`text-xs px-3 py-2 rounded-xl max-w-[80%] ${
                            msg.role === 'assistant'
                              ? 'bg-cyan-500/10 text-cyan-300 ml-auto'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {msg.content}
                          <span className="block text-[9px] text-zinc-600 mt-1">
                            {msg.timestamp ? formatTimestamp(msg.timestamp) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── Voicemail List ─────────────────────────────────────────────────────────

function VoicemailList({ calls }) {
  const voicemails = useMemo(
    () => calls.filter((c) => c.voicemail_url || c.status === 'voicemail'),
    [calls]
  );

  if (voicemails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <VoicemailIcon className="w-10 h-10 text-zinc-800 mb-3" />
        <p className="text-sm text-zinc-500">No voicemails</p>
        <p className="text-xs text-zinc-600 mt-1">Voicemails will be transcribed and shown here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800/60">
      {voicemails.map((vm, i) => (
        <motion.div
          key={vm.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.02 }}
          className="px-5 py-3 hover:bg-zinc-800/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <VoicemailIcon className="w-4 h-4 text-blue-400" />
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-zinc-200 truncate block">
                {vm.caller_number || 'Unknown'}
              </span>
              <p className="text-xs text-zinc-500 truncate mt-0.5">
                {vm.transcript || 'Voicemail - no transcript available'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {vm.duration_seconds > 0 && (
                <span className="text-xs text-zinc-500">{formatDurationShort(vm.duration_seconds)}</span>
              )}
              {vm.voicemail_url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(vm.voicemail_url, '_blank');
                  }}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  title="Play voicemail"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <span className="text-[10px] text-zinc-600 ml-11 block mt-1">
            {formatTimestamp(vm.started_at)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function PhoneDashboard({
  phoneNumber,
  loading,
  provisioning,
  callHistory,
  smsHistory,
  callsLoading,
  smsLoading,
  requestPhoneNumber,
  updateSettings,
  refetch,
  // Calling props
  isDeviceReady,
  callStatus,
  isMuted,
  callDuration,
  incomingCall,
  activeCall,
  makeCall,
  callSync,
  acceptCall,
  rejectCall,
  hangupCall,
  toggleMute,
}) {
  const [activeTab, setActiveTab] = useState('dialer');

  // If no phone number, show provisioning card
  if (!loading && !phoneNumber) {
    return <PhoneProvisionCard onProvision={requestPhoneNumber} provisioning={provisioning} />;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const isInCall = callStatus !== 'idle';

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Incoming call banner */}
      <AnimatePresence>
        {incomingCall && callStatus === 'ringing' && !activeCall && (
          <IncomingCallBanner
            incomingCall={incomingCall}
            acceptCall={acceptCall}
            rejectCall={rejectCall}
          />
        )}
      </AnimatePresence>

      {/* Stats Bar */}
      <StatsBar callHistory={callHistory} smsHistory={smsHistory} phoneNumber={phoneNumber} isDeviceReady={isDeviceReady} />

      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-800/60 bg-zinc-900/30 px-4 overflow-x-auto">
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'text-cyan-400 border-cyan-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}

        <div className="ml-auto">
          <button
            onClick={refetch}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className={activeTab === 'settings' || activeTab === 'contacts' ? 'p-6 max-w-2xl' : ''}
          >
            {activeTab === 'dialer' && (
              <Dialer
                makeCall={makeCall}
                callSync={callSync}
                isDeviceReady={isDeviceReady}
                phoneNumber={phoneNumber}
                callHistory={callHistory}
              />
            )}
            {activeTab === 'calls' && (
              <CallsList calls={callHistory} loading={callsLoading} makeCall={makeCall} />
            )}
            {activeTab === 'sms' && (
              <SMSList conversations={smsHistory} loading={smsLoading} />
            )}
            {activeTab === 'voicemail' && (
              <VoicemailList calls={callHistory} />
            )}
            {activeTab === 'settings' && (
              <PhoneSettings phoneNumber={phoneNumber} onSave={updateSettings} />
            )}
            {activeTab === 'contacts' && (
              <PhoneContactManager phoneNumber={phoneNumber} onSave={updateSettings} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Active call overlay */}
      <AnimatePresence>
        {isInCall && (
          <ActiveCallOverlay
            callStatus={callStatus}
            callDuration={callDuration}
            isMuted={isMuted}
            toggleMute={toggleMute}
            hangupCall={hangupCall}
            activeCall={activeCall}
            incomingCall={incomingCall}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
