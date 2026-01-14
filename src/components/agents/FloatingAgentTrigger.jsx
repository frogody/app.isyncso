import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hand, Play, ExternalLink } from "lucide-react";
import { db } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { ChatInterface } from "@/components/ui/ChatInterface";
import { Shield, TrendingUp, BookOpen, FileText, AlertTriangle, CheckCircle, Building2, Search, Target, Mail } from "lucide-react";
import AgentControlOverlay from "./AgentControlOverlay";
import AgentActionCard from "./AgentActionCard";
import { useAgentControl } from "./useAgentControl";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const AGENT_CONFIGS = {
  growth: {
    name: "growth_assistant",
    title: "Growth AI",
    icon: TrendingUp,
    color: "indigo",
    colorClasses: {
      bg: "bg-indigo-500",
      bgLight: "bg-indigo-500/20",
      border: "border-indigo-500/30",
      text: "text-indigo-400",
      glow: "shadow-[0_0_20px_rgba(99,102,241,0.4)]"
    },
    placeholder: "Ask about any company, find prospects, or get outreach help...",
    quickActions: [
      { label: "Research a company", prompt: "Research stripe.com - give me a full company profile", icon: Building2 },
      { label: "Find prospects", prompt: "Help me find SaaS companies with 50-200 employees that use AWS", icon: Search },
      { label: "Build ICP", prompt: "Help me define my ideal customer profile for a B2B SaaS product", icon: Target },
      { label: "Draft outreach", prompt: "Help me write a cold email to a VP of Engineering at a fintech startup", icon: Mail },
    ]
  },
  sentinel: {
    name: "sentinel",
    title: "SENTINEL AI",
    icon: Shield,
    color: "sage",
    colorClasses: {
      bg: "bg-[#86EFAC]",
      bgLight: "bg-[#86EFAC]/20",
      border: "border-[#86EFAC]/30",
      text: "text-[#86EFAC]",
      glow: "shadow-[0_0_20px_rgba(134,239,172,0.4)]"
    },
    placeholder: "Ask about EU AI Act compliance, risk assessment, documentation...",
    quickActions: [
      { label: "Check compliance status", prompt: "What's the compliance status of my AI systems?", icon: CheckCircle },
      { label: "EU AI Act requirements", prompt: "What are the key requirements of the EU AI Act?", icon: FileText },
      { label: "Risk classification help", prompt: "Help me understand AI risk classification", icon: AlertTriangle },
      { label: "Generate documentation", prompt: "What documentation do I need for a high-risk AI system?", icon: FileText },
    ]
  },
  learn: {
    name: "learn_assistant",
    title: "Learn AI",
    icon: BookOpen,
    color: "cyan",
    colorClasses: {
      bg: "bg-cyan-500",
      bgLight: "bg-cyan-500/20",
      border: "border-cyan-500/30",
      text: "text-cyan-400",
      glow: "shadow-[0_0_20px_rgba(6,182,212,0.4)]"
    },
    placeholder: "Ask about courses, learning paths, or get study help...",
    quickActions: [
      { label: "Recommend a course", prompt: "What course should I take next based on my progress?", icon: BookOpen },
      { label: "Explain a concept", prompt: "Help me understand machine learning basics", icon: Target },
    ]
  },
  finance: {
    name: "finance_assistant",
    title: "Finance AI",
    icon: FileText,
    color: "amber",
    colorClasses: {
      bg: "bg-amber-500",
      bgLight: "bg-amber-500/20",
      border: "border-amber-500/30",
      text: "text-amber-400",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.4)]"
    },
    placeholder: "Ask about invoices, proposals, expenses, or financial reports...",
    quickActions: [
      { label: "Create invoice", prompt: "Help me create a new invoice", icon: FileText },
      { label: "View financial summary", prompt: "Show me a summary of my finances", icon: TrendingUp },
      { label: "Track expenses", prompt: "Help me track my business expenses", icon: AlertTriangle },
    ]
  },
  raise: {
    name: "raise_assistant",
    title: "Raise AI",
    icon: TrendingUp,
    color: "orange",
    colorClasses: {
      bg: "bg-orange-500",
      bgLight: "bg-orange-500/20",
      border: "border-orange-500/30",
      text: "text-orange-400",
      glow: "shadow-[0_0_20px_rgba(249,115,22,0.4)]"
    },
    placeholder: "Ask about fundraising, investor relations, or pitch preparation...",
    quickActions: [
      { label: "Prepare pitch deck", prompt: "Help me prepare for an investor pitch", icon: Target },
      { label: "Fundraising strategy", prompt: "What's the best fundraising strategy for my stage?", icon: TrendingUp },
    ]
  },
  create: {
    name: "create_assistant",
    title: "Create AI",
    icon: FileText,
    color: "rose",
    colorClasses: {
      bg: "bg-rose-500",
      bgLight: "bg-rose-500/20",
      border: "border-rose-500/30",
      text: "text-rose-400",
      glow: "shadow-[0_0_20px_rgba(244,63,94,0.4)]"
    },
    placeholder: "Ask about content creation, branding, or creative assets...",
    quickActions: [
      { label: "Generate branding", prompt: "Help me create branding assets", icon: Target },
      { label: "Content ideas", prompt: "Give me content ideas for my business", icon: FileText },
    ]
  },
  talent: {
    name: "talent_assistant",
    title: "Talent AI",
    icon: Target,
    color: "violet",
    colorClasses: {
      bg: "bg-violet-500",
      bgLight: "bg-violet-500/20",
      border: "border-violet-500/30",
      text: "text-violet-400",
      glow: "shadow-[0_0_20px_rgba(139,92,246,0.4)]"
    },
    placeholder: "Ask about candidates, flight risk, outreach campaigns...",
    quickActions: [
      { label: "Analyze candidate", prompt: "Help me analyze a candidate's flight risk", icon: Target },
      { label: "Create campaign", prompt: "Help me create a recruitment outreach campaign", icon: Mail },
      { label: "Find high-risk candidates", prompt: "Show me candidates with high flight risk scores", icon: AlertTriangle },
      { label: "Draft outreach", prompt: "Help me draft a personalized outreach message", icon: Mail },
    ]
  }
};

