import React, { useState, useEffect } from 'react';
import { Plus, Search, MessageSquare, Settings, LogOut, User, CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { db } from "@/api/supabaseClient";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function AgentChatSidebar({ 
  logo, title, conversations, activeId, 
  onSelect, onCreate, colors 
}) {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    db.auth.me()
      .then(u => setUser(u))
      .catch(e => console.error("Failed to load user:", e));
  }, []);

  const handleLogout = async () => {
    await db.auth.logout();
  };

  const filteredConversations = conversations.filter(conv => 
    (conv.metadata?.name || "New Conversation")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-white/5">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 font-bold text-white tracking-wider">
          <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
            {React.cloneElement(logo, { className: "w-full h-full" })}
          </div>
          {title}
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-lg" 
          onClick={onCreate}
        >
          <Plus size={16} />
        </Button>
      </div>
      
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..." 
            className="bg-[#1a1a1a] border-none text-sm text-gray-300 pl-9 h-9 rounded-lg focus-visible:ring-1 focus-visible:ring-white/20" 
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1">
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex items-center gap-3 group",
                activeId === conv.id 
                  ? "bg-[#1a1a1a] text-white" 
                  : "text-gray-400 hover:bg-[#1a1a1a]/50 hover:text-gray-200"
              )}
            >
              <MessageSquare size={14} className={activeId === conv.id ? colors.text : "text-gray-600"} />
              <span className="truncate flex-1">
                {conv.metadata?.name || "New Conversation"}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-white/5">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-3 text-sm text-gray-400 hover:text-white cursor-pointer p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors">
              {user?.avatar_url ? (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-white border border-white/10 flex-shrink-0">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 truncate text-left">
                <div className="font-medium text-white truncate">{user?.full_name || 'User Account'}</div>
                <div className="text-xs text-gray-500 truncate">{user?.email || 'Loading...'}</div>
              </div>
              <Settings size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            align="end" 
            side="right" 
            className="w-64 bg-[#1a1a1a] border-white/10 p-2"
          >
            <div className="space-y-1">
              {user && (
                <div className="px-3 py-2 mb-2">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-sm font-bold text-white border border-white/10">
                        {user.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{user.full_name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                      {user.credits !== undefined && (
                        <div className="text-xs text-cyan-400 mt-1">{user.credits} credits</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <Link to={createPageUrl("Profile")}>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  <User size={16} />
                  <span>View Profile</span>
                </button>
              </Link>
              
              <Link to={createPageUrl("Settings")}>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
              </Link>
              
              <div className="h-px bg-white/10 my-1" />
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}