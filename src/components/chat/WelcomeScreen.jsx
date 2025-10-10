
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Paperclip,
  X,
  Mic,
  ArrowUp,
  RefreshCw,
  User as UserIcon,
  Briefcase,
  Zap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SyncAvatar from "../ui/SyncAvatar";
import { useIsMobile } from "../utils/useIsMobile";

export default function WelcomeScreen({
  onSendMessage,
  inputMessage,
  setInputMessage,
  attachments,
  setAttachments,
  selectedCandidates,
  setSelectedCandidates,
  currentProject,
  isLoading,
  isUploadingDocs,
  fileInputRef,
  handleSelectFiles,
  setShowCandidateModal,
  setShowProjectModal,
  setShowMCPModal,
  showPlusMenu,
  setShowPlusMenu,
}) {
  const [isListening, setIsListening] = React.useState(false);
  const [recognition, setRecognition] = React.useState(null);
  const isMobile = useIsMobile();

  // Initialize speech recognition
  React.useEffect(() => {
    let recognitionInstance = null;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionInstance = new SpeechRecognition();
      
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

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
        recognitionInstance.onstart = null;
        recognitionInstance.onresult = null;
        recognitionInstance.onerror = null;
        recognitionInstance.onend = null;
      }
    };
  }, [setInputMessage]);

  const toggleSpeechRecognition = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }
    
    if (isListening) {
      recognition.stop();
    } else {
      setInputMessage(prev => prev + " ");
      recognition.start();
    }
  };

  const removeAttachment = (url) => {
    setAttachments(prev => prev.filter(a => a.url !== url));
  };

  const handleRemoveCandidate = (candidateId) => {
    setSelectedCandidates(prev => prev.filter(c => c.id !== candidateId));
  };

  // Mobile version - optimized layout with better positioning
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        <style jsx>{`
          .input-container-mobile {
            border-radius: 32px;
          }
          .mobile-welcome-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1rem 1.5rem;
            min-height: 0;
            overflow: hidden;
          }
          .mobile-input-area {
            flex-shrink: 0;
            padding: 1rem 1rem;
            background: linear-gradient(to top, var(--bg) 90%, transparent);
            padding-bottom: max(1rem, calc(env(safe-area-inset-bottom) + 1rem));
          }
          /* The @supports block for .mobile-welcome-wrapper is removed as the class is no longer used */
        `}</style>
        
        {/* Centered content area - responsive to keyboard */}
        <div className="mobile-welcome-content">
          <SyncAvatar size={80} />
          <h2 className="text-base font-medium mt-4 text-center px-4" style={{color: 'var(--txt)'}}>
            What's on your mind today?
          </h2>
        </div>
        
        {/* Fixed bottom input area - works with keyboard */}
        <div className="mobile-input-area">
          {/* Project/Attachments/Candidates display - above input */}
          {(currentProject || attachments.length > 0 || selectedCandidates.length > 0) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {currentProject && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                  style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', color: 'var(--txt)' }}
                >
                  <Briefcase className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span className="max-w-[180px] truncate">{currentProject.title}</span>
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
                    onClick={() => removeAttachment(att.url)}
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
                    onClick={() => handleRemoveCandidate(candidate.id)}
                    className="hover:opacity-80 ml-0.5"
                    title="Remove candidate"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={onSendMessage} className="relative">
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
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 hover:bg-white/5 rounded-full"
                  >
                    <Plus className="w-5 h-5" style={{ color: 'var(--txt)' }} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="glass-card border-white/10" 
                  style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}
                >
                  <DropdownMenuItem 
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowPlusMenu(false);
                    }}
                    disabled={isUploadingDocs}
                    className="text-sm flex items-center gap-2 hover:bg-white/10"
                    style={{ color: 'var(--txt)' }}
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    {isUploadingDocs ? 'Uploading...' : 'Attach files'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setShowCandidateModal(true);
                      setShowPlusMenu(false);
                    }}
                    className="text-sm flex items-center gap-2 hover:bg-white/10"
                    style={{ color: 'var(--txt)' }}
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    Select candidate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setShowProjectModal(true);
                      setShowPlusMenu(false);
                    }}
                    className="text-sm flex items-center gap-2 hover:bg-white/10"
                    style={{ color: 'var(--txt)' }}
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Select project / role
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setShowMCPModal(true);
                      setShowPlusMenu(false);
                    }}
                    className="text-sm flex items-center gap-2 hover:bg-white/10"
                    style={{ color: 'var(--txt)' }}
                  >
                    <Zap className="w-4 h-4 mr-2" style={{ color: 'var(--accent)' }} />
                    MCP Tools / Connections
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading || isUploadingDocs}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-9 text-base"
                style={{ color: 'var(--txt)' }}
                autoComplete="off"
              />

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-full transition-colors ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                      : 'hover:bg-white/10 text-gray-300'
                  }`}
                  onClick={toggleSpeechRecognition}
                  title={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  <Mic className="w-5 h-5" />
                </Button>

                <Button
                  type="submit"
                  disabled={(!inputMessage.trim() && attachments.length === 0 && selectedCandidates.length === 0 && !currentProject) || isLoading || isUploadingDocs}
                  size="icon"
                  className="h-9 w-9 rounded-full btn-primary"
                >
                  {isLoading || isUploadingDocs ? (
                    <div className="w-5 h-5">
                      <SyncAvatar size={20} />
                    </div>
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Desktop version - keep existing layout
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <div className="flex justify-center mb-2" style={{ transform: 'translateY(-80px)' }}>
          <SyncAvatar size={180} />
        </div>
        
        <h2 className="text-2xl font-medium mb-16" style={{color: 'var(--txt)', marginTop: '-80px'}}>
          What's on your mind today?
        </h2>
      </div>
      
      <div className="w-full max-w-2xl lg:max-w-3xl">
        <form onSubmit={onSendMessage} className="relative">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.rtf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleSelectFiles}
          />
          
          <div 
            className="flex items-center gap-3 bg-gray-800 border border-gray-600 rounded-3xl py-3 px-4 focus-within:border-gray-500 transition-colors"
            style={{ backgroundColor: 'rgba(64, 64, 64, 0.6)', borderColor: 'rgba(122, 122, 122, 0.6)' }}
          >
            <DropdownMenu open={showPlusMenu} onOpenChange={setShowPlusMenu}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-700 rounded-full"
                >
                  <Plus className="w-4 h-4 text-gray-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                side="top"
                className="glass-card border-white/10 mb-2" 
                style={{background: 'rgba(15,20,24,.95)', borderColor: 'rgba(255,255,255,.06)'}}
              >
                <DropdownMenuItem
                  onClick={() => {
                    setShowProjectModal(true);
                    setShowPlusMenu(false);
                  }}
                  className="text-sm flex items-center gap-2 hover:bg-white/10"
                  style={{color: 'var(--txt)'}}
                >
                  <Briefcase className="w-4 h-4" />
                  Select project / role
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setShowCandidateModal(true);
                    setShowPlusMenu(false);
                  }}
                  className="text-sm flex items-center gap-2 hover:bg-white/10"
                  style={{color: 'var(--txt)'}}
                >
                  <UserIcon className="w-4 h-4" />
                  Select candidate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowPlusMenu(false);
                  }}
                  disabled={isUploadingDocs}
                  className="text-sm flex items-center gap-2 hover:bg-white/10"
                  style={{color: 'var(--txt)'}}
                >
                  <Paperclip className="w-4 h-4" />
                  {isUploadingDocs ? 'Uploading...' : 'Attach files'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setShowMCPModal(true);
                    setShowPlusMenu(false);
                  }}
                  className="text-sm flex items-center gap-2 hover:bg-white/10"
                  style={{color: 'var(--txt)'}}
                >
                  <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  MCP Tools / Connections
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Show me the best candidates in Amsterdam"
              disabled={isLoading}
              className="flex-1 bg-transparent border-none text-base py-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{color: 'var(--txt)'}}
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 rounded-full transition-colors ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
                onClick={toggleSpeechRecognition}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                <Mic className="w-4 h-4" />
              </Button>
              
              <Button
                type="submit"
                disabled={(!inputMessage.trim() && attachments.length === 0 && selectedCandidates.length === 0 && !currentProject) || isLoading}
                size="sm"
                className="h-6 w-6 p-0 rounded-full bg-gray-300 hover:bg-white disabled:bg-gray-600"
              >
                {isLoading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-black" />
                ) : (
                  <ArrowUp className="w-3 h-3 text-black" />
                )}
              </Button>
            </div>
          </div>

          {/* Selected project display */}
          {currentProject && (
            <div className="mt-3 flex flex-wrap gap-2">
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs"
                style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.20)', color: 'var(--txt)' }}
              >
                <Briefcase className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                <span className="max-w-[200px] truncate">{currentProject.title}</span>
              </div>
            </div>
          )}

          {/* Attachments display */}
          {attachments && attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {attachments.map(att => (
                <div
                  key={att.url}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', color: 'var(--txt)' }}
                  title={att.name}
                >
                  <Paperclip className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                  <span className="max-w-[180px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.url)}
                    className="hover:opacity-80"
                    title="Remove"
                  >
                    <X className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Selected candidates display */}
          {selectedCandidates.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedCandidates.map(candidate => (
                <div
                  key={candidate.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs"
                  style={{ background: 'rgba(128,128,128,.08)', border: '1px solid rgba(128,128,128,.20)', color: 'var(--txt)' }}
                >
                  <UserIcon className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                  <span className="max-w-[150px] truncate">{candidate.first_name} {candidate.last_name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCandidate(candidate.id)}
                    className="hover:opacity-80 ml-0.5"
                    title="Remove candidate"
                  >
                    <X className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
