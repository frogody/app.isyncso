import React from "react";
import { LayoutGrid, List, Calendar } from "lucide-react";

const VIEWS = [
  { id: "kanban", label: "Board", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "calendar", label: "Calendar", icon: Calendar },
];

export default function TaskViewSwitcher({ view, onViewChange }) {
  return (
    <div className="flex items-center bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/60 rounded-full p-1 gap-0.5">
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onViewChange(id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            view === id
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
          title={label}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
