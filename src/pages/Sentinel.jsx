import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { Shield, Search, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChatInterface } from "@/components/ui/ChatInterface";
import { Skeleton } from "@/components/ui/skeleton";

export default function SentinelChat() {
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
        agent_name: "sentinel",
        metadata: { name: "Compliance Session", user_id: user.id }
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
      }, 30000);

    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again."
      }]);
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Check compliance status", prompt: "What's the compliance status of my AI systems?", icon: CheckCircle },
    { label: "EU AI Act requirements", prompt: "What are the key requirements of the EU AI Act?", icon: FileText },
    { label: "Risk classification help", prompt: "Help me understand AI risk classification", icon: AlertTriangle },
    { label: "Generate documentation", prompt: "What documentation do I need for a high-risk AI system?", icon: FileText },
  ];

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-xl" />
          <Skeleton className="h-[600px] bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/3 w-96 h-96 bg-[#86EFAC]/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          icon={Shield}
          title="Ask SENTINEL"
          subtitle="Your AI compliance assistant for EU AI Act guidance"
          color="sage"
        />

        <div className="h-[calc(100vh-220px)] min-h-[500px]">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Ask about EU AI Act compliance, risk assessment, documentation..."
            quickActions={quickActions}
            color="sage"
            assistantName="SENTINEL AI"
            assistantIcon={Shield}
          />
        </div>
      </div>
    </div>
  );
}