import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Bot,
  GraduationCap,
  TrendingUp,
  Shield,
  DollarSign,
  Rocket,
  ArrowLeft,
  Check,
  Clock,
  Users,
  Zap,
  Star,
  Play,
  Book,
  MessageSquare,
  Settings,
  ChevronRight,
  Sparkles,
  Target,
  BarChart3,
  FileText,
  ExternalLink,
  Power
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

// Agent definitions - matches the ones in Agents.jsx
const AGENTS_DATA = {
  learn: {
    id: 'learn',
    name: 'Learn Agent',
    shortName: 'Learn',
    tagline: 'Your AI Learning Companion',
    description: 'The Learn Agent is your intelligent learning companion that personalizes your educational journey. It analyzes your skill gaps, recommends relevant courses, tracks your progress, and provides AI-powered tutoring support during lessons.',
    icon: GraduationCap,
    color: 'cyan',
    status: 'active',
    category: 'Productivity',
    version: '2.1.0',
    lastUpdated: '2025-01-03',
    capabilities: [
      {
        title: 'Personalized Course Recommendations',
        description: 'AI analyzes your role, skills, and goals to suggest the most relevant courses',
        icon: Target
      },
      {
        title: 'Skill Gap Analysis',
        description: 'Identifies missing competencies and creates targeted learning paths',
        icon: BarChart3
      },
      {
        title: 'Learning Path Optimization',
        description: 'Sequences courses for maximum knowledge retention and efficiency',
        icon: Zap
      },
      {
        title: 'AI Tutoring Assistance',
        description: 'Get instant answers to questions during lessons with context-aware AI',
        icon: MessageSquare
      },
      {
        title: 'Progress Tracking & Analytics',
        description: 'Comprehensive dashboards showing learning metrics and achievements',
        icon: BarChart3
      },
      {
        title: 'Certificate Management',
        description: 'Track and verify certifications with blockchain-backed credentials',
        icon: FileText
      }
    ],
    useCases: [
      {
        title: 'Onboarding New Employees',
        description: 'Automatically assign role-specific learning paths to new team members',
        example: '"Create an onboarding path for new sales representatives focusing on product knowledge and CRM usage"'
      },
      {
        title: 'Skill Development Planning',
        description: 'Build personalized development plans based on career goals',
        example: '"Suggest courses to help me transition from developer to engineering manager"'
      },
      {
        title: 'Team Training Coordination',
        description: 'Organize and track team-wide training initiatives',
        example: '"Assign the AI compliance course to all team members and track completion"'
      },
      {
        title: 'Certification Preparation',
        description: 'Prepare for industry certifications with targeted content',
        example: '"Create a study plan for the AWS Solutions Architect certification"'
      }
    ],
    stats: {
      users: '2,400+',
      tasksCompleted: '15,000+',
      satisfaction: '94%',
      avgResponseTime: '1.2s'
    },
    integrations: ['Course Library', 'Skill Frameworks', 'Certificate System', 'Analytics Dashboard'],
    appLink: '/Learn'
  },
  growth: {
    id: 'growth',
    name: 'Growth Agent',
    shortName: 'Growth',
    tagline: 'Accelerate Your Sales Pipeline',
    description: 'The Growth Agent supercharges your sales efforts with AI-powered prospect research, intelligent lead scoring, and automated campaign management. Transform cold outreach into warm conversations.',
    icon: TrendingUp,
    color: 'indigo',
    status: 'active',
    category: 'Sales',
    version: '1.8.0',
    lastUpdated: '2025-01-02',
    capabilities: [
      {
        title: 'Lead Scoring & Qualification',
        description: 'AI evaluates leads based on fit, intent, and engagement signals',
        icon: Target
      },
      {
        title: 'Prospect Enrichment',
        description: 'Automatically gather company and contact information from multiple sources',
        icon: Users
      },
      {
        title: 'Campaign Automation',
        description: 'Build and run multi-touch outreach sequences with AI optimization',
        icon: Zap
      },
      {
        title: 'Email Sequence Generation',
        description: 'Create personalized email sequences based on prospect profiles',
        icon: MessageSquare
      },
      {
        title: 'Market Research',
        description: 'Analyze markets, competitors, and trends for strategic insights',
        icon: BarChart3
      },
      {
        title: 'Competitive Intelligence',
        description: 'Monitor competitors and identify positioning opportunities',
        icon: Target
      }
    ],
    useCases: [
      {
        title: 'Prospect Research',
        description: 'Find and qualify new prospects matching your ICP',
        example: '"Find 50 Series A SaaS companies in fintech with 50-200 employees"'
      },
      {
        title: 'Personalized Outreach',
        description: 'Generate tailored messaging for each prospect',
        example: '"Write a personalized email sequence for prospects who recently raised funding"'
      },
      {
        title: 'Campaign Optimization',
        description: 'Analyze and improve campaign performance',
        example: '"Analyze my last campaign and suggest improvements for open rates"'
      },
      {
        title: 'Competitive Analysis',
        description: 'Understand competitor positioning and find gaps',
        example: '"Compare our pricing and features against Competitor X"'
      }
    ],
    stats: {
      users: '1,800+',
      tasksCompleted: '28,000+',
      satisfaction: '91%',
      avgResponseTime: '2.1s'
    },
    integrations: ['CRM', 'Email Providers', 'LinkedIn', 'Data Enrichment APIs'],
    appLink: '/Growth'
  },
  sentinel: {
    id: 'sentinel',
    name: 'Sentinel Agent',
    shortName: 'Sentinel',
    tagline: 'Your AI Compliance Guardian',
    description: 'The Sentinel Agent ensures your organization stays compliant with AI regulations and governance requirements. It automates risk assessments, monitors compliance status, and generates required documentation.',
    icon: Shield,
    color: 'sage',
    status: 'active',
    category: 'Compliance',
    version: '1.5.0',
    lastUpdated: '2025-01-04',
    capabilities: [
      {
        title: 'Risk Assessment Automation',
        description: 'Evaluate AI systems against regulatory frameworks automatically',
        icon: Target
      },
      {
        title: 'Compliance Monitoring',
        description: 'Continuous monitoring of compliance status across all systems',
        icon: BarChart3
      },
      {
        title: 'Document Generation',
        description: 'Auto-generate compliance documentation and reports',
        icon: FileText
      },
      {
        title: 'AI System Governance',
        description: 'Maintain inventory and governance of all AI systems',
        icon: Settings
      },
      {
        title: 'Regulatory Tracking',
        description: 'Stay updated on AI regulations like EU AI Act',
        icon: Book
      },
      {
        title: 'Audit Preparation',
        description: 'Prepare comprehensive audit packages on demand',
        icon: FileText
      }
    ],
    useCases: [
      {
        title: 'AI System Registration',
        description: 'Register and assess new AI systems for compliance',
        example: '"Register our new customer service chatbot and run a risk assessment"'
      },
      {
        title: 'Compliance Reporting',
        description: 'Generate compliance reports for stakeholders',
        example: '"Create a quarterly compliance report for the board"'
      },
      {
        title: 'Regulatory Updates',
        description: 'Stay informed about regulatory changes',
        example: '"What are the latest updates to the EU AI Act that affect us?"'
      },
      {
        title: 'Documentation Generation',
        description: 'Create required compliance documentation',
        example: '"Generate a technical documentation template for our ML model"'
      }
    ],
    stats: {
      users: '890+',
      tasksCompleted: '5,200+',
      satisfaction: '96%',
      avgResponseTime: '1.8s'
    },
    integrations: ['AI System Inventory', 'Document Generator', 'Risk Framework', 'Regulatory Database'],
    appLink: '/Sentinel'
  },
  finance: {
    id: 'finance',
    name: 'Finance Agent',
    shortName: 'Finance',
    tagline: 'Intelligent Financial Operations',
    description: 'The Finance Agent streamlines your financial operations with AI-powered invoice processing, smart expense categorization, and predictive budget forecasting.',
    icon: DollarSign,
    color: 'amber',
    status: 'coming_soon',
    category: 'Finance',
    version: '0.9.0 Beta',
    lastUpdated: '2025-01-01',
    capabilities: [
      {
        title: 'Invoice Processing',
        description: 'Automatically extract and process invoice data',
        icon: FileText
      },
      {
        title: 'Expense Categorization',
        description: 'AI categorizes expenses based on patterns and rules',
        icon: Target
      },
      {
        title: 'Budget Forecasting',
        description: 'Predict future expenses based on historical data',
        icon: BarChart3
      },
      {
        title: 'Cash Flow Analysis',
        description: 'Monitor and optimize cash flow in real-time',
        icon: Zap
      },
      {
        title: 'Financial Reporting',
        description: 'Generate comprehensive financial reports',
        icon: FileText
      },
      {
        title: 'Subscription Management',
        description: 'Track and optimize SaaS subscriptions',
        icon: Settings
      }
    ],
    useCases: [
      {
        title: 'Invoice Automation',
        description: 'Process invoices automatically with AI extraction',
        example: '"Process all invoices from the last month and flag any anomalies"'
      },
      {
        title: 'Expense Analysis',
        description: 'Analyze spending patterns and find savings',
        example: '"Show me our top 10 expense categories and YoY trends"'
      },
      {
        title: 'Budget Planning',
        description: 'Create data-driven budget forecasts',
        example: '"Forecast Q2 expenses based on our growth trajectory"'
      },
      {
        title: 'Subscription Audit',
        description: 'Identify unused or duplicate subscriptions',
        example: '"Audit our SaaS subscriptions and identify savings opportunities"'
      }
    ],
    stats: {
      users: '-',
      tasksCompleted: '-',
      satisfaction: '-',
      avgResponseTime: '-'
    },
    integrations: ['Accounting Software', 'Banking APIs', 'Invoice Systems', 'ERP'],
    appLink: '/Finance'
  },
  raise: {
    id: 'raise',
    name: 'Raise Agent',
    shortName: 'Raise',
    tagline: 'Navigate Fundraising with AI',
    description: 'The Raise Agent helps startups and growing companies navigate the fundraising process with AI-powered investor matching, pitch preparation, and deal pipeline management.',
    icon: Rocket,
    color: 'orange',
    status: 'coming_soon',
    category: 'Fundraising',
    version: '0.8.0 Beta',
    lastUpdated: '2024-12-28',
    capabilities: [
      {
        title: 'Investor Matching',
        description: 'Find investors that match your stage, sector, and thesis',
        icon: Target
      },
      {
        title: 'Pitch Deck Analysis',
        description: 'Get AI feedback on your pitch deck',
        icon: FileText
      },
      {
        title: 'Due Diligence Preparation',
        description: 'Organize documents for investor due diligence',
        icon: Book
      },
      {
        title: 'Deal Flow Tracking',
        description: 'Manage your fundraising pipeline efficiently',
        icon: BarChart3
      },
      {
        title: 'Valuation Insights',
        description: 'Understand market valuations for your stage',
        icon: Zap
      },
      {
        title: 'Term Sheet Analysis',
        description: 'Understand and compare term sheet terms',
        icon: FileText
      }
    ],
    useCases: [
      {
        title: 'Investor Discovery',
        description: 'Find investors matching your profile',
        example: '"Find Series A investors who have invested in AI SaaS companies"'
      },
      {
        title: 'Pitch Optimization',
        description: 'Improve your pitch deck with AI feedback',
        example: '"Analyze my pitch deck and suggest improvements"'
      },
      {
        title: 'Pipeline Management',
        description: 'Track investor conversations and next steps',
        example: '"Show me all investors in the due diligence stage"'
      },
      {
        title: 'Term Sheet Review',
        description: 'Understand key terms and compare offers',
        example: '"Compare these two term sheets and highlight key differences"'
      }
    ],
    stats: {
      users: '-',
      tasksCompleted: '-',
      satisfaction: '-',
      avgResponseTime: '-'
    },
    integrations: ['CRM', 'Document Storage', 'Data Room', 'Calendar'],
    appLink: '/Raise'
  }
};

