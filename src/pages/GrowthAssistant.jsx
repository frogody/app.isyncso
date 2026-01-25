import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { useComposio } from "@/hooks/useComposio";
import {
  TrendingUp, Search, Building2, Users, Mail, Target, Loader2, Send,
  RefreshCw, Bot, User, AlertCircle, Sparkles, Database, Zap, Link2,
  CheckCircle, XCircle, Clock, MessageSquare, Calendar, FileSpreadsheet,
  Brain, ChevronRight, ExternalLink, X, Plus
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/components/hooks/useLocalStorage";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Integration icons mapping
const INTEGRATION_ICONS = {
  gmail: Mail,
  hubspot: Building2,
  calendar: Calendar,
  sheets: FileSpreadsheet,
  teams: MessageSquare,
  slack: MessageSquare,
};

const INTEGRATION_COLORS = {
  gmail: "text-red-400 bg-red-500/10 border-red-500/20",
  hubspot: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  calendar: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  sheets: "text-green-400 bg-green-500/10 border-green-500/20",
  teams: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  slack: "text-pink-400 bg-pink-500/10 border-pink-500/20",
};

// RAG Insight component
function RAGInsight({ insight }) {
  const IconComponent = INTEGRATION_ICONS[insight.sourceType] || Database;
  const colorClass = INTEGRATION_COLORS[insight.sourceType] || "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-3 rounded-xl border bg-zinc-800/50 hover:bg-zinc-800/70 transition-colors cursor-pointer",
        "border-zinc-700/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg border", colorClass)}>
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200 line-clamp-2">{insight.content}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-400">
              {insight.sourceType}
            </Badge>
            <span className="text-[10px] text-zinc-500">
              {Math.round(insight.similarity * 100)}% match
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Integration Status Card
function IntegrationStatus({ integration, connected, lastSync, onConnect, onSync }) {
  const IconComponent = INTEGRATION_ICONS[integration] || Database;
  const colorClass = INTEGRATION_COLORS[integration] || "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg border", colorClass)}>
          <IconComponent className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-white capitalize">{integration}</p>
          {connected && lastSync && (
            <p className="text-[10px] text-zinc-500">
              Synced {new Date(lastSync).toLocaleString()}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-400" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSync(integration)}
              className="h-7 px-2 text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Sync
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={() => onConnect(integration)}
            className="h-7 bg-indigo-600/80 hover:bg-indigo-600"
          >
            <Link2 className="w-3 h-3 mr-1" />
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

// Chat Message component
function ChatMessage({ message, isLast }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
        </div>
      )}

      <div className={cn("flex flex-col gap-1 max-w-[80%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            isUser
              ? "bg-indigo-600 text-white"
              : "bg-zinc-800/80 text-zinc-200 border border-white/5"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-li:my-1 prose-code:text-indigo-400 prose-code:bg-indigo-950/30 prose-code:px-1 prose-code:rounded"
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        {message.ragContext && message.ragContext.length > 0 && (
          <div className="mt-2 px-2">
            <p className="text-[10px] text-zinc-500 mb-1.5 flex items-center gap-1">
              <Brain className="w-3 h-3" />
              RAG Context ({message.ragContext.length} sources)
            </p>
            <div className="space-y-1">
              {message.ragContext.slice(0, 3).map((ctx, i) => (
                <div key={i} className="text-[10px] text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded-lg">
                  {ctx.sourceType}: {ctx.content?.substring(0, 100)}...
                </div>
              ))}
            </div>
          </div>
        )}
        <span className="text-[10px] text-zinc-600 px-2">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-zinc-300" />
        </div>
      )}
    </motion.div>
  );
}

