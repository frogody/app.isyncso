import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from "@/api/supabaseClient";
import { 
  Send, Plus, Lock, Menu, Upload, Cpu, FileText, BookOpen, X, Search, Brain, Zap, GraduationCap, Target, TrendingUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import AgentChatSidebar from "./AgentChatSidebar";
import AgentChatMessage from "./AgentChatMessage";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLOR_MAP = {
  sage: {
    bg: "bg-[#86EFAC]",
    text: "text-[#86EFAC]",
    border: "border-[#86EFAC]/20", 
    hover: "hover:bg-[#86EFAC]/10",
    glow: "shadow-[0_0_20px_rgba(134,239,172,0.3)]"
  },
  red: {
    bg: "bg-red-600",
    text: "text-red-500", 
    border: "border-red-500/20",
    hover: "hover:bg-red-500/10",
    glow: "shadow-[0_0_20px_rgba(220,38,38,0.3)]"
  },
  blue: {
    bg: "bg-blue-600",
    text: "text-blue-500",
    border: "border-blue-500/20", 
    hover: "hover:bg-blue-500/10",
    glow: "shadow-[0_0_20px_rgba(37,99,235,0.3)]"
  },
  cyan: {
    bg: "bg-cyan-600",
    text: "text-cyan-500",
    border: "border-cyan-500/20", 
    hover: "hover:bg-cyan-500/10",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.3)]"
  },
  teal: {
    bg: "bg-teal-600",
    text: "text-teal-500",
    border: "border-teal-500/20", 
    hover: "hover:bg-teal-500/10",
    glow: "shadow-[0_0_20px_rgba(20,184,166,0.3)]"
  },
  indigo: {
    bg: "bg-indigo-600",
    text: "text-indigo-400",
    border: "border-indigo-500/20",
    hover: "hover:bg-indigo-500/10",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.3)]"
  },
  yellow: {
    bg: "bg-yellow-600",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
    hover: "hover:bg-yellow-500/10",
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.3)]"
  }
};

