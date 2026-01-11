import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { TrendingUp, Search, Building2, Users, Mail, Target } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChatInterface } from "@/components/ui/ChatInterface";
import { Skeleton } from "@/components/ui/skeleton";

export default function GrowthAssistant() {
  const { user, isLoading: userLoading } = useUser();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    initConversation();
  }, [user]);

  const initConversation = async () => {
    if (!user) return;
    try {
      const conversation = await db.agents.createConversation({
        agent_name: "growth_assistant",
        metadata: { name: "Growth Research Session", user_id: user.id }
      });
      setConversationId(conversation.id);
    } catch (error) {
      console.error("Failed to init conversation:", error);
    }
  };

  const handleSendMessage = async (content) => {
    if (!conversationId) return;

    const userMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversation = await db.agents.getConversation(conversationId);
      await db.agents.addMessage(conversation, { role: 'user', content });

      const unsubscribe = db.agents.subscribeToConversation(conversationId, (data) => {
        if (data.messages) {
          setMessages(data.messages);
        }
      });

      setTimeout(() => {
        unsubscribe();
        setIsLoading(false);
      }, 60000); // Longer timeout for Explorium calls

    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I encountered an error while researching. Please try again."
      }]);
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Research a company", prompt: "Research stripe.com - give me a full company profile", icon: Building2 },
    { label: "Find prospects", prompt: "Help me find SaaS companies with 50-200 employees that use AWS", icon: Search },
    { label: "Build ICP", prompt: "Help me define my ideal customer profile for a B2B SaaS product", icon: Target },
    { label: "Draft outreach", prompt: "Help me write a cold email to a VP of Engineering at a fintech startup", icon: Mail },
  ];

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-2xl" />
          <Skeleton className="h-[600px] bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 lg:px-8 py-6 space-y-6">
        <PageHeader
          icon={TrendingUp}
          title="Growth Assistant"
          subtitle="AI-powered prospect research with Explorium data"
          color="indigo"
        />

        <div className="h-[calc(100vh-220px)] min-h-[500px]">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Ask about any company, find prospects, or get outreach help..."
            quickActions={quickActions}
            color="indigo"
            assistantName="Growth AI"
            assistantIcon={TrendingUp}
          />
        </div>
      </div>
    </div>
  );
}