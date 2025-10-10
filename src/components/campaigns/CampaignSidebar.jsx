
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import IconWrapper from "../ui/IconWrapper";
import { Megaphone, Plus, Trash2, Search, MoreVertical, Edit2, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CampaignSidebar({
  campaigns,
  selectedCampaignId,
  onSelect,
  onDelete,
  onRename,
  onCreate,
  user,
}) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [editingId, setEditingId] = React.useState(null);
  const [editName, setEditName] = React.useState("");

  const filtered = campaigns.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-500/10 border-gray-500/30 text-gray-400",
      analyzing: "bg-purple-500/10 border-purple-500/30 text-purple-400",
      active: "bg-green-500/10 border-green-500/30 text-green-400",
      paused: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
      completed: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      archived: "bg-gray-500/10 border-gray-500/30 text-gray-500"
    };
    return colors[status] || colors.draft;
  };

  const handleRenameStart = (campaign, e) => {
    e.stopPropagation();
    setEditingId(campaign.id);
    setEditName(campaign.name);
  };

  const handleRenameSave = (campaign) => {
    if (editName.trim() && editName !== campaign.name) {
      onRename(campaign.id, editName.trim());
    }
    setEditingId(null);
    setEditName(""); // Reset editName regardless
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditName("");
  };

  return (
    <div
      className="flex flex-col h-[calc(100vh-140px)] rounded-xl overflow-hidden"
      style={{ 
        width: '320px',
        maxWidth: '320px',
        minWidth: '320px',
        border: '1px solid rgba(255,255,255,.06)', 
        background: 'rgba(26,32,38,.35)', 
        backdropFilter: 'blur(8px)' 
      }}
    >
      <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <IconWrapper icon={Megaphone} size={18} variant="accent" className="flex-shrink-0" />
            <h3 className="font-semibold truncate" style={{ color: 'var(--txt)' }}>
              {user?.language === 'nl' ? 'Campagnes' : 'Campaigns'}
            </h3>
          </div>
          <Button size="sm" className="btn-primary flex-shrink-0" onClick={onCreate}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStatusFilter("all")}
            className="flex-1 h-8 text-xs"
            style={{
              background: statusFilter === "all" ? 'rgba(233,240,241,.12)' : 'transparent',
              color: statusFilter === "all" ? '#E9F0F1' : 'var(--muted)',
              border: statusFilter === "all" ? '1px solid rgba(233,240,241,.3)' : '1px solid rgba(255,255,255,.08)',
              borderRadius: '6px'
            }}
          >
            {user?.language === 'nl' ? 'Alle' : 'All'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStatusFilter("active")}
            className="flex-1 h-8 text-xs"
            style={{
              background: statusFilter === "active" ? 'rgba(74,222,128,.12)' : 'transparent',
              color: statusFilter === "active" ? '#86EFAC' : 'var(--muted)',
              border: statusFilter === "active" ? '1px solid rgba(74,222,128,.3)' : '1px solid rgba(255,255,255,.08)',
              borderRadius: '6px'
            }}
          >
            {user?.language === 'nl' ? 'Actief' : 'Active'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStatusFilter("draft")}
            className="flex-1 h-8 text-xs"
            style={{
              background: statusFilter === "draft" ? 'rgba(156,163,175,.12)' : 'transparent',
              color: statusFilter === "draft" ? '#D1D5DB' : 'var(--muted)',
              border: statusFilter === "draft" ? '1px solid rgba(156,163,175,.3)' : '1px solid rgba(255,255,255,.08)',
              borderRadius: '6px'
            }}
          >
            {user?.language === 'nl' ? 'Concept' : 'Draft'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStatusFilter("completed")}
            className="flex-1 h-8 text-xs"
            style={{
              background: statusFilter === "completed" ? 'rgba(96,165,250,.12)' : 'transparent',
              color: statusFilter === "completed" ? '#93C5FD' : 'var(--muted)',
              border: statusFilter === "completed" ? '1px solid rgba(96,165,250,.3)' : '1px solid rgba(255,255,255,.08)',
              borderRadius: '6px'
            }}
          >
            {user?.language === 'nl' ? 'Voltooid' : 'Completed'}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 flex-shrink-0 pointer-events-none z-10" style={{ color: 'var(--muted)' }} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={user?.language === 'nl' ? 'Zoek campagnes...' : 'Search campaigns...'}
            className="pl-8 h-9 bg-transparent w-full"
            style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {user?.language === 'nl' ? 'Geen campagnes gevonden' : 'No campaigns found'}
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = c.id === selectedCampaignId;
              const isEditing = editingId === c.id;

              if (isEditing) {
                return (
                  <div key={c.id} className="flex items-center gap-1 p-2 mb-2 w-full">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSave(c);
                        if (e.key === 'Escape') handleRenameCancel();
                      }}
                      className="h-8 text-sm bg-transparent flex-grow"
                      style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.08)' }}
                      autoFocus
                      onFocus={e => e.target.select()} // Select all text on focus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => handleRenameSave(c)}
                    >
                      <Check className="w-4 h-4" style={{ color: 'var(--txt)' }} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={handleRenameCancel}
                    >
                      <X className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                    </Button>
                  </div>
                );
              }

              return (
                <div
                  key={c.id}
                  className="w-full mb-2 rounded-lg transition-all overflow-hidden"
                  style={{
                    background: isActive ? 'rgba(239,68,68,.08)' : 'transparent',
                    border: isActive ? '1px solid rgba(239,68,68,.25)' : '1px solid rgba(255,255,255,.06)',
                    maxWidth: '100%'
                  }}
                >
                  <button
                    onClick={() => onSelect(c)}
                    className="w-full text-left p-3 flex items-start gap-2"
                  >
                    <div className="min-w-0 flex-1 overflow-hidden" style={{ maxWidth: 'calc(100% - 40px)' }}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium text-sm break-words" style={{ 
                          color: 'var(--txt)',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          hyphens: 'auto'
                        }}>
                          {c.name}
                        </h4>
                        <Badge className={`${getStatusColor(c.status)} px-2 py-0.5 text-[10px] flex-shrink-0 whitespace-nowrap`}>
                          {c.status}
                        </Badge>
                      </div>
                      {c.description && (
                        <p className="text-xs mt-1 line-clamp-2 break-words" style={{ 
                          color: 'var(--muted)',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word'
                        }}>
                          {c.description}
                        </p>
                      )}
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                        {(c.matched_candidates?.length || 0)} {user?.language === 'nl' ? 'kandidaten' : 'candidates'}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          title={user?.language === 'nl' ? 'Meer opties' : 'More options'}
                        >
                          <MoreVertical className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        className="glass-card" 
                        style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}
                        align="end"
                      >
                        <DropdownMenuItem 
                          onClick={(e) => handleRenameStart(c, e)}
                          style={{ color: 'var(--txt)' }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          {user?.language === 'nl' ? 'Hernoemen' : 'Rename'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(c.id);
                          }}
                          style={{ color: '#EF4444' }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {user?.language === 'nl' ? 'Verwijderen' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
