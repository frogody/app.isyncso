import {
  Target,
  CheckCircle2,
  FileSignature,
  Handshake,
  Trophy,
  Building2,
  User,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

const pipelineStats = [
  { label: 'Prospects', value: 45, icon: Target, color: 'text-zinc-400' },
  { label: 'Qualified', value: 23, icon: CheckCircle2, color: 'text-cyan-400' },
  { label: 'Proposals', value: 12, icon: FileSignature, color: 'text-amber-400' },
  { label: 'Negotiation', value: 8, icon: Handshake, color: 'text-violet-400' },
  { label: 'Closed', value: 5, icon: Trophy, color: 'text-emerald-400' },
];

const stageBadgeColors = {
  Lead: 'bg-zinc-700 text-zinc-300',
  Qualified: 'bg-cyan-500/15 text-cyan-400',
  Proposal: 'bg-amber-500/15 text-amber-400',
  Closed: 'bg-emerald-500/15 text-emerald-400',
};

export default function DemoGrowth({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const columns = [
    {
      stage: 'Lead',
      color: 'border-zinc-600',
      deals: [
        { company: 'NovaTech Solutions', value: '$18,000', contact: 'James Park', tag: 'Inbound' },
        { company: 'Meridian Health', value: '$32,000', contact: 'Lisa Tran', tag: 'Referral' },
        { company: 'UrbanEdge Media', value: '$9,500', contact: 'Carlos Diaz', tag: 'Outbound' },
      ],
    },
    {
      stage: 'Qualified',
      color: 'border-cyan-500/40',
      deals: [
        { company: 'TechVentures', value: '$28,000', contact: 'Alex Morgan', tag: 'Platform License' },
        { company: 'Summit Analytics', value: '$41,000', contact: 'Priya Shah', tag: 'Enterprise' },
      ],
    },
    {
      stage: 'Proposal',
      color: 'border-amber-500/40',
      deals: [
        { company: `${companyName}`, value: '$45,000', contact: recipientName, tag: 'Q1 Expansion' },
        { company: 'DataBridge Corp', value: '$22,500', contact: 'Michael Chen', tag: 'Add-on' },
        { company: 'GreenLeaf Ventures', value: '$36,000', contact: 'Nina Patel', tag: 'New Deal' },
      ],
    },
    {
      stage: 'Closed',
      color: 'border-emerald-500/40',
      deals: [
        { company: 'Pinnacle Group', value: '$55,000', contact: 'Robert Kim', tag: 'Renewed' },
        { company: 'Orion Systems', value: '$19,800', contact: 'Emma Wilson', tag: 'Won' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Growth Pipeline</h1>
        <p className="text-zinc-400 mt-1">Track deals from prospect to close.</p>
      </div>

      {/* Pipeline Stats */}
      <div data-demo="pipeline-stats" className="flex items-center gap-2 overflow-x-auto pb-2">
        {pipelineStats.map((stat, i) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-3 min-w-fit"
          >
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
            {i < pipelineStats.length - 1 && (
              <TrendingUp className="w-4 h-4 text-zinc-700 ml-2" />
            )}
          </div>
        ))}
      </div>

      {/* Kanban Columns */}
      <div data-demo="pipeline" className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.stage} className="min-w-[280px] flex-1 space-y-3">
            {/* Column Header */}
            <div className={`flex items-center gap-2 pb-3 border-b-2 ${col.color}`}>
              <span className={`text-sm font-semibold ${stageBadgeColors[col.stage].split(' ')[1]}`}>
                {col.stage}
              </span>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                {col.deals.length}
              </span>
            </div>

            {/* Deal Cards */}
            {col.deals.map((deal, i) => (
              <div
                key={i}
                data-demo="deal-card"
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-white">{deal.company}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${stageBadgeColors[col.stage]}`}>
                    {deal.tag}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">{deal.value}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-xs">{deal.contact}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
