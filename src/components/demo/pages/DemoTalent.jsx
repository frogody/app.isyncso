import {
  Sparkles,
  Brain,
  AlertTriangle,
  TrendingUp,
  Building2,
  Briefcase,
  Star,
  Shield,
  Zap,
} from 'lucide-react';

const scoreColor = (score) => {
  if (score >= 90) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (score >= 80) return 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';
  if (score >= 70) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  return 'text-zinc-400 bg-zinc-700/50 border-zinc-600';
};

const intelligenceStyles = {
  'High flight risk': { color: 'text-red-400 bg-red-500/10', icon: AlertTriangle },
  'M&A activity at employer': { color: 'text-amber-400 bg-amber-500/10', icon: TrendingUp },
  'Recently promoted': { color: 'text-emerald-400 bg-emerald-500/10', icon: Star },
  'Open to opportunities': { color: 'text-cyan-400 bg-cyan-500/10', icon: Zap },
};

export default function DemoTalent({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const candidates = [
    {
      name: 'Elena Rodriguez',
      title: 'VP of Engineering',
      company: 'Stripe',
      score: 92,
      skills: ['System Design', 'Team Leadership', 'Go', 'Kubernetes'],
      intelligence: 'High flight risk',
      avatar: 'ER',
    },
    {
      name: 'David Kim',
      title: 'Head of Product',
      company: companyName,
      score: 85,
      skills: ['Product Strategy', 'Analytics', 'B2B SaaS', 'GTM'],
      intelligence: 'M&A activity at employer',
      avatar: 'DK',
    },
    {
      name: 'Sophia Nguyen',
      title: 'Senior Data Scientist',
      company: 'Meta',
      score: 78,
      skills: ['ML/AI', 'Python', 'NLP', 'Data Pipelines'],
      intelligence: 'Recently promoted',
      avatar: 'SN',
    },
    {
      name: 'Marcus Johnson',
      title: 'Director of Sales',
      company: 'HubSpot',
      score: 71,
      skills: ['Enterprise Sales', 'Negotiation', 'CRM', 'Team Building'],
      intelligence: 'Open to opportunities',
      avatar: 'MJ',
    },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-cyan-500/15 rounded-xl">
          <Brain className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">AI-Powered Talent Matching</h1>
          <p className="text-zinc-400 mt-0.5">
            Intelligence-driven candidates ranked by fit for {companyName}.
          </p>
        </div>
      </div>

      {/* Candidate Cards */}
      <div data-demo="candidates" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {candidates.map((candidate) => {
          const intel = intelligenceStyles[candidate.intelligence];
          const IntelIcon = intel.icon;

          return (
            <div
              key={candidate.name}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4"
            >
              {/* Top row: avatar, info, score */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300">
                    {candidate.avatar}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{candidate.name}</h3>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-xs mt-0.5">
                      <Briefcase className="w-3 h-3" />
                      {candidate.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-0.5">
                      <Building2 className="w-3 h-3" />
                      {candidate.company}
                    </div>
                  </div>
                </div>
                <div
                  data-demo="match-score"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold ${scoreColor(candidate.score)}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {candidate.score}%
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Intelligence Signal */}
              <div
                data-demo="intelligence"
                className={`flex items-center gap-2 px-3 py-2 rounded-xl ${intel.color}`}
              >
                <IntelIcon className="w-4 h-4" />
                <span className="text-xs font-medium">{candidate.intelligence}</span>
                <Shield className="w-3 h-3 ml-auto opacity-50" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
