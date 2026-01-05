import React from "react";
import { TrendingUp, MessageSquare, Brain, Zap } from "lucide-react";
import SyncAvatar from "../ui/SyncAvatar";
import IconWrapper from "../ui/IconWrapper";
import { motion } from "framer-motion";

export default function WelcomeScreen({ onSelectPrompt, user }) {
  const prompts = user?.language === 'nl' ? [
    {
      title: "Analyseer kandidaten",
      description: "Wie zijn mijn hot leads met hoge intelligence scores?",
      icon: Brain,
      prompt: "Wie zijn mijn hot leads met hoge intelligence scores?"
    },
    {
      title: "Schrijf outreach",
      description: "Genereer een gepersonaliseerd outreach bericht",
      icon: MessageSquare,
      prompt: "Schrijf een outreach bericht voor mijn beste kandidaat"
    },
    {
      title: "Campaign performance",
      description: "Hoe presteren mijn actieve campaigns?",
      icon: TrendingUp,
      prompt: "Hoe presteren mijn actieve campaigns?"
    },
    {
      title: "Taken overzicht",
      description: "Wat moet ik deze week doen?",
      icon: Zap,
      prompt: "Wat zijn mijn prioriteiten deze week?"
    }
  ] : [
    {
      title: "Analyze candidates",
      description: "Who are my hot leads with high intelligence scores?",
      icon: Brain,
      prompt: "Who are my hot leads with high intelligence scores?"
    },
    {
      title: "Write outreach",
      description: "Generate a personalized outreach message",
      icon: MessageSquare,
      prompt: "Write an outreach message for my top candidate"
    },
    {
      title: "Campaign performance",
      description: "How are my active campaigns performing?",
      icon: TrendingUp,
      prompt: "How are my active campaigns performing?"
    },
    {
      title: "Task overview",
      description: "What should I focus on this week?",
      icon: Zap,
      prompt: "What are my priorities this week?"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto">
      <style jsx>{`
        .welcome-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .welcome-card:hover {
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)), rgba(26,32,38,.4);
          border-color: rgba(239,68,68,.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), 0 0 20px rgba(239,68,68,.1);
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <SyncAvatar size={64} />
        </div>
        <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--txt)' }}>
          {user?.language === 'nl' ? 'Welkom bij SYNC' : 'Welcome to SYNC'}
        </h1>
        <p className="text-lg" style={{ color: 'var(--muted)' }}>
          {user?.language === 'nl' 
            ? 'Je AI recruitment assistent. Wat kan ik vandaag voor je doen?'
            : 'Your AI recruitment assistant. What can I help you with today?'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {prompts.map((promptItem, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectPrompt(promptItem.prompt)}
            className="welcome-card p-6 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <IconWrapper icon={promptItem.icon} size={24} variant="accent" glow={true} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1" style={{ color: 'var(--txt)' }}>
                  {promptItem.title}
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {promptItem.description}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-sm"
        style={{ color: 'var(--muted)' }}
      >
        {user?.language === 'nl'
          ? '💡 Tip: SYNC heeft toegang tot al je kandidaten, campaigns en projecten'
          : '💡 Tip: SYNC has access to all your candidates, campaigns, and projects'}
      </motion.p>
    </div>
  );
}