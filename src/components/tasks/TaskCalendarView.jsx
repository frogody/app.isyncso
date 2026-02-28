import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityDot, STATUS_CONFIG, PRIORITY_CONFIG } from "./TaskCard";

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function TaskCalendarView({
  tasks,
  onEdit,
  onAddTask,
  onSelect,
  selectedTaskId,
}) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  // Map tasks by date
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      if (!task.due_date) return;
      const d = new Date(task.due_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  // Build calendar grid
  const weeks = useMemo(() => {
    const cells = [];
    // Previous month padding
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, inMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, inMonth: true, date: new Date(year, month, d) });
    }
    // Next month padding
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, inMonth: false, date: new Date(year, month + 1, i) });
    }
    // Chunk into weeks
    const result = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [year, month, daysInMonth, firstDay]);

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getChipStyle = (task) => {
    if (task.status === "completed") {
      return "bg-zinc-800/40 text-zinc-500 border-zinc-700/30 line-through";
    }
    if (selectedTaskId === task.id) {
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
    }
    const config = PRIORITY_CONFIG[task.priority];
    if (config) return config.color;
    return "bg-zinc-800/50 text-zinc-300 border-zinc-700/40";
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-full bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-semibold text-white min-w-[200px] text-center">{monthName}</h3>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-full bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 rounded-full bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 text-zinc-300 text-xs font-medium transition-all"
        >
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-zinc-800/40">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider py-3">
              {day}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((cell, ci) => {
              const dateKey = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
              const dayTasks = tasksByDate[dateKey] || [];
              const isToday = isSameDay(cell.date, today);

              return (
                <div
                  key={ci}
                  className={`group relative min-h-[100px] border border-zinc-800/30 p-2 transition-colors cursor-pointer ${
                    !cell.inMonth ? "opacity-30" : ""
                  } ${isToday ? "bg-cyan-500/[0.03] border-cyan-500/20" : "hover:bg-white/[0.01]"}`}
                  onClick={() => {
                    if (cell.inMonth) {
                      const y = cell.date.getFullYear();
                      const m = String(cell.date.getMonth() + 1).padStart(2, "0");
                      const dd = String(cell.date.getDate()).padStart(2, "0");
                      onAddTask?.("pending", `${y}-${m}-${dd}`);
                    }
                  }}
                >
                  {/* Day number */}
                  <div className={`text-xs mb-1.5 ${
                    isToday
                      ? "text-cyan-400 font-bold"
                      : cell.inMonth
                        ? "text-zinc-400"
                        : "text-zinc-600"
                  }`}>
                    {cell.day}
                  </div>

                  {/* Tasks */}
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(task);
                        }}
                        className={`w-full text-left rounded-full px-2 py-0.5 text-[10px] font-medium border truncate max-w-full transition-colors ${getChipStyle(task)}`}
                      >
                        <span className="flex items-center gap-1">
                          <PriorityDot priority={task.priority} />
                          <span className="truncate">{task.title}</span>
                        </span>
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-zinc-500 px-2">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Hover add indicator */}
                  {cell.inMonth && dayTasks.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Plus className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tasks without dates */}
      {tasks.filter(t => !t.due_date).length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-zinc-500 mb-2">
            {tasks.filter(t => !t.due_date).length} task(s) without due date
          </p>
        </div>
      )}
    </div>
  );
}
