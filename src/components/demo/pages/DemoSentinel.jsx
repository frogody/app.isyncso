import {
  ShieldCheck,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
  ChevronRight,
  Eye,
  Bot,
  Brain,
  Network,
  Scan,
  Activity,
  Calendar,
  User,
  MoreHorizontal,
} from 'lucide-react';

// ─── Stats ────────────────────────────────────────────────────────────────────
const sentinelStats = [
  { label: 'AI Systems', value: '12', icon: Cpu, bg: 'bg-[#86EFAC]/10', text: 'text-[#86EFAC]' },
  { label: 'High Risk', value: '3', icon: AlertTriangle, bg: 'bg-red-500/10', text: 'text-red-400' },
  { label: 'Compliant', value: '8', icon: CheckCircle2, bg: 'bg-[#86EFAC]/10', text: 'text-[#86EFAC]' },
  { label: 'Action Required', value: '1', icon: Clock, bg: 'bg-amber-500/10', text: 'text-amber-400' },
];

// ─── Workflow Steps ───────────────────────────────────────────────────────────
const workflowSteps = [
  { label: 'Register', description: 'Add AI system', status: 'done', icon: Cpu },
  { label: 'Classify', description: 'Risk assessment', status: 'done', icon: Scan },
  { label: 'Assess', description: 'Compliance check', status: 'active', icon: Activity },
  { label: 'Document', description: 'Generate docs', status: 'pending', icon: FileText },
];

// ─── Risk Classification ──────────────────────────────────────────────────────
const riskCategories = [
  { label: 'Prohibited', count: 0, maxWidth: 0, shade: 'bg-red-600' },
  { label: 'Unacceptable', count: 0, maxWidth: 0, shade: 'bg-red-500' },
  { label: 'High Risk', count: 3, maxWidth: 60, shade: 'bg-amber-500' },
  { label: 'Limited Risk', count: 4, maxWidth: 80, shade: 'bg-[#86EFAC]' },
  { label: 'Minimal Risk', count: 5, maxWidth: 100, shade: 'bg-emerald-400' },
];

// ─── AI Systems ───────────────────────────────────────────────────────────────
const riskBadge = {
  Minimal: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  Limited: 'bg-[#86EFAC]/15 text-[#86EFAC] border border-[#86EFAC]/20',
  High: 'bg-red-500/15 text-red-400 border border-red-500/20',
};

const complianceDot = {
  Compliant: 'bg-emerald-500',
  'In Progress': 'bg-amber-500',
  'Non-Compliant': 'bg-red-500',
};

const complianceText = {
  Compliant: 'text-emerald-400',
  'In Progress': 'text-amber-400',
  'Non-Compliant': 'text-red-400',
};

const systemIcons = [Bot, Brain, Network, Scan, Eye, Cpu];

const aiSystems = [
  { name: 'Customer Support Bot', risk: 'Limited', compliance: 'Compliant', assessed: 'Jan 15, 2026', iconIdx: 0 },
  { name: 'Credit Scoring Engine', risk: 'High', compliance: 'In Progress', assessed: 'Jan 20, 2026', iconIdx: 1 },
  { name: 'Resume Screener', risk: 'High', compliance: 'Compliant', assessed: 'Dec 10, 2025', iconIdx: 2 },
  { name: 'Content Recommender', risk: 'Minimal', compliance: 'Compliant', assessed: 'Feb 1, 2026', iconIdx: 3 },
  { name: 'Fraud Detection System', risk: 'High', compliance: 'Non-Compliant', assessed: 'Jan 28, 2026', iconIdx: 4 },
  { name: 'Chatbot Translation Layer', risk: 'Minimal', compliance: 'Compliant', assessed: 'Jan 5, 2026', iconIdx: 5 },
];

// ─── Obligations ──────────────────────────────────────────────────────────────
const urgencyBadge = {
  urgent: 'bg-red-500/15 text-red-400 border border-red-500/20',
  upcoming: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  planned: 'bg-[#86EFAC]/15 text-[#86EFAC] border border-[#86EFAC]/20',
};

