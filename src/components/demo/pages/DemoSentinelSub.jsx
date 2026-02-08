import {
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  Bot,
  Brain,
  Network,
  Scan,
  Activity,
  ShieldCheck,
  Download,
  ChevronRight,
  Calendar,
  User,
  Sparkles,
  Target,
  Flag,
  BookOpen,
} from 'lucide-react';

// ─── AI SYSTEMS ───────────────────────────────────────────────────────────────

const systemStats = [
  { label: 'Total Systems', value: '12', icon: Cpu, bg: 'bg-[#86EFAC]/10', text: 'text-[#86EFAC]' },
  { label: 'High Risk', value: '2', icon: AlertTriangle, bg: 'bg-red-500/10', text: 'text-red-400' },
  { label: 'Compliant', value: '8', icon: CheckCircle2, bg: 'bg-[#86EFAC]/10', text: 'text-[#86EFAC]' },
  { label: 'Pending Review', value: '2', icon: Clock, bg: 'bg-amber-500/10', text: 'text-amber-400' },
];

const riskBadge = {
  Minimal: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  Limited: 'bg-[#86EFAC]/15 text-[#86EFAC] border border-[#86EFAC]/20',
  High: 'bg-red-500/15 text-red-400 border border-red-500/20',
  Unacceptable: 'bg-red-700/15 text-red-500 border border-red-700/20',
};

const complianceDot = {
  Compliant: 'bg-emerald-500',
  'In Progress': 'bg-amber-500',
  'Pending Review': 'bg-amber-500',
  'Non-Compliant': 'bg-red-500',
};

const complianceText = {
  Compliant: 'text-emerald-400',
  'In Progress': 'text-amber-400',
  'Pending Review': 'text-amber-400',
  'Non-Compliant': 'text-red-400',
};

const systemIcons = [Bot, Brain, Network, Scan, Eye, Cpu];

const aiSystems = [
  { name: 'Customer Chatbot', desc: 'Customer support conversational AI', risk: 'Limited', compliance: 'Compliant', assessed: 'Jan 15, 2026', dept: 'Support', iconIdx: 0 },
  { name: 'Resume Screener', desc: 'Automated CV screening and ranking', risk: 'High', compliance: 'In Progress', assessed: 'Jan 20, 2026', dept: 'HR', iconIdx: 1 },
  { name: 'Fraud Detection', desc: 'Transaction anomaly detection system', risk: 'High', compliance: 'Compliant', assessed: 'Feb 1, 2026', dept: 'Finance', iconIdx: 2 },
  { name: 'Content Generator', desc: 'Marketing copy and content creation', risk: 'Limited', compliance: 'Compliant', assessed: 'Jan 28, 2026', dept: 'Marketing', iconIdx: 3 },
  { name: 'Price Optimizer', desc: 'Dynamic pricing algorithm', risk: 'Minimal', compliance: 'Compliant', assessed: 'Feb 3, 2026', dept: 'Sales', iconIdx: 4 },
  { name: 'Sentiment Analyzer', desc: 'Customer feedback sentiment analysis', risk: 'Minimal', compliance: 'Pending Review', assessed: 'Feb 5, 2026', dept: 'Product', iconIdx: 5 },
];

const riskDistribution = [
  { level: 'Minimal', count: 4, maxWidth: 67, shade: 'bg-emerald-400' },
  { level: 'Limited', count: 4, maxWidth: 67, shade: 'bg-[#86EFAC]' },
  { level: 'High', count: 2, maxWidth: 33, shade: 'bg-red-500' },
  { level: 'Unacceptable', count: 0, maxWidth: 0, shade: 'bg-red-700' },
];

