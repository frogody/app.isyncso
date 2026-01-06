import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Sparkles,
  BookOpen,
  Target,
  Zap,
  Users,
  MessageCircle,
  Bot,
  ExternalLink,
  Cpu,
  Shield,
  Rocket,
  GraduationCap,
  DollarSign,
  ArrowRight,
  Activity,
  Settings,
  Play,
  MoreHorizontal,
  ChevronRight,
  Network,
  Workflow
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";

// Specialized agents configuration
const SPECIALIZED_AGENTS = [
  {
    id: 'learn',
    name: 'Learn',
    description: 'Courses, skills, certifications & learning paths',
    icon: GraduationCap,
    color: 'cyan',
    status: 'active',
    capabilities: ['Course recommendations', 'Skill tracking', 'Learning analytics', 'Certificate generation'],
    link: createPageUrl('LearnDashboard'),
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Sales pipeline, campaigns & prospect research',
    icon: Rocket,
    color: 'indigo',
    status: 'active',
    capabilities: ['Lead scoring', 'Campaign automation', 'Prospect enrichment', 'Outreach sequences'],
    link: createPageUrl('Growth'),
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    description: 'AI compliance, governance & risk management',
    icon: Shield,
    color: 'sage',
    status: 'active',
    capabilities: ['Risk assessment', 'Compliance monitoring', 'Document generation', 'Audit trails'],
    link: createPageUrl('SentinelDashboard'),
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Invoices, expenses, subscriptions & forecasting',
    icon: DollarSign,
    color: 'amber',
    status: 'coming_soon',
    capabilities: ['Invoice processing', 'Expense categorization', 'Budget forecasting', 'Financial insights'],
    link: createPageUrl('FinanceOverview'),
  },
];

const COLOR_MAP = {
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    solid: 'bg-cyan-500',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.3)]',
    solid: 'bg-indigo-500',
  },
  sage: {
    bg: 'bg-[#86EFAC]/10',
    border: 'border-[#86EFAC]/30',
    text: 'text-[#86EFAC]',
    glow: 'shadow-[0_0_20px_rgba(134,239,172,0.3)]',
    solid: 'bg-[#86EFAC]',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    solid: 'bg-amber-500',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]',
    solid: 'bg-purple-500',
  },
};

