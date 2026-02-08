import {
  TrendingUp,
  Target,
  Users,
  FileText,
  DollarSign,
  Eye,
  Clock,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Video,
  Phone,
  Briefcase,
  Building2,
  ChevronRight,
  Shield,
  Scale,
} from 'lucide-react';

const raiseStats = [
  { label: 'Target', value: '$2.5M', icon: Target, color: 'bg-orange-500/15 text-orange-400' },
  { label: 'Committed', value: '$1.8M', icon: DollarSign, color: 'bg-orange-500/15 text-orange-400' },
  { label: 'Investors', value: '14', icon: Users, color: 'bg-orange-500/15 text-orange-400' },
  { label: 'Term Sheets', value: '3', icon: FileText, color: 'bg-orange-500/15 text-orange-400' },
];

const kanbanColumns = [
  {
    stage: 'Sourced',
    borderColor: 'border-zinc-600',
    headingColor: 'text-zinc-400',
    count: 3,
    investors: [
      {
        firm: 'Lightspeed Ventures',
        name: 'Emily Zhang',
        checkSize: '$200K',
        lastMeeting: 'Jan 15',
        notes: 'Interested in SaaS vertical. Warm intro via Alex.',
        dots: [true, false, false, false],
      },
      {
        firm: 'Y Combinator',
        name: 'Dalton Caldwell',
        checkSize: '$500K',
        lastMeeting: 'Jan 20',
        notes: 'Reviewing application. Follow up next week.',
        dots: [true, false, false, false],
      },
      {
        firm: 'Atomico',
        name: 'Marcus Eriksson',
        checkSize: '$350K',
        lastMeeting: 'Jan 22',
        notes: 'Prefers European-focused B2B. Good fit.',
        dots: [true, false, false, false],
      },
    ],
  },
  {
    stage: 'Interested',
    borderColor: 'border-orange-500/40',
    headingColor: 'text-orange-400',
    count: 3,
    investors: [
      {
        firm: 'Accel Partners',
        name: 'Rachel Chen',
        checkSize: '$400K',
        lastMeeting: 'Jan 28',
        notes: 'Wants to see Q1 metrics. Positive on product vision.',
        dots: [true, true, false, false],
      },
      {
        firm: 'Northzone',
        name: 'Jessica Schultz',
        checkSize: '$300K',
        lastMeeting: 'Feb 1',
        notes: 'Requesting financial model and customer references.',
        dots: [true, true, false, false],
      },
      {
        firm: 'Balderton Capital',
        name: 'James Wise',
        checkSize: '$250K',
        lastMeeting: 'Feb 2',
        notes: 'Comparing with 2 other deals. Strong interest.',
        dots: [true, true, false, false],
      },
    ],
  },
  {
    stage: 'Due Diligence',
    borderColor: 'border-amber-500/40',
    headingColor: 'text-amber-400',
    count: 2,
    investors: [
      {
        firm: 'Andreessen Horowitz',
        name: 'David Park',
        checkSize: '$750K',
        lastMeeting: 'Feb 3',
        notes: 'Technical DD complete. Legal review in progress.',
        dots: [true, true, true, false],
      },
      {
        firm: 'Index Ventures',
        name: 'Sophie Laurent',
        checkSize: '$350K',
        lastMeeting: 'Feb 4',
        notes: 'Customer calls scheduled. Very engaged.',
        dots: [true, true, true, false],
      },
    ],
  },
  {
    stage: 'Committed',
    borderColor: 'border-emerald-500/40',
    headingColor: 'text-emerald-400',
    count: 3,
    investors: [
      {
        firm: 'Sequoia Capital',
        name: 'Sarah Lin',
        checkSize: '$500K',
        lastMeeting: 'Feb 5',
        notes: 'Lead investor. Term sheet signed.',
        dots: [true, true, true, true],
      },
      {
        firm: 'Felicis Ventures',
        name: 'Aydin Senkut',
        checkSize: '$300K',
        lastMeeting: 'Feb 4',
        notes: 'Verbal commitment confirmed. Docs pending.',
        dots: [true, true, true, true],
      },
      {
        firm: 'Creandum',
        name: 'Carl Fritjofsson',
        checkSize: '$200K',
        lastMeeting: 'Feb 3',
        notes: 'Committed. Follow-on rights requested.',
        dots: [true, true, true, true],
      },
    ],
  },
];

