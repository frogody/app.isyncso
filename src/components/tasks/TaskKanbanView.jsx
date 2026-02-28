import React, { useMemo } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import TaskCard, { STATUS_CONFIG } from "./TaskCard";
import TaskQuickCreate from "./TaskQuickCreate";

const COLUMNS = [
  { id: "pending", ...STATUS_CONFIG.pending },
  { id: "in_progress", ...STATUS_CONFIG.in_progress },
  { id: "completed", ...STATUS_CONFIG.completed },
];

function KanbanColumn({ column, tasks, onAddTask, onEdit, onDelete, onSelect, selectedTaskId, onCreateTask, onOpenFullModal, onAIAction }) {
  const Icon = column.icon;

  return (
    <div className="flex-shrink-0 w-[280px] sm:w-[300px] lg:w-[320px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-[12px] ${column.color === 'zinc' ? 'bg-zinc-500/10' : 'bg-cyan-500/10'} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${column.color === 'zinc' ? 'text-zinc-400' : 'text-cyan-400'}`} />
          </div>
          <span className="font-semibold text-white text-sm">{column.label}</span>
          <span className="text-xs text-zinc-500 bg-zinc-800/60 px-2.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-white"
          onClick={() => onAddTask(column.id)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick create */}
      <div className="mb-2 px-1">
        <TaskQuickCreate
          onCreateTask={(data) => onCreateTask({ ...data, status: column.id })}
          onOpenFullModal={(data) => onOpenFullModal({ ...data, status: column.id })}
          status={column.id}
          placeholder={`Add to ${column.label}...`}
        />
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-3 min-h-[300px] rounded-[16px] p-2 transition-all ${
              snapshot.isDraggingOver
                ? "bg-cyan-500/[0.03] border-2 border-dashed border-cyan-500/20"
                : "border-2 border-transparent"
            }`}
          >
            <AnimatePresence>
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onSelect={onSelect}
                  isSelected={selectedTaskId === task.id}
                  onAIAction={onAIAction}
                />
              ))}
            </AnimatePresence>
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div
                className="flex flex-col items-center justify-center py-10 text-center rounded-[20px] border border-dashed border-zinc-800/40 bg-zinc-900/20 cursor-pointer hover:border-zinc-700/50 transition-all"
                onClick={() => onAddTask(column.id)}
              >
                <div className="w-10 h-10 rounded-[14px] bg-zinc-800/40 flex items-center justify-center mb-3">
                  <Plus className="w-5 h-5 text-zinc-600" />
                </div>
                <p className="text-zinc-600 text-sm">Add a task</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function TaskKanbanView({
  tasks,
  onDragEnd,
  onEdit,
  onDelete,
  onAddTask,
  onSelect,
  selectedTaskId,
  onCreateTask,
  onOpenFullModal,
  onAIAction,
}) {
  const tasksByColumn = useMemo(() => {
    const grouped = {};
    COLUMNS.forEach((col) => {
      grouped[col.id] = tasks.filter((t) => t.status === col.id);
    });
    return grouped;
  }, [tasks]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 tablet-scroll scroll-smooth-ios">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id] || []}
            onAddTask={onAddTask}
            onEdit={onEdit}
            onDelete={onDelete}
            onSelect={onSelect}
            selectedTaskId={selectedTaskId}
            onCreateTask={onCreateTask}
            onOpenFullModal={onOpenFullModal}
            onAIAction={onAIAction}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
