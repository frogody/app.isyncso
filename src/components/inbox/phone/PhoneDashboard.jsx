import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, MessageSquare, VoicemailIcon, ArrowDownLeft, ArrowUpRight,
  Clock, Loader2, PhoneOff, PhoneIncoming, PhoneOutgoing,
  ChevronRight, Play, RefreshCw, Settings, Users as UsersIcon,
  BarChart3, Send
} from 'lucide-react';
import PhoneSettings from './PhoneSettings';
import PhoneContactManager from './PhoneContactManager';

const TAB_ITEMS = [
  { id: 'calls', label: 'Recent Calls', icon: Phone },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'voicemail', label: 'Voicemail', icon: VoicemailIcon },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'contacts', label: 'Contacts', icon: UsersIcon },
];

function formatDuration(seconds) {
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

function StatsBar({ callHistory, smsHistory, phoneNumber }) {
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
        <div className={`w-2 h-2 rounded-full ${phoneNumber?.status === 'active' ? 'bg-cyan-400' : 'bg-zinc-600'}`} />
        <span className="text-xs text-zinc-400">
          {phoneNumber?.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}

function CallsList({ calls, loading }) {
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
        <p className="text-xs text-zinc-600 mt-1">Calls will appear here when your Sync number receives them</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800/60">
      <AnimatePresence>
        {calls.map((call, i) => {
          const isInbound = call.direction === 'inbound';
          const expanded = expandedId === call.id;

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
                      {isInbound ? (call.caller_number || 'Unknown') : (call.callee_number || 'Unknown')}
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
                    {call.duration && (
                      <span className="text-[10px] text-zinc-600">{formatDuration(call.duration)}</span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs text-zinc-500">{formatTimestamp(call.started_at)}</span>
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
                      {call.transcript && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Transcript</p>
                          <p className="text-xs text-zinc-400 leading-relaxed">{call.transcript}</p>
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
                      {!call.transcript && !call.recording_url && (
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
              {vm.duration && (
                <span className="text-xs text-zinc-500">{formatDuration(vm.duration)}</span>
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
}) {
  const [activeTab, setActiveTab] = useState('calls');

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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Stats Bar */}
      <StatsBar callHistory={callHistory} smsHistory={smsHistory} phoneNumber={phoneNumber} />

      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-800/60 bg-zinc-900/30 px-4">
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all ${
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
            {activeTab === 'calls' && (
              <CallsList calls={callHistory} loading={callsLoading} />
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
    </div>
  );
}