function SpinningOrb({ color, size = 40 }) {
  const colors = AGENT_CONFIGS[color]?.colorClasses || AGENT_CONFIGS.growth.colorClasses;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className={`absolute inset-0 rounded-full ${colors.bgLight} animate-pulse`} />
      <div 
        className={`absolute inset-1 rounded-full border-t-2 border-l-1 ${colors.border} animate-spin`}
        style={{ animationDuration: '3s' }}
      />
      <div 
        className={`absolute inset-2 rounded-full border-b-2 border-r-1 ${colors.border} animate-spin`}
        style={{ animationDuration: '2s', animationDirection: 'reverse' }}
      />
      <div className={`absolute inset-0 flex items-center justify-center`}>
        <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
      </div>
    </div>
  );
}

export default function FloatingAgentTrigger({ agentType, autoOpen = false, onToggle }) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  
  // Agent control state
  const {
    isControlling,
    isPaused,
    currentAction,
    progress,
    pendingAction,
    color: controlColor,
    startControl,
    pauseControl,
    resumeControl,
    stopControl,
    proposeAction,
    clearPendingAction,
    approvePendingAction
  } = useAgentControl({
    agentType,
    onActionComplete: (action, success, error) => {
      // Add completion message to chat
      if (success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Done! ${action.completionMessage || `Successfully completed: ${action.title}`}`
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Action failed: ${error || 'Unknown error'}. Would you like me to try again?`
        }]);
      }
    }
  });
  
  const config = AGENT_CONFIGS[agentType];
  if (!config) return null;
  
  const Icon = config.icon;
  const colors = config.colorClasses;

  // Auto-open when autoOpen prop is true
  useEffect(() => {
    if (autoOpen && !isOpen) {
      setIsOpen(true);
      onToggle?.(true);
    }
  }, [autoOpen]);

  // Notify parent when panel state changes
  const handleToggle = (open) => {
    setIsOpen(open);
    onToggle?.(open);
  };

  // Removed auto-init - conversation created on first message

  // Parse agent responses for actionable suggestions
  const parseAgentResponse = useCallback((messageContent) => {
    // Check for action patterns in the response
    const actionPatterns = [
      // Learn agent patterns
      { pattern: /enroll.*course|start.*course|begin.*course/i, type: 'enroll', agent: 'learn' },
      { pattern: /navigate.*to|go.*to|open/i, type: 'navigate' },
      { pattern: /create.*progress|track.*progress/i, type: 'create', agent: 'learn' },
      // Sentinel patterns
      { pattern: /assess.*system|risk.*assessment|classify/i, type: 'assess', agent: 'sentinel' },
      { pattern: /generate.*document|create.*documentation/i, type: 'generate', agent: 'sentinel' },
      { pattern: /register.*system|add.*ai.*system/i, type: 'create', agent: 'sentinel' },
      // Growth patterns
      { pattern: /research.*company|analyze.*company/i, type: 'research', agent: 'growth' },
      { pattern: /create.*prospect|add.*prospect/i, type: 'create', agent: 'growth' },
      { pattern: /draft.*email|write.*outreach/i, type: 'generate', agent: 'growth' },
    ];

    for (const { pattern, type, agent } of actionPatterns) {
      if (pattern.test(messageContent) && (!agent || agent === agentType)) {
        return { detected: true, type };
      }
    }
    return { detected: false };
  }, [agentType]);

  const handleSendMessage = async (content) => {
    const userMessage = { role: 'user', content };
    setMessages(prev => [...(prev || []), userMessage]);
    setIsLoading(true);

    let unsubscribe = null;

    try {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        const conversation = await db.agents.createConversation({
          agent_name: config.name,
          metadata: { name: `${config.title} Session`, user_id: user?.id }
        });
        convId = conversation.id;
        setConversationId(convId);
      }

      const conversation = await db.agents.getConversation(convId);
      
      // Subscribe before sending message to catch the response
      unsubscribe = db.agents.subscribeToConversation(convId, (data) => {
        if (data && data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
          
          // Check if we have an assistant response (not just our user message)
          const hasAssistantResponse = data.messages.some(m => m.role === 'assistant');
          const lastMessage = data.messages[data.messages.length - 1];
          
          // Only stop loading when we get a complete assistant response
          if (hasAssistantResponse && lastMessage?.role === 'assistant') {
            setIsLoading(false);
          }
          
          // Check the latest assistant message for actionable content
          if (lastMessage?.role === 'assistant' && lastMessage?.proposed_action) {
            proposeAction(lastMessage.proposed_action);
          }
        }
      });

      // Send the message after subscribing
      await db.agents.addMessage(conversation, { role: 'user', content });

      // Cleanup after 60 seconds
      setTimeout(() => {
        if (unsubscribe) unsubscribe();
        setIsLoading(false);
      }, 60000);

    } catch (error) {
      console.error("Failed to send message:", error);
      if (unsubscribe) unsubscribe();
      setMessages(prev => [...(prev || []), {
        role: 'assistant',
        content: "I encountered an error. Please try again."
      }]);
      setIsLoading(false);
    }
  };

  // Handle taking back control
  const handleTakeControl = useCallback(() => {
    stopControl();
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: "🖐️ Control returned to you. Let me know if you need help with anything else!"
    }]);
  }, [stopControl]);

  return (
    <>
      {/* Agent Control Overlay - shows when AI is controlling */}
      <AgentControlOverlay
        isActive={isControlling}
        currentAction={currentAction}
        progress={progress}
        onPause={pauseControl}
        onStop={handleTakeControl}
        onResume={resumeControl}
        isPaused={isPaused}
        color={controlColor}
        agentName={config.title}
      />

      {/* Sidebar Trigger Button */}
      {!autoOpen && (
        <motion.button
          onClick={() => handleToggle(true)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${colors.bgLight} ${colors.border} border hover:scale-[1.02]`}
          whileTap={{ scale: 0.95 }}
          title={`Open ${config.title}`}
        >
          <SpinningOrb color={agentType} size={32} />
        </motion.button>
      )}

      {/* Slide-out Panel - no backdrop when autoOpen, panel is inline */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - only show when not autoOpen */}
            {!autoOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => handleToggle(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />
            )}

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`${autoOpen ? 'relative' : 'fixed right-0 top-0'} h-full w-full ${autoOpen ? '' : 'sm:w-[480px]'} bg-zinc-950 border-l border-zinc-800 ${autoOpen ? 'z-10' : 'z-50'} flex flex-col`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b border-zinc-800 ${colors.bgLight}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${colors.bgLight} ${colors.border} border`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">{config.title}</h2>
                    <p className="text-xs text-zinc-400">AI Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Take Control Button - visible when agent is controlling */}
              {isControlling && (
                <div className={`px-4 py-2 ${colors.bgLight} border-b ${colors.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className={`w-2 h-2 rounded-full ${colors.bg}`}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className={`text-xs ${colors.text}`}>AI is controlling the app</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTakeControl}
                    className="h-7 text-xs border-white/20 text-white hover:bg-white/10"
                  >
                    <Hand className="w-3 h-3 mr-1" />
                    Take Back Control
                  </Button>
                </div>
              )}

              {/* Pending Action Card */}
              {pendingAction && (
                <div className="px-4 pt-2">
                  <AgentActionCard
                    action={pendingAction}
                    onApprove={approvePendingAction}
                    onReject={clearPendingAction}
                    isExecuting={isControlling}
                    color={config.color}
                  />
                </div>
              )}

              {/* Chat Interface */}
              <div className="flex-1 overflow-hidden">
                <ChatInterface
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  placeholder={config.placeholder}
                  quickActions={config.quickActions}
                  color={config.color}
                  assistantName={config.title}
                  assistantIcon={config.icon}
                  hideHeader
                  renderCustomMessage={(msg, idx) => {
                    // Render action cards inline with messages
                    if (msg.proposed_action) {
                      const action = msg.proposed_action;
                      
                      // For company research, show a link to the company profile
                      if (action.entity === 'Prospect' && action.data?.domain) {
                        return (
                          <div key={`action-${idx}`} className="mt-3 space-y-3">
                            <AgentActionCard
                              action={action}
                              onApprove={() => {
                                proposeAction(action);
                                approvePendingAction();
                              }}
                              onReject={() => {}}
                              isExecuting={isControlling}
                              color={config.color}
                            />
                            {action.data?.firmographics && (
                              <Link 
                                to={createPageUrl(`CompanyProfile?domain=${action.data.domain}`)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400 text-sm hover:bg-indigo-500/20 transition-colors"
                                onClick={async () => {
                                  // Save company data for the profile page
                                  try {
                                    const existing = await db.entities.Company.filter({ domain: action.data.domain });
                                    if (existing.length === 0) {
                                      await db.entities.Company.create({
                                        name: action.data.company_name,
                                        domain: action.data.domain,
                                        description: action.data.description,
                                        industry: action.data.industry,
                                        size_range: action.data.company_size,
                                        website_url: action.data.website_url,
                                        firmographics: action.data.firmographics,
                                        technographics: action.data.technographics,
                                        funding_data: action.data.funding_data
                                      });
                                    }
                                  } catch (e) {
                                    console.error('Failed to save company:', e);
                                  }
                                }}
                              >
                                <ExternalLink className="w-4 h-4" />
                                View Full Company Profile
                              </Link>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <AgentActionCard
                          key={`action-${idx}`}
                          action={action}
                          onApprove={() => {
                            proposeAction(action);
                            approvePendingAction();
                          }}
                          onReject={() => {}}
                          isExecuting={isControlling}
                          color={config.color}
                        />
                      );
                    }
                    return null;
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}