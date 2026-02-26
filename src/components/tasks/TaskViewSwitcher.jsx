import React from "react";
import { LayoutGrid, List, Calendar } from "lucide-react";

const VIEWS = [
  { id: "kanban", label: "Board", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "calendar", label: "Calendar", icon: Calendar },
];

export default function TaskViewSwitcher({ view, onViewChange }) {
  return (
    <div className="flex items-center bg-zinc-800/50 rounded-lg p-1">
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onViewChange(id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition-colors ${
            view === id
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
          title={label}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{label}</span>
        </button>
      ))}
    </div>
  );
}
