import {
  Sparkles,
  Mic,
  Zap,
  Brain,
} from 'lucide-react';

const capabilities = [
  {
    title: 'Voice Commands',
    description: 'Control your workspace with natural language voice commands.',
    icon: Mic,
    color: 'cyan',
  },
  {
    title: 'Smart Actions',
    description: 'Automate workflows and execute multi-step tasks instantly.',
    icon: Zap,
    color: 'amber',
  },
  {
    title: 'Business Intelligence',
    description: 'Get real-time insights and recommendations powered by AI.',
    icon: Brain,
    color: 'violet',
  },
];

const capBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  violet: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
};

const capIconBg = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  amber: 'bg-amber-500/15 text-amber-400',
  violet: 'bg-violet-500/15 text-violet-400',
};

export default function DemoSync({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const commands = [
    `Create an invoice for ${companyName}`,
    'Find candidates for senior developer',
    "Summarize this week's pipeline",
    'Schedule a meeting with...',
  ];

  return (
    <div className="min-h-screen bg-black p-6 flex flex-col items-center justify-center">
      {/* Sync Avatar */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 flex items-center justify-center animate-pulse">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <div className="absolute inset-0 w-28 h-28 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-violet-600/20 blur-xl" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-2">
        Meet Sync, Your AI Assistant
      </h1>
      <p className="text-zinc-400 text-sm text-center max-w-md mb-10">
        Sync understands your business and helps you get things done faster across every module.
      </p>

      {/* Capability Cards */}
      <div data-demo="sync-capabilities" className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-10">
        {capabilities.map((cap) => (
          <div
            key={cap.title}
            className={`rounded-2xl border p-5 space-y-3 ${capBgMap[cap.color]}`}
          >
            <div className={`p-2.5 rounded-xl w-fit ${capIconBg[cap.color]}`}>
              <cap.icon className="w-5 h-5" />
            </div>
            <h3 className="text-white font-semibold text-sm">{cap.title}</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">{cap.description}</p>
          </div>
        ))}
      </div>

      {/* Command Chips */}
      <div data-demo="sync-commands" className="w-full max-w-2xl">
        <p className="text-xs text-zinc-500 text-center mb-3">Try saying...</p>
        <div className="flex flex-wrap justify-center gap-2">
          {commands.map((cmd) => (
            <div
              key={cmd}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-300 cursor-default hover:border-cyan-500/30 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {cmd}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
