import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Hash, Lock, Users, Pin, Search, Info, MessageSquare,
  AtSign, Bookmark, Send, Smile, Paperclip, Phone, Video,
  ChevronDown, Plus, Settings, Bell, Wifi, Menu,
  MoreHorizontal, Reply, Heart, ThumbsUp, Laugh,
} from 'lucide-react';

// ─── Channel Data ──────────────────────────────────────────────────────────────

const CHANNELS = [
  { id: 'general', name: 'general', type: 'public', description: 'Company-wide announcements', unread: 2 },
  { id: 'sales', name: 'sales', type: 'public', description: 'Sales team discussions', unread: 5 },
  { id: 'product', name: 'product', type: 'public', description: 'Product updates and feedback', unread: 0 },
  { id: 'engineering', name: 'engineering', type: 'private', description: 'Engineering discussions', unread: 3 },
  { id: 'marketing', name: 'marketing', type: 'public', description: 'Marketing campaigns', unread: 0 },
];

const DMS = [
  { id: 'dm-1', name: 'Sarah Mitchell', type: 'dm', avatar: 'SM', online: true, unread: 1 },
  { id: 'dm-2', name: 'James Park', type: 'dm', avatar: 'JP', online: true, unread: 0 },
  { id: 'dm-3', name: 'Lisa Tran', type: 'dm', avatar: 'LT', online: false, unread: 0 },
  { id: 'dm-4', name: 'SYNC Agent', type: 'dm', avatar: 'S', online: true, unread: 0, isBot: true },
];

