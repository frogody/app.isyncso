import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Send, X, Loader2, Mic, MicOff, 
  Volume2, VolumeX, Sparkles, RotateCcw,
  ChevronDown, Maximize2, Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { db } from "@/api/supabaseClient";
import ReactMarkdown from "react-markdown";

// Message Bubble Component
function MessageBubble({ message, isUser }) {
  // Clean display content
  let displayContent = message?.content || '';
  displayContent = displayContent
    .replace(/\[SCREEN_CONTEXT\][\s\S]*?\[\/SCREEN_CONTEXT\]/g, '')
    .replace(/\[PROACTIVE_HELP_TRIGGER\][\s\S]*/g, '')
    .replace(/\[VISION\].*?(?=\n|$)/g, '');
  
  if (isUser && displayContent.includes("User said:")) {
    const match = displayContent.match(/User (?:said|typed):\s*(.*)/s);
    if (match) displayContent = match[1].trim();
  }
  
  displayContent = displayContent.replace(/\n{3,}/g, '\n\n').trim();
  
  if (!displayContent || displayContent.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("max-w-[85%]", isUser ? "ml-auto" : "mr-auto")}
    >
      <div className={cn(
        "rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser 
          ? "bg-teal-600 text-white rounded-br-md" 
          : "bg-zinc-800/80 text-zinc-200 rounded-bl-md border border-zinc-700/50"
      )}>
        {isUser ? (
          <p>{displayContent}</p>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              em: ({ children }) => <em className="text-teal-400">{children}</em>,
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 rounded bg-zinc-900 text-teal-400 text-xs font-mono">
                  {children}
                </code>
              ),
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-zinc-300">{children}</li>,
            }}
          >
            {displayContent}
          </ReactMarkdown>
        )}
      </div>
    </motion.div>
  );
}

// Typing Indicator
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 max-w-[60%]">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-teal-500 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{ 
              duration: 0.6, 
              repeat: Infinity, 
              delay: i * 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      <span className="text-xs text-zinc-500">AI is thinking...</span>
    </div>
  );
}

// Quick Suggestions
function QuickSuggestions({ onSelect }) {
  const suggestions = [
    "Explain this concept simply",
    "Give me an example",
    "What's the key takeaway?",
    "How do I apply this?"
  ];

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {suggestions.map((text, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(text)}
          className="px-3 py-1.5 text-xs rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-colors"
        >
          {text}
        </motion.button>
      ))}
    </div>
  );
}

export default function AITutorPanel({ 
  lesson, 
  isVisible, 
  onClose,
  onConversationReady 
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize conversation
  useEffect(() => {
    let unsubscribe;

    if (lesson && isVisible) {
      setConversation(null);
      setMessages([]);

      (async () => {
        try {
          const user = await db.auth.me();

          // Get enriched profile for personalization context
          const enrichedProfile = user.enriched_profile || {};
          const linkedinProfile = user.linkedin_profile || {};

          const newConversation = await db.agents.createConversation({
            agent_name: "learn_assistant",
            metadata: {
              lesson_id: lesson.id,
              lesson_title: lesson.title,
              lesson_content: lesson.content?.substring(0, 3000) || '',
              user_name: user.full_name || 'there',
              user_role: user.job_title || null,
              is_first_message: true,
              // Enhanced personalization context
              industry: enrichedProfile.industry || linkedinProfile.industries?.[0] || null,
              experience_level: enrichedProfile.user_experience_level || user.experience_level || 'intermediate',
              communication_style: enrichedProfile.communication_style || 'mixed',
              content_style: enrichedProfile.content_style || 'hybrid',
              key_skills: linkedinProfile.skills?.slice(0, 5) || enrichedProfile.recommended_skills?.slice(0, 5) || [],
              learning_priorities: enrichedProfile.learning_priorities?.slice(0, 3) || [],
              seniority_level: linkedinProfile.seniority_level || null,
              personalization_notes: enrichedProfile.personalization_notes || null,
            },
          });

          setConversation(newConversation);
          onConversationReady?.(newConversation);

          unsubscribe = db.agents.subscribeToConversation(
            newConversation.id,
            (data) => {
              if (data?.messages && Array.isArray(data.messages)) {
                setMessages(data.messages);
              }
            }
          );
        } catch (error) {
          console.error("Failed to initialize conversation:", error);
        }
      })();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [lesson?.id, isVisible]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (text = inputMessage) => {
    if (!text.trim() || !conversation || isLoading) return;

    setInputMessage("");
    setIsLoading(true);

    try {
      await db.agents.addMessage(conversation, {
        role: "user",
        content: text.trim(),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setConversation(null);
    setMessages([]);
  };

  const filteredMessages = messages.filter(m => m?.role !== "system");
  const showSuggestions = filteredMessages.length === 0 && !isLoading;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={cn(
            "fixed right-0 top-0 h-full bg-zinc-950/98 backdrop-blur-xl border-l border-zinc-800/50 z-50 flex flex-col",
            isExpanded ? "w-full sm:w-[600px]" : "w-full sm:w-[380px]"
          )}
        >
          {/* Header */}
          <div className="h-14 border-b border-zinc-800/50 flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-teal-500/20">
                <Brain className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <span className="text-white font-medium text-sm">AI Tutor</span>
                {conversation && (
                  <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                    Connected
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="text-zinc-400 hover:text-white h-8 w-8"
                title="New conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:flex text-zinc-400 hover:text-white h-8 w-8"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-zinc-400 hover:text-white h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {filteredMessages.length === 0 && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-purple-500/20 flex items-center justify-center mb-6 border border-teal-500/30"
                >
                  <Sparkles className="w-10 h-10 text-teal-400" />
                </motion.div>
                <h3 className="text-white font-semibold text-lg mb-2">AI Tutor Ready</h3>
                <p className="text-zinc-400 text-sm mb-6 max-w-xs">
                  Ask questions about "{lesson?.title}" and I'll help you understand better.
                </p>
              </div>
            ) : (
              <>
                {filteredMessages.map((message, index) => (
                  <MessageBubble 
                    key={index} 
                    message={message} 
                    isUser={message?.role === "user"} 
                  />
                ))}
                {isLoading && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {showSuggestions && (
            <QuickSuggestions onSelect={handleSendMessage} />
          )}

          {/* Input */}
          <div className="p-4 border-t border-zinc-800/50 flex-shrink-0">
            <div className="flex gap-2">
              <Input 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-teal-500"
                disabled={isLoading || !conversation}
              />
              <Button 
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading || !conversation}
                size="icon" 
                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 text-center">
              Press Enter to send • AI responses may vary
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}