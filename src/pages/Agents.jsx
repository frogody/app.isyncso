import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/components/utils/translations";
import {
  Bot,
  MessageSquare,
  Brain,
  Mail,
  BarChart3,
  CheckSquare,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";
import { haptics } from "@/components/utils/haptics";

const AGENT_CONFIGS = [
  {
    id: 'recruitment_assistant',
    name: 'Recruitment Assistant',
    name_nl: 'Recruitment Assistent',
    description: 'General recruitment help with candidates, campaigns, and insights',
    description_nl: 'Algemene recruitment hulp met kandidaten, campaigns en inzichten',
    icon: Bot,
    color: 'from-blue-500 to-blue-600',
    capabilities: [
      'Candidate management',
      'Campaign insights',
      'Task organization',
      'Performance tracking'
    ],
    capabilities_nl: [
      'Kandidaat beheer',
      'Campaign inzichten',
      'Taak organisatie',
      'Performance tracking'
    ]
  },
  {
    id: 'candidate_intelligence',
    name: 'Intelligence Analyst',
    name_nl: 'Intelligence Analist',
    description: 'Deep candidate analysis and matching insights',
    description_nl: 'Diepgaande kandidaat analyse en matching inzichten',
    icon: Brain,
    color: 'from-purple-500 to-purple-600',
    capabilities: [
      'Intelligence scoring',
      'Flight risk analysis',
      'Candidate-role matching',
      'Timing recommendations'
    ],
    capabilities_nl: [
      'Intelligence scoring',
      'Flight risk analyse',
      'Kandidaat-rol matching',
      'Timing aanbevelingen'
    ]
  },
  {
    id: 'outreach_specialist',
    name: 'Outreach Specialist',
    name_nl: 'Outreach Specialist',
    description: 'Personalized message crafting and outreach optimization',
    description_nl: 'Gepersonaliseerde berichten en outreach optimalisatie',
    icon: Mail,
    color: 'from-green-500 to-green-600',
    capabilities: [
      'Message personalization',
      'Follow-up sequences',
      'Response rate optimization',
      'A/B testing insights'
    ],
    capabilities_nl: [
      'Bericht personalisatie',
      'Follow-up reeksen',
      'Response rate optimalisatie',
      'A/B test inzichten'
    ]
  },
  {
    id: 'campaign_manager',
    name: 'Campaign Manager',
    name_nl: 'Campaign Manager',
    description: 'Campaign performance analysis and optimization',
    description_nl: 'Campaign performance analyse en optimalisatie',
    icon: BarChart3,
    color: 'from-orange-500 to-orange-600',
    capabilities: [
      'Performance tracking',
      'Conversion analytics',
      'Pipeline optimization',
      'Strategy recommendations'
    ],
    capabilities_nl: [
      'Performance tracking',
      'Conversie analytics',
      'Pipeline optimalisatie',
      'Strategie aanbevelingen'
    ]
  },
  {
    id: 'task_assistant',
    name: 'Task Assistant',
    name_nl: 'Taak Assistent',
    description: 'Task management and workflow organization',
    description_nl: 'Taakbeheer en workflow organisatie',
    icon: CheckSquare,
    color: 'from-red-500 to-red-600',
    capabilities: [
      'Task creation',
      'Priority management',
      'Follow-up scheduling',
      'Workflow automation'
    ],
    capabilities_nl: [
      'Taak creatie',
      'Prioriteit beheer',
      'Follow-up planning',
      'Workflow automatisering'
    ]
  }
];

export default function AgentsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedAgent, setCopiedAgent] = useState(null);

  const { t } = useTranslation(user?.language || 'nl');
  const isNL = user?.language === 'nl';

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
    setLoading(false);
  };

  const getWhatsAppURL = (agentId) => {
    return base44.agents.getWhatsAppConnectURL(agentId);
  };

  const handleCopyURL = async (agentId) => {
    haptics.light();
    const url = getWhatsAppURL(agentId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAgent(agentId);
      setTimeout(() => setCopiedAgent(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --txt: #E9F0F1;
          }
          body {
            background: var(--bg) !important;
            color: var(--txt) !important;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>
            {isNL ? 'Agents laden...' : 'Loading agents...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <IconWrapper icon={Bot} size={36} variant="accent" glow={true} />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--txt)' }}>
              {isNL ? 'AI Agents' : 'AI Agents'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {isNL 
                ? 'Gespecialiseerde AI assistenten voor verschillende recruitment taken'
                : 'Specialized AI assistants for different recruitment tasks'}
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(34,197,94,.12)' }}>
                <IconWrapper icon={MessageSquare} size={24} variant="default" glow={false} style={{ color: '#22C55E' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                  {isNL ? 'WhatsApp Integratie' : 'WhatsApp Integration'}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {isNL 
                    ? 'Alle agents zijn beschikbaar via WhatsApp. Klik op de WhatsApp knop bij een agent om te starten. Je wordt automatisch ingelogd als je nog niet bent ingelogd.'
                    : 'All agents are available via WhatsApp. Click the WhatsApp button on any agent to get started. You\'ll be automatically logged in if you\'re not already.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AGENT_CONFIGS.map((agent) => {
            const Icon = agent.icon;
            const whatsappURL = getWhatsAppURL(agent.id);
            const isCopied = copiedAgent === agent.id;

            return (
              <Card key={agent.id} className="glass-card hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${agent.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="outline" style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E', borderColor: 'rgba(34,197,94,.3)' }}>
                      {isNL ? 'Actief' : 'Active'}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4" style={{ color: 'var(--txt)' }}>
                    {isNL ? agent.name_nl : agent.name}
                  </CardTitle>
                  <CardDescription style={{ color: 'var(--muted)' }}>
                    {isNL ? agent.description_nl : agent.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                        {isNL ? 'Mogelijkheden' : 'Capabilities'}
                      </p>
                      <ul className="space-y-1">
                        {(isNL ? agent.capabilities_nl : agent.capabilities).map((cap, idx) => (
                          <li key={idx} className="text-sm flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        asChild
                        className="flex-1"
                        style={{
                          background: 'rgba(37,211,102,.12)',
                          color: '#25D366',
                          border: '1px solid rgba(37,211,102,.3)'
                        }}
                        onClick={() => haptics.medium()}
                      >
                        <a href={whatsappURL} target="_blank" rel="noopener noreferrer">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          WhatsApp
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyURL(agent.id)}
                        style={{
                          background: 'rgba(255,255,255,.04)',
                          border: '1px solid rgba(255,255,255,.12)'
                        }}
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4" style={{ color: '#22C55E' }} />
                        ) : (
                          <Copy className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* How to Use */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: 'var(--txt)' }}>
              {isNL ? 'Hoe te gebruiken' : 'How to Use'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold"
                     style={{ background: 'rgba(239,68,68,.12)', color: 'var(--accent)' }}>
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--txt)' }}>
                    {isNL ? 'Kies een agent' : 'Choose an agent'}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {isNL 
                      ? 'Selecteer de agent die het beste past bij je taak'
                      : 'Select the agent that best fits your task'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold"
                     style={{ background: 'rgba(239,68,68,.12)', color: 'var(--accent)' }}>
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--txt)' }}>
                    {isNL ? 'Start conversatie' : 'Start conversation'}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {isNL 
                      ? 'Klik op WhatsApp om een gesprek te starten'
                      : 'Click WhatsApp to start a conversation'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold"
                     style={{ background: 'rgba(239,68,68,.12)', color: 'var(--accent)' }}>
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--txt)' }}>
                    {isNL ? 'Stel je vraag' : 'Ask your question'}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {isNL 
                      ? 'De agent heeft toegang tot al je data en kan direct helpen'
                      : 'The agent has access to all your data and can help immediately'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}