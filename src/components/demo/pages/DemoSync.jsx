import {
  Sparkles,
  Mic,
  Zap,
  Brain,
  Send,
  DollarSign,
  Users,
  CheckSquare,
  MessageSquare,
  BarChart3,
  Target,
  BookOpen,
  ShieldCheck,
  Rocket,
  Image,
  FileText,
  Search,
  Globe,
} from 'lucide-react';

// ─── Capability Cards ─────────────────────────────────────────────────────────
const capabilities = [
  {
    title: 'Voice Commands',
    description: 'Control your workspace with natural voice commands.',
    example: 'Create an invoice for {companyName}',
    icon: Mic,
    gradient: 'from-cyan-500/15 to-cyan-600/5',
    border: 'border-cyan-500/20',
    iconBg: 'bg-cyan-500/20',
    iconText: 'text-cyan-400',
  },
  {
    title: 'Smart Actions',
    description: 'Execute multi-step workflows instantly.',
    example: 'Find candidates matching the senior dev role and draft outreach',
    icon: Zap,
    gradient: 'from-amber-500/15 to-amber-600/5',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/20',
    iconText: 'text-amber-400',
  },
  {
    title: 'Business Intelligence',
    description: 'Real-time insights and recommendations.',
    example: "Summarize this week's pipeline and flag at-risk deals",
    icon: Brain,
    gradient: 'from-violet-500/15 to-violet-600/5',
    border: 'border-violet-500/20',
    iconBg: 'bg-violet-500/20',
    iconText: 'text-violet-400',
  },
];

// ─── Module Icons ─────────────────────────────────────────────────────────────
const modules = [
  { name: 'Finance', icon: DollarSign, color: 'text-blue-400' },
  { name: 'Growth', icon: Target, color: 'text-indigo-400' },
  { name: 'Tasks', icon: CheckSquare, color: 'text-cyan-400' },
  { name: 'Inbox', icon: MessageSquare, color: 'text-cyan-400' },
  { name: 'Talent', icon: Users, color: 'text-red-400' },
  { name: 'Learn', icon: BookOpen, color: 'text-cyan-400' },
  { name: 'Sentinel', icon: ShieldCheck, color: 'text-emerald-400' },
  { name: 'Products', icon: BarChart3, color: 'text-cyan-400' },
  { name: 'Raise', icon: Rocket, color: 'text-blue-400' },
  { name: 'Create', icon: Image, color: 'text-cyan-400' },
  { name: 'Reports', icon: FileText, color: 'text-zinc-400' },
  { name: 'Research', icon: Search, color: 'text-zinc-400' },
  { name: 'Integrations', icon: Globe, color: 'text-cyan-400' },
];

// ─── Command Chips ────────────────────────────────────────────────────────────
const commandChips = [
  'Create an invoice...',
  'Find candidates...',
  'Summarize pipeline...',
  'Generate an image...',
  'Check compliance...',
  'Schedule a meeting...',
];

// ─── SYNC Avatar Ring Colors (10 segments) ────────────────────────────────────
const ringColors = [
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#14b8a6', // teal
  '#a855f7', // purple
];