const MESSAGES = [
  { id: 1, user: 'Sarah Mitchell', avatar: 'SM', time: '10:24 AM', content: 'Hey team, just closed the TechVentures deal! They signed for the enterprise plan.', reactions: [{ emoji: '🎉', count: 4 }, { emoji: '🔥', count: 2 }] },
  { id: 2, user: 'James Park', avatar: 'JP', time: '10:26 AM', content: 'Amazing work Sarah! That\'s our biggest deal this quarter. What was the final contract value?' },
  { id: 3, user: 'Sarah Mitchell', avatar: 'SM', time: '10:28 AM', content: '€41,000 ARR with a 2-year commitment. They also want to onboard 3 more teams in Q2.', reactions: [{ emoji: '💪', count: 3 }] },
  { id: 4, user: 'SYNC Agent', avatar: 'S', time: '10:29 AM', content: 'I\'ve updated the CRM pipeline and created the onboarding tasks for TechVentures. Invoice #INV-2026-048 has been generated.', isBot: true },
  { id: 5, user: 'Michael Chen', avatar: 'MC', time: '10:32 AM', content: 'Great news! @Sarah Mitchell can you share the proposal template you used? I\'d like to adapt it for the DataBridge pitch next week.' },
  { id: 6, user: 'Sarah Mitchell', avatar: 'SM', time: '10:35 AM', content: 'Sure! I\'ll share it in the #sales channel. The key was positioning the ROI calculator upfront — they loved the projected savings breakdown.' },
  { id: 7, user: 'Emma Wilson', avatar: 'EW', time: '10:41 AM', content: 'That reminds me — @SYNC can you pull up the pipeline stats for this month? I want to include the TechVentures win in my board update.' },
  { id: 8, user: 'SYNC Agent', avatar: 'S', time: '10:42 AM', content: 'Here are the February pipeline stats:\n• Won: 4 deals (€127K)\n• In Progress: 8 deals (€198K)\n• New Leads: 12 this month\n• Win Rate: 33% (up from 28% in Jan)', isBot: true },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DemoInbox({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[1]); // sales channel

  return (
    <div className="h-[calc(100vh-60px)] bg-black flex overflow-hidden">

      {/* ── Channel Sidebar ───────────────────────────────────── */}
      <div className="w-60 shrink-0 bg-zinc-900/80 border-r border-zinc-800/60 flex flex-col hidden lg:flex">
        {/* Workspace Header */}
        <div className="h-12 border-b border-zinc-800/60 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white truncate">{companyName}</h2>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 text-[10px] text-cyan-400">
              <Wifi className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="px-2 py-2 border-b border-zinc-800/40">
          {[
            { icon: MessageSquare, label: 'Threads' },
            { icon: AtSign, label: 'Mentions & Reactions' },
            { icon: Bookmark, label: 'Saved Items' },
          ].map(item => (
            <button key={item.label} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-800/50 cursor-default">
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Channels</span>
            <button className="text-zinc-600 hover:text-zinc-400 cursor-default"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm cursor-default transition-colors ${
                selectedChannel?.id === ch.id
                  ? 'bg-cyan-500/10 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              {ch.type === 'private' ? <Lock className="w-3.5 h-3.5 shrink-0" /> : <Hash className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{ch.name}</span>
              {ch.unread > 0 && (
                <span className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">{ch.unread}</span>
              )}
            </button>
          ))}

          <div className="flex items-center justify-between px-2 mb-1 mt-4">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Direct Messages</span>
            <button className="text-zinc-600 hover:text-zinc-400 cursor-default"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          {DMS.map(dm => (
            <button
              key={dm.id}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-800/50 cursor-default"
            >
              <div className="relative shrink-0">
                <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${dm.isBot ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-300'}`}>
                  {dm.avatar.charAt(0)}
                </div>
                {dm.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-zinc-900" />
                )}
              </div>
              <span className="truncate">{dm.name}</span>
              {dm.unread > 0 && (
                <span className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">{dm.unread}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Chat Area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-black">
        {/* Channel Header */}
        <header className="h-12 border-b border-zinc-800/60 px-3 sm:px-5 flex items-center justify-between bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 lg:hidden cursor-default">
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center shrink-0">
              <Hash className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-medium text-white text-sm">{selectedChannel?.name || 'sales'}</h2>
              <p className="text-[11px] text-zinc-500 truncate hidden sm:block">{selectedChannel?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[
              { icon: Phone, label: 'Call' },
              { icon: Video, label: 'Video' },
              { icon: Pin, label: 'Pins' },
              { icon: Users, label: 'Members' },
              { icon: Search, label: 'Search' },
            ].map(action => (
              <button key={action.label} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors cursor-default" title={action.label}>
                <action.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1">
          {/* Date Divider */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-500 font-medium px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800">Today</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {MESSAGES.map((msg) => (
            <div key={msg.id} className="group flex gap-3 py-2 px-2 rounded-lg hover:bg-zinc-900/50 transition-colors">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.isBot ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {msg.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-medium ${msg.isBot ? 'text-cyan-400' : 'text-white'}`}>{msg.user}</span>
                  {msg.isBot && <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/15 text-cyan-400 rounded-md border border-cyan-500/20">BOT</span>}
                  <span className="text-[11px] text-zinc-600">{msg.time}</span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">{msg.content}</p>
                {msg.reactions && (
                  <div className="flex gap-1.5 mt-1.5">
                    {msg.reactions.map((r, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-zinc-800/80 border border-zinc-700/50 rounded-full cursor-default">
                        {r.emoji} {r.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Hover Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-0.5 shrink-0">
                {[Reply, ThumbsUp, Bookmark, MoreHorizontal].map((Icon, i) => (
                  <button key={i} className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 cursor-default">
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-zinc-600"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-xs text-zinc-600">Alex Morgan is typing...</span>
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t border-zinc-800/60 p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <button className="text-zinc-600 hover:text-zinc-400 cursor-default">
                <Plus className="w-5 h-5" />
              </button>
              <span className="flex-1 text-sm text-zinc-500">Message #{selectedChannel?.name || 'sales'}...</span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-zinc-600 hover:text-zinc-400 cursor-default">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-zinc-600 hover:text-zinc-400 cursor-default">
                  <Smile className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-zinc-600 hover:text-zinc-400 cursor-default">
                  <AtSign className="w-4 h-4" />
                </button>
                <button className="p-1.5 bg-cyan-600/80 text-white rounded-lg cursor-default">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
