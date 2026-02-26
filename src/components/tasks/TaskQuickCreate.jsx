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
      className={`flex items-center gap-2 rounded-lg border transition-all ${
        focused
          ? "border-cyan-500/30 bg-cyan-500/5"
          : "border-transparent hover:border-zinc-800 bg-transparent"
      }`}
    >
      <div className="flex items-center gap-2 flex-1 px-2 py-1.5">
        <Plus className={`w-4 h-4 flex-shrink-0 transition-colors ${focused ? "text-cyan-400" : "text-zinc-600"}`} />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
        />
      </div>
      {focused && title.trim() && (
        <div className="flex items-center gap-1 pr-2 text-[10px] text-zinc-500">
          <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">Enter</kbd>
          <span>create</span>
          <span className="mx-1">|</span>
          <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">Shift+Enter</kbd>
          <span>details</span>
        </div>
      )}
    </div>
  );
}
