import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Send, Users, Plus, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SyncAvatar from "../ui/SyncAvatar";
import IconWrapper from "../ui/IconWrapper";
import ChatMessage from "./ChatMessage";
import WelcomeScreen from "./WelcomeScreen";
import { useTranslation } from "@/components/utils/translations";

export default function ChatManager({
  messages,
  onSendMessage,
  onRegenerateMessage,
  onNewConversation,
  onConversationSelect,
  conversations,
  currentConversationId,
  isLoading,
  error,
  inputMessage,
  setInputMessage,
  attachments,
  setAttachments,
  selectedCandidates,
  setSelectedCandidates,
  _currentProject,
  _setCurrentProject,
  _compareMode,
  _setCompareMode,
  isRegenerating,
  user,
  messagesEndRef
}) {
  const { t } = useTranslation(user?.language || 'nl');
  const [_showCandidateModal, setShowCandidateModal] = useState(false);
  const [_showProjectModal, _setShowProjectModal] = useState(false);

  const handleSend = () => {
    if (!inputMessage.trim() && attachments.length === 0 && selectedCandidates.length === 0) {
      return;
    }

    const fileUrls = attachments.map(a => a.url);
    onSendMessage(inputMessage, fileUrls, selectedCandidates);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        
        .message-input {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          color: var(--txt);
          border-radius: 12px;
          transition: all 0.2s;
        }
        
        .message-input:focus {
          outline: none;
          border-color: rgba(239,68,68,.3);
          background: rgba(255,255,255,.06);
          box-shadow: 0 0 0 3px rgba(239,68,68,.08);
        }
        
        .attachment-chip {
          background: rgba(239,68,68,.08);
          border: 1px solid rgba(239,68,68,.2);
          border-radius: 8px;
          padding: 6px 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--txt);
        }
        
        .send-button {
          background: linear-gradient(135deg, #EF4444, #DC2626) !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 0 20px rgba(239,68,68,.3) !important;
          transition: all 0.2s !important;
        }
        
        .send-button:hover:not(:disabled) {
          box-shadow: 0 0 30px rgba(239,68,68,.5) !important;
          transform: translateY(-1px) !important;
        }
        
        .send-button:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
        
        .toolbar-button {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .toolbar-button:hover {
          background: rgba(255,255,255,.08);
          border-color: rgba(255,255,255,.12);
        }
        
        .conversation-item {
          padding: 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 4px;
        }
        
        .conversation-item:hover {
          background: rgba(255,255,255,.04);
        }
        
        .conversation-item.active {
          background: rgba(239,68,68,.08);
          border: 1px solid rgba(239,68,68,.2);
        }
      `}</style>

      {/* Sidebar */}
      <div className="flex-shrink-0 w-64 border-r" style={{ borderColor: 'rgba(255,255,255,.06)', background: 'var(--surface)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
          <Button 
            onClick={onNewConversation} 
            className="w-full justify-start gap-2"
            style={{
              background: 'rgba(239,68,68,.08)',
              color: '#FFCCCB',
              border: '1px solid rgba(239,68,68,.25)',
              borderRadius: '12px'
            }}
          >
            <Plus className="w-4 h-4" />
            {t('nav_sync')}
          </Button>
        </div>
        <div className="flex-1 p-3 overflow-y-auto">
          {conversations && conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => onConversationSelect(conv.id)}
              className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
            >
              <div className="flex items-start gap-2">
                <SyncAvatar size={20} variant={conv.id === currentConversationId ? "default" : "grey"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--txt)' }}>
                    {conv.metadata?.name || conv.title || 'Conversation'}
                  </p>
                  {conv.last_message_at && (
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {new Date(conv.last_message_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
        {/* Header */}
        <div className="flex-shrink-0 border-b px-6 py-4" style={{ borderColor: 'rgba(255,255,255,.06)', background: 'var(--surface)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SyncAvatar size={32} />
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--txt)' }}>
                  SYNC
                </h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {user?.language === 'nl' ? 'AI Recruitment Assistent' : 'AI Recruitment Assistant'}
                </p>
              </div>
            </div>
            {error && (
              <p className="text-sm px-3 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,.1)', color: '#FCA5A5' }}>
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6" style={{ minHeight: 0, background: 'var(--bg)' }}>
          {messages.length === 0 ? (
            <WelcomeScreen 
              onSelectPrompt={(prompt) => setInputMessage(prompt)}
              user={user}
            />
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id || index}
                    message={message}
                    onRegenerate={onRegenerateMessage}
                    isRegenerating={isRegenerating === message.id}
                    isLastMessage={index === messages.length - 1}
                    user={user}
                  />
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t px-6 py-4" style={{ borderColor: 'rgba(255,255,255,.06)', background: 'var(--surface)' }}>
          <div className="max-w-4xl mx-auto">
            {/* Attachments */}
            {(attachments.length > 0 || selectedCandidates.length > 0) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="attachment-chip">
                    <Paperclip className="w-3 h-3" />
                    <span>{attachment.name}</span>
                    <button 
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {selectedCandidates.map((candidate, index) => (
                  <div key={index} className="attachment-chip" style={{ background: 'rgba(59,130,246,.08)', borderColor: 'rgba(59,130,246,.2)' }}>
                    <Users className="w-3 h-3" />
                    <span>{candidate.name || `${candidate.first_name} ${candidate.last_name}`}</span>
                    <button 
                      onClick={() => setSelectedCandidates(selectedCandidates.filter((_, i) => i !== index))}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
              {/* Toolbar buttons */}
              <button
                className="toolbar-button"
                onClick={() => setShowCandidateModal(true)}
                title={user?.language === 'nl' ? 'Kandidaten selecteren' : 'Select candidates'}
              >
                <IconWrapper icon={Users} size={20} variant="muted" glow={false} />
              </button>

              {/* Input */}
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={user?.language === 'nl' ? 'Stel een vraag aan SYNC...' : 'Ask SYNC a question...'}
                  className="message-input w-full px-4 py-3 resize-none"
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                  rows={1}
                  disabled={isLoading}
                />
              </div>

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={isLoading || (!inputMessage.trim() && attachments.length === 0 && selectedCandidates.length === 0)}
                className="send-button flex-shrink-0 h-12 px-6"
              >
                {isLoading ? (
                  <>
                    <SyncAvatar size={18} className="mr-2" />
                    {user?.language === 'nl' ? 'Versturen...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {user?.language === 'nl' ? 'Verstuur' : 'Send'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}