import {
  MessageSquare,
  Search,
} from 'lucide-react';

export default function DemoInbox({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const conversations = [
    {
      sender: 'Sarah Mitchell',
      avatar: 'SM',
      preview: `Re: ${companyName} Partnership - Looking forward to discussing the terms next week.`,
      time: '10 min ago',
      unread: true,
    },
    {
      sender: 'David Park',
      avatar: 'DP',
      preview: 'Invoice #1042 approved - Payment has been scheduled for Friday.',
      time: '1 hour ago',
      unread: true,
    },
    {
      sender: 'SYNC AI',
      avatar: 'SA',
      preview: 'New candidate match - 92% score for Senior Developer role.',
      time: '2 hours ago',
      unread: true,
    },
    {
      sender: 'Rachel Chen',
      avatar: 'RC',
      preview: 'Q1 Campaign Results - We exceeded our targets by 23% across all channels.',
      time: '3 hours ago',
      unread: true,
    },
    {
      sender: 'Tom Müller',
      avatar: 'TM',
      preview: 'Product launch update - Everything is on track for the February release.',
      time: '5 hours ago',
      unread: true,
    },
    {
      sender: 'Lisa Tran',
      avatar: 'LT',
      preview: 'Team standup notes - Key blockers resolved, sprint velocity improved.',
      time: 'Yesterday',
      unread: false,
    },
  ];

  const unreadCount = conversations.filter((c) => c.unread).length;

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/15 rounded-xl">
            <MessageSquare className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Inbox</h1>
            <p className="text-zinc-400 mt-0.5">Your conversations and messages.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-cyan-400 bg-cyan-500/15 px-3 py-1.5 rounded-full">
            {unreadCount} unread
          </span>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Search messages...</span>
          </div>
        </div>
      </div>

      {/* Conversation List */}
      <div
        data-demo="inbox"
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div data-demo="conversations" className="divide-y divide-zinc-800/50">
          {conversations.map((convo) => (
            <div
              key={convo.sender}
              className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/20 transition-colors cursor-default"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
                  {convo.avatar}
                </div>
                {convo.unread && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-cyan-500 rounded-full border-2 border-zinc-900" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm font-medium ${convo.unread ? 'text-white' : 'text-zinc-400'}`}>
                    {convo.sender}
                  </span>
                  <span className="text-xs text-zinc-500 shrink-0 ml-3">{convo.time}</span>
                </div>
                <p className={`text-sm truncate ${convo.unread ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {convo.preview}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
