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
    <div className="flex-shrink-0 w-[260px] sm:w-72 md:w-[280px] lg:w-80">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center bg-${column.color === 'zinc' ? 'zinc' : 'cyan'}-500/10`}>
            <Icon className={`w-4 h-4 text-${column.color === 'zinc' ? 'zinc' : 'cyan'}-400`} />
          </div>
          <span className="font-medium text-white text-sm">{column.label}</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{tasks.length}</span>
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
            className={`space-y-2 min-h-[300px] rounded-xl p-2 transition-all ${
              snapshot.isDraggingOver
                ? "bg-cyan-500/5 border-2 border-dashed border-cyan-500/30"
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
                className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors"
                onClick={() => onAddTask(column.id)}
              >
                <Plus className="w-6 h-6 text-zinc-600 mb-2" />
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
