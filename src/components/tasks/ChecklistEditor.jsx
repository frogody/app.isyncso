import React, { useState, useRef, useEffect } from "react";
import { Plus, X, GripVertical, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

function ChecklistItem({ item, onToggle, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleSave = () => {
    if (title.trim()) {
      onUpdate(item.id, { title: title.trim() });
    }
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-2 group py-1"
    >
      <div className="text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
        <GripVertical className="w-3 h-3" />
      </div>

      <button
        onClick={() => onToggle(item.id)}
        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          item.done
            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
            : "border-zinc-600 hover:border-zinc-500"
        }`}
      >
        {item.done && <Check className="w-3 h-3" />}
      </button>

      {editing ? (
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setTitle(item.title); setEditing(false); }
          }}
          className="h-7 text-sm bg-zinc-800 border-zinc-700 flex-1"
        />
      ) : (
        <span
          className={`text-sm flex-1 cursor-pointer ${
            item.done ? "text-zinc-500 line-through" : "text-zinc-300"
          }`}
          onClick={() => setEditing(true)}
        >
          {item.title}
        </span>
      )}

      <button
        onClick={() => onDelete(item.id)}
        className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

export default function ChecklistEditor({ checklist = [], onChange }) {
  const [newItemTitle, setNewItemTitle] = useState("");
  const inputRef = useRef(null);

  const handleAdd = () => {
    if (!newItemTitle.trim()) return;

    const newItem = {
      id: crypto.randomUUID(),
      title: newItemTitle.trim(),
      done: false,
      created_at: new Date().toISOString(),
    };

    onChange([...checklist, newItem]);
    setNewItemTitle("");
    inputRef.current?.focus();
  };

  const handleToggle = (id) => {
    onChange(
      checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  };

  const handleUpdate = (id, updates) => {
    onChange(
      checklist.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const handleDelete = (id) => {
    onChange(checklist.filter((item) => item.id !== id));
  };

  const completedCount = checklist.filter((i) => i.done).length;
  const totalCount = checklist.length;

  return (
    <div className="space-y-2">
      {/* Progress */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500/60 rounded-full transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Items */}
      <AnimatePresence>
        {checklist.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={handleToggle}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </AnimatePresence>

      {/* Add new item */}
      <div className="flex items-center gap-2 pt-1">
        <Plus className="w-4 h-4 text-zinc-600 flex-shrink-0" />
        <Input
          ref={inputRef}
          placeholder="Add subtask..."
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          className="h-7 text-sm bg-transparent border-none focus-visible:ring-0 px-0 text-zinc-400 placeholder:text-zinc-600"
        />
        {newItemTitle.trim() && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAdd}
            className="h-6 w-6 text-cyan-400 hover:text-cyan-300"
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
