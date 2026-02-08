import {
  ShieldCheck,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const sentinelStats = [
  { label: 'AI Systems', value: '12', icon: Cpu, color: 'cyan' },
  { label: 'High Risk', value: '3', icon: AlertTriangle, color: 'red' },
  { label: 'Compliant', value: '8', icon: CheckCircle2, color: 'emerald' },
  { label: 'Action Required', value: '1', icon: Clock, color: 'amber' },
];

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  red: 'bg-red-500/15 text-red-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-400',
};

const riskStyles = {
  Minimal: 'bg-emerald-500/15 text-emerald-400',
  Limited: 'bg-cyan-500/15 text-cyan-400',
  High: 'bg-red-500/15 text-red-400',
};

const complianceStyles = {
  Compliant: 'text-emerald-400',
  'In Progress': 'text-amber-400',
  'Non-Compliant': 'text-red-400',
};

const aiSystems = [
  { name: 'Customer Support Bot', risk: 'Limited', compliance: 'Compliant', assessed: 'Jan 15, 2026' },
  { name: 'Credit Scoring Engine', risk: 'High', compliance: 'In Progress', assessed: 'Jan 20, 2026' },
  { name: 'Resume Screener', risk: 'High', compliance: 'Compliant', assessed: 'Dec 10, 2025' },
  { name: 'Content Recommender', risk: 'Minimal', compliance: 'Compliant', assessed: 'Feb 1, 2026' },
];

export default function DemoSentinel({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const complianceScore = 78;
  const circumference = 2 * Math.PI * 58;
  const strokeOffset = circumference - (complianceScore / 100) * circumference;

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-cyan-500/15 rounded-xl">
          <ShieldCheck className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Sentinel - AI Compliance</h1>
          <p className="text-zinc-400 mt-0.5">
            EU AI Act compliance tracking for {companyName}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Gauge */}
        <div
          data-demo="compliance"
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center"
        >
          <h2 className="text-white font-semibold mb-4">Compliance Score</h2>
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="58" fill="none" stroke="#27272a" strokeWidth="8" />
              <circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{complianceScore}%</span>
              <span className="text-xs text-zinc-500">Overall</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {sentinelStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className={`p-2.5 rounded-xl ${iconBgMap[stat.color]}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-zinc-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Systems List */}
      <div
        data-demo="ai-systems"
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">AI Systems Inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-5 py-3 font-medium">System</th>
                <th className="px-5 py-3 font-medium">Risk Level</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Last Assessed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {aiSystems.map((system) => (
                <tr key={system.name} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm font-medium text-white">{system.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${riskStyles[system.risk]}`}>
                      {system.risk}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-medium ${complianceStyles[system.compliance]}`}>
                      {system.compliance}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-500">{system.assessed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
