import React, { useState } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Sparkles,
  BookOpen,
  Target,
  Zap,
  Users,
  CheckCircle,
  MessageCircle,
  Bot,
  ExternalLink,
  Settings,
  Cpu
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";

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

  React.useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Sync"
          subtitle="Your AI-powered workspace assistant"
          icon={Bot}
          color="purple"
          actions={
            <Link to={createPageUrl("MCPIntegrations")}>
              <Button
                variant="outline"
                className="border-white/10 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10"
              >
                <Cpu className="w-4 h-4 mr-2" /> Integrations
              </Button>
            </Link>
          }
        />

        {/* Main Content */}
        <GlassCard className="p-6">
          <div className="space-y-6">
            {/* Sync Hero Section */}
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 mb-6">
                <Bot className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Meet Sync</h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                Your all-in-one AI assistant that can manage your entire ISYNCSO workspace -
                tasks, projects, contacts, learning, campaigns, and more.
              </p>
            </div>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: CheckCircle, label: "Tasks & Projects", desc: "Create, update, and track all your work" },
                { icon: Users, label: "CRM & Contacts", desc: "Manage prospects and sales pipeline" },
                { icon: BookOpen, label: "Learning", desc: "Track courses, skills, and certificates" },
                { icon: Target, label: "Growth Campaigns", desc: "Launch and manage outreach campaigns" },
                { icon: Zap, label: "Actions & Workflows", desc: "Automate and track integrations" },
                { icon: MessageCircle, label: "Communication", desc: "Manage inbox and messages" },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-purple-500/30 transition-colors">
                  <item.icon className="w-6 h-6 text-purple-400 mb-3" />
                  <h3 className="text-white font-medium mb-1">{item.label}</h3>
                  <p className="text-zinc-500 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* WhatsApp Connection */}
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Connect Sync on WhatsApp
                  </h3>
                  <p className="text-zinc-400 mb-4">
                    Take Sync with you anywhere. Manage your workspace, create tasks, check your pipeline,
                    and more - all from your favorite messaging app.
                  </p>
                  <a
                    href={base44.agents.getWhatsAppConnectURL('sync')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-medium transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Connect to WhatsApp
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Usage Tips */}
            <div className="p-5 rounded-xl bg-zinc-900/30 border border-white/5">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                How to use Sync
              </h4>
              <ul className="space-y-2 text-zinc-400 text-sm">
                <li>• <strong className="text-zinc-300">In Inbox:</strong> Mention <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-400">@sync</code> in any channel to get help</li>
                <li>• <strong className="text-zinc-300">On WhatsApp:</strong> Just message Sync directly with your requests</li>
                <li>• <strong className="text-zinc-300">Examples:</strong> "Create a task for tomorrow", "Show my pending deals", "What courses am I enrolled in?"</li>
              </ul>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}