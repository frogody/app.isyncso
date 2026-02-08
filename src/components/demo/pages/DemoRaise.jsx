import {
  Rocket,
  Target,
  Handshake,
  Users,
  FileText,
  DollarSign,
  Eye,
  Clock,
} from 'lucide-react';

const raiseStats = [
  { label: 'Target', value: '$2.5M', icon: Target, color: 'cyan' },
  { label: 'Committed', value: '$1.8M', icon: DollarSign, color: 'emerald' },
  { label: 'Investors', value: '14', icon: Users, color: 'violet' },
  { label: 'Term Sheets', value: '3', icon: FileText, color: 'amber' },
];

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  violet: 'bg-violet-500/15 text-violet-400',
  amber: 'bg-amber-500/15 text-amber-400',
};

const investorStatusStyles = {
  Interested: 'bg-cyan-500/15 text-cyan-400',
  'Due Diligence': 'bg-amber-500/15 text-amber-400',
  Committed: 'bg-emerald-500/15 text-emerald-400',
  Passed: 'bg-red-500/15 text-red-400',
};

const investors = [
  { name: 'Sarah Lin', firm: 'Sequoia Capital', amount: '$500K', status: 'Committed', avatar: 'SL' },
  { name: 'David Park', firm: 'Andreessen Horowitz', amount: '$750K', status: 'Due Diligence', avatar: 'DP' },
  { name: 'Rachel Chen', firm: 'Accel Partners', amount: '$400K', status: 'Interested', avatar: 'RC' },
  { name: 'Tom Müller', firm: 'Index Ventures', amount: '$300K', status: 'Passed', avatar: 'TM' },
];

const documents = [
  { name: 'Pitch Deck', views: 47, updated: '2 days ago' },
  { name: 'Financial Model', views: 31, updated: '1 week ago' },
  { name: 'Cap Table', views: 22, updated: '3 days ago' },
  { name: 'Term Sheet', views: 18, updated: '5 days ago' },
  { name: 'Legal Docs', views: 9, updated: '1 week ago' },
];

export default function DemoRaise({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-cyan-500/15 rounded-xl">
          <Rocket className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Raise</h1>
          <p className="text-zinc-400 mt-0.5">
            Manage {companyName}'s fundraising pipeline.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div data-demo="raise-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {raiseStats.map((stat) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Investor Pipeline */}
        <div
          data-demo="investors"
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">Investor Pipeline</h2>
          <div className="space-y-3">
            {investors.map((inv) => (
              <div
                key={inv.name}
                className="flex items-center gap-4 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                  {inv.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{inv.name}</p>
                  <p className="text-xs text-zinc-500">{inv.firm}</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" />
                  {inv.amount.replace('$', '')}
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap ${investorStatusStyles[inv.status]}`}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Room */}
        <div
          data-demo="data-room"
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">Data Room</h2>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.name}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm text-zinc-300">{doc.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {doc.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {doc.updated}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
