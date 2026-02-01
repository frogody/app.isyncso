import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { BookOpen, Search, HelpCircle, Sparkles, ListChecks, Sun, Moon } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChatInterface } from "@/components/ui/ChatInterface";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from '@/contexts/GlobalThemeContext';
import { LearnPageTransition } from '@/components/learn/ui';

export default function LearnAssistant() {
  const { theme, toggleTheme, lt } = useTheme();
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
        agent_name: "learn_assistant",
        metadata: { name: "Learning Session", user_id: user.id }
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

  const getQuickActions = () => {
    const enrichedProfile = user?.enriched_profile;
    const linkedinProfile = user?.linkedin_profile;

    const industry = enrichedProfile?.industry || 'business';
    const skills = enrichedProfile?.recommended_skills || linkedinProfile?.skills || [];
    const priorities = enrichedProfile?.learning_priorities || [];
    const topSkill = skills[0] || 'AI';
    const topPriority = priorities[0] || 'AI fundamentals';
    const jobTitle = user?.job_title || '';

    const coursePrompt = jobTitle
      ? `Help me find courses relevant for a ${jobTitle} in the ${industry} industry`
      : `Help me find a course about ${topPriority}`;

    const explainPrompt = topSkill
      ? `Can you explain ${topSkill} and how it applies to ${industry}?`
      : "Can you explain machine learning in simple terms?";

    const pathPrompt = enrichedProfile
      ? `Based on my role as ${jobTitle || 'a professional'} and my goals of ${priorities.slice(0, 2).join(' and ') || 'improving AI skills'}, what should I learn next?`
      : "What should I learn next based on my progress?";

    return [
      { label: "Find a course", prompt: coursePrompt, icon: Search },
      { label: "Explain a concept", prompt: explainPrompt, icon: HelpCircle },
      { label: "Quiz me", prompt: "Quiz me on what I've learned recently", icon: ListChecks },
      { label: "Learning path", prompt: pathPrompt, icon: Sparkles },
    ];
  };

  const quickActions = getQuickActions();

  if (userLoading) {
    return (
      <div className={`min-h-screen ${lt('bg-slate-50', 'bg-black')} p-6`}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className={`h-24 w-full ${lt('bg-slate-200', 'bg-zinc-800')} rounded-2xl`} />
          <Skeleton className={`h-[600px] ${lt('bg-slate-200', 'bg-zinc-800')} rounded-2xl`} />
        </div>
      </div>
    );
  }

  return (
    <LearnPageTransition>
    <div className={`min-h-screen ${lt('bg-slate-50', 'bg-black')} relative`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/3 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 lg:px-8 py-6 space-y-6">
        <PageHeader
          icon={Sparkles}
          title="Learning Assistant"
          subtitle="Your AI-powered learning companion"
          color="teal"
          actions={
            <button onClick={toggleTheme} className={`p-2 rounded-lg border transition-colors ${lt('border-slate-200 hover:bg-slate-100 text-slate-600', 'border-zinc-700 hover:bg-zinc-800 text-zinc-400')}`}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          }
        />

        <div className="h-[calc(100vh-220px)] min-h-[500px]">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Ask about courses, concepts, or get personalized recommendations..."
            quickActions={quickActions}
            color="teal"
            assistantName="Learn AI"
            assistantIcon={BookOpen}
          />
        </div>
      </div>
    </div>
    </LearnPageTransition>
  );
}
