import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { Shield, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { ChatInterface } from '@/components/ui/ChatInterface';
import { SentinelCardSkeleton } from '@/components/sentinel/ui/SentinelCard';
import { SentinelPageTransition } from '@/components/sentinel/ui/SentinelPageTransition';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ElementType;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Check compliance status', prompt: "What's the compliance status of my AI systems?", icon: CheckCircle },
  { label: 'EU AI Act requirements', prompt: 'What are the key requirements of the EU AI Act?', icon: FileText },
  { label: 'Risk classification help', prompt: 'Help me understand AI risk classification', icon: AlertTriangle },
  { label: 'Generate documentation', prompt: 'What documentation do I need for a high-risk AI system?', icon: FileText },
];

export default function SentinelChat() {
  const { user, isLoading: userLoading } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const initConversation = useCallback(async () => {
    if (!user) return;
    try {
      const conversation = await db.agents.createConversation({
        agent_name: 'sentinel',
        metadata: { name: 'Compliance Session', user_id: user.id },
      });
      setConversationId(conversation.id);
    } catch (error) {
      console.error('Failed to init conversation:', error);
    }
  }, [user]);

  useEffect(() => {
    initConversation();
  }, [initConversation]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversation = await db.agents.getConversation(conversationId);
      await db.agents.addMessage(conversation, { role: 'user', content });

      const unsubscribe = db.agents.subscribeToConversation(conversationId, (data: any) => {
        if (data.messages) {
          setMessages(data.messages);
        }
      });

      setTimeout(() => {
        unsubscribe();
        setIsLoading(false);
      }, 30000);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." },
      ]);
      setIsLoading(false);
    }
  }, [conversationId]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <SentinelCardSkeleton className="h-24" />
          <SentinelCardSkeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  return (
    <SentinelPageTransition className="min-h-screen bg-black">
      <div className="w-full max-w-5xl mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[20px] bg-sky-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Ask SENTINEL</h1>
            <p className="text-xs text-zinc-500">Your AI compliance assistant for EU AI Act guidance</p>
          </div>
        </div>

        <div className="h-[calc(100vh-220px)] min-h-[500px]">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Ask about EU AI Act compliance, risk assessment, documentation..."
            quickActions={QUICK_ACTIONS}
            color="sage"
            assistantName="SENTINEL AI"
            assistantIcon={Shield}
          />
        </div>
      </div>
    </SentinelPageTransition>
  );
}
