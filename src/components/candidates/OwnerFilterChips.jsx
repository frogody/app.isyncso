
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, ChevronRight, ChevronDown, Pin, PinOff } from "lucide-react";
import { User } from "@/api/entities";
import { useTranslation } from "@/components/utils/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

export default function OwnerFilterChips({ users = [], selected = "all", onChange }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [pinnedUsers, setPinnedUsers] = useState(() => {
    // Load pinned users from localStorage
    const saved = localStorage.getItem('pinnedOwners');
    return saved ? JSON.parse(saved) : [];
  });
  const collapseTimerRef = useRef(null);
  
  const { t: _t } = useTranslation(currentUser?.language || 'nl');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setCurrentUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  // Save pinned users to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pinnedOwners', JSON.stringify(pinnedUsers));
  }, [pinnedUsers]);

  // Auto-collapse after inactivity
  useEffect(() => {
    if (isExpanded) {
      // Clear any existing timer
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
      
      // Set new timer to collapse after 3 seconds of inactivity
      collapseTimerRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, 3000);
    }

    // Cleanup timer on unmount or when isExpanded changes
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, [isExpanded]);

  const resetCollapseTimer = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    if (isExpanded) {
      collapseTimerRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, 3000);
    }
  };

  const handleSelect = (val) => {
    if (!onChange) return;
    onChange(val);
    resetCollapseTimer();
  };

  const togglePin = (userId, e) => {
    e.stopPropagation();
    setPinnedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
    resetCollapseTimer();
  };

  const getUserKey = (u) => u.user_id || u.id;

  const getFirstName = (user) => {
    if (user.full_name) {
      return user.full_name.split(' ')[0];
    }
    return user.email?.split('@')[0] || 'User';
  };

  // Determine which users to show
  const currentUserId = currentUser ? (currentUser.user_id || currentUser.id) : null;
  
  const visibleUsers = isExpanded 
    ? users 
    : users.filter(u => {
        const userId = getUserKey(u);
        // Current user is always considered "pinned" for display logic
        return userId === currentUserId || pinnedUsers.includes(userId);
      });

  return (
    <div 
      className="glass-card px-3 py-2"
      onMouseEnter={resetCollapseTimer}
      onMouseMove={resetCollapseTimer}
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pl-1">
        {/* All Owners Chip with Expand/Collapse */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => handleSelect("all")}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className={`relative h-10 rounded-full transition-all group ${
            selected === "all" ? "ring-2 ring-red-500/50" : ""
          }`}
          style={{
            background: selected === "all" ? "rgba(239,68,68,.08)" : "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.08)",
            color: "var(--txt)",
            borderRadius: "9999px",
            padding: isHovering ? "0 12px" : "0",
            width: isHovering ? "auto" : "40px",
            transition: "all 0.2s ease"
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-800 flex-shrink-0">
              <Users className="w-4 h-4" style={{ color: "var(--accent)" }} />
            </div>
            {isHovering && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="flex items-center justify-center transition-opacity"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" style={{ color: "var(--muted)" }} />
                ) : (
                  <ChevronRight className="w-4 h-4" style={{ color: "var(--muted)" }} />
                )}
              </button>
            )}
          </div>
        </Button>

        {/* User Chips with animation */}
        <AnimatePresence>
          {visibleUsers.map((u) => {
            const key = getUserKey(u);
            const active = selected === key;
            const isPinned = pinnedUsers.includes(key);
            const isCurrentUser = key === currentUserId;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.8, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleSelect(key)}
                      className={`relative h-10 px-3 rounded-full transition-all group ${
                        active ? "ring-2 ring-red-500/50" : ""
                      }`}
                      style={{
                        background: active ? "rgba(239,68,68,.08)" : "rgba(255,255,255,.04)",
                        border: "1px solid rgba(255,255,255,.08)",
                        color: "var(--txt)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          {u.profile_picture ? (
                            <AvatarImage src={u.profile_picture} alt={getFirstName(u)} />
                          ) : null}
                          <AvatarFallback>
                            {getFirstName(u).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium" style={{ color: "var(--txt)" }}>
                          {getFirstName(u)}
                        </span>
                        {/* Three dots indicator - only show if not current user */}
                        {!isCurrentUser && (
                          <div className="flex items-center gap-0.5 ml-1">
                            <div className="w-1 h-1 rounded-full" style={{ background: 'var(--muted)' }} />
                            <div className="w-1 h-1 rounded-full" style={{ background: 'var(--muted)' }} />
                            <div className="w-1 h-1 rounded-full" style={{ background: 'var(--muted)' }} />
                          </div>
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="glass-card" 
                    style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}
                  >
                    <DropdownMenuItem 
                      onClick={(e) => togglePin(key, e)}
                      style={{ color: 'var(--txt)' }}
                    >
                      {isPinned ? (
                        <>
                          <PinOff className="w-4 h-4 mr-2" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="w-4 h-4 mr-2" />
                          Pin to sidebar
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
