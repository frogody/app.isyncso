import React, { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TaskQuickCreate({ onCreateTask, onOpenFullModal, status = "pending", placeholder = "New task..." }) {
  const [title, setTitle] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    const newTask = await onCreateTask({
      title: title.trim(),
      status,
    });

    if (newTask) {
      setTitle("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      onOpenFullModal?.({ title: title.trim(), status });
      setTitle("");
    }
    if (e.key === "Escape") {
      setTitle("");
      inputRef.current?.blur();
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[16px] bg-zinc-900/30 border border-dashed transition-all ${
        focused
          ? "border-cyan-500/20 bg-zinc-900/40"
          : "border-zinc-800/50 hover:border-zinc-700/60"
      }`}
    >
      <div className="w-6 h-6 rounded-full bg-zinc-800/60 flex items-center justify-center flex-shrink-0">
        <Plus className={`w-3.5 h-3.5 transition-colors ${focused ? "text-cyan-400" : "text-zinc-500"}`} />
      </div>
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 outline-none"
      />
      {focused && title.trim() && (
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 flex-shrink-0">
          <kbd className="px-1 py-0.5 bg-zinc-800/80 rounded-full text-zinc-400">Enter</kbd>
          <span>create</span>
          <span className="mx-1">|</span>
          <kbd className="px-1 py-0.5 bg-zinc-800/80 rounded-full text-zinc-400">Shift+Enter</kbd>
          <span>details</span>
        </div>
      )}
    </div>
  );
}