// =============================================================================
// SYNC AVATAR SVG (10 colored ring segments)
// =============================================================================
function SyncAvatar({ size = 120 }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;
  const strokeWidth = 6;
  const totalSegments = ringColors.length;
  const gapDeg = 4;
  const segmentDeg = (360 - gapDeg * totalSegments) / totalSegments;

  const segments = ringColors.map((color, i) => {
    const startAngle = i * (segmentDeg + gapDeg);
    const endAngle = startAngle + segmentDeg;
    const startRad = (Math.PI / 180) * (startAngle - 90);
    const endRad = (Math.PI / 180) * (endAngle - 90);

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = segmentDeg > 180 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

    return (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow */}
      <div
        className="absolute inset-4 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />
      <svg width={size} height={size} className="relative z-10">
        {segments}
      </svg>
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 via-violet-500/20 to-indigo-500/20 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DemoSync({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 space-y-8">

      {/* ─── Hero Section ──────────────────────────────────────────────────── */}
      <div data-demo="sync-hero" className="flex flex-col items-center text-center pt-6 pb-2">
        <SyncAvatar size={120} />
        <h1 className="text-3xl font-bold text-white mt-6">Meet Sync</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-md">
          Your AI-powered business assistant that understands your workflows and helps you
          get things done faster across every module.
        </p>
      </div>

      {/* ─── Capability Cards ──────────────────────────────────────────────── */}
      <div data-demo="sync-capabilities" className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {capabilities.map((cap) => (
          <div
            key={cap.title}
            className={`rounded-2xl border ${cap.border} bg-gradient-to-b ${cap.gradient} p-5 space-y-3`}
          >
            <div className={`p-2.5 rounded-xl w-fit ${cap.iconBg}`}>
              <cap.icon className={`w-5 h-5 ${cap.iconText}`} />
            </div>
            <h3 className="text-white font-semibold text-sm">{cap.title}</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">{cap.description}</p>
            <div className="bg-black/30 rounded-lg px-3 py-2 border border-white/5">
              <p className="text-[11px] text-zinc-500 italic">
                "{cap.example.replace('{companyName}', companyName)}"
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Live Demo Chat ────────────────────────────────────────────────── */}
      <div
        data-demo="sync-chat"
        className="max-w-3xl mx-auto bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden"
      >
        {/* Chat header */}
        <div className="px-5 py-3.5 border-b border-zinc-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 via-violet-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">SYNC AI</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-zinc-500">Online</span>
            </div>
          </div>
        </div>

        {/* Chat messages */}
        <div className="p-5 space-y-5">

          {/* User message 1 */}
          <div className="flex justify-end">
            <div className="bg-cyan-500/15 border border-cyan-500/20 rounded-xl rounded-tr-sm px-4 py-3 max-w-[80%]">
              <p className="text-sm text-white">
                What is the status of deals with {companyName}?
              </p>
            </div>
          </div>

          {/* SYNC response 1 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 via-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%] space-y-3">
              <p className="text-sm text-zinc-300">
                Here is a summary of your active deals with {companyName}:
              </p>

              {/* Formatted deal data */}
              <div className="bg-black/30 rounded-lg p-3 space-y-2 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Active Deals</span>
                  <span className="text-white font-semibold">3</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Total Value</span>
                  <span className="text-cyan-400 font-semibold">$142,500</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Closest to Close</span>
                  <span className="text-emerald-400 font-semibold">Q1 Expansion ($55K)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Next Step</span>
                  <span className="text-amber-400 font-semibold">Proposal review (Feb 12)</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button className="text-[11px] px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 cursor-default">
                  View Pipeline
                </button>
                <button className="text-[11px] px-3 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 cursor-default">
                  Schedule Follow-up
                </button>
              </div>
            </div>
          </div>

          {/* User message 2 */}
          <div className="flex justify-end">
            <div className="bg-cyan-500/15 border border-cyan-500/20 rounded-xl rounded-tr-sm px-4 py-3 max-w-[80%]">
              <p className="text-sm text-white">
                Draft a follow-up email for the Q1 expansion deal
              </p>
            </div>
          </div>

          {/* SYNC response 2 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 via-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%] space-y-3">
              <p className="text-sm text-zinc-300">
                Here is a draft follow-up email for the Q1 expansion:
              </p>

              {/* Email preview */}
              <div className="bg-black/30 rounded-lg p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-500 pb-2 border-b border-zinc-800/40">
                  <span className="font-medium text-zinc-400">To:</span>
                  <span>vp-ops@{companyName.toLowerCase().replace(/\s/g, '')}.com</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 pb-2 border-b border-zinc-800/40">
                  <span className="font-medium text-zinc-400">Subject:</span>
                  <span className="text-white">Next Steps: {companyName} European Expansion</span>
                </div>
                <div className="pt-1 space-y-2 text-xs text-zinc-400 leading-relaxed">
                  <p>Hi there,</p>
                  <p>
                    Following up on our excellent conversation yesterday about expanding
                    the pilot to your European offices. I have prepared a tailored proposal
                    covering the 3 additional offices and 200 seats we discussed.
                  </p>
                  <p>
                    Given your current contract timeline, I would love to schedule a brief
                    call this week to walk through the proposal and address any questions.
                  </p>
                  <p className="text-zinc-500">Best regards,<br/>{recipientName}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button className="text-[11px] px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 cursor-default flex items-center gap-1">
                  <Send className="w-3 h-3" /> Send
                </button>
                <button className="text-[11px] px-3 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 cursor-default">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat input */}
        <div className="px-5 py-3 border-t border-zinc-800/60">
          <div className="flex items-center gap-2 bg-zinc-800/40 border border-zinc-700/40 rounded-xl px-3 py-2.5">
            <Mic className="w-4 h-4 text-zinc-600 shrink-0" />
            <span className="flex-1 text-sm text-zinc-600">Ask SYNC anything...</span>
            <button className="p-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 cursor-default shrink-0">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Stats Bar ─────────────────────────────────────────────────────── */}
      <div
        data-demo="sync-stats"
        className="max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: '51 actions across 10 modules', icon: Zap, color: 'text-cyan-400' },
            { label: 'Voice + Text input', icon: Mic, color: 'text-amber-400' },
            { label: 'Persistent memory', icon: Brain, color: 'text-violet-400' },
            { label: 'Multi-agent workflows', icon: Globe, color: 'text-indigo-400' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2.5">
              <stat.icon className={`w-4 h-4 ${stat.color} shrink-0`} />
              <span className="text-xs text-zinc-400">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Module Integration Grid ───────────────────────────────────────── */}
      <div data-demo="sync-modules" className="max-w-4xl mx-auto">
        <p className="text-xs text-zinc-600 text-center mb-3">SYNC operates across all modules</p>
        <div className="flex flex-wrap justify-center gap-3">
          {modules.map((mod) => (
            <div
              key={mod.name}
              className="flex flex-col items-center gap-1.5 w-16"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-900/60 border border-zinc-800/40 flex items-center justify-center">
                <mod.icon className={`w-4.5 h-4.5 ${mod.color}`} />
              </div>
              <span className="text-[10px] text-zinc-500 text-center">{mod.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Try It - Command Chips ────────────────────────────────────────── */}
      <div data-demo="sync-commands" className="max-w-3xl mx-auto pb-6">
        <p className="text-xs text-zinc-600 text-center mb-3">Try saying...</p>
        <div className="flex flex-wrap justify-center gap-2">
          {commandChips.map((cmd) => (
            <div
              key={cmd}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800/60 text-sm text-zinc-300 cursor-default hover:border-cyan-500/30 transition-colors"
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
