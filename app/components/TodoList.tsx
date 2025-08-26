import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTodoStore } from "../lib/store";
import type { Task } from "../lib/types";
import TodoItem from "./TodoItem";

interface TodoListProps {
  listType: "todo" | "done" | "ignored";
  title: string;
  tasks: Task[];
}

const DropIndicator = ({
  beforeId,
  column,
}: {
  beforeId: string | null;
  column: "todo" | "done" | "ignored";
}) => {
  const listColors = {
    todo: { bg: "bg-blue-500" },
    done: { bg: "bg-emerald-500" },
    ignored: { bg: "bg-gray-500" },
  };

  return (
    <div
      data-before={beforeId || "-1"}
      data-column={column}
      className={`m-auto my-0.5 h-1 w-[99%] ${listColors[column].bg} rounded-full opacity-0`}
    />
  );
};

export default function TodoList({ listType, title, tasks }: TodoListProps) {
  const { clearList, startDrag, updateDrag, endDrag, dragState, currentUser } =
    useTodoStore();

  const [active, setActive] = useState(false);
  const [otherUserActive, setOtherUserActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !dragState ||
      dragState.userId === currentUser?.id ||
      !dragState.currentPos
    ) {
      if (otherUserActive) {
        clearHighlights();
        setOtherUserActive(false);
      }
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const { x, y } = dragState.currentPos;

    const isOver =
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    if (isOver) {
      if (!otherUserActive) {
        setOtherUserActive(true);
      }

      const indicators = getIndicators();
      if (indicators.length > 0) {
        clearHighlights(indicators);
        const nearest = getNearestIndicatorForPosition(y, indicators);
        if (nearest.element) {
          nearest.element.style.opacity = "1";
        }
      }
    } else {
      if (otherUserActive) {
        clearHighlights();
        setOtherUserActive(false);
      }
    }
  }, [dragState, currentUser?.id, otherUserActive]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.setData("sourceList", listType);

    // Create custom drag image
    const dragElement = e.target as HTMLElement;
    const rect = dragElement.getBoundingClientRect();

    const relativePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    startDrag(task.id, { x: e.clientX, y: e.clientY }, relativePos, listType);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (e.clientX !== 0 && e.clientY !== 0) {
      updateDrag({ x: e.clientX, y: e.clientY });
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const taskId = e.dataTransfer.getData("taskId");

    setActive(false);
    clearHighlights();

    const indicators = getIndicators();
    const { element } = getNearestIndicator(e, indicators);

    const before = element.dataset.before || "-1";

    endDrag(taskId, listType, before);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    highlightIndicator(e);
    setActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if actually leaving the container (not moving to child elements)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      clearHighlights();
      setActive(false);
    }
  };

  const clearHighlights = (els?: HTMLElement[]) => {
    const indicators = els || getIndicators();
    indicators.forEach((i) => {
      i.style.opacity = "0";
    });
  };

  const highlightIndicator = (e: React.DragEvent) => {
    const indicators = getIndicators();
    clearHighlights(indicators);
    const el = getNearestIndicator(e, indicators);
    el.element.style.opacity = "1";
  };

  const getNearestIndicator = (
    e: React.DragEvent,
    indicators: HTMLElement[],
  ) => {
    const DISTANCE_OFFSET = 50;

    const el = indicators.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientY - (box.top + DISTANCE_OFFSET);

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      },
    );

    return el;
  };

  const getNearestIndicatorForPosition = (
    y: number,
    indicators: HTMLElement[],
  ) => {
    const DISTANCE_OFFSET = 50;

    const el = indicators.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - (box.top + DISTANCE_OFFSET);

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      },
    );

    return el;
  };

  const getIndicators = (): HTMLElement[] => {
    return Array.from(document.querySelectorAll(`[data-column="${listType}"]`));
  };

  const handleClear = () => {
    if (tasks.length === 0) return;
    if (confirm(`Clear all ${title.toLowerCase()} items?`)) {
      clearList(listType);
    }
  };

  const titleColors = {
    todo: "text-blue-400",
    done: "text-emerald-400",
    ignored: "text-gray-400",
  };

  const accentColors = {
    todo: "border-blue-500/20 bg-blue-500/5",
    done: "border-emerald-500/20 bg-emerald-500/5",
    ignored: "border-gray-500/20 bg-gray-500/5",
  };

  const dragActiveColors = {
    todo: "bg-blue-500/20 ring-1 ring-blue-400/40",
    done: "bg-emerald-500/20 ring-1 ring-emerald-400/40",
    ignored: "bg-gray-500/20 ring-1 ring-gray-400/40",
  };

  const otherUserDragActiveColors = {
    todo: "bg-yellow-500/10 ring-1 ring-yellow-400/30",
    done: "bg-yellow-500/10 ring-1 ring-yellow-400/30",
    ignored: "bg-yellow-500/10 ring-1 ring-yellow-400/30",
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 border backdrop-blur-sm ${accentColors[listType]} flex min-h-0 flex-col overflow-hidden rounded-xl pb-8 transition-all duration-200 ${
        active ? dragActiveColors[listType] : "bg-gray-900/40"
      } ${otherUserActive ? otherUserDragActiveColors[listType] : ""}`}
    >
      <div className="border-b border-gray-700/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className={`text-base font-medium ${titleColors[listType]}`}>
              {title}
            </h2>
            <span className="rounded-full bg-gray-700/50 px-2 py-0.5 text-xs text-gray-300">
              {tasks.length}
            </span>
            {active && (
              <span
                className={`animate-pulse rounded-full px-2 py-0.5 text-xs ${
                  listType === "todo"
                    ? "bg-blue-500/20 text-blue-400"
                    : listType === "done"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-gray-500/20 text-gray-400"
                }`}
              >
                Drop zone active
              </span>
            )}
            {otherUserActive && (
              <span className="animate-pulse rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                Other user hovering
              </span>
            )}
          </div>
          <button
            onClick={handleClear}
            disabled={tasks.length === 0}
            className="rounded-md bg-red-600/20 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-600/30 disabled:cursor-not-allowed disabled:bg-gray-600/20 disabled:text-gray-500"
          >
            Clear
          </button>
        </div>
      </div>

      <motion.div
        layout
        className="flex-1 overflow-y-auto p-4 transition-colors duration-200"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#374151 transparent",
        }}
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <DropIndicator beforeId={null} column={listType} />

        {tasks.length === 0 ? (
          <div className="mt-8 text-center text-sm text-gray-500">
            No {title.toLowerCase()} items
          </div>
        ) : (
          <>
            {tasks.map((task, index) => (
              <motion.div key={task.id} layout>
                <TodoItem
                  task={task}
                  listType={listType}
                  index={index}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                />
                <DropIndicator beforeId={task.id} column={listType} />
              </motion.div>
            ))}
          </>
        )}
      </motion.div>
    </div>
  );
}
