import React from 'react';
import { 
  GraduationCap, BookOpen, Target, Rocket, Shield, Cpu, 
  ListTodo, Zap, TrendingUp, CheckCircle, AlertTriangle,
  Flame, Award, Bell, Send, DollarSign, Percent, Clock, FileText, Layers
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Mini preview components for the apps manager
export function WidgetPreview({ widgetId, appId, size }) {
  switch (widgetId) {
    // Learn widgets
    case 'learn_progress':
      return <LearnProgressPreview />;
    case 'learn_stats':
      return <LearnStatsPreview />;
    case 'learn_streak':
      return <LearnStreakPreview />;
    case 'learn_xp':
      return <LearnXPPreview />;
    case 'learn_skills':
      return <LearnSkillsPreview />;
    case 'learn_certificates':
      return <LearnCertificatesPreview />;
    
    // Growth widgets
    case 'growth_pipeline':
      return <GrowthPipelinePreview />;
    case 'growth_stats':
      return <GrowthStatsPreview />;
    case 'growth_deals':
      return <GrowthDealsPreview />;
    case 'growth_winrate':
      return <GrowthWinRatePreview />;
    case 'growth_signals':
      return <GrowthSignalsPreview />;
    case 'growth_campaigns':
      return <GrowthCampaignsPreview />;
    
    // Sentinel widgets
    case 'sentinel_compliance':
      return <SentinelCompliancePreview />;
    case 'sentinel_systems':
      return <SentinelSystemsPreview />;
    case 'sentinel_risk':
      return <SentinelRiskPreview />;
    case 'sentinel_tasks':
      return <SentinelTasksPreview />;
    case 'sentinel_docs':
      return <SentinelDocsPreview />;
    
    // Core widgets
    case 'actions_recent':
      return <ActionsRecentPreview />;
    case 'quick_actions':
      return <QuickActionsPreview />;
    default:
      return <DefaultPreview />;
  }
}

// LEARN PREVIEWS
function LearnProgressPreview() {
  return (
    <div className="space-y-2 transform scale-[0.85] origin-top-left">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-medium text-zinc-300">Continue Learning</span>
      </div>
      {[75, 45, 20].map((val, i) => (
        <div key={i} className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[10px] text-zinc-400">Course {i + 1}</span>
          </div>
          <Progress value={val} className="h-1" />
        </div>
      ))}
    </div>
  );
}

function LearnStatsPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-2">
        <GraduationCap className="w-4 h-4 text-cyan-400" />
      </div>
      <div className="text-lg font-bold text-white">24h</div>
      <div className="text-[10px] text-zinc-500">Learning Hours</div>
    </div>
  );
}

function LearnStreakPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
          <Flame className="w-4 h-4 text-orange-400" />
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">🔥</span>
      </div>
      <div className="text-lg font-bold text-white">7</div>
      <div className="text-[10px] text-zinc-500">Day Streak</div>
    </div>
  );
}

function LearnXPPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">
          5
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">Level 5</span>
      </div>
      <div className="text-lg font-bold text-cyan-400">2,450</div>
      <div className="text-[10px] text-zinc-500">Total XP</div>
      <Progress value={45} className="h-1 mt-1.5" />
    </div>
  );
}

function LearnSkillsPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-medium text-zinc-300">Top Skills</span>
      </div>
      {['AI Basics', 'Prompting', 'Data'].map((skill, i) => (
        <div key={i} className="mb-2">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-zinc-400">{skill}</span>
            <span className="text-cyan-400">{85 - i * 15}%</span>
          </div>
          <Progress value={85 - i * 15} className="h-1" />
        </div>
      ))}
    </div>
  );
}

function LearnCertificatesPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-2">
        <Award className="w-4 h-4 text-amber-400" />
      </div>
      <div className="text-lg font-bold text-white">3</div>
      <div className="text-[10px] text-zinc-500">Certificates</div>
    </div>
  );
}

// GROWTH PREVIEWS
function GrowthPipelinePreview() {
  return (
    <div className="space-y-2 transform scale-[0.85] origin-top-left">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-medium text-zinc-300">Pipeline</span>
      </div>
      {['Acme Corp', 'Tech Inc', 'StartupXYZ'].map((name, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
          <span className="text-[10px] text-zinc-400">{name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">€{(i + 1) * 15}k</span>
        </div>
      ))}
    </div>
  );
}

function GrowthStatsPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-indigo-400" />
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">+12%</span>
      </div>
      <div className="text-lg font-bold text-white">€142k</div>
      <div className="text-[10px] text-zinc-500">Pipeline Value</div>
    </div>
  );
}

function GrowthDealsPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Rocket className="w-4 h-4 text-indigo-400" />
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">4 won</span>
      </div>
      <div className="text-lg font-bold text-white">12</div>
      <div className="text-[10px] text-zinc-500">Active Deals</div>
    </div>
  );
}

function GrowthWinRatePreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-2">
        <Percent className="w-4 h-4 text-green-400" />
      </div>
      <div className="text-lg font-bold text-green-400">68%</div>
      <div className="text-[10px] text-zinc-500 mb-1.5">Win Rate</div>
      <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
        <div className="bg-green-500 w-[68%]" />
        <div className="bg-zinc-700 flex-1" />
      </div>
    </div>
  );
}

function GrowthSignalsPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-medium text-zinc-300">Signals</span>
      </div>
      {[
        { name: 'TechCo', type: 'funding', color: 'bg-green-500/20 text-green-400' },
        { name: 'StartupAI', type: 'hiring', color: 'bg-blue-500/20 text-blue-400' },
      ].map((s, i) => (
        <div key={i} className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-300">{s.name}</span>
            <span className={`text-[9px] px-1 py-0.5 rounded ${s.color}`}>{s.type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function GrowthCampaignsPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center gap-2 mb-3">
        <Send className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-medium text-zinc-300">Campaigns</span>
      </div>
      {['Outreach Q4', 'Product Launch'].map((name, i) => (
        <div key={i} className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 mb-2">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-zinc-300">{name}</span>
            <span className="text-indigo-400">{i === 0 ? '3' : '1'} replies</span>
          </div>
          <Progress value={i === 0 ? 65 : 30} className="h-1" />
        </div>
      ))}
    </div>
  );
}

// SENTINEL PREVIEWS
function SentinelCompliancePreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-[#86EFAC]" />
        <span className="text-xs font-medium text-zinc-300">Compliance</span>
      </div>
      <div className="flex items-center justify-center mb-2">
        <div className="relative w-16 h-16">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#27272a" strokeWidth="4" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="#86EFAC" strokeWidth="4" strokeDasharray="176" strokeDashoffset="44" strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">75%</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-1.5 rounded bg-zinc-800/60">
          <div className="text-xs font-bold text-white">8</div>
          <div className="text-[8px] text-zinc-500">Systems</div>
        </div>
        <div className="text-center p-1.5 rounded bg-zinc-800/60">
          <div className="text-xs font-bold text-amber-400">2</div>
          <div className="text-[8px] text-zinc-500">High Risk</div>
        </div>
      </div>
    </div>
  );
}

function SentinelSystemsPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-[#86EFAC]/20 border border-[#86EFAC]/30 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-[#86EFAC]" />
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">2 high-risk</span>
      </div>
      <div className="text-lg font-bold text-white">8</div>
      <div className="text-[10px] text-zinc-500">AI Systems</div>
    </div>
  );
}

function SentinelRiskPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-[#86EFAC]" />
        <span className="text-xs font-medium text-zinc-300">Risk Overview</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden mb-2">
        <div className="bg-amber-500 w-[25%]" />
        <div className="bg-purple-500 w-[15%]" />
        <div className="bg-yellow-500 w-[30%]" />
        <div className="bg-green-500 w-[30%]" />
      </div>
      <div className="grid grid-cols-2 gap-1 text-[9px]">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-zinc-400">High: 2</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-zinc-400">Minimal: 3</span></div>
      </div>
    </div>
  );
}

function SentinelTasksPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">5 urgent</span>
      </div>
      <div className="text-lg font-bold text-white">22</div>
      <div className="text-[10px] text-zinc-500">Pending Tasks</div>
    </div>
  );
}

function SentinelDocsPreview() {
  return (
    <div className="transform scale-[0.85] origin-top-left">
      <div className="w-8 h-8 rounded-lg bg-[#86EFAC]/20 border border-[#86EFAC]/30 flex items-center justify-center mb-2">
        <FileText className="w-4 h-4 text-[#86EFAC]" />
      </div>
      <div className="text-lg font-bold text-white">12</div>
      <div className="text-[10px] text-zinc-500">Documents</div>
    </div>
  );
}

// CORE PREVIEWS
function ActionsRecentPreview() {
  return (
    <div className="space-y-2 transform scale-[0.85] origin-top-left">
      <div className="flex items-center gap-2 mb-3">
        <ListTodo className="w-4 h-4 text-orange-400" />
        <span className="text-xs font-medium text-zinc-300">Recent Actions</span>
      </div>
      {[
        { icon: CheckCircle, color: 'text-green-400 bg-green-500/20', label: 'Email sent' },
        { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/20', label: 'Pending review' },
        { icon: CheckCircle, color: 'text-green-400 bg-green-500/20', label: 'Data synced' }
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
          <div className={`w-5 h-5 rounded flex items-center justify-center ${item.color}`}>
            <item.icon className="w-3 h-3" />
          </div>
          <span className="text-[10px] text-zinc-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function QuickActionsPreview() {
  return (
    <div className="space-y-2 transform scale-[0.85] origin-top-left">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-medium text-zinc-300">Quick Actions</span>
      </div>
      {[
        { label: 'View Pipeline', color: 'border-indigo-500/30 bg-indigo-500/10' },
        { label: 'Continue Learning', color: 'border-cyan-500/30 bg-cyan-500/10' },
        { label: 'Check Compliance', color: 'border-[#86EFAC]/30 bg-[#86EFAC]/10' }
      ].map((item, i) => (
        <div key={i} className={`p-2 rounded-lg border ${item.color}`}>
          <span className="text-[10px] text-zinc-300">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DefaultPreview() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
        <Zap className="w-5 h-5 text-zinc-600" />
      </div>
    </div>
  );
}