const documents = [
  { name: 'Pitch Deck', views: 47, updated: '2 days ago', trend: 'up', trendValue: '+12' },
  { name: 'Financial Model', views: 31, updated: '1 week ago', trend: 'up', trendValue: '+5' },
  { name: 'Cap Table', views: 22, updated: '3 days ago', trend: 'down', trendValue: '-2' },
  { name: 'Term Sheet', views: 18, updated: '5 days ago', trend: 'up', trendValue: '+8' },
  { name: 'Legal Docs', views: 9, updated: '1 week ago', trend: 'flat', trendValue: '0' },
];

const trendStyle = {
  up: { icon: ArrowUpRight, color: 'text-emerald-400' },
  down: { icon: ArrowDownRight, color: 'text-red-400' },
  flat: { icon: null, color: 'text-zinc-500' },
};

const meetingTypeBadge = {
  Intro: 'bg-blue-500/15 text-blue-400',
  'Follow-up': 'bg-orange-500/15 text-orange-400',
  'Due Diligence': 'bg-amber-500/15 text-amber-400',
};

const prepStatusStyle = {
  Ready: 'text-emerald-400',
  'In Progress': 'text-amber-400',
  'Not Started': 'text-zinc-500',
};

const meetings = [
  {
    investor: 'David Park',
    firm: 'Andreessen Horowitz',
    date: 'Feb 10, 2026',
    time: '2:00 PM',
    type: 'Due Diligence',
    prep: 'Ready',
    icon: Video,
  },
  {
    investor: 'Jessica Schultz',
    firm: 'Northzone',
    date: 'Feb 11, 2026',
    time: '10:30 AM',
    type: 'Follow-up',
    prep: 'In Progress',
    icon: Phone,
  },
  {
    investor: 'Marcus Eriksson',
    firm: 'Atomico',
    date: 'Feb 12, 2026',
    time: '4:00 PM',
    type: 'Intro',
    prep: 'Not Started',
    icon: Video,
  },
];

const milestones = [
  { pct: 25, label: '25%', value: '$625K' },
  { pct: 50, label: '50%', value: '$1.25M' },
  { pct: 75, label: '75%', value: '$1.875M' },
  { pct: 100, label: '100%', value: '$2.5M' },
];