export default function AgentChatInterface({ 
  agentName, title, logo, 
  accentColor = "red", isComingSoon = false, transparentLogo = false 
}) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  
  // Separate backend messages and pending local messages
  const [messages, setMessages] = useState([]);
  const [pendingMessages, setPendingMessages] = useState([]);
  
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  
  const scrollRef = useRef(null);
  const colors = useMemo(() => COLOR_MAP[accentColor] || COLOR_MAP.red, [accentColor]);

  // Combined messages for display
  const displayMessages = useMemo(() => {
    const backendContentSet = new Set(messages.filter(m => m.role === 'user').map(m => m.content));
    const filteredPending = pendingMessages.filter(pm => !backendContentSet.has(pm.content));
    return [...messages, ...filteredPending];
  }, [messages, pendingMessages]);

  const isWaitingForResponse = useMemo(() => {
    return displayMessages.length > 0 && displayMessages[displayMessages.length - 1].role === 'user';
  }, [displayMessages]);

  const loadConversations = React.useCallback(async () => {
    if (!isComingSoon) {
      try {
        const convs = await db.agents.listConversations({ agent_name: agentName });
        setConversations(convs);
        if (convs.length > 0) setActiveConversationId(convs[0].id);
      } catch (e) {
        console.error("Failed to load conversations", e);
      }
    }
  }, [agentName, isComingSoon]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Subscribe to messages
  useEffect(() => {
    if (activeConversationId) {
      setMessages([]); // Clear backend messages on switch
      // We do NOT clear pending messages here automatically, as they might belong to the new conversation if we just created it.
      // However, if we switch MANUALLY, we should clear pending. 
      // For now, we'll assume pending are tied to the active interaction.
      // Better safety: clear pending if the conversation switch was NOT due to creation.
      // But we can rely on the deduplication in displayMessages.
      
      const unsubscribe = db.agents.subscribeToConversation(activeConversationId, (data) => {
        setMessages(prev => {
          const newMessages = data.messages || [];
          // Protection against empty updates clearing the chat history
          if (prev.length > 0 && newMessages.length === 0) {
            return prev;
          }
          return newMessages;
        });
      });
      return () => unsubscribe();
    }
  }, [activeConversationId]);

  // Clear pending messages when we successfully receive them from backend
  useEffect(() => {
    if (messages.length > 0 && pendingMessages.length > 0) {
      // If we see our pending messages in the backend list, we can clear them from pending
      // This is handled by the displayMessages memo, but we should cleanup state
      const backendContentSet = new Set(messages.filter(m => m.role === 'user').map(m => m.content));
      const remainingPending = pendingMessages.filter(pm => !backendContentSet.has(pm.content));
      
      if (remainingPending.length !== pendingMessages.length) {
        setPendingMessages(remainingPending);
      }
    }
  }, [messages, pendingMessages]);

  // Scroll on messages change
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
         if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
         }
      }, 100);
    }
  }, [displayMessages.length, loading]);

  const handleCreateConversation = React.useCallback(async () => {
     try {
       const newConv = await db.agents.createConversation({
         agent_name: agentName,
         metadata: { name: "New Conversation" }
       });
       setConversations([newConv, ...conversations]);
       setActiveConversationId(newConv.id);
       setPendingMessages([]); // Clear pending on manual new chat
       setMessages([]);
       setIsSidebarOpen(false);
     } catch (e) {
       console.error("Failed to create conversation", e);
     }
  }, [agentName, conversations]);

  const handleFileUpload = React.useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const result = await db.integrations.Core.UploadFile({ file });
        return {
          name: file.name,
          url: result.file_url,
          type: file.type
        };
      });

      const uploaded = await Promise.all(uploadPromises);
      setAttachedFiles(prev => [...prev, ...uploaded]);
    } catch (error) {
      console.error("Failed to upload files:", error);
      alert("Failed to upload files");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleQuickAction = React.useCallback((action) => {
    let message = "";
    
    switch(action) {
      // Sentinel actions
      case "systems":
        message = "Show me all my registered AI systems with their risk classifications";
        break;
      case "obligations":
        message = "What are my upcoming compliance obligations and deadlines?";
        break;
      case "guide":
        message = "Give me a step-by-step guide on how to classify a new AI system";
        break;
      
      // Learn actions
      case "recommend":
        message = "Recommend courses based on my current skills and learning goals";
        break;
      case "progress":
        message = "Show me my learning progress and achievements";
        break;
      case "skillgaps":
        message = "Analyze my skill gaps and suggest courses to fill them";
        break;
      
      // CIDE actions
      case "icp":
        message = "Help me define my Ideal Customer Profile with strategic criteria";
        break;
      case "lists":
        message = "Show me my prospect lists and their performance metrics";
        break;
      case "research":
        message = "Research a company and evaluate their fit as a prospect";
        break;
      
      // Universal actions
      case "websearch":
        message = "Search the web for: ";
        setInputValue(message);
        return; // Let user complete the query
      case "deepthink":
        message = "Use extended reasoning to analyze: ";
        setInputValue(message);
        return; // Let user complete the query
      
      default:
        return;
    }

    setInputValue(message);
  }, []);

  const handleSendMessage = React.useCallback(async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || loading) return;
    
    const content = inputValue || "Uploaded files for analysis";
    const fileUrls = attachedFiles.map(f => f.url);
    
    setInputValue("");
    setAttachedFiles([]);
    setLoading(true);

    // Add to pending messages immediately
    setPendingMessages(prev => [...prev, { role: "user", content }]);

    try {
      let convId = activeConversationId;
      
      // Create conversation if needed
      if (!convId) {
        const newConv = await db.agents.createConversation({
          agent_name: agentName,
          metadata: { name: content.substring(0, 30) + "..." }
        });
        setConversations([newConv, ...conversations]);
        setActiveConversationId(newConv.id);
        convId = newConv.id;
      }

      // Fetch full conversation object to ensure proper agent triggering
      const conversation = await db.agents.getConversation(convId);
      await db.agents.addMessage(conversation, {
        role: "user",
        content: content,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined
      });
      
    } catch (e) {
      console.error("Failed to send message", e);
      // Remove from pending on failure
      setPendingMessages(prev => prev.filter(m => m.content !== content));
    } finally {
      setLoading(false);
    }
  }, [inputValue, attachedFiles, loading, activeConversationId, agentName, conversations]);

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden relative">
      {/* Mobile Sidebar Trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 border-r border-white/10 bg-black">
            <AgentChatSidebar 
              logo={logo} title={title} conversations={conversations} 
              activeId={activeConversationId} onSelect={(id) => { setActiveConversationId(id); setIsSidebarOpen(false); }} 
              onCreate={handleCreateConversation} colors={colors}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 flex-shrink-0 h-full">
        <AgentChatSidebar 
          logo={logo} title={title} conversations={conversations} 
          activeId={activeConversationId} onSelect={setActiveConversationId} 
          onCreate={handleCreateConversation} colors={colors}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Header (Mobile only) */}
        <div className="lg:hidden h-16 flex items-center justify-center border-b border-white/5 bg-black/50 backdrop-blur-md">
          <span className="font-bold text-lg tracking-wider">{title}</span>
        </div>

        {isComingSoon ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 z-10" />
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${colors.bg} opacity-5 blur-[100px] rounded-full animate-pulse`} />
            <div className="relative z-20 space-y-6">
              <div className="w-24 h-24 mx-auto relative flex items-center justify-center">
                <div className={`absolute w-full h-full rounded-full border-t-[4px] border-l-[2px] blur-[2px] animate-spin ${accentColor === 'red' ? 'border-red-400/50' : 'border-cyan-400/50'}`} style={{ animationDuration: '4s' }} />
                <div className={`absolute w-[80%] h-[80%] rounded-full border-b-[4px] border-r-[2px] blur-[3px] animate-spin ${accentColor === 'red' ? 'border-red-600/50' : 'border-teal-600/50'}`} style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
                <div className={`absolute w-[60%] h-[60%] rounded-full border-t-[3px] blur-[1px] animate-spin ${accentColor === 'red' ? 'border-red-200/60' : 'border-cyan-200/60'}`} style={{ animationDuration: '2s' }} />
                <div className={`absolute w-[30%] h-[30%] blur-xl rounded-full ${accentColor === 'red' ? 'bg-red-500/30' : 'bg-teal-500/30'}`} />
                <div className="absolute w-[20%] h-[20%] bg-white/80 blur-md rounded-full" />
                <div className="relative z-10 w-8 h-8 flex items-center justify-center">
                  {React.cloneElement(logo, { className: `w-full h-full ${logo.props.className || ''}` })}
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center gap-3 justify-center flex-wrap">
                <span className="text-white">{title}</span>
                <div className="flex items-center gap-2">
                  <span className={colors.text}>2.0</span>
                  {accentColor === 'red' && (
                    <span className="px-2 py-1 text-xs rounded-md bg-red-500/20 text-red-200 border border-red-400/30">Early Beta</span>
                  )}
                </div>
              </h1>
              <p className="text-gray-400 max-w-md mx-auto text-lg">
                Our next-generation AI agent is currently in development. Stay tuned for updates.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
                <Lock size={14} />
                <span>Access Restricted</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto relative" ref={scrollRef}>
              {displayMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 mb-6 relative flex items-center justify-center">
                  <div className={`absolute w-full h-full rounded-full border-t-[4px] border-l-[2px] blur-[2px] animate-spin ${accentColor === 'sage' ? 'border-[#86EFAC]/50' : accentColor === 'teal' ? 'border-teal-400/50' : accentColor === 'indigo' ? 'border-indigo-400/50' : 'border-yellow-400/50'}`} style={{ animationDuration: '4s' }} />
                  <div className={`absolute w-[80%] h-[80%] rounded-full border-b-[4px] border-r-[2px] blur-[3px] animate-spin ${accentColor === 'sage' ? 'border-[#6EE7B7]/50' : accentColor === 'teal' ? 'border-teal-600/50' : accentColor === 'indigo' ? 'border-indigo-600/50' : 'border-yellow-600/50'}`} style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
                  <div className={`absolute w-[60%] h-[60%] rounded-full border-t-[3px] blur-[1px] animate-spin ${accentColor === 'sage' ? 'border-[#A7F3D0]/60' : accentColor === 'teal' ? 'border-teal-200/60' : accentColor === 'indigo' ? 'border-indigo-200/60' : 'border-yellow-200/60'}`} style={{ animationDuration: '2s' }} />
                  <div className={`absolute w-[30%] h-[30%] blur-xl rounded-full ${accentColor === 'sage' ? 'bg-[#86EFAC]/30' : accentColor === 'teal' ? 'bg-teal-500/30' : accentColor === 'indigo' ? 'bg-indigo-500/30' : 'bg-yellow-500/30'}`} />
                  <div className="absolute w-[20%] h-[20%] bg-white/80 blur-md rounded-full" />
                </div>
                  <h2 className="text-3xl font-bold mb-3 text-white">How can I help you?</h2>
                  <p className="text-gray-500 max-w-md">
                    {agentName === "sentinel" 
                      ? "Ask me about EU AI Act compliance or your registered AI systems"
                      : agentName === "learn_assistant"
                      ? "Ask me about courses, learning paths, or your progress"
                      : agentName === "cide_assistant"
                      ? "Ask me about prospect research, ICP definition, or lead lists"
                      : "Ask me about anything or optimizing your campaigns"
                    }
                  </p>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto p-4 pb-32 space-y-6 pt-8">
                  {displayMessages.map((msg, idx) => (
                    <AgentChatMessage 
                      key={idx} 
                      msg={msg} 
                      logo={logo} 
                      transparentLogo={transparentLogo} 
                    />
                  ))}
                  {(loading || isWaitingForResponse) && (
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-8 h-8 flex items-center justify-center shrink-0",
                        transparentLogo
                          ? ""
                          : "rounded-lg border border-white/10 bg-[#1a1a1a]"
                      )}>
                        {React.cloneElement(logo, { className: "w-5 h-5" })}
                      </div>
                      <div className="flex items-center gap-1 h-8 px-2">
                        <div className={`w-1.5 h-1.5 ${colors.bg} rounded-full animate-bounce`} />
                        <div className={`w-1.5 h-1.5 ${colors.bg} rounded-full animate-bounce [animation-delay:0.2s]`} />
                        <div className={`w-1.5 h-1.5 ${colors.bg} rounded-full animate-bounce [animation-delay:0.4s]`} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 md:p-6 max-w-5xl mx-auto w-full absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent">
              {/* Attached Files */}
              {attachedFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm">
                      <FileText className={`w-4 h-4 ${colors.text}`} />
                      <span className="text-gray-300 truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative flex items-center gap-2 bg-[#1a1a1a] rounded-2xl border border-white/10 p-2 shadow-xl">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-gray-400 hover:text-white rounded-xl"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Plus size={20} />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-[#1a1a1a] border-white/10 w-64">
                    <DropdownMenuItem 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-gray-300 hover:text-white cursor-pointer"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Documents
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={() => handleQuickAction("websearch")}
                      className="text-gray-300 hover:text-white cursor-pointer"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Search the Web
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={() => handleQuickAction("deepthink")}
                      className="text-gray-300 hover:text-white cursor-pointer"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Deep Thinking Mode
                    </DropdownMenuItem>
                    
                    {agentName === "sentinel" && (
                      <>
                        <div className="h-px bg-white/10 my-1" />
                        <DropdownMenuItem 
                          onClick={() => handleQuickAction("systems")}
                          className="text-gray-300 hover:text-white cursor-pointer"
                        >
                          <Cpu className="w-4 h-4 mr-2" />
                          View AI Systems
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleQuickAction("obligations")}
                          className="text-gray-300 hover:text-white cursor-pointer"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Compliance Obligations
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleQuickAction("guide")}
                          className="text-gray-300 hover:text-white cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          Classification Guide
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {agentName === "learn_assistant" && (
                      <>
                        <div className="h-px bg-white/10 my-1" />
                        <DropdownMenuItem 
                          onClick={() => handleQuickAction("recommend")}
                          className="text-gray-300 hover:text-white cursor-pointer"
                        >
                          <GraduationCap className="w-4 h-4 mr-2" />
                          Recommend Courses
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleQuickAction("progress")}
                          className="text-gray-300 hover:text-white cursor-pointer"
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          View My Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleQuickAction("skillgaps")}
                          className="text-gray-300 hover:text-white cursor-pointer"
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Analyze Skill Gaps
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {agentName === "cide_assistant" && (
                      <>
                        <div className="h-px bg-white/10 my-1" />
                        <DropdownMenuItem 
                          onClick={() => handleQuickAction("icp")}
                          className="text-gray-300 hover:text-white cursor-pointer"
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Define ICP
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleQuickAction("lists")}
                          className="text-gray-300 hover:text-white cursor-pointer"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Prospect Lists
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleQuickAction("research")}
                          className="text-gray-300 hover:text-white cursor-pointer"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Research Company
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Ask a question..." 
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 text-white placeholder-gray-500 h-10"
                />
                <Button 
                  size="icon" 
                  onClick={handleSendMessage}
                  disabled={(!inputValue.trim() && attachedFiles.length === 0) || loading}
                  className={cn(
                    "rounded-xl transition-all",
                    (inputValue.trim() || attachedFiles.length > 0) ? `${colors.bg} text-white hover:opacity-90` : "bg-[#2a2a2a] text-gray-600"
                  )}
                >
                  <Send size={18} />
                </Button>
              </div>
              <div className="text-center mt-2">
                <p className="text-[10px] text-gray-600">
                  AI can make mistakes. Verify important information.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}