// Typing indicator
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
        <TrendingUp className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="bg-zinc-800/80 rounded-2xl px-4 py-3 border border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function GrowthAssistant() {
  const { user, isLoading: userLoading } = useUser();
  const composio = useComposio();

  // Chat state
  const [sessionId, setSessionId] = useLocalStorage("growth_assistant_session", null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // RAG state
  const [ragInsights, setRagInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Integrations state
  const [integrations, setIntegrations] = useState({
    gmail: { connected: false, lastSync: null },
    hubspot: { connected: false, lastSync: null },
    calendar: { connected: false, lastSync: null },
    sheets: { connected: false, lastSync: null },
    teams: { connected: false, lastSync: null },
  });
  const [syncingIntegration, setSyncingIntegration] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize session
  useEffect(() => {
    if (user?.id && !sessionId) {
      setSessionId(`growth_${user.id}_${Date.now()}`);
    }
  }, [user, sessionId]);

  // Load integration status
  useEffect(() => {
    if (user?.id) {
      loadIntegrationStatus();
    }
  }, [user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const loadIntegrationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("user_integrations")
        .select("toolkit_slug, status, last_used_at, connected_at")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!error && data) {
        const statusMap = { ...integrations };
        for (const integration of data) {
          const slug = integration.toolkit_slug.toLowerCase();
          if (statusMap[slug] !== undefined) {
            statusMap[slug] = {
              connected: true,
              lastSync: integration.last_used_at || integration.connected_at,
            };
          }
        }
        setIntegrations(statusMap);
      }
    } catch (err) {
      console.error("Failed to load integration status:", err);
    }
  };

  const handleConnect = (integration) => {
    window.location.href = createPageUrl(`Integrations?connect=${integration}`);
  };

  const handleSync = async (integration) => {
    setSyncingIntegration(integration);
    try {
      // Call SYNC edge function with sync request
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            message: `Sync my ${integration} data and index it for search`,
            sessionId,
            context: {
              userId: user?.id,
              companyId: user?.company_id,
              requestType: "integration_sync",
              integration,
            },
          }),
        }
      );

      if (response.ok) {
        // Update last sync time
        setIntegrations((prev) => ({
          ...prev,
          [integration]: { ...prev[integration], lastSync: new Date().toISOString() },
        }));
      }
    } catch (err) {
      console.error(`Failed to sync ${integration}:`, err);
    } finally {
      setSyncingIntegration(null);
    }
  };

  const fetchRAGInsights = async (query) => {
    setLoadingInsights(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            message: query,
            sessionId,
            context: {
              userId: user?.id,
              companyId: user?.company_id,
              requestType: "rag_search_only",
              includeIntegrations: true,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.ragContext) {
          setRagInsights(data.ragContext);
        }
      }
    } catch (err) {
      console.error("Failed to fetch RAG insights:", err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleSend = async (messageText = input) => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || isLoading) return;

    setError(null);
    setInput("");

    // Add user message
    const userMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: trimmedMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Fetch RAG insights in background
    fetchRAGInsights(trimmedMessage);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            message: trimmedMessage,
            sessionId,
            context: {
              userId: user?.id,
              companyId: user?.company_id,
              agentHint: "growth",
              includeRAG: true,
              includeIntegrations: true,
              ragConfig: {
                vectorWeight: 0.6,
                graphWeight: 0.4,
                includeIntegrations: true,
                expandRelationships: true,
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage = {
        id: `msg_${Date.now()}_resp`,
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
        ragContext: data.ragContext,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update insights from response
      if (data.ragContext) {
        setRagInsights(data.ragContext);
      }
    } catch (err) {
      console.error("Growth Assistant error:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(`growth_${user?.id}_${Date.now()}`);
    setRagInsights([]);
    setError(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: "Research a company", prompt: "Research stripe.com - give me a full company profile", icon: Building2 },
    { label: "Find prospects", prompt: "Help me find SaaS companies with 50-200 employees that use AWS", icon: Search },
    { label: "Build ICP", prompt: "Help me define my ideal customer profile for a B2B SaaS product", icon: Target },
    { label: "Draft outreach", prompt: "Help me write a cold email to a VP of Engineering at a fintech startup", icon: Mail },
    { label: "Search emails", prompt: "Find emails from prospects about pricing or demo requests", icon: Mail },
    { label: "Pipeline insights", prompt: "Analyze my current pipeline and suggest next actions", icon: TrendingUp },
  ];

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-16 w-full bg-zinc-800 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Skeleton className="lg:col-span-3 h-[500px] bg-zinc-800 rounded-xl" />
            <Skeleton className="h-[500px] bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          icon={TrendingUp}
          title="Growth Assistant"
          subtitle="AI-powered research with RAG across all your integrations"
          color="indigo"
          actions={
            <div className="flex gap-2">
              <Link to={createPageUrl("Integrations")}>
                <Button variant="outline" className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700">
                  <Link2 className="w-4 h-4 mr-2" />
                  Integrations
                </Button>
              </Link>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <div className="h-[calc(100vh-180px)] min-h-[450px] flex flex-col rounded-xl bg-zinc-900/50 border border-zinc-800/60 overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-xs">Growth AI</h3>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      RAG-powered with integration context
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNewChat}
                  className="text-zinc-400 hover:text-white gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </Button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4 py-6">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-3">
                      <TrendingUp className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h4 className="text-base font-medium text-white mb-2">Growth Research Assistant</h4>
                    <p className="text-xs text-zinc-500 mb-4 max-w-md">
                      I can help research companies, find prospects, and analyze your pipeline using data from all your connected integrations.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
                      {quickActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(action.prompt)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 text-[10px] hover:bg-zinc-800 hover:border-indigo-500/30 transition-all"
                        >
                          <action.icon className="w-3 h-3 text-indigo-400/70" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <AnimatePresence mode="popLayout">
                      {messages.map((message) => (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          isLast={message === messages[messages.length - 1]}
                        />
                      ))}
                    </AnimatePresence>
                    {isLoading && <TypingIndicator />}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-zinc-800/60">
                <div className="flex items-end gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about companies, prospects, or search your integrations..."
                    disabled={isLoading}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500",
                      "focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  />
                  <Button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "h-12 w-12 rounded-xl transition-all",
                      input.trim()
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : "bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Integrations & Insights */}
          <div className="space-y-3">
            {/* Integration Status */}
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Database className="w-3 h-3 text-indigo-400" />
                  Data Sources
                </h3>
                <Link to={createPageUrl("Integrations")} className="text-[10px] text-indigo-400 hover:text-indigo-300">
                  Manage
                </Link>
              </div>
              <div className="space-y-1.5">
                {Object.entries(integrations).map(([key, value]) => (
                  <IntegrationStatus
                    key={key}
                    integration={key}
                    connected={value.connected}
                    lastSync={value.lastSync}
                    onConnect={handleConnect}
                    onSync={handleSync}
                  />
                ))}
              </div>
              {syncingIntegration && (
                <div className="mt-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-[10px] text-indigo-400 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Syncing {syncingIntegration}...
                  </p>
                </div>
              )}
            </div>

            {/* RAG Insights Panel */}
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  RAG Insights
                </h3>
                {loadingInsights && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
              </div>

              {ragInsights.length > 0 ? (
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                  {ragInsights.slice(0, 8).map((insight, i) => (
                    <RAGInsight key={i} insight={insight} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Brain className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">
                    {messages.length > 0
                      ? "No relevant context found"
                      : "Ask a question to see relevant context"}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 p-3">
              <h3 className="text-xs font-semibold text-white flex items-center gap-2 mb-2">
                <Zap className="w-3 h-3 text-indigo-400" />
                Quick Actions
              </h3>
              <div className="space-y-1">
                <Link to={createPageUrl("GrowthResearch")}>
                  <Button variant="ghost" className="w-full justify-start text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 text-xs">
                    <Search className="w-3 h-3 mr-2" />
                    Deep Research
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </Button>
                </Link>
                <Link to={createPageUrl("GrowthPipeline")}>
                  <Button variant="ghost" className="w-full justify-start text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 text-xs">
                    <Target className="w-3 h-3 mr-2" />
                    View Pipeline
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </Button>
                </Link>
                <Link to={createPageUrl("GrowthProspects")}>
                  <Button variant="ghost" className="w-full justify-start text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 text-xs">
                    <Users className="w-3 h-3 mr-2" />
                    Prospect Lists
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