export default function DemoRaise({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const progressPct = 72;
  const committed = 1800000;
  const pipeline = 450000;
  const target = 2500000;

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Page Header */}
      <div data-demo="header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/20 rounded-xl">
            <TrendingUp className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Raise</h1>
            <p className="text-zinc-400 mt-0.5">
              Manage {companyName}'s fundraising pipeline.
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-medium text-sm rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
          Add Investor
        </button>
      </div>

      {/* Fundraise Progress Hero */}
      <div data-demo="progress-hero" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold text-lg">Fundraise Progress</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Series A Round</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              ${(committed / 1000000).toFixed(1)}M
              <span className="text-zinc-500 font-normal text-base ml-1">
                of ${(target / 1000000).toFixed(1)}M
              </span>
            </p>
            <p className="text-sm text-orange-400 font-semibold">{progressPct}% complete</p>
          </div>
        </div>

        {/* Progress Bar with Milestones */}
        <div className="relative mb-8">
          {/* Bar background */}
          <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
            {/* Committed portion */}
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full relative"
              style={{ width: `${progressPct}%` }}
            >
              {/* Pipeline overlay */}
              <div
                className="absolute right-0 top-0 h-full bg-orange-300/30 rounded-r-full"
                style={{ width: `${((pipeline / target) * 100 / progressPct) * 100}%`, maxWidth: '100%' }}
              />
            </div>
          </div>

          {/* Milestone markers */}
          <div className="relative mt-1">
            {milestones.map((m) => (
              <div
                key={m.pct}
                className="absolute flex flex-col items-center"
                style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}
              >
                <div className={`w-0.5 h-3 ${m.pct <= progressPct ? 'bg-orange-400' : 'bg-zinc-700'}`} />
                <span className={`text-[10px] mt-0.5 ${m.pct <= progressPct ? 'text-orange-400' : 'text-zinc-600'}`}>
                  {m.label}
                </span>
                <span className="text-[9px] text-zinc-600">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Committed vs Pipeline */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-zinc-400">Committed</span>
            <span className="text-white font-semibold">${(committed / 1000000).toFixed(1)}M</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-300/40" />
            <span className="text-zinc-400">Pipeline</span>
            <span className="text-white font-semibold">${(pipeline / 1000).toFixed(0)}K</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <span className="text-zinc-400">Remaining</span>
            <span className="text-white font-semibold">${((target - committed - pipeline) / 1000).toFixed(0)}K</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div data-demo="raise-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {raiseStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-xl ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Investor Kanban */}
      <div data-demo="investor-kanban" className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1100px]">
          {kanbanColumns.map((col) => (
            <div key={col.stage} className="flex-1 min-w-[260px] space-y-3">
              {/* Column Header */}
              <div className={`flex items-center justify-between pb-3 border-b-2 ${col.borderColor}`}>
                <span className={`text-sm font-semibold ${col.headingColor}`}>
                  {col.stage}
                </span>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                  {col.count}
                </span>
              </div>

              {/* Investor Cards */}
              {col.investors.map((inv, idx) => (
                <div
                  key={idx}
                  data-demo="investor-card"
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3 cursor-default hover:border-zinc-700 transition-colors"
                >
                  {/* Firm + Name */}
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-sm font-semibold text-white">{inv.firm}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 ml-5.5">{inv.name}</p>
                  </div>

                  {/* Check Size */}
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-sm font-semibold text-orange-400">{inv.checkSize}</span>
                  </div>

                  {/* Status Timeline Dots */}
                  <div className="flex items-center gap-1.5">
                    {inv.dots.map((active, di) => (
                      active ? (
                        <CheckCircle2 key={di} className="w-3.5 h-3.5 text-orange-400" />
                      ) : (
                        <Circle key={di} className="w-3.5 h-3.5 text-zinc-700" />
                      )
                    ))}
                    <span className="text-[10px] text-zinc-600 ml-1">
                      {inv.dots.filter(Boolean).length}/4
                    </span>
                  </div>

                  {/* Last meeting + Notes */}
                  <div className="space-y-1.5 pt-1 border-t border-zinc-800/50">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      Last: {inv.lastMeeting}
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{inv.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Data Room + Meetings + Round Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Room */}
        <div data-demo="data-room" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Data Room</h2>
            <span className="text-xs text-orange-400 cursor-default">Manage Files</span>
          </div>
          <div className="space-y-3">
            {documents.map((doc) => {
              const TrendIcon = trendStyle[doc.trend].icon;
              return (
                <div
                  key={doc.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-300">{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Eye className="w-3 h-3" />
                      {doc.views}
                    </div>
                    {TrendIcon && (
                      <div className={`flex items-center gap-0.5 text-[10px] ${trendStyle[doc.trend].color}`}>
                        <TrendIcon className="w-3 h-3" />
                        {doc.trendValue}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                      <Clock className="w-3 h-3" />
                      {doc.updated}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div data-demo="meetings" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Upcoming Meetings</h2>
            <span className="text-xs text-zinc-500">This week</span>
          </div>
          <div className="space-y-3">
            {meetings.map((m, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-zinc-800/30 border border-zinc-800/50 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{m.investor}</p>
                    <p className="text-xs text-zinc-500">{m.firm}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${meetingTypeBadge[m.type]}`}>
                    {m.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {m.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {m.time}
                    </span>
                  </div>
                  <m.icon className="w-3.5 h-3.5 text-zinc-600" />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-600">Prep:</span>
                  <span className={`font-medium ${prepStatusStyle[m.prep]}`}>{m.prep}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Round Summary */}
        <div data-demo="round-summary" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Round Summary</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-medium">
              Active
            </span>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2.5 border-b border-zinc-800/50">
                <span className="text-xs text-zinc-500">Round Type</span>
                <span className="text-sm text-white font-medium">Series A</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-zinc-800/50">
                <span className="text-xs text-zinc-500">Pre-Money Valuation</span>
                <span className="text-sm text-white font-medium">$10M</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-zinc-800/50">
                <span className="text-xs text-zinc-500">Lead Investor</span>
                <span className="text-sm text-white font-medium">Sequoia Capital</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-zinc-800/50">
                <span className="text-xs text-zinc-500">Post-Money</span>
                <span className="text-sm text-white font-medium">$12.5M</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-zinc-800/50">
                <span className="text-xs text-zinc-500">Dilution</span>
                <span className="text-sm text-white font-medium">20%</span>
              </div>
            </div>

            {/* Key Terms */}
            <div>
              <p className="text-xs text-zinc-500 mb-2">Key Terms</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Shield className="w-3.5 h-3.5 text-orange-400/70" />
                  <span className="text-zinc-400">1x non-participating liquidation preference</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Briefcase className="w-3.5 h-3.5 text-orange-400/70" />
                  <span className="text-zinc-400">Board seat for lead investor</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Scale className="w-3.5 h-3.5 text-orange-400/70" />
                  <span className="text-zinc-400">Standard pro-rata rights</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Users className="w-3.5 h-3.5 text-orange-400/70" />
                  <span className="text-zinc-400">10% ESOP pool post-close</span>
                </div>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl transition-colors mt-2">
              <Download className="w-3.5 h-3.5" />
              Download Term Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