const colorStyles = {
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    solid: 'bg-cyan-500',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent'
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    solid: 'bg-indigo-500',
    glow: 'shadow-[0_0_30px_rgba(99,102,241,0.3)]',
    gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent'
  },
  sage: {
    bg: 'bg-[#86EFAC]/10',
    border: 'border-[#86EFAC]/30',
    text: 'text-[#86EFAC]',
    solid: 'bg-[#86EFAC]',
    glow: 'shadow-[0_0_30px_rgba(134,239,172,0.3)]',
    gradient: 'from-[#86EFAC]/20 via-[#86EFAC]/5 to-transparent'
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    solid: 'bg-amber-500',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent'
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    solid: 'bg-orange-500',
    glow: 'shadow-[0_0_30px_rgba(249,115,22,0.3)]',
    gradient: 'from-orange-500/20 via-orange-500/5 to-transparent'
  }
};

export default function AgentDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const agentId = searchParams.get('id') || 'learn';
  const agent = AGENTS_DATA[agentId];

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Bot className="w-16 h-16 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Agent Not Found</h2>
        <p className="text-zinc-400 mb-6">The requested agent could not be found.</p>
        <button
          onClick={() => navigate('/Agents')}
          className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
        >
          Back to Agents
        </button>
      </div>
    );
  }

  const colors = colorStyles[agent.color];
  const Icon = agent.icon;
  const isActive = agent.status === 'active';
  const isComingSoon = agent.status === 'coming_soon';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/Agents')}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Agents</span>
      </button>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative rounded-2xl border bg-zinc-900/60 backdrop-blur-xl overflow-hidden',
          colors.border
        )}
      >
        {/* Background gradient */}
        <div className={cn('absolute inset-0 bg-gradient-to-br', colors.gradient)} />

        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Icon */}
            <div className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center border',
              colors.bg,
              colors.border,
              colors.glow
            )}>
              <Icon className={cn('w-10 h-10', colors.text)} />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
                {isActive ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                    Active
                  </span>
                ) : isComingSoon ? (
                  <span className="px-3 py-1 rounded-full bg-zinc-500/20 border border-zinc-500/30 text-zinc-400 text-sm font-medium">
                    Coming Soon
                  </span>
                ) : null}
              </div>
              <p className={cn('text-lg mb-2', colors.text)}>{agent.tagline}</p>
              <p className="text-zinc-400 max-w-2xl">{agent.description}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {isActive && (
                <Link
                  to={agent.appLink}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                    colors.solid,
                    'text-black hover:opacity-90'
                  )}
                >
                  <Play className="w-4 h-4" />
                  Open {agent.shortName}
                </Link>
              )}
              <button
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium border transition-all',
                  colors.border,
                  colors.text,
                  'hover:bg-white/5'
                )}
              >
                <Settings className="w-4 h-4" />
                Configure
              </button>
            </div>
          </div>

          {/* Stats */}
          {isActive && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
              <div>
                <div className="text-2xl font-bold text-white">{agent.stats.users}</div>
                <div className="text-sm text-zinc-400">Active Users</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{agent.stats.tasksCompleted}</div>
                <div className="text-sm text-zinc-400">Tasks Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{agent.stats.satisfaction}</div>
                <div className="text-sm text-zinc-400">Satisfaction</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{agent.stats.avgResponseTime}</div>
                <div className="text-sm text-zinc-400">Avg Response Time</div>
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
            <span>Version {agent.version}</span>
            <span>•</span>
            <span>Updated {agent.lastUpdated}</span>
            <span>•</span>
            <span>{agent.category}</span>
          </div>
        </div>
      </motion.div>

      {/* Capabilities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Sparkles className={cn('w-5 h-5', colors.text)} />
          Capabilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agent.capabilities.map((cap, idx) => {
            const CapIcon = cap.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className={cn(
                  'p-4 rounded-xl border bg-zinc-800/30',
                  colors.border
                )}
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', colors.bg)}>
                  <CapIcon className={cn('w-5 h-5', colors.text)} />
                </div>
                <h3 className="font-medium text-white mb-1">{cap.title}</h3>
                <p className="text-sm text-zinc-400">{cap.description}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Use Cases */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Target className={cn('w-5 h-5', colors.text)} />
          Example Use Cases
        </h2>
        <div className="space-y-4">
          {agent.useCases.map((uc, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.05 }}
              className="p-5 rounded-xl bg-zinc-800/30 border border-white/5"
            >
              <h3 className="font-medium text-white mb-2">{uc.title}</h3>
              <p className="text-sm text-zinc-400 mb-3">{uc.description}</p>
              <div className={cn('p-3 rounded-lg border', colors.bg, colors.border)}>
                <div className="flex items-start gap-2">
                  <MessageSquare className={cn('w-4 h-4 mt-0.5 flex-shrink-0', colors.text)} />
                  <span className="text-sm text-zinc-300 italic">{uc.example}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Integrations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Settings className={cn('w-5 h-5', colors.text)} />
          Integrations
        </h2>
        <div className="flex flex-wrap gap-3">
          {agent.integrations.map((integration, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className={cn(
                'px-4 py-2 rounded-lg border flex items-center gap-2',
                colors.bg,
                colors.border
              )}
            >
              <Check className={cn('w-4 h-4', colors.text)} />
              <span className="text-sm text-white">{integration}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Section */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn(
            'rounded-2xl border p-8 text-center',
            colors.border,
            colors.bg
          )}
        >
          <h3 className="text-xl font-semibold text-white mb-2">Ready to get started?</h3>
          <p className="text-zinc-400 mb-6">Start using {agent.name} to enhance your workflow</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to={agent.appLink}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                colors.solid,
                'text-black hover:opacity-90'
              )}
            >
              <Play className="w-4 h-4" />
              Open {agent.shortName}
            </Link>
            <Link
              to="/Sync"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium border border-white/20 text-white hover:bg-white/5 transition-all"
            >
              <Bot className="w-4 h-4" />
              Talk to Sync
            </Link>
          </div>
        </motion.div>
      )}

      {/* Coming Soon CTA */}
      {isComingSoon && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-zinc-700 bg-zinc-800/50 p-8 text-center"
        >
          <Clock className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
          <p className="text-zinc-400 mb-6">{agent.name} is currently in development. Get notified when it launches.</p>
          <button className="px-6 py-3 rounded-xl font-medium bg-zinc-700 text-white hover:bg-zinc-600 transition-all">
            Notify Me
          </button>
        </motion.div>
      )}
    </div>
  );
}
