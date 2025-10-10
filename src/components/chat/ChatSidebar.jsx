
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Search,
  Pin,
  Trash2,
  Archive,
  Edit2,
  Check,
  X,
  MoreVertical
} from "lucide-react";
import { ChatConversation } from "@/api/entities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import IconWrapper from "../ui/IconWrapper";
import { base44 } from "@/api/base44Client"; // Added import for base44 client

export default function ChatSidebar({
  conversations,
  currentConversation,
  currentProject,
  sidebarCollapsed,
  setSidebarCollapsed,
  showProjectSidebar,
  setShowProjectSidebar,
  onNewConversation,
  onConversationSelect,
  onConversationUpdate
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  // Filter conversations based on search query and the new metadata.archived flag
  const filteredConversations = conversations.filter(conv =>
    !conv.metadata?.archived && // Exclude conversations that are soft-deleted (archived in metadata)
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRenameStart = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleRenameSave = async (conv) => {
    if (editTitle.trim() && editTitle !== conv.title) {
      await ChatConversation.update(conv.id, { title: editTitle.trim() });
      if (onConversationUpdate) onConversationUpdate();
    }
    setEditingId(null);
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handlePin = async (conv, e) => {
    e.stopPropagation();
    await ChatConversation.update(conv.id, {
      is_pinned: !conv.is_pinned
    });
    if (onConversationUpdate) onConversationUpdate();
  };

  // handleArchive now uses base44 and sets metadata.archived to true (soft delete/archive)
  const handleArchive = async (conv, e) => {
    e.stopPropagation();
    try {
      if (confirm(`Weet je zeker dat je het gesprek "${conv.title}" wilt archiveren? Het zal verdwijnen uit je lijst, maar kan later worden hersteld.`)) {
        await base44.agents.updateConversation(conv.id, {
          metadata: { ...(conv.metadata || {}), archived: true }
        });
        if (onConversationUpdate) onConversationUpdate();
      }
    } catch (error) {
      console.error("Failed to archive conversation", error);
      alert("Kon gesprek niet archiveren. Probeer het opnieuw.");
    }
  };

  // handleHardDelete performs a permanent deletion using ChatConversation.delete
  // This is distinct from archiving.
  const handleHardDelete = async (conv, e) => {
    e.stopPropagation();
    if (confirm(`Weet je zeker dat je het gesprek "${conv.title}" PERMANENT wilt verwijderen? Dit kan NIET ongedaan worden gemaakt.`)) {
      await ChatConversation.delete(conv.id);
      if (onConversationUpdate) onConversationUpdate();
    }
  };

  const handleConversationClick = async (conv) => {
    await Promise.all(
      conversations.map(c =>
        c.is_active && c.id !== conv.id
          ? ChatConversation.update(c.id, { is_active: false })
          : Promise.resolve()
      )
    );

    if (!conv.is_active) {
      await ChatConversation.update(conv.id, { is_active: true });
    }

    onConversationSelect(conv);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Vandaag';
    if (diffDays === 1) return 'Gisteren';
    if (diffDays < 7) return `${diffDays} dagen geleden`;
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  };

  const getMessageCount = (conv) => {
    return conv.messages?.length || 0;
  };

  const pinnedConversations = filteredConversations.filter(c => c.is_pinned);
  const regularConversations = filteredConversations.filter(c => !c.is_pinned);

  return (
    <div
      className={`flex flex-col h-screen transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        background: 'rgba(21,26,31,.98)',
        borderRight: '1px solid rgba(255,255,255,.06)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <style>{`
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .btn-primary {
          background: rgba(239,68,68,.12) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.3) !important;
          border-radius: 12px !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.18) !important;
          color: #FFE5E5 !important;
          border-color: rgba(239,68,68,.4) !important;
        }
        .collapsed-conversation-btn {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.06);
        }
        .collapsed-conversation-btn:hover {
          background: rgba(255,255,255,.08);
          transform: translateY(-1px);
        }
        .collapsed-conversation-btn.active {
          background: rgba(239,68,68,.12);
          border-color: rgba(239,68,68,.25);
        }
      `}</style>

      {/* Header */}
      <div className="p-3 border-b flex flex-col items-center" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
        {sidebarCollapsed ? (
          <>
            {/* Collapse/Expand Button */}
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-all hover:bg-white/5"
              title="Expand sidebar"
            >
              <ChevronRight className="w-5 h-5" style={{ color: 'var(--muted)' }} />
            </button>

            {/* New Conversation Button - Collapsed */}
            <button
              onClick={onNewConversation}
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-2"
              style={{
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))'
              }}
              title="Nieuw gesprek"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 w-full">
              <h2 className="font-semibold" style={{ color: 'var(--txt)' }}>
                Gesprekken
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(true)}
                className="h-8 w-8"
                style={{ color: 'var(--muted)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-3 w-full">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
              <Input
                placeholder="Zoek gesprekken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 bg-transparent text-sm"
                style={{
                  color: 'var(--txt)',
                  borderColor: 'rgba(255,255,255,.08)',
                  background: 'rgba(255,255,255,.04)'
                }}
              />
            </div>

            {/* New Conversation Button - Expanded */}
            <Button
              onClick={onNewConversation}
              className="w-full btn-primary justify-start"
              size="sm"
            >
              <IconWrapper icon={Plus} size={16} variant="accent" className="mr-2" />
              Nieuw gesprek
            </Button>
          </>
        )}
      </div>

      {/* Project Context */}
      {currentProject && (
        <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
          {sidebarCollapsed ? (
            <button
              onClick={() => setShowProjectSidebar(!showProjectSidebar)}
              className="collapsed-conversation-btn mx-auto"
              title={currentProject.title}
            >
              <IconWrapper icon={Briefcase} size={20} variant="accent" />
            </button>
          ) : (
            <button
              onClick={() => setShowProjectSidebar(!showProjectSidebar)}
              className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,.04)' }}
            >
              <IconWrapper icon={Briefcase} size={16} variant="accent" />
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--txt)' }}>
                  {currentProject.title}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                  {currentProject.client_company}
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {sidebarCollapsed ? (
          <div className="p-3 space-y-2 flex flex-col items-center">
            {filteredConversations.slice(0, 10).map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleConversationClick(conv)}
                className={`collapsed-conversation-btn ${currentConversation?.id === conv.id ? 'active' : ''}`}
                title={conv.title}
              >
                {currentConversation?.id === conv.id ? (
                  <IconWrapper icon={MessageSquare} size={20} variant="accent" />
                ) : (
                  <MessageSquare className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Pinned Conversations */}
            {pinnedConversations.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                  Vastgepind
                </div>
                {pinnedConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={currentConversation?.id === conv.id}
                    isCollapsed={false}
                    isEditing={editingId === conv.id}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    onSelect={() => handleConversationClick(conv)}
                    onRenameStart={handleRenameStart}
                    onRenameSave={handleRenameSave}
                    onRenameCancel={handleRenameCancel}
                    onPin={handlePin}
                    onArchive={handleArchive} // Pass the new handleArchive (soft delete)
                    onDelete={handleHardDelete} // Pass the handleHardDelete (permanent delete)
                    formatDate={formatDate}
                    getMessageCount={getMessageCount}
                  />
                ))}
                <div className="h-2" />
              </>
            )}

            {/* Regular Conversations */}
            {regularConversations.length > 0 && pinnedConversations.length > 0 && (
              <div className="px-2 py-1 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                Recent
              </div>
            )}
            {regularConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={currentConversation?.id === conv.id}
                isCollapsed={false}
                isEditing={editingId === conv.id}
                editTitle={editTitle}
                setEditTitle={setEditTitle}
                onSelect={() => handleConversationClick(conv)}
                onRenameStart={handleRenameStart}
                onRenameSave={handleRenameSave}
                onRenameCancel={handleRenameCancel}
                onPin={handlePin}
                onArchive={handleArchive} // Pass the new handleArchive (soft delete)
                onDelete={handleHardDelete} // Pass the handleHardDelete (permanent delete)
                formatDate={formatDate}
                getMessageCount={getMessageCount}
              />
            ))}

            {filteredConversations.length === 0 && (
              <div className="text-center py-8 px-4">
                <IconWrapper icon={MessageSquare} size={32} variant="muted" className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {searchQuery ? 'Geen gesprekken gevonden' : 'Nog geen gesprekken'}
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ConversationItem({
  conv,
  isActive,
  isCollapsed,
  isEditing,
  editTitle,
  setEditTitle,
  onSelect,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onPin,
  onArchive, // This prop now triggers the soft-delete/archive via base44
  onDelete, // This prop now triggers the permanent delete via ChatConversation.delete
  formatDate,
  getMessageCount
}) {
  // Remove the collapsed rendering from here - it's now in the parent
  if (isCollapsed) {
    return null;
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 p-2">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameSave(conv);
            if (e.key === 'Escape') onRenameCancel();
          }}
          className="h-8 text-sm bg-transparent"
          style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.08)' }}
          autoFocus
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={() => onRenameSave(conv)}
        >
          <Check className="w-4 h-4" style={{ color: 'var(--txt)' }} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={onRenameCancel}
        >
          <X className="w-4 h-4" style={{ color: 'var(--muted)' }} />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded-lg transition-colors ${
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <button
        onClick={onSelect}
        className="w-full p-2.5 text-left pr-9"
      >
        <div className="flex items-start gap-2.5 min-w-0">
          {isActive ? (
            <IconWrapper icon={MessageSquare} size={16} variant="accent" className="mt-1 flex-shrink-0" />
          ) : (
            <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: 'var(--muted)' }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1 mb-1.5">
              {conv.is_pinned && (
                <IconWrapper icon={Pin} size={12} variant="accent" className="mt-0.5 flex-shrink-0" />
              )}
              <p
                className="text-sm font-medium line-clamp-2"
                style={{
                  color: 'var(--txt)',
                  wordBreak: 'break-word',
                  lineHeight: '1.3',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {conv.title}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <span className="truncate">{formatDate(conv.last_message_at)}</span>
              <span>•</span>
              <span className="whitespace-nowrap">{getMessageCount(conv)}</span>
            </div>
          </div>
        </div>
      </button>

      {/* Actions menu */}
      <div className="absolute right-1.5 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card w-44" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
            <DropdownMenuItem onClick={(e) => onRenameStart(conv, e)} className="text-xs py-2" style={{ color: 'var(--txt)' }}>
              <Edit2 className="w-3 h-3 mr-2" />
              Hernoemen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => onPin(conv, e)} className="text-xs py-2" style={{ color: 'var(--txt)' }}>
              <Pin className="w-3 h-3 mr-2" />
              {conv.is_pinned ? 'Losmaken' : 'Vastpinnen'}
            </DropdownMenuItem>
            <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,.06)' }} />
            <DropdownMenuItem onClick={(e) => onArchive(conv, e)} className="text-xs py-2" style={{ color: 'var(--txt)' }}>
              <Archive className="w-3 h-3 mr-2" />
              Archiveren
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => onDelete(conv, e)} className="text-xs py-2 text-red-400">
              <Trash2 className="w-3 h-3 mr-2" />
              Permanent verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