export function DemoSentinelSystems({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="space-y-6" data-demo="ai-systems">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 flex items-center gap-4">
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

      {/* System Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {aiSystems.map((system) => {
          const IconComp = systemIcons[system.iconIdx];
          return (
            <div key={system.name} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 space-y-3 hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/60 flex items-center justify-center">
                    <IconComp className="w-5 h-5 text-[#86EFAC]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{system.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{system.desc}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full ${riskBadge[system.risk]}`}>{system.risk} Risk</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${complianceDot[system.compliance]}`} />
                  <span className={`text-xs ${complianceText[system.compliance]}`}>{system.compliance}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {system.assessed}
                  </span>
                  <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                    <User className="w-3 h-3" /> {system.dept}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk Distribution */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Risk Distribution</h2>
        <div className="space-y-3">
          {riskDistribution.map((cat) => (
            <div key={cat.level} className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 w-28 text-right shrink-0">{cat.level}</span>
              <div className="flex-1 bg-zinc-800/60 rounded-full h-3 overflow-hidden">
                {cat.maxWidth > 0 && (
                  <div className={`h-full rounded-full ${cat.shade}`} style={{ width: `${cat.maxWidth}%` }} />
                )}
              </div>
              <span className={`text-xs font-semibold w-5 text-right ${cat.count > 0 ? 'text-white' : 'text-zinc-600'}`}>{cat.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COMPLIANCE ROADMAP ───────────────────────────────────────────────────────

const milestones = [
  { label: 'System Registration', date: 'Jan 2026', status: 'Complete', icon: Cpu },
  { label: 'Risk Assessment', date: 'Feb 2026', status: 'In Progress', icon: Scan },
  { label: 'Documentation', date: 'Mar 2026', status: 'Upcoming', icon: FileText },
  { label: 'Audit Preparation', date: 'May 2026', status: 'Planned', icon: ShieldCheck },
];

const milestoneStyle = {
  Complete: { dot: 'bg-[#86EFAC] border-[#86EFAC]', line: 'bg-[#86EFAC]/50', text: 'text-[#86EFAC]' },
  'In Progress': { dot: 'bg-[#86EFAC]/50 border-[#86EFAC] ring-4 ring-[#86EFAC]/10', line: 'bg-zinc-800', text: 'text-[#86EFAC]' },
  Upcoming: { dot: 'bg-zinc-800 border-zinc-600', line: 'bg-zinc-800', text: 'text-zinc-500' },
  Planned: { dot: 'bg-zinc-800 border-zinc-700', line: 'bg-zinc-800', text: 'text-zinc-600' },
};

const obligations = [
  { title: 'Submit system registration forms', due: 'Jan 31, 2026', priority: 'High', status: 'Complete', assignee: 'Sarah M.' },
  { title: 'Complete risk classification review', due: 'Feb 10, 2026', priority: 'High', status: 'Complete', assignee: 'David P.' },
  { title: 'Conformity assessment for Resume Screener', due: 'Feb 15, 2026', priority: 'High', status: 'In Progress', assignee: 'Rachel C.' },
  { title: 'Update Fraud Detection technical docs', due: 'Feb 28, 2026', priority: 'Medium', status: 'In Progress', assignee: 'Tom B.' },
  { title: 'Data governance plan review', due: 'Mar 15, 2026', priority: 'Medium', status: 'Not Started', assignee: 'Nina P.' },
  { title: 'Human oversight protocol for HR systems', due: 'Mar 30, 2026', priority: 'High', status: 'Not Started', assignee: 'Sarah M.' },
  { title: 'Transparency notice for Customer Chatbot', due: 'Apr 10, 2026', priority: 'Low', status: 'Not Started', assignee: 'David P.' },
  { title: 'Schedule external audit', due: 'May 1, 2026', priority: 'Medium', status: 'Not Started', assignee: 'Rachel C.' },
];

const priorityBadge = {
  High: 'bg-red-500/15 text-red-400 border border-red-500/20',
  Medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  Low: 'bg-[#86EFAC]/15 text-[#86EFAC] border border-[#86EFAC]/20',
};

const statusDot = {
  Complete: 'bg-emerald-500',
  'In Progress': 'bg-amber-500',
  'Not Started': 'bg-zinc-600',
};

const statusText = {
  Complete: 'text-emerald-400',
  'In Progress': 'text-amber-400',
  'Not Started': 'text-zinc-500',
};

export function DemoSentinelRoadmap({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const completedCount = obligations.filter((o) => o.status === 'Complete').length;

  return (
    <div className="space-y-6" data-demo="compliance-roadmap">
      {/* Timeline */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-6">Compliance Timeline</h2>
        <div className="flex items-center justify-between relative">
          {milestones.map((ms, i) => {
            const style = milestoneStyle[ms.status];
            return (
              <div key={ms.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${style.dot}`}>
                    {ms.status === 'Complete' ? (
                      <CheckCircle2 className="w-5 h-5 text-[#86EFAC]" />
                    ) : (
                      <ms.icon className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                  <span className={`text-xs font-medium mt-2 ${ms.status === 'Complete' || ms.status === 'In Progress' ? 'text-white' : 'text-zinc-500'}`}>
                    {ms.label}
                  </span>
                  <span className="text-[10px] text-zinc-600 mt-0.5">{ms.date}</span>
                  <span className={`text-[10px] mt-1 ${style.text}`}>{ms.status}</span>
                </div>
                {i < milestones.length - 1 && (
                  <div className="flex-1 mx-3 h-0.5 mt-[-40px]">
                    <div className={`h-full rounded-full ${style.line}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Obligation Progress</h2>
          <span className="text-xs text-[#86EFAC]">{completedCount} of {obligations.length} complete</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#86EFAC] rounded-full transition-all"
            style={{ width: `${(completedCount / obligations.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Obligation Tracker Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Obligation Tracker</h2>
          <span className="text-[11px] text-zinc-500">{obligations.length} obligations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-zinc-500 border-b border-zinc-800/40 bg-zinc-900/80 uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Obligation</th>
                <th className="px-5 py-3 font-medium">Due Date</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {obligations.map((ob, i) => (
                <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-white max-w-xs">{ob.title}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{ob.due}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityBadge[ob.priority]}`}>{ob.priority}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusDot[ob.status]}`} />
                      <span className={`text-xs ${statusText[ob.status]}`}>{ob.status}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-400">{ob.assignee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

const docTypes = [
  { name: 'Annex IV Technical Documentation', system: 'Resume Screener', status: 'Generated', updated: 'Feb 3, 2026', icon: FileText },
  { name: 'Article 47 Conformity Declaration', system: 'Fraud Detection', status: 'Generated', updated: 'Feb 1, 2026', icon: ShieldCheck },
  { name: 'Risk Assessment Report', system: 'Resume Screener', status: 'Generated', updated: 'Jan 28, 2026', icon: AlertTriangle },
  { name: 'Data Governance Plan', system: 'Customer Chatbot', status: 'Pending', updated: 'Jan 20, 2026', icon: BookOpen },
  { name: 'Human Oversight Protocol', system: 'Resume Screener', status: 'Draft', updated: 'Feb 5, 2026', icon: Eye },
  { name: 'Transparency Notice', system: 'Content Generator', status: 'Pending', updated: 'Jan 15, 2026', icon: Target },
];

const docStatusStyle = {
  Generated: 'bg-[#86EFAC]/15 text-[#86EFAC] border border-[#86EFAC]/20',
  Pending: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  Draft: 'bg-zinc-700 text-zinc-400 border border-zinc-600',
};

export function DemoSentinelDocuments({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const generatedCount = 8;
  const totalRequired = 14;

  return (
    <div className="space-y-6" data-demo="sentinel-documents">
      {/* Progress */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Documentation Progress</h2>
          <span className="text-xs text-[#86EFAC]">{generatedCount} of {totalRequired} required documents complete</span>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#86EFAC] to-emerald-400 rounded-full transition-all"
            style={{ width: `${(generatedCount / totalRequired) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-zinc-600">0%</span>
          <span className="text-[10px] text-[#86EFAC] font-medium">{Math.round((generatedCount / totalRequired) * 100)}%</span>
          <span className="text-[10px] text-zinc-600">100%</span>
        </div>
      </div>

      {/* Document Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docTypes.map((doc) => (
          <div key={doc.name} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 space-y-3 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-[#86EFAC]/10 rounded-xl">
                <doc.icon className="w-5 h-5 text-[#86EFAC]" />
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full ${docStatusStyle[doc.status]}`}>{doc.status}</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{doc.name}</h3>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                <Cpu className="w-3 h-3" /> {doc.system}
              </p>
            </div>
            <div className="text-[10px] text-zinc-600 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Updated: {doc.updated}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/40">
              <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl transition-colors cursor-default">
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              {doc.status === 'Pending' ? (
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#86EFAC]/15 hover:bg-[#86EFAC]/25 text-[#86EFAC] text-xs rounded-xl transition-colors cursor-default">
                  <Sparkles className="w-3.5 h-3.5" /> Generate
                </button>
              ) : (
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl transition-colors cursor-default">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
