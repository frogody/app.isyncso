/**
 * ActionsPhonePanel — compact phone integration designed for the Actions page.
 * Split layout: compact dialer left, activity feed right.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, MessageSquare, VoicemailIcon, ArrowDownLeft, ArrowUpRight,
  PhoneOff, PhoneIncoming, PhoneOutgoing, Play, RefreshCw,
  Settings, Users as UsersIcon, Loader2, Mic, MicOff, PhoneCall,
  Delete, Bot, Hash, Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSyncPhone } from '@/components/inbox/phone';
import PhoneSettings from '@/components/inbox/phone/PhoneSettings';
import PhoneContactManager from '@/components/inbox/phone/PhoneContactManager';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDurationShort(seconds) {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  if (diffHrs < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPhoneDisplay(number) {
  if (!number) return '';
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1'))
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  if (cleaned.length === 10)
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  return number;
}

// ─── Dialpad Keys ────────────────────────────────────────────────────────────

const DIALPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];
const DIALPAD_SUB = {
  '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL',
  '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ', '0': '+',
};

// ─── Compact Dialer ──────────────────────────────────────────────────────────

function CompactDialer({ makeCall, callSync, isDeviceReady, phoneNumber }) {
  const [dialNumber, setDialNumber] = useState('');

  const handleKeyPress = useCallback((key) => {
    setDialNumber(prev => prev + key);
  }, []);

  const handleDial = useCallback(() => {
    if (!dialNumber.trim()) return;
    let number = dialNumber.trim();
    if (number.startsWith('00') && number.length > 6) number = '+' + number.slice(2);
    if (!number.startsWith('+') && /^\d{10}$/.test(number)) number = '+1' + number;
    if (!number.startsWith('+') && /^\d{11,}$/.test(number)) number = '+' + number;
    makeCall(number);
  }, [dialNumber, makeCall]);

  return (
    <div className="flex flex-col items-center">
      {/* Number input */}
      <div className="w-full mb-3">
        <input
          type="tel"
          value={dialNumber}
          onChange={(e) => setDialNumber(e.target.value.replace(/[^0-9+*#]/g, ''))}
          placeholder="Enter number"
          className={`bg-transparent text-center w-full font-mono tracking-wider outline-none placeholder-zinc-600 ${
            dialNumber.length > 12 ? 'text-base' : dialNumber.length > 0 ? 'text-xl' : 'text-base'
          } ${dialNumber ? 'text-white' : 'text-zinc-600'}`}
          onKeyDown={(e) => { if (e.key === 'Enter') handleDial(); }}
        />
        {phoneNumber?.phone_number && (
          <p className="text-center text-[9px] text-zinc-600 mt-0.5">
            From {formatPhoneDisplay(phoneNumber.phone_number)}
          </p>
        )}
      </div>

      {/* Compact Dialpad */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {DIALPAD_KEYS.map((row) =>
          row.map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="w-12 h-12 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 active:bg-zinc-600/60 transition-all flex flex-col items-center justify-center"
            >
              <span className="text-base font-medium text-white leading-none">{key}</span>
              {DIALPAD_SUB[key] && (
                <span className="text-[7px] text-zinc-500 tracking-widest mt-0.5">{DIALPAD_SUB[key]}</span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setDialNumber(prev => prev.slice(0, -1))}
          disabled={!dialNumber}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 disabled:opacity-20 transition-colors"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          onClick={handleDial}
          disabled={!isDeviceReady || !dialNumber.trim()}
          className="w-14 h-14 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all shadow-lg shadow-cyan-600/20 hover:shadow-cyan-500/30 disabled:shadow-none"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button
          onClick={callSync}
          disabled={!isDeviceReady}
          className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:border-cyan-400/50 disabled:opacity-20 transition-all"
          title="Call Sync AI"
        >
          <Bot className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Activity Feed (calls + sms combined) ────────────────────────────────────

const RIGHT_TABS = [
  { id: 'calls', label: 'Calls', icon: Phone },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'voicemail', label: 'Voicemail', icon: VoicemailIcon },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'contacts', label: 'Contacts', icon: UsersIcon },
];

function CallRow({ call, makeCall }) {
  const isInbound = call.direction === 'inbound';
  const displayNumber = isInbound ? call.caller_number : call.callee_number;
  const isMissed = call.status === 'missed' || call.status === 'no-answer';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/40 transition-colors group">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
        isMissed ? 'bg-red-500/10' : isInbound ? 'bg-cyan-500/10' : 'bg-blue-500/10'
      }`}>
        {isMissed ? <PhoneOff className="w-3.5 h-3.5 text-red-400" /> :
         isInbound ? <PhoneIncoming className="w-3.5 h-3.5 text-cyan-400" /> :
         <PhoneOutgoing className="w-3.5 h-3.5 text-blue-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-zinc-200 truncate">
            {call.caller_name || (displayNumber === 'sync-ai' ? 'Sync AI' : formatPhoneDisplay(displayNumber) || 'Unknown')}
          </span>
          {isInbound ? <ArrowDownLeft className="w-2.5 h-2.5 text-zinc-600 shrink-0" /> : <ArrowUpRight className="w-2.5 h-2.5 text-zinc-600 shrink-0" />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[9px] px-1 py-0.5 rounded ${
            call.status === 'completed' ? 'bg-cyan-500/10 text-cyan-400' :
            isMissed ? 'bg-red-500/10 text-red-400' :
            'bg-zinc-800 text-zinc-500'
          }`}>{call.status || 'unknown'}</span>
          {call.duration_seconds > 0 && (
            <span className="text-[9px] text-zinc-600">{formatDurationShort(call.duration_seconds)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-zinc-600">{formatTimestamp(call.started_at || call.created_at)}</span>
        {displayNumber && displayNumber !== 'sync-ai' && (
          <button
            onClick={(e) => { e.stopPropagation(); makeCall(displayNumber); }}
            className="p-1 rounded-md text-zinc-700 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Phone className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function SMSRow({ conv }) {
  const lastMsg = conv.messages?.[conv.messages.length - 1];
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/40 transition-colors">
      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-zinc-200 truncate block">{conv.phone_number || 'Unknown'}</span>
        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{lastMsg?.content || 'No messages'}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-[10px] text-zinc-600 block">{formatTimestamp(conv.last_message_at || conv.created_at)}</span>
        <span className={`text-[9px] px-1 py-0.5 rounded ${
          conv.status === 'responded' || conv.status === 'interested' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-zinc-800 text-zinc-500'
        }`}>{conv.status || 'sent'}</span>
      </div>
    </div>
  );
}

function VoicemailRow({ vm }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/40 transition-colors">
      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
        <VoicemailIcon className="w-3.5 h-3.5 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-zinc-200 truncate block">{vm.caller_number || 'Unknown'}</span>
        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{vm.transcript || 'No transcript'}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {vm.duration_seconds > 0 && <span className="text-[10px] text-zinc-600">{formatDurationShort(vm.duration_seconds)}</span>}
        {vm.voicemail_url && (
          <button
            onClick={() => window.open(vm.voicemail_url, '_blank')}
            className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <Play className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Provision Card ──────────────────────────────────────────────────────────

function ProvisionCard({ onProvision, provisioning }) {
  const [areaCode, setAreaCode] = useState('');

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
          <Phone className="w-7 h-7 text-cyan-400" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">Set Up Sync Phone</h3>
        <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
          Get a dedicated phone number. Sync will answer calls, take messages, schedule meetings, and handle SMS.
        </p>
        <div className="flex items-center gap-2 max-w-[200px] mx-auto mb-3">
          <input
            type="text"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="Area code"
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700/50 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 text-center"
            maxLength={3}
          />
        </div>
        <button
          onClick={() => onProvision(areaCode || undefined)}
          disabled={provisioning}
          className="px-4 py-2 bg-cyan-600/80 hover:bg-cyan-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto"
        >
          {provisioning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Provisioning...</> : <><Phone className="w-3.5 h-3.5" />Get Number</>}
        </button>
        <p className="text-[10px] text-zinc-600 mt-3">$2/month per number</p>
      </div>
    </div>
  );
}

// ─── Active Call Overlay ─────────────────────────────────────────────────────

function ActiveCallOverlay({ callStatus, callDuration, isMuted, toggleMute, hangupCall, activeCall, incomingCall }) {
  const isIncoming = !!incomingCall && callStatus === 'ringing';
  const callParams = activeCall?.parameters || activeCall?.customParameters || {};
  const incomingFrom = incomingCall?.parameters?.From || incomingCall?.parameters?.from || 'Unknown';

  let displayNumber = 'Unknown';
  let statusLabel = 'Connecting...';

  if (isIncoming) { displayNumber = incomingFrom; statusLabel = 'Incoming Call'; }
  else if (activeCall) { displayNumber = callParams.To || callParams.to || 'Unknown'; if (displayNumber === 'sync-ai') displayNumber = 'Sync AI'; }
  if (callStatus === 'connecting') statusLabel = 'Connecting...';
  else if (callStatus === 'ringing') statusLabel = isIncoming ? 'Incoming Call' : 'Ringing...';
  else if (callStatus === 'connected') statusLabel = formatDuration(callDuration);

  return (
    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[360px]">
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/50 p-4">
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-2">
            {callStatus === 'connected' ? <PhoneCall className="w-5 h-5 text-cyan-400" /> :
             isIncoming ? <PhoneIncoming className="w-5 h-5 text-cyan-400 animate-pulse" /> :
             <Phone className="w-5 h-5 text-cyan-400 animate-pulse" />}
          </div>
          <p className="text-base font-medium text-white">{displayNumber === 'Sync AI' ? 'Sync AI' : formatPhoneDisplay(displayNumber)}</p>
          <p className={`text-xs mt-0.5 ${callStatus === 'connected' ? 'text-cyan-400 font-mono' : 'text-zinc-400'}`}>{statusLabel}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={toggleMute} disabled={callStatus !== 'connected'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-zinc-800 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
            } disabled:opacity-30`}>
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={hangupCall}
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-red-600/30">
            <PhoneOff className="w-5 h-5" />
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
    <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
      className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-r from-cyan-900/90 to-blue-900/90 backdrop-blur-xl border-b border-cyan-500/30 px-4 py-3 rounded-t-xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center animate-pulse">
          <PhoneIncoming className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white">Incoming Call</p>
          <p className="text-[10px] text-cyan-300/70">{formatPhoneDisplay(callerNumber)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={rejectCall} className="w-9 h-9 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center"><PhoneOff className="w-3.5 h-3.5" /></button>
          <button onClick={acceptCall} className="w-9 h-9 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center"><Phone className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export default function ActionsPhonePanel() {
  const {
    phoneNumber, loading, provisioning, callHistory, smsHistory,
    callsLoading, smsLoading, requestPhoneNumber, updateSettings, refetch,
    isDeviceReady, callStatus, isMuted, callDuration,
    incomingCall, activeCall, makeCall, callSync, acceptCall,
    rejectCall, hangupCall, toggleMute,
  } = useSyncPhone();

  const [rightTab, setRightTab] = useState('calls');

  const voicemails = useMemo(
    () => (callHistory || []).filter(c => c.voicemail_url || c.status === 'voicemail'),
    [callHistory]
  );

  const todayStart = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const callsToday = useMemo(() => (callHistory || []).filter(c => new Date(c.started_at || c.created_at) >= todayStart).length, [callHistory, todayStart]);
  const smsToday = useMemo(() => (smsHistory || []).filter(s => new Date(s.last_message_at || s.created_at) >= todayStart).length, [smsHistory, todayStart]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!phoneNumber) {
    return <ProvisionCard onProvision={requestPhoneNumber} provisioning={provisioning} />;
  }

  const isInCall = callStatus !== 'idle';

  return (
    <div className="flex flex-col h-full relative">
      {/* Incoming call banner */}
      <AnimatePresence>
        {incomingCall && callStatus === 'ringing' && !activeCall && (
          <IncomingCallBanner incomingCall={incomingCall} acceptCall={acceptCall} rejectCall={rejectCall} />
        )}
      </AnimatePresence>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] text-zinc-400 font-medium">{formatPhoneDisplay(phoneNumber.phone_number)}</span>
        </div>
        <div className="w-px h-3 bg-zinc-800" />
        <span className="text-[10px] text-zinc-500"><span className="text-zinc-300 font-medium">{callsToday}</span> calls</span>
        <div className="w-px h-3 bg-zinc-800" />
        <span className="text-[10px] text-zinc-500"><span className="text-zinc-300 font-medium">{smsToday}</span> SMS</span>
        <div className="w-px h-3 bg-zinc-800" />
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isDeviceReady ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span className="text-[10px] text-zinc-500">{isDeviceReady ? 'Ready' : 'Connecting'}</span>
        </div>
        <button onClick={refetch} className="ml-auto p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Main content: two columns */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Compact Dialer */}
        <div className="w-[220px] shrink-0 border-r border-zinc-800/60 flex flex-col items-center justify-center p-4">
          <CompactDialer makeCall={makeCall} callSync={callSync} isDeviceReady={isDeviceReady} phoneNumber={phoneNumber} />
        </div>

        {/* Right: Activity Feed */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Right tabs */}
          <div className="flex items-center border-b border-zinc-800/60 px-3 shrink-0">
            {RIGHT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = rightTab === tab.id;
              const count = tab.id === 'calls' ? (callHistory || []).length :
                            tab.id === 'sms' ? (smsHistory || []).length :
                            tab.id === 'voicemail' ? voicemails.length : null;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRightTab(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-2 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActive ? 'text-cyan-400 border-cyan-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[9px] px-1 rounded ${isActive ? 'bg-cyan-500/15 text-cyan-300' : 'bg-zinc-800 text-zinc-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2">
            {rightTab === 'calls' && (
              callsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-4 h-4 text-cyan-400 animate-spin" /></div>
              ) : (callHistory || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Phone className="w-8 h-8 text-zinc-800 mb-2" />
                  <p className="text-xs text-zinc-500">No calls yet</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {(callHistory || []).map(call => <CallRow key={call.id} call={call} makeCall={makeCall} />)}
                </div>
              )
            )}

            {rightTab === 'sms' && (
              smsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-4 h-4 text-cyan-400 animate-spin" /></div>
              ) : (smsHistory || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-8 h-8 text-zinc-800 mb-2" />
                  <p className="text-xs text-zinc-500">No SMS yet</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {(smsHistory || []).map(conv => <SMSRow key={conv.id} conv={conv} />)}
                </div>
              )
            )}

            {rightTab === 'voicemail' && (
              voicemails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <VoicemailIcon className="w-8 h-8 text-zinc-800 mb-2" />
                  <p className="text-xs text-zinc-500">No voicemails</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {voicemails.map(vm => <VoicemailRow key={vm.id} vm={vm} />)}
                </div>
              )
            )}

            {rightTab === 'settings' && (
              <div className="p-4 max-w-lg">
                <PhoneSettings phoneNumber={phoneNumber} onSave={updateSettings} />
              </div>
            )}

            {rightTab === 'contacts' && (
              <div className="p-4 max-w-lg">
                <PhoneContactManager phoneNumber={phoneNumber} onSave={updateSettings} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active call overlay */}
      <AnimatePresence>
        {isInCall && (
          <ActiveCallOverlay callStatus={callStatus} callDuration={callDuration} isMuted={isMuted}
            toggleMute={toggleMute} hangupCall={hangupCall} activeCall={activeCall} incomingCall={incomingCall} />
        )}
      </AnimatePresence>
    </div>
  );
}
