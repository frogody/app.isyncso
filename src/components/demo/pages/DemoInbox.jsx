import {
  MessageSquare,
  Search,
  Hash,
  Sparkles,
  Paperclip,
  Smile,
  Send,
  Phone,
  Video,
  MoreHorizontal,
  ChevronDown,
  Reply,
  Heart,
  Pin,
} from 'lucide-react';

// ─── Channels ─────────────────────────────────────────────────────────────────
const channelCategories = [
  {
    label: 'Channels',
    channels: [
      { id: 'general', name: 'general', icon: Hash, unread: 2, time: '2m', active: false },
      { id: 'sales', name: 'sales', icon: Hash, unread: 5, time: '10m', active: true },
      { id: 'product', name: 'product', icon: Hash, unread: 0, time: '1h', active: false },
    ],
  },
  {
    label: 'Direct Messages',
    channels: [
      { id: 'dm-sarah', name: 'Sarah Mitchell', initials: 'SM', unread: 1, time: '5m', active: false, online: true },
      { id: 'dm-david', name: 'David Park', initials: 'DP', unread: 0, time: '3h', active: false, online: true },
      { id: 'dm-rachel', name: 'Rachel Chen', initials: 'RC', unread: 3, time: '15m', active: false, online: false },
    ],
  },
  {
    label: 'SYNC AI',
    channels: [
      { id: 'sync-ai', name: 'SYNC Assistant', icon: Sparkles, unread: 1, time: '1m', active: false, isAI: true },
    ],
  },
];

// ─── Messages in #sales ───────────────────────────────────────────────────────
const channelMessages = [
  {
    id: 1,
    sender: 'Sarah Mitchell',
    initials: 'SM',
    color: 'bg-cyan-600',
    time: '9:42 AM',
    preview: 'Just got off a call with the VP of Ops. They want to expand the pilot.',
    unread: false,
    selected: true,
  },
  {
    id: 2,
    sender: 'David Park',
    initials: 'DP',
    color: 'bg-violet-600',
    time: '9:38 AM',
    preview: 'Invoice #1042 for CloudNine is approved. Sending it out today.',
    unread: true,
    selected: false,
  },
  {
    id: 3,
    sender: 'SYNC AI',
    initials: 'S',
    color: 'bg-gradient-to-br from-cyan-500 to-violet-600',
    time: '9:35 AM',
    preview: 'Action suggested: Follow up with Pinnacle Group -- their contract expires in 14 days.',
    unread: true,
    selected: false,
    isAI: true,
  },
  {
    id: 4,
    sender: 'Tom Mueller',
    initials: 'TM',
    color: 'bg-emerald-600',
    time: '9:22 AM',
    preview: 'Updated the pitch deck with Q4 numbers. Ready for review.',
    unread: false,
    selected: false,
  },
  {
    id: 5,
    sender: 'Rachel Chen',
    initials: 'RC',
    color: 'bg-rose-600',
    time: '9:15 AM',
    preview: 'Campaign results are in -- 23% above target across all channels!',
    unread: true,
    selected: false,
  },
  {
    id: 6,
    sender: 'Lisa Tran',
    initials: 'LT',
    color: 'bg-amber-600',
    time: '8:50 AM',
    preview: 'Sprint retro notes posted. Key wins and two blockers resolved.',
    unread: false,
    selected: false,
  },
  {
    id: 7,
    sender: 'Marcus Rivera',
    initials: 'MR',
    color: 'bg-blue-600',
    time: '8:30 AM',
    preview: 'New lead from the webinar -- CTO at a mid-market SaaS company.',
    unread: false,
    selected: false,
  },
];

// ─── Thread Replies ───────────────────────────────────────────────────────────
const threadReplies = [
  {
    sender: 'David Park',
    initials: 'DP',
    color: 'bg-violet-600',
    time: '9:48 AM',
    message: 'That is great news! What timeline are they looking at for the expansion?',
  },
  {
    sender: 'Tom Mueller',
    initials: 'TM',
    color: 'bg-emerald-600',
    time: '9:51 AM',
    message: 'I can have the updated proposal ready by EOD tomorrow. Should I include the enterprise tier pricing?',
  },
];


// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DemoInbox({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black flex">

      {/* ─── Left Column: Channel Sidebar ──────────────────────────────────── */}
      <div
        data-demo="channel-sidebar"
        className="w-[220px] shrink-0 bg-zinc-950 border-r border-zinc-800/60 flex flex-col"
      >
        {/* Workspace Header */}
        <div className="px-4 py-4 border-b border-zinc-800/60">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white truncate">{companyName}</h2>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/60 rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-[11px] text-zinc-600">Search messages...</span>
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 pb-4">
          {channelCategories.map((category) => (
            <div key={category.label}>
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium px-2 mb-1.5">
                {category.label}
              </p>
              <div className="space-y-0.5">
                {category.channels.map((ch) => (
                  <div
                    key={ch.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default transition-colors ${
                      ch.active
                        ? 'bg-cyan-500/15 text-cyan-400'
                        : 'text-zinc-400 hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* Icon or avatar */}
                    {ch.icon ? (
                      <ch.icon className={`w-4 h-4 shrink-0 ${ch.isAI ? 'text-violet-400' : ''}`} />
                    ) : (
                      <div className="relative shrink-0">
                        <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300">
                          {ch.initials}
                        </div>
                        {ch.online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-zinc-950" />
                        )}
                      </div>
                    )}
                    <span className="text-xs font-medium truncate flex-1">{ch.name}</span>
                    {ch.unread > 0 && (
                      <span className="text-[9px] font-bold bg-cyan-500 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center min-w-[18px] px-1">
                        {ch.unread}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Typing indicator */}
        <div className="px-3 py-2 border-t border-zinc-800/60">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-cyan-600 flex items-center justify-center text-[7px] font-bold text-white shrink-0">
              SM
            </div>
            <span className="text-[10px] text-zinc-500">
              Sarah is typing
              <span className="inline-flex ml-0.5">
                <span className="animate-bounce inline-block" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce inline-block" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce inline-block" style={{ animationDelay: '300ms' }}>.</span>
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Middle Column: Message List ────────────────────────────────────── */}
      <div
        data-demo="message-list"
        className="w-[340px] shrink-0 border-r border-zinc-800/60 flex flex-col bg-zinc-950/50"
      >
        {/* Channel Header */}
        <div className="px-4 py-3.5 border-b border-zinc-800/60 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">sales</h2>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">8 members</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-default">
              <Phone className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-default">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {channelMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 px-4 py-3 cursor-default transition-colors border-l-2 ${
                msg.selected
                  ? 'bg-cyan-500/5 border-l-cyan-500'
                  : 'border-l-transparent hover:bg-zinc-800/20'
              }`}
            >
              <div className={`w-9 h-9 rounded-full ${msg.color} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                {msg.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-semibold ${msg.unread ? 'text-white' : 'text-zinc-400'}`}>
                    {msg.sender}
                    {msg.isAI && <Sparkles className="w-3 h-3 text-violet-400 inline ml-1" />}
                  </span>
                  <span className="text-[10px] text-zinc-600 shrink-0 ml-2">{msg.time}</span>
                </div>
                <p className={`text-xs leading-relaxed truncate ${msg.unread ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {msg.preview}
                </p>
              </div>
              {msg.unread && (
                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right Column: Message Detail (Thread) ─────────────────────────── */}
      <div
        data-demo="message-detail"
        className="flex-1 flex flex-col bg-black min-w-0"
      >
        {/* Thread Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-[11px] font-bold text-white">
              SM
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Sarah Mitchell</h3>
              <p className="text-[10px] text-zinc-500">Sales Lead</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-default">
              <Video className="w-4 h-4 text-zinc-500" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-default">
              <Phone className="w-4 h-4 text-zinc-500" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-default">
              <MoreHorizontal className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Full Message + Replies */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Original message */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              SM
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">Sarah Mitchell</span>
                <span className="text-[10px] text-zinc-600">9:42 AM</span>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl rounded-tl-sm p-4">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Just got off a call with the VP of Operations at {companyName}. They want to
                  expand the pilot to their entire European division — that is 3 more offices
                  and roughly 200 additional seats.
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed mt-2">
                  They mentioned their current contract expires end of Q1, so timing is
                  perfect. Should I draft the expansion proposal today?
                </p>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800/40">
                  <button className="flex items-center gap-1 text-[10px] text-zinc-500 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors cursor-default">
                    <Heart className="w-3 h-3" /> 3
                  </button>
                  <button className="flex items-center gap-1 text-[10px] text-zinc-500 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors cursor-default">
                    <Reply className="w-3 h-3" /> Reply
                  </button>
                  <button className="flex items-center gap-1 text-[10px] text-zinc-500 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors cursor-default">
                    <Pin className="w-3 h-3" /> Pin
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Thread indicator */}
          <div className="flex items-center gap-3 ml-12">
            <div className="h-px flex-1 bg-zinc-800/60" />
            <span className="text-[10px] text-zinc-600 shrink-0">2 replies</span>
            <div className="h-px flex-1 bg-zinc-800/60" />
          </div>

          {/* Replies */}
          {threadReplies.map((reply, i) => (
            <div key={i} className="flex items-start gap-3 ml-6">
              <div className={`w-8 h-8 rounded-full ${reply.color} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                {reply.initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-white">{reply.sender}</span>
                  <span className="text-[10px] text-zinc-600">{reply.time}</span>
                </div>
                <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl rounded-tl-sm p-3">
                  <p className="text-sm text-zinc-400 leading-relaxed">{reply.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div
          data-demo="message-input"
          className="px-5 py-3 border-t border-zinc-800/60"
        >
          <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2.5">
            <button className="p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-default shrink-0">
              <Paperclip className="w-4 h-4 text-zinc-500" />
            </button>
            <span className="flex-1 text-sm text-zinc-600">Reply to thread...</span>
            <button className="p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-default shrink-0">
              <Smile className="w-4 h-4 text-zinc-500" />
            </button>
            <button className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 transition-colors cursor-default shrink-0">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
