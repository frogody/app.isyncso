
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  MessageSquare,
  RefreshCw,
  Trash2,
  MoreHorizontal,
  Paperclip,
  Globe,
  X,
  ChevronLeft,
  ChevronRight,
  Mic,
  ArrowUp,
  Briefcase,
  User as UserIcon,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

import { chatWithCandidates } from "@/api/functions";
import { ChatConversation } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { User } from "@/api/entities";

import ChatMessage from "../components/chat/ChatMessage";
import SyncAvatar from "../components/ui/SyncAvatar";
import ThinkingIndicator from "../components/chat/ThinkingIndicator";
import CandidateSelectionModal from "../components/chat/CandidateSelectionModal";
import ProjectSidebar from "../components/projects/ProjectSidebar";
import ChatSidebar from "../components/chat/ChatSidebar";
import WelcomeScreen from "../components/chat/WelcomeScreen";
import { ChatProvider, useChatContext } from "../components/chat/ChatManager";
import CompareMode from "../components/chat/CompareMode";
import ProjectSelectionModal from "../components/chat/ProjectSelectionModal";
import MCPToolsModal from "../components/chat/MCPToolsModal";
import IconWrapper from "../components/ui/IconWrapper";
import { useIsMobile } from "../components/utils/useIsMobile";
import { haptics } from "../components/utils/haptics";