function AgentCard({ agent, index }) {
  const colors = COLOR_MAP[agent.color];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={agent.link}>
        <div className={`relative p-5 rounded-2xl ${colors.bg} border ${colors.border} hover:${colors.glow} transition-all duration-300 cursor-pointer group`}>
          {/* Status indicator */}
          <div className="absolute top-4 right-4">
            {agent.status === 'active' ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400">Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs text-zinc-500">Coming Soon</span>
              </div>
            )}
          </div>

          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center mb-4`}>
            <agent.icon className={`w-6 h-6 ${colors.text}`} />
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-white mb-1">{agent.name} Agent</h3>
          <p className="text-sm text-zinc-400 mb-4">{agent.description}</p>

          {/* Capabilities */}
          <div className="space-y-1.5">
            {agent.capabilities.slice(0, 3).map((cap, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                <div className={`w-1 h-1 rounded-full ${colors.solid}`} />
                {cap}
              </div>
            ))}
          </div>

          {/* Hover arrow */}
          <motion.div
            className="absolute bottom-4 right-4"
            animate={{ x: isHovered ? 0 : -4, opacity: isHovered ? 1 : 0 }}
          >
            <ChevronRight className={`w-5 h-5 ${colors.text}`} />
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}

function OrbitVisualization() {
  return (
    <div className="relative w-full h-[400px] flex items-center justify-center">
      {/* Outer orbit ring */}
      <motion.div
        className="absolute w-[350px] h-[350px] rounded-full border border-purple-500/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />

      {/* Middle orbit ring */}
      <motion.div
        className="absolute w-[250px] h-[250px] rounded-full border border-purple-500/30"
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
      />

      {/* Inner orbit ring */}
      <motion.div
        className="absolute w-[150px] h-[150px] rounded-full border border-purple-500/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {/* Orbiting agents */}
      {SPECIALIZED_AGENTS.map((agent, index) => {
        const angle = (index / SPECIALIZED_AGENTS.length) * 360;
        const radius = 175;
        const colors = COLOR_MAP[agent.color];

        return (
          <motion.div
            key={agent.id}
            className="absolute"
            animate={{
              rotate: [angle, angle + 360],
            }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: 'center center' }}
          >
            <motion.div
              className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}
              style={{
                transform: `translateY(-${radius}px) rotate(-${angle}deg)`,
              }}
              animate={{
                rotate: [-angle, -angle - 360],
              }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              whileHover={{ scale: 1.2 }}
            >
              <agent.icon className={`w-5 h-5 ${colors.text}`} />
            </motion.div>
          </motion.div>
        );
      })}

      {/* Central Sync brain */}
      <motion.div
        className="relative z-10"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-purple-500/50 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.4)]">
          <Brain className="w-12 h-12 text-purple-400" />
        </div>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-sm font-medium text-purple-400">Sync</span>
        </div>
      </motion.div>

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'translate(0, 0)' }}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.5)" />
            <stop offset="100%" stopColor="rgba(168, 85, 247, 0.1)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function AIAssistant() {
  const [user, setUser] = useState(null);

  const loadUserData = React.useCallback(async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-purple-950/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-8">
        {/* Page Header */}
        <PageHeader
          title="Sync"
          subtitle="Central AI orchestrator for your entire workspace"
          icon={Brain}
          color="purple"
          actions={
            <div className="flex items-center gap-3">
              <Link to={createPageUrl("MCPIntegrations")}>
                <Button
                  variant="outline"
                  className="border-white/10 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10"
                >
                  <Cpu className="w-4 h-4 mr-2" /> Integrations
                </Button>
              </Link>
            </div>
          }
        />

        {/* Hero Section with Orbit Visualization */}
        <GlassCard className="p-8 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: Text content */}
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 mb-4">
                  <Network className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-400">AI Orchestration</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">
                  One Brain. Many Agents.
                </h2>
                <p className="text-zinc-400 text-lg">
                  Sync is your central AI orchestrator that coordinates specialized agents across your workspace.
                  Ask Sync anything, and it will delegate to the right agent or handle it directly.
                </p>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                  <div className="text-2xl font-bold text-white">{SPECIALIZED_AGENTS.filter(a => a.status === 'active').length}</div>
                  <div className="text-sm text-zinc-500">Active Agents</div>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                  <div className="text-2xl font-bold text-white">24/7</div>
                  <div className="text-sm text-zinc-500">Always On</div>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                  <div className="text-2xl font-bold text-green-400">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div className="text-sm text-zinc-500">All Systems Go</div>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={base44.agents.getWhatsAppConnectURL('sync')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white font-medium transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Connect on WhatsApp
                </a>
                <Button
                  variant="outline"
                  className="border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Try Sync in Inbox
                </Button>
              </div>
            </div>

            {/* Right: Orbit visualization */}
            <div className="hidden lg:block">
              <OrbitVisualization />
            </div>
          </div>
        </GlassCard>

        {/* Specialized Agents Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">Specialized Agents</h3>
              <p className="text-sm text-zinc-500">Sync orchestrates these domain-specific agents</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SPECIALIZED_AGENTS.map((agent, index) => (
              <AgentCard key={agent.id} agent={agent} index={index} />
            ))}
          </div>
        </div>

        {/* How it works */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Workflow className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">How Sync Works</h3>
              <p className="text-sm text-zinc-500">Intelligent task routing and orchestration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-sm font-medium text-purple-400">
                  1
                </div>
                <h4 className="font-medium text-white">You Ask</h4>
              </div>
              <p className="text-sm text-zinc-400 pl-12">
                Message Sync via WhatsApp, Inbox, or any connected channel with your request.
              </p>
              <div className="hidden md:block absolute top-4 right-0 w-8">
                <ArrowRight className="w-5 h-5 text-zinc-600" />
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-sm font-medium text-purple-400">
                  2
                </div>
                <h4 className="font-medium text-white">Sync Routes</h4>
              </div>
              <p className="text-sm text-zinc-400 pl-12">
                Sync analyzes your request and delegates to the appropriate specialized agent.
              </p>
              <div className="hidden md:block absolute top-4 right-0 w-8">
                <ArrowRight className="w-5 h-5 text-zinc-600" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-sm font-medium text-purple-400">
                  3
                </div>
                <h4 className="font-medium text-white">Agent Executes</h4>
              </div>
              <p className="text-sm text-zinc-400 pl-12">
                The specialized agent completes the task and Sync reports back with results.
              </p>
            </div>
          </div>

          {/* Example queries */}
          <div className="mt-8 p-4 rounded-xl bg-zinc-900/50 border border-white/5">
            <h5 className="text-sm font-medium text-zinc-300 mb-3">Example Requests</h5>
            <div className="flex flex-wrap gap-2">
              {[
                "What courses should I take next?",
                "Show my sales pipeline",
                "Are my AI systems compliant?",
                "Create a task for tomorrow",
                "Draft an outreach email",
                "What's my learning progress?",
              ].map((example, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-white/5 text-sm text-zinc-400 hover:text-white hover:border-purple-500/30 cursor-pointer transition-colors"
                >
                  "{example}"
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
