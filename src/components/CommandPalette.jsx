import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowRight,
  Users,
  FolderPlus,
  LayoutDashboard,
  Store,
  Brain,
  Megaphone,
  Package,
  Settings,
  BarChart3,
  Plus,
  Upload,
  Download,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CommandPalette({ open, onClose, onAction }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const commands = useMemo(
    () => [
      // Navigation
      {
        id: "dashboard",
        label: "Go to Dashboard",
        icon: LayoutDashboard,
        category: "Navigation",
        keywords: ["home", "main"],
        action: () => navigate(createPageUrl("TalentDashboard")),
      },
      {
        id: "candidates",
        label: "Go to Candidates",
        icon: Users,
        category: "Navigation",
        keywords: ["talent", "pool", "people"],
        action: () => navigate(createPageUrl("TalentCandidates")),
      },
      {
        id: "campaigns",
        label: "Go to Campaigns",
        icon: Megaphone,
        category: "Navigation",
        keywords: ["outreach", "recruiting"],
        action: () => navigate(createPageUrl("TalentCampaigns")),
      },
      {
        id: "nests",
        label: "Go to My Nests",
        icon: Package,
        category: "Navigation",
        keywords: ["talent", "pools"],
        action: () => navigate(createPageUrl("TalentNests")),
      },
      {
        id: "marketplace",
        label: "Browse Marketplace",
        icon: Store,
        category: "Navigation",
        keywords: ["buy", "purchase", "shop"],
        action: () => navigate(createPageUrl("NestsMarketplace")),
      },

      // Quick Actions
      {
        id: "new-campaign",
        label: "Create New Campaign",
        icon: FolderPlus,
        category: "Quick Actions",
        keywords: ["add", "start"],
        action: () => {
          navigate(createPageUrl("TalentCampaigns") + "?action=new");
        },
      },
      {
        id: "add-candidate",
        label: "Add New Candidate",
        icon: Plus,
        category: "Quick Actions",
        keywords: ["create", "new"],
        action: () => {
          navigate(createPageUrl("TalentCandidates") + "?action=add");
          onAction?.("add-candidate");
        },
      },
      {
        id: "import-candidates",
        label: "Import Candidates (CSV)",
        icon: Upload,
        category: "Quick Actions",
        keywords: ["upload", "bulk"],
        action: () => {
          navigate(createPageUrl("TalentCandidates") + "?action=import");
          onAction?.("import-candidates");
        },
      },
      {
        id: "export-candidates",
        label: "Export Candidates",
        icon: Download,
        category: "Quick Actions",
        keywords: ["download", "csv"],
        action: () => {
          onAction?.("export-candidates");
        },
      },

      // AI Features
      {
        id: "run-intel",
        label: "Run Intel Analysis",
        icon: Brain,
        category: "AI Features",
        keywords: ["intelligence", "analyze", "ai"],
        action: () => {
          onAction?.("run-intel");
        },
      },
      {
        id: "run-matching",
        label: "Run AI Matching",
        icon: Sparkles,
        category: "AI Features",
        keywords: ["match", "analyze", "candidates"],
        action: () => {
          onAction?.("run-matching");
        },
      },

      // Settings
      {
        id: "analytics",
        label: "View Analytics",
        icon: BarChart3,
        category: "Analytics",
        keywords: ["stats", "metrics", "performance"],
        action: () => navigate(createPageUrl("TalentDashboard") + "?tab=analytics"),
      },
    ],
    [navigate, onAction]
  );

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.id.includes(q) ||
        cmd.keywords?.some((k) => k.includes(q)) ||
        cmd.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Flat list for keyboard navigation
  const flatCommands = useMemo(() => {
    return Object.values(groupedCommands).flat();
  }, [groupedCommands]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const items = listRef.current.querySelectorAll("[data-command-item]");
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatCommands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatCommands[selectedIndex]) {
        flatCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleSelect = (cmd) => {
    cmd.action();
    onClose();
  };

  let itemIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-50 w-full max-w-[550px] px-4"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                <Search className="w-5 h-5 text-zinc-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-white placeholder:text-zinc-500 focus:outline-none text-base"
                />
                <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-500 font-mono">
                  Esc
                </kbd>
              </div>

              {/* Commands list */}
              <div
                ref={listRef}
                className="max-h-[350px] overflow-y-auto p-2"
              >
                {flatCommands.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500">
                    No commands found for "{query}"
                  </div>
                ) : (
                  Object.entries(groupedCommands).map(([category, cmds]) => (
                    <div key={category} className="mb-2">
                      <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        {category}
                      </div>
                      {cmds.map((cmd) => {
                        itemIndex++;
                        const isSelected = itemIndex === selectedIndex;
                        return (
                          <button
                            key={cmd.id}
                            data-command-item
                            onClick={() => handleSelect(cmd)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                              isSelected
                                ? "bg-red-500/20 text-white"
                                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            }`}
                          >
                            <cmd.icon
                              className={`w-5 h-5 shrink-0 ${
                                isSelected ? "text-red-400" : ""
                              }`}
                            />
                            <span className="flex-1">{cmd.label}</span>
                            <ArrowRight
                              className={`w-4 h-4 transition-opacity ${
                                isSelected ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="p-3 border-t border-zinc-800 bg-zinc-800/50 flex items-center justify-center gap-6 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">↓</kbd>
                  <span className="ml-1">navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">↵</kbd>
                  <span className="ml-1">select</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">esc</kbd>
                  <span className="ml-1">close</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
