import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityDot, STATUS_CONFIG } from "./TaskCard";

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

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 text-zinc-400">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-medium text-white min-w-[200px] text-center">{monthName}</h3>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 text-zinc-400">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday} className="border-zinc-700 text-zinc-300 text-xs">
          Today
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-zinc-900/60">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2 border-b border-zinc-800/40">
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
                  className={`min-h-[90px] border-b border-r border-zinc-800/30 p-1.5 transition-colors ${
                    cell.inMonth ? "bg-transparent" : "bg-zinc-900/30"
                  } ${isToday ? "bg-cyan-500/5" : ""} hover:bg-white/[0.02]`}
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
                  <div className={`text-xs mb-1 ${
                    isToday
                      ? "text-cyan-400 font-bold"
                      : cell.inMonth
                        ? "text-zinc-400"
                        : "text-zinc-600"
                  }`}>
                    {cell.day}
                  </div>

                  {/* Tasks */}
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(task);
                        }}
                        className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate transition-colors ${
                          task.status === "completed"
                            ? "bg-zinc-800/50 text-zinc-500 line-through"
                            : selectedTaskId === task.id
                              ? "bg-cyan-500/20 text-cyan-300"
                              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <PriorityDot priority={task.priority} />
                          {task.title}
                        </span>
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-zinc-500 px-1.5">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
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