class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chat Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <style jsx>{`
            :root {
              --bg: #151A1F;
              --txt: #E9F0F1;
              --accent: #EF4444;
            }
          `}</style>
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--txt)' }}>
              Er ging iets mis
            </h1>
            <p className="mb-6" style={{ color: 'var(--txt)' }}>
              {this.state.error?.message || 'Onbekende fout'}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Pagina vernieuwen
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ChatPageContent() {
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    progress,
    currentProject,
    user,
    initialized,
    dispatch,
    loadConversations,
    startProgressPolling
   } = useChatContext();

  const [inputMessage, setInputMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMCPModal, setShowMCPModal] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [showProjectSidebar, setShowProjectSidebar] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'nl-NL';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
      };
      
      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }
        
        if (finalTranscript) {
          setInputMessage(prev => prev + finalTranscript);
        }
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleSpeechRecognition = useCallback(() => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      return;
    }
    
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [recognition, isListening]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesEndRef]); // Added messagesEndRef to dependencies

  useEffect(() => {
    scrollToBottom();
  }, [messages, progress, scrollToBottom]);

  const createNewConversation = useCallback(async (project = currentProject) => {
    if (!user) return null;

    try {
      if (currentConversation) {
        await ChatConversation.update(currentConversation.id, { is_active: false });
      }

      const welcomeMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        candidates: []
      };

      const newConversation = await ChatConversation.create({
        title: "Nieuw gesprek",
        messages: [welcomeMessage],
        last_message_at: new Date().toISOString(),
        is_active: true,
        project_id: project?.id || null,
        organization_id: user.organization_id,
      });

      dispatch({ type: 'SET_CURRENT_CONVERSATION', conversation: newConversation });
      setSelectedCandidates([]);
      loadConversations(user, project?.id || null);
      
      return newConversation;
    } catch (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
  }, [user, currentConversation, currentProject, dispatch, loadConversations]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && attachments.length === 0 && selectedCandidates.length === 0) || isLoading) {
      return;
    }

    let conversation = currentConversation;
    if (!conversation) {
      console.log("No conversation found, creating one...");
      conversation = await createNewConversation();
      if (!conversation) {
        console.error("Failed to create conversation");
        alert("Er ging iets mis bij het aanmaken van een gesprek. Probeer de pagina te vernieuwen.");
        return;
      }
    }

    const jobId = crypto.randomUUID();
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ 
      type: 'SET_PROGRESS', 
      progress: { 
        step: attachments.length > 0 ? "docs" : "analyze", 
        percent: 5, 
        status: "running" 
      } 
    });
    startProgressPolling(jobId);

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      candidates: [],
      file_urls: attachments.map(a => a.url),
      selected_candidates: selectedCandidates,
      project_id: currentProject?.id || null,
    };

    dispatch({ type: 'ADD_MESSAGE', message: userMessage });
    setInputMessage("");
    setAttachments([]);
    setSelectedCandidates([]);
    setCompareMode(false);

    try {
      const response = await chatWithCandidates({
        message: userMessage.content,
        conversation_history: messages,
        file_urls: userMessage.file_urls,
        use_web: true,
        job_id: jobId,
        selected_candidates: userMessage.selected_candidates,
        project_id: currentProject?.id || null,
        compare_mode: compareMode && selectedCandidates.length >= 2
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data.response,
        timestamp: new Date().toISOString(),
        candidates: response.data.relevant_candidates || [],
        project_id: currentProject?.id || null,
      };

      const finalMessages = [...messages, userMessage, assistantMessage];
      dispatch({ type: 'UPDATE_MESSAGES', messages: finalMessages });

      console.log("Saving conversation with", finalMessages.length, "messages to conversation", conversation.id);
      
      const title = conversation.title === "Nieuw gesprek" && finalMessages.length >= 2
        ? generateTitle(userMessage.content)
        : conversation.title;

      await ChatConversation.update(conversation.id, {
        title,
        messages: finalMessages,
        last_message_at: new Date().toISOString(),
        project_id: currentProject?.id || null,
      });
      
      console.log("Conversation saved successfully");
      loadConversations(user, currentProject?.id || null, true);

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, er ging iets mis. Probeer het opnieuw.",
        timestamp: new Date().toISOString(),
        candidates: [],
      };
      dispatch({ type: 'ADD_MESSAGE', message: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
      dispatch({ type: 'CLEAR_PROGRESS' });
    }
  };

  const reloadConversations = useCallback(() => {
    if (user) {
      loadConversations(user, currentProject?.id || null, true);
    }
  }, [user, currentProject, loadConversations]);

  const handleRegenerateMessage = useCallback(async (messageIndex) => {
    if (!currentConversation || messageIndex < 1 || isLoading) return;
    
    const userMessage = messages[messageIndex - 1]; 
    if (!userMessage || userMessage.role !== 'user') return;

    const updatedMessages = messages.slice(0, messageIndex);
    dispatch({ type: 'UPDATE_MESSAGES', messages: updatedMessages });
    
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ 
      type: 'SET_PROGRESS', 
      progress: { 
        step: userMessage.file_urls && userMessage.file_urls.length > 0 ? "docs" : "analyze", 
        percent: 5, 
        status: "running" 
      } 
    });

    try {
      const jobId = crypto.randomUUID();
      startProgressPolling(jobId);

      const response = await chatWithCandidates({
        message: userMessage.content,
        conversation_history: updatedMessages,
        file_urls: userMessage.file_urls || [],
        use_web: true,
        job_id: jobId,
        selected_candidates: userMessage.selected_candidates || [],
        project_id: currentProject?.id || null,
        compare_mode: compareMode && selectedCandidates.length >= 2
      });

      const newAssistantMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.data.response,
        timestamp: new Date().toISOString(),
        candidates: response.data.relevant_candidates || [],
        project_id: currentProject?.id || null,
      };

      const finalMessages = [...updatedMessages, newAssistantMessage];
      dispatch({ type: 'UPDATE_MESSAGES', messages: finalMessages });

      if (currentConversation) {
        await ChatConversation.update(currentConversation.id, {
          messages: finalMessages,
          last_message_at: new Date().toISOString(),
        });
        
        console.log("Regenerated conversation saved");
      }
    } catch (error) {
      console.error("Error regenerating message:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, er ging iets mis tijdens het opnieuw genereren. Probeer het opnieuw.",
        timestamp: new Date().toISOString(),
        candidates: [],
      };
      dispatch({ type: 'ADD_MESSAGE', message: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
      dispatch({ type: 'CLEAR_PROGRESS' });
    }
  }, [currentConversation, isLoading, messages, dispatch, startProgressPolling, currentProject, compareMode, selectedCandidates]);

  const handleRegenerateLastMessage = useCallback(() => {
    // We want to regenerate the assistant's response to the last user message.
    // So, we need to find the last user message's index.
    // If current conversation has `messages = [system, user1, assistant1, user2, assistant2]`,
    // and we want to regenerate assistant2, then the user message is user2 (messages.length - 2).
    // The `handleRegenerateMessage` expects the index of the *assistant message* to remove it and then regenerate.
    // So if the last message is an assistant message, we pass its index.
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      handleRegenerateMessage(messages.length - 1); 
    }
  }, [messages, handleRegenerateMessage]);

  const handleSelectFiles = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    setIsUploadingDocs(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const res = await UploadFile({ file });
        if (res.file_url) {
          uploaded.push({ name: file.name, url: res.file_url, size: file.size, type: file.type });
        }
      }
      setAttachments(prev => [...prev, ...uploaded]);
    } finally {
      setIsUploadingDocs(false);
      if (e.target) e.target.value = "";
    }
  }, []);

  const removeAttachment = useCallback((url) => {
    setAttachments(prev => prev.filter(a => a.url !== url));
  }, []);

  const handleRemoveCandidate = useCallback((candidateId) => {
    setSelectedCandidates(prev => prev.filter(c => c.id !== candidateId));
  }, []);

  const handleNewConversation = useCallback(async () => {
    haptics.light(); // For mobile, if this is called from mobile UI
    dispatch({ type: 'SET_CURRENT_CONVERSATION', conversation: null });
    dispatch({ type: 'UPDATE_MESSAGES', messages: [] });
    setInputMessage("");
    setAttachments([]);
    setSelectedCandidates([]);
    setCompareMode(false);
    // Automatically create a new one to show welcome screen
    await createNewConversation();
  }, [dispatch, createNewConversation]);

  const generateTitle = (userMessage) => {
    return userMessage.length > 50 ? userMessage.substring(0, 47) + "..." : userMessage;
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg)'}}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --surface: #1A2026;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
            --accent2: #DC2626;
          }
          body {
            background: var(--bg) !important;
            color: var(--txt) !important;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{color: 'var(--txt)'}}>SYNC laden...</p>
        </div>
      </div>
    );
  }

  // Mobile version
  if (isMobile) {
    return (
      <div className="h-screen flex overflow-hidden mobile-chat-container" style={{background: 'var(--bg)', paddingTop: 0}}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --txt: #E9F0C1;
            --muted: #B5C0C4;
            --accent: #EF4444;
          }
          body {
            background: var(--bg) !important;
            color: var(--txt) !important;
            overflow: hidden;
          }
          .btn-primary {
            background: rgba(239,68,68,.12) !important;
            color: #FFCCCB !important;
            border: 1px solid rgba(239,68,68,.3) !important;
          }
          .btn-primary:hover {
            background: rgba(239,68,68,.18) !important;
            color: #FFE5E5 !important;
          }
          .glass-card {
            background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
            border: 1px solid rgba(255,255,255,.06);
            backdrop-filter: blur(8px);
            border-radius: 16px;
          }
          .mobile-sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,.6);
            backdrop-filter: blur(4px);
            z-index: 99;
          }
          .mobile-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 80%;
            max-width: 320px;
            background: var(--bg);
            border-right: 1px solid rgba(255,255,255,.06);
            z-index: 100;
          }
          .mobile-chat-wrapper {
            height: calc(100vh - 60px);
            height: calc(100dvh - 60px);
          }
          .mobile-input-fixed {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            background: linear-gradient(to top, var(--bg) 90%, transparent);
            padding: 1rem 1rem;
            padding-bottom: max(1rem, calc(env(safe-area-inset-bottom) + 1rem));
          }
          .input-container-mobile {
            border-radius: 32px;
          }
        `}</style>

        <AnimatePresence>
          {!showMobileSidebar && (
            <motion.button
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              onClick={() => {
                haptics.light();
                setShowMobileSidebar(true);
              }}
              className="fixed top-16 left-2 z-40 w-8 h-12 rounded-r-xl flex items-center justify-center"
              style={{
                background: 'rgba(26,32,38,.95)',
                border: '1px solid rgba(255,255,255,.06)',
                borderLeft: 'none'
              }}
            >
              <ChevronRight className="w-5 h-5" style={{ color: 'var(--txt)' }} />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMobileSidebar && (
            <>
              <motion.div
                className="mobile-sidebar-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  haptics.light();
                  setShowMobileSidebar(false);
                }}
              />
              <motion.div
                className="mobile-sidebar"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--txt)' }}>Conversations</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        haptics.light();
                        setShowMobileSidebar(false);
                      }}
                    >
                      <X className="w-5 h-5" style={{ color: 'var(--txt)' }} />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ChatSidebar
                      conversations={conversations}
                      currentConversation={currentConversation}
                      currentProject={currentProject}
                      sidebarCollapsed={false}
                      setSidebarCollapsed={() => {}}
                      showProjectSidebar={showProjectSidebar}
                      setShowProjectSidebar={setShowProjectSidebar}
                      onNewConversation={handleNewConversation}
                      onConversationSelect={(conv) => {
                        haptics.light();
                        dispatch({ type: 'SET_CURRENT_CONVERSATION', conversation: conv });
                        dispatch({ type: 'UPDATE_MESSAGES', messages: conv.messages });
                        setShowMobileSidebar(false);
                      }}
                      onConversationUpdate={reloadConversations}
                      isMobile={true}
                      onClose={() => {
                        haptics.light();
                        setShowMobileSidebar(false);
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {showProjectSidebar && (
          <ProjectSidebar
            isOpen={showProjectSidebar}
            onClose={() => setShowProjectSidebar(false)}
            currentProject={currentProject}
            onSelectProject={async (project) => {
              dispatch({ type: 'SET_PROJECT', project });
              setShowProjectSidebar(false);
              loadConversations(user, project?.id || null);
            }}
            onProjectCreate={async (project) => {
              dispatch({ type: 'SET_PROJECT', project });
              setShowProjectSidebar(false);
              createNewConversation(project);
            }}
          />
        )}

        <div className="flex-1 flex flex-col mobile-chat-wrapper">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {messages.length <= 1 ? (
              <WelcomeScreen
                onSendMessage={handleSendMessage}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                attachments={attachments}
                setAttachments={setAttachments}
                selectedCandidates={selectedCandidates}
                setSelectedCandidates={setSelectedCandidates}
                currentProject={currentProject}
                isLoading={isLoading}
                isUploadingDocs={isUploadingDocs}
                fileInputRef={fileInputRef}
                handleSelectFiles={handleSelectFiles}
                setShowCandidateModal={setShowCandidateModal}
                setShowProjectModal={setShowProjectModal}
                setShowMCPModal={setShowMCPModal}
                showPlusMenu={showPlusMenu}
                setShowPlusMenu={setShowPlusMenu}
              />
            ) : (
              <>
                <ScrollArea className="flex-1" style={{ paddingBottom: '120px' }}>
                  <div className="flex flex-col gap-4 p-4">
                    {progress && progress.status === 'running' && ( 
                      <ThinkingIndicator
                        active={true}
                        stepKey={progress.step}
                        percent={progress.percent || 0}
                      />
                    )}
                    
                    {compareMode && selectedCandidates.length >= 2 && (
                      <CompareMode 
                        candidates={selectedCandidates}
                        onClose={() => setCompareMode(false)}
                      />
                    )}

                    {messages.map((msg, idx) => (
                      <ChatMessage
                        key={msg.id || idx}
                        message={msg}
                        onRegenerate={
                          idx === messages.length - 1 && msg.role === 'assistant'
                            ? handleRegenerateLastMessage
                            : undefined
                        }
                      />
                    ))}
                    {isLoading && <ThinkingIndicator progress={progress} />}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="mobile-input-fixed">
                  {(currentProject || attachments.length > 0 || selectedCandidates.length > 0) && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {currentProject && (
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                          style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', color: 'var(--txt)' }}
                        >
                          <Briefcase className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                          <span className="max-w-[180px] truncate">{currentProject.title}</span>
                          <button
                            type="button"
                            onClick={() => { haptics.light(); dispatch({ type: 'SET_PROJECT', project: null }); }}
                            className="hover:opacity-80 ml-0.5"
                            title="Remove project"
                          >
                            <X className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                          </button>
                        </div>
                      )}

                      {attachments.map(att => (
                        <div
                          key={att.url}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs"
                          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: 'var(--txt)' }}
                          title={att.name}
                        >
                          <Paperclip className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                          <span className="max-w-[100px] truncate">{att.name}</span>
                          <button
                            type="button"
                            onClick={() => { haptics.light(); removeAttachment(att.url); }}
                            className="hover:opacity-80"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                          </button>
                        </div>
                      ))}

                      {selectedCandidates.map(candidate => (
                        <div
                          key={candidate.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                          style={{ background: 'rgba(128,128,128,.12)', border: '1px solid rgba(128,128,128,.25)', color: 'var(--txt)' }}
                        >
                          <UserIcon className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                          <span className="max-w-[100px] truncate">{candidate.first_name} {candidate.last_name}</span>
                          <button
                            type="button"
                            onClick={() => { haptics.light(); handleRemoveCandidate(candidate.id); }}
                            className="hover:opacity-80 ml-0.5"
                            title="Remove candidate"
                          >
                            <X className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.md,.rtf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleSelectFiles}
                    />
                    
                    <div 
                      className="input-container-mobile flex items-center gap-2.5 py-3 px-4 shadow-lg"
                      style={{ 
                        backgroundColor: 'rgba(26, 32, 38, 0.95)', 
                        borderColor: 'rgba(255,255,255,.12)',
                        border: '1px solid'
                      }}
                    >
                      <DropdownMenu open={showPlusMenu} onOpenChange={setShowPlusMenu}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full flex-shrink-0 hover:bg-gray-700"
                            disabled={isLoading}
                            onClick={() => haptics.light()}
                          >
                            <Plus className="w-5 h-5" style={{ color: 'var(--txt)' }} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="start" 
                          side="top"
                          className="glass-card"
                          style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}
                        >
                          <DropdownMenuItem
                            onClick={() => {
                              haptics.light();
                              setShowProjectModal(true);
                              setShowPlusMenu(false);
                            }}
                            className="text-sm flex items-center gap-2"
                            style={{color: 'var(--txt)'}}
                          >
                            <Briefcase className="w-4 h-4" />
                            Select project / role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              haptics.light();
                              setShowCandidateModal(true);
                              setShowPlusMenu(false);
                            }}
                            className="text-sm flex items-center gap-2"
                            style={{color: 'var(--txt)'}}
                          >
                            <UserIcon className="w-4 h-4" />
                            Select candidate
                          </DropdownMenuItem>
                          {selectedCandidates.length >= 2 && (
                            <DropdownMenuItem
                              onClick={() => {
                                haptics.light();
                                setCompareMode(true);
                                setShowPlusMenu(false);
                              }}
                              className="text-sm flex items-center gap-2"
                              style={{color: 'var(--txt)'}}
                            >
                              <IconWrapper icon={UserIcon} size={16} variant="muted" />
                              Compare candidates ({selectedCandidates.length})
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              haptics.light();
                              fileInputRef.current?.click();
                              setShowPlusMenu(false);
                            }}
                            disabled={isUploadingDocs}
                            className="text-sm flex items-center gap-2"
                            style={{color: 'var(--txt)'}}
                          >
                            <Paperclip className="w-4 h-4" />
                            {isUploadingDocs ? 'Uploading...' : 'Attach files'}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              haptics.light();
                              setShowMCPModal(true);
                              setShowPlusMenu(false);
                            }}
                            className="text-sm flex items-center gap-2"
                            style={{color: 'var(--txt)'}}
                          >
                            <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            MCP Tools / Connections
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Input
                        ref={inputRef}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask me anything..."
                        disabled={isLoading}
                        className="flex-1 bg-transparent border-none text-base py-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-500"
                        style={{color: 'var(--txt)'}}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                      />

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 rounded-full transition-colors ${
                            isListening 
                              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                              : 'hover:bg-white/10 text-gray-300'
                          }`}
                          onClick={() => { haptics.light(); toggleSpeechRecognition(); }}
                          title={isListening ? 'Stop recording' : 'Start voice input'}
                        >
                          <Mic className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          type="submit"
                          disabled={(!inputMessage.trim() && attachments.length === 0 && selectedCandidates.length === 0) || isLoading}
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full flex-shrink-0"
                          style={{
                            background: (isLoading || (!inputMessage.trim() && attachments.length === 0 && selectedCandidates.length === 0)) 
                              ? 'rgba(255,255,255,.1)' 
                              : 'rgba(239,68,68,.15)',
                            border: '1px solid rgba(239,68,68,.3)'
                          }}
                        >
                          {isLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          ) : (
                            <ArrowUp className="w-4 h-4 text-white" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>

        <CandidateSelectionModal
          isOpen={showCandidateModal}
          onClose={() => setShowCandidateModal(false)}
          selectedCandidates={selectedCandidates}
          onSelectionChange={setSelectedCandidates}
        />

        <ProjectSelectionModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          currentProject={currentProject}
          onSelectProject={(project) => {
            dispatch({ type: 'SET_PROJECT', project });
            setShowProjectModal(false);
          }}
        />

        <MCPToolsModal
          isOpen={showMCPModal}
          onClose={() => setShowMCPModal(false)}
          user={user}
        />
      </div>
    );
  }

  // Desktop version
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg)' }}>
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
          box-shadow: 0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .btn-primary {
          background: rgba(239,68,68,.12) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.3) !important;
          border-radius: 12px !important;
          transition: all .2s ease !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.18) !important;
          transform: translateY(-0.5px) !important;
          border-color: rgba(239,68,68,.4) !important;
          color: #FFE5E5 !important;
          box-shadow: 0 2px 8px rgba(239,68,68,.2) !important;
        }
        .chat-sidebar-toggle {
          position: fixed;
          left: 80px;
          top: 10%;
          transform: translateY(-50%);
          z-index: 60;
          width: 12px;
          height: 80px;
          background: linear-gradient(135deg, rgba(239,68,68,.15), rgba(220,38,38,.12));
          border: 1px solid rgba(239,68,68,.3);
          border-left: none;
          border-radius: 0 12px 12px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .2s ease;
          box-shadow: 2px 0 12px rgba(239,68,68,.2);
        }
        .chat-sidebar-toggle:hover {
          width: 16px;
          background: linear-gradient(135deg, rgba(239,68,68,.25), rgba(220,38,38,.2));
          border-color: rgba(239,68,68,.4);
          box-shadow: 3px 0 16px rgba(239,68,68,.3);
        }
        .chat-sidebar-toggle-icon {
          color: #EF4444;
          filter: drop-shadow(0 0 4px rgba(239,68,68,.4));
        }
      `}</style>

      <AnimatePresence mode="wait">
        {sidebarCollapsed ? (
          <motion.button
            key="collapsed"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            onClick={() => setSidebarCollapsed(false)}
            className="chat-sidebar-toggle"
          >
            <ChevronRight className="w-4 h-4 chat-sidebar-toggle-icon" />
          </motion.button>
        ) : (
          <motion.div
            key="sidebar"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-80 flex flex-col border-r"
            style={{
              background: 'var(--surface)',
              borderColor: 'rgba(255,255,255,.06)',
              marginLeft: '0px'
            }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
              <div className="flex items-center gap-2">
                <SyncAvatar size={24} />
                <h2 className="text-lg font-semibold" style={{ color: 'var(--txt)' }}>SYNC</h2>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewConversation}
                  className="h-9 w-9"
                  title="New conversation"
                >
                  <Plus className="w-5 h-5" style={{ color: 'var(--txt)' }} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(true)}
                  className="h-9 w-9"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-5 h-5" style={{ color: 'var(--txt)' }} />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ChatSidebar
                conversations={conversations}
                currentConversation={currentConversation}
                currentProject={currentProject}
                sidebarCollapsed={false} // Not actually collapsed, just showing desktop sidebar
                setSidebarCollapsed={() => {}} // Not used here, main sidebar controls its own collapse
                showProjectSidebar={showProjectSidebar}
                setShowProjectSidebar={setShowProjectSidebar}
                onNewConversation={handleNewConversation}
                onConversationSelect={(conv) => {
                  dispatch({ type: 'SET_CURRENT_CONVERSATION', conversation: conv });
                  dispatch({ type: 'UPDATE_MESSAGES', messages: conv.messages });
                }}
                onConversationUpdate={reloadConversations}
                isMobile={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-h-0">
        {compareMode ? (
          <CompareMode 
            candidates={selectedCandidates}
            onClose={() => setCompareMode(false)}
          />
        ) : messages.length <= 1 ? (
          <WelcomeScreen
            onSendMessage={handleSendMessage}
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            attachments={attachments}
            setAttachments={setAttachments}
            selectedCandidates={selectedCandidates}
            setSelectedCandidates={setSelectedCandidates}
            currentProject={currentProject}
            isLoading={isLoading}
            isUploadingDocs={isUploadingDocs}
            fileInputRef={fileInputRef}
            handleSelectFiles={handleSelectFiles}
            setShowCandidateModal={setShowCandidateModal}
            setShowProjectModal={setShowProjectModal}
            setShowMCPModal={setShowMCPModal}
            showPlusMenu={showPlusMenu}
            setShowPlusMenu={setShowPlusMenu}
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--txt)' }}>
                {currentConversation?.title || "New Conversation"}
              </h2>
              <div className="flex items-center gap-2">
                {currentProject && (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                    style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', color: 'var(--txt)' }}
                  >
                    <Briefcase className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span>{currentProject.title}</span>
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-5 h-5" style={{ color: 'var(--txt)' }} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass-card" style={{ background: 'rgba(26,32,38,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                    <DropdownMenuItem onClick={() => setShowProjectSidebar(true)} style={{ color: 'var(--txt)' }}>
                      <Briefcase className="w-4 h-4 mr-2" />
                      Projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setCompareMode(true); }} disabled={selectedCandidates.length < 2} style={{ color: 'var(--txt)' }}>
                      <UserIcon className="w-4 h-4 mr-2" />
                      Compare Candidates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleNewConversation} style={{ color: 'var(--txt)' }}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <ScrollArea className="flex-1 px-6 py-4">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <ChatMessage
                      message={message}
                      onRegenerate={
                        index === messages.length - 1 && message.role === 'assistant'
                          ? handleRegenerateLastMessage
                          : undefined
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {progress && (
                <ThinkingIndicator
                  active={true}
                  stepKey={progress.step}
                  percent={progress.percent || 0}
                />
              )}

              <div ref={messagesEndRef} />
            </ScrollArea>

            <div className="border-t p-4" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
              {(currentProject || attachments.length > 0 || selectedCandidates.length > 0) && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {currentProject && (
                    <Badge className="glass-card" style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', color: 'var(--txt)' }}>
                      <Briefcase className="w-3 h-3 mr-1" style={{ color: 'var(--accent)' }} />
                      {currentProject.title}
                    </Badge>
                  )}

                  {attachments.map(att => (
                    <Badge
                      key={att.url}
                      className="glass-card cursor-pointer hover:opacity-80"
                      style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: 'var(--txt)' }}
                      onClick={() => removeAttachment(att.url)}
                      title={`${att.name} (click to remove)`}
                    >
                      <Paperclip className="w-3 h-3 mr-1" style={{ color: 'var(--muted)' }} />
                      {att.name}
                      <X className="w-3 h-3 ml-1" style={{ color: 'var(--muted)' }} />
                    </Badge>
                  ))}

                  {selectedCandidates.map(candidate => (
                    <Badge
                      key={candidate.id}
                      className="glass-card cursor-pointer hover:opacity-80"
                      style={{ background: 'rgba(128,128,128,.12)', border: '1px solid rgba(128,128,128,.25)', color: 'var(--txt)' }}
                      onClick={() => handleRemoveCandidate(candidate.id)}
                      title={`${candidate.first_name} ${candidate.last_name} (click to remove)`}
                    >
                      <UserIcon className="w-3 h-3 mr-1" style={{ color: 'var(--muted)' }} />
                      {candidate.first_name} {candidate.last_name}
                      <X className="w-3 h-3 ml-1" style={{ color: 'var(--muted)' }} />
                    </Badge>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md,.rtf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleSelectFiles}
                />
                
                <div 
                  className="glass-card flex items-center gap-3 py-3 px-4"
                  style={{ background: 'rgba(26, 32, 38, 0.8)' }}
                >
                  <DropdownMenu open={showPlusMenu} onOpenChange={setShowPlusMenu}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        disabled={isLoading}
                      >
                        <Plus className="w-5 h-5" style={{ color: 'var(--txt)' }} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" className="glass-card" style={{ background: 'rgba(26,32,38,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                      <DropdownMenuItem onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }} disabled={isUploadingDocs} style={{ color: 'var(--txt)' }}>
                        <Paperclip className="w-4 h-4 mr-2" />
                        {isUploadingDocs ? 'Uploading...' : 'Attach Files'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setShowCandidateModal(true); setShowPlusMenu(false); }} style={{ color: 'var(--txt)' }}>
                        <UserIcon className="w-4 h-4 mr-2" />
                        Select Candidates
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setShowProjectModal(true); setShowPlusMenu(false); }} style={{ color: 'var(--txt)' }}>
                        <Briefcase className="w-4 h-4 mr-2" />
                        Select Project
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setShowMCPModal(true); setShowPlusMenu(false); }} style={{ color: 'var(--txt)' }}>
                        <Zap className="w-4 h-4 mr-2" style={{ color: 'var(--accent)' }} />
                        MCP Tools / Connections
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Message SYNC..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    style={{ color: 'var(--txt)' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleSpeechRecognition}
                    disabled={isLoading}
                    className={`flex-shrink-0 ${isListening ? 'text-red-500' : ''}`}
                    title={isListening ? "Stop recording" : "Voice input"}
                    style={{ color: isListening ? '#EF4444' : 'var(--txt)' }}
                  >
                    <Mic className="w-5 h-5" />
                  </Button>

                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || (!inputMessage.trim() && attachments.length === 0 && selectedCandidates.length === 0)}
                    className="flex-shrink-0 h-10 w-10 rounded-full btn-primary"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    ) : (
                      <ArrowUp className="w-5 h-5 text-white" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showProjectSidebar && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-80 border-l"
            style={{
              background: 'var(--surface)',
              borderColor: 'rgba(255,255,255,.06)'
            }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--txt)' }}>Projects</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProjectSidebar(false)}
              >
                <X className="w-5 h-5" style={{ color: 'var(--txt)' }} />
              </Button>
            </div>
            <ProjectSidebar 
              isOpen={showProjectSidebar} // Assuming ProjectSidebar now takes isOpen, onClose
              onClose={() => setShowProjectSidebar(false)}
              currentProject={currentProject}
              onSelectProject={async (project) => {
                dispatch({ type: 'SET_PROJECT', project });
                setShowProjectSidebar(false);
                loadConversations(user, project?.id || null);
              }}
              onProjectCreate={async (project) => {
                dispatch({ type: 'SET_PROJECT', project });
                setShowProjectSidebar(false);
                createNewConversation(project);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CandidateSelectionModal
        isOpen={showCandidateModal}
        onClose={() => setShowCandidateModal(false)}
        selectedCandidates={selectedCandidates}
        onSelectionChange={setSelectedCandidates}
      />

      <ProjectSelectionModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        currentProject={currentProject}
        onSelectProject={(project) => {
          dispatch({ type: 'SET_PROJECT', project });
          setShowProjectModal(false);
        }}
      />

      <MCPToolsModal
        isOpen={showMCPModal}
        onClose={() => setShowMCPModal(false)}
        user={user}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <ChatErrorBoundary>
      <ChatProvider>
        <ChatPageContent />
      </ChatProvider>
    </ChatErrorBoundary>
  );
}