const obligations = [
  { title: 'Submit High-Risk System Conformity Assessment', deadline: 'Feb 15, 2026', urgency: 'urgent', assignee: 'Sarah M.' },
  { title: 'Update Technical Documentation for Credit Scoring', deadline: 'Mar 1, 2026', urgency: 'upcoming', assignee: 'David P.' },
  { title: 'Annual Risk Re-classification Review', deadline: 'Apr 15, 2026', urgency: 'planned', assignee: 'Rachel C.' },
];

// ─── Documents ────────────────────────────────────────────────────────────────
const documents = [
  { type: 'Technical Documentation', completion: 85, icon: FileText, lastGenerated: 'Jan 28, 2026' },
  { type: 'Conformity Declaration', completion: 62, icon: ShieldCheck, lastGenerated: 'Jan 10, 2026' },
  { type: 'Risk Assessment Report', completion: 94, icon: AlertTriangle, lastGenerated: 'Feb 3, 2026' },
];


// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DemoSentinel({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const complianceScore = 78;
  const gaugeRadius = 62;
  const gaugeStroke = 10;
  const normalizedR = gaugeRadius - gaugeStroke / 2;
  const circumference = 2 * Math.PI * normalizedR;
  const strokeOffset = circumference - (complianceScore / 100) * circumference;

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 space-y-6">

      {/* ─── Page Header ───────────────────────────────────────────────────── */}
      <div data-demo="header" className="flex items-center gap-3">
        <div className="p-2.5 bg-[#86EFAC]/20 rounded-xl">
          <ShieldCheck className="w-6 h-6 text-[#86EFAC]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Sentinel - EU AI Act Compliance</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Track, assess, and document AI system compliance for {companyName}.
          </p>
        </div>
      </div>

      {/* ─── Hero: Gauge + Stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance Gauge */}
        <div
          data-demo="compliance-gauge"
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6 flex flex-col items-center justify-center"
        >
          <h2 className="text-sm font-semibold text-white mb-5">Overall Compliance</h2>
          <div className="relative" style={{ width: 140, height: 140 }}>
            <svg width="140" height="140" className="-rotate-90">
              <circle
                cx="70" cy="70" r={normalizedR}
                fill="none" stroke="#27272a" strokeWidth={gaugeStroke}
              />
              <circle
                cx="70" cy="70" r={normalizedR}
                fill="none" stroke="#86EFAC" strokeWidth={gaugeStroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{complianceScore}%</span>
              <span className="text-[11px] text-zinc-500 mt-0.5">Score</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-[#86EFAC]">
              <CheckCircle2 className="w-3.5 h-3.5" /> 8 compliant
            </span>
            <span className="text-zinc-600">|</span>
            <span className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3.5 h-3.5" /> 3 pending
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {sentinelStats.map((stat) => (
            <div
              key={stat.label}
              data-demo={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
              className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.text}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-zinc-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Workflow Stepper ──────────────────────────────────────────────── */}
      <div
        data-demo="workflow-stepper"
        className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
      >
        <h2 className="text-sm font-semibold text-white mb-5">Compliance Workflow</h2>
        <div className="flex items-center justify-between">
          {workflowSteps.map((step, i) => {
            const isDone = step.status === 'done';
            const isActive = step.status === 'active';

            return (
              <div key={step.label} className="flex items-center flex-1">
                {/* Step circle + label */}
                <div className="flex flex-col items-center min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isDone
                        ? 'bg-[#86EFAC]/20 border-[#86EFAC] text-[#86EFAC]'
                        : isActive
                          ? 'bg-[#86EFAC]/10 border-[#86EFAC] text-[#86EFAC] ring-4 ring-[#86EFAC]/10'
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-4.5 h-4.5" />
                    )}
                  </div>
                  <span className={`text-xs font-medium mt-2 ${isActive || isDone ? 'text-white' : 'text-zinc-500'}`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-zinc-600 mt-0.5">{step.description}</span>
                </div>

                {/* Connector line */}
                {i < workflowSteps.length - 1 && (
                  <div className="flex-1 mx-3 h-0.5 mt-[-20px]">
                    <div className={`h-full rounded-full ${isDone ? 'bg-[#86EFAC]/50' : 'bg-zinc-800'}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Risk Classification + AI Systems Table ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Risk Classification Chart */}
        <div
          data-demo="risk-classification"
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Risk Classification</h2>
          <div className="space-y-3">
            {riskCategories.map((cat) => (
              <div key={cat.label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-24 text-right shrink-0 truncate">{cat.label}</span>
                <div className="flex-1 bg-zinc-800/60 rounded-full h-3 overflow-hidden">
                  {cat.maxWidth > 0 && (
                    <div
                      className={`h-full rounded-full ${cat.shade}`}
                      style={{ width: `${cat.maxWidth}%` }}
                    />
                  )}
                </div>
                <span className={`text-xs font-semibold w-5 text-right ${cat.count > 0 ? 'text-white' : 'text-zinc-600'}`}>
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 text-xs text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#86EFAC]" />
            <span>0 prohibited systems detected</span>
          </div>
        </div>

        {/* AI Systems Table */}
        <div
          data-demo="ai-systems"
          className="xl:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">AI Systems Inventory</h2>
            <span className="text-[11px] text-zinc-500">{aiSystems.length} systems registered</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] text-zinc-500 border-b border-zinc-800/40 bg-zinc-900/80 uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">System</th>
                  <th className="px-5 py-3 font-medium">Risk Level</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Last Assessed</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {aiSystems.map((system) => {
                  const IconComp = systemIcons[system.iconIdx];
                  return (
                    <tr key={system.name} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800/60 flex items-center justify-center">
                            <IconComp className="w-4 h-4 text-zinc-400" />
                          </div>
                          <span className="text-sm font-medium text-white">{system.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full ${riskBadge[system.risk]}`}>
                          {system.risk}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${complianceDot[system.compliance]}`} />
                          <span className={`text-sm ${complianceText[system.compliance]}`}>
                            {system.compliance}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500">{system.assessed}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-default">
                            <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-default">
                            <MoreHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Obligations + Document Status ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Upcoming Obligations */}
        <div
          data-demo="obligations"
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Upcoming Obligations</h2>
            <button className="text-[11px] text-[#86EFAC] flex items-center gap-1 cursor-default">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {obligations.map((ob, i) => (
              <div
                key={i}
                className="bg-zinc-800/30 border border-zinc-800/40 rounded-xl p-4 flex items-start gap-3"
              >
                <div className="p-2 bg-[#86EFAC]/10 rounded-lg mt-0.5 shrink-0">
                  <Calendar className="w-4 h-4 text-[#86EFAC]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{ob.title}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${urgencyBadge[ob.urgency]}`}>
                      {ob.urgency.charAt(0).toUpperCase() + ob.urgency.slice(1)}
                    </span>
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {ob.deadline}
                    </span>
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <User className="w-3 h-3" /> {ob.assignee}
                    </span>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors cursor-default shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Document Status */}
        <div
          data-demo="document-status"
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Document Status</h2>
            <button className="text-[11px] text-[#86EFAC] flex items-center gap-1 cursor-default">
              Generate <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {documents.map((doc) => {
              const barColor = doc.completion >= 90
                ? 'bg-[#86EFAC]'
                : doc.completion >= 70
                  ? 'bg-amber-500'
                  : 'bg-red-500';
              return (
                <div
                  key={doc.type}
                  className="bg-zinc-800/30 border border-zinc-800/40 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[#86EFAC]/10 rounded-lg shrink-0">
                      <doc.icon className="w-4 h-4 text-[#86EFAC]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{doc.type}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Last generated: {doc.lastGenerated}</p>
                    </div>
                    <span className="text-sm font-bold text-white">{doc.completion}%</span>
                  </div>
                  <div className="bg-zinc-800/60 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: `${doc.completion}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
