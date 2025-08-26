import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTodoStore } from "../lib/store";
import type { Task } from "../lib/types";

interface TodoItemProps {
  task: Task;
  listType: "todo" | "done" | "ignored";
  index: number;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDrag: (e: React.DragEvent) => void;
}

export default function TodoItem({
  task,
  listType,
  index,
  onDragStart,
  onDrag,
}: TodoItemProps) {
  const {
    currentUser,
    connectedUsers,
    editingState,
    dragState,
    canEdit,
    endDrag,
    moveTask,
    deleteTask,
    startEditing,
    endEditing,
    updateTask,
  } = useTodoStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);

  const isBeingEdited = editingState.has(task.id);
  const editingUser = editingState.get(task.id);
  const isMyEdit = editingUser === currentUser?.id;
  const user = connectedUsers.find((u) => u.id === editingUser);

  const isBeingDragged = dragState && dragState.taskId === task.id;

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isMyEdit) {
        endEditing(task.id);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isMyEdit) {
        handleCancel();
      }
    };

    if (isMyEdit) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      };
    }
  }, [isMyEdit, task.id, endEditing]);

  useEffect(() => {
    return () => {
      if (isMyEdit) {
        endEditing(task.id);
      }
    };
  }, []);

  const listColors = {
    todo: { bg: "bg-blue-500" },
    done: { bg: "bg-emerald-500" },
    ignored: { bg: "bg-gray-500" },
  };

  const handleEdit = () => {
    if (!canEdit || isBeingEdited) return;

    startEditing(task.id, "edit");
    setEditTitle(task.title);
    setEditDesc(task.description);
    setShowEditModal(true);
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      updateTask(task.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
      });
    }
    setShowEditModal(false);
    endEditing(task.id);
  };

  const handleCancel = () => {
    setShowEditModal(false);
    setEditTitle(task.title);
    setEditDesc(task.description);
    endEditing(task.id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleModalBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!canEdit || isBeingEdited) {
      e.preventDefault();
      return;
    }
    onDragStart(e, task);
  };

  const getActionButtons = () => {
    if (listType === "todo") {
      return (
        <div className="flex space-x-1">
          <button
            onClick={() => moveTask(task.id, listType, "done")}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600/20 text-xs text-emerald-400 transition-all hover:scale-105 hover:bg-emerald-600/30"
            title="Mark as done"
          >
            ✓
          </button>
          <button
            onClick={() => moveTask(task.id, listType, "ignored")}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-600/20 text-xs text-gray-400 transition-all hover:scale-105 hover:bg-gray-600/30"
            title="Ignore"
          >
            ✗
          </button>
        </div>
      );
    }

    return (
      <div className="flex space-x-1">
        <button
          onClick={() => moveTask(task.id, listType, "todo")}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600/20 text-xs text-blue-400 transition-all hover:scale-105 hover:bg-blue-600/30"
          title="Restore"
        >
          ↶
        </button>
        <button
          onClick={() => deleteTask(task.id, listType)}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-red-600/20 text-xs text-red-400 transition-all hover:scale-105 hover:bg-red-600/30"
          title="Delete"
        >
          🗑
        </button>
      </div>
    );
  };

  const modalContent = showEditModal ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleModalBackdropClick}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl rounded-xl border border-gray-700/50 bg-gray-900/90 p-6 shadow-2xl backdrop-blur"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Edit Task</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 transition-colors hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Title *
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 px-3 py-2 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none"
              placeholder="Task title"
              maxLength={40}
              autoFocus
            />
            <div className="mt-1 text-right text-xs text-gray-400">
              {editTitle.length}/40
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full resize-none rounded-lg border border-gray-600/50 bg-gray-800/50 px-3 py-2 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none"
              placeholder="Optional description"
              rows={10}
              maxLength={2000}
            />
            <div className="mt-1 text-right text-xs text-gray-400">
              {editDesc.length}/2000
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleCancel}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editTitle.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              Save
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  ) : null;

  return (
    <>
      <motion.div
        layout
        layoutId={task.id}
        initial={false}
        draggable={canEdit && !isBeingEdited}
        onDragStart={handleDragStart}
        onDrag={onDrag}
        onDragEnd={() => {
          endDrag(task.id);
        }}
        className={`group relative overflow-hidden rounded-lg border border-gray-700/50 bg-gray-900/60 p-3 backdrop-blur-sm transition-all duration-200 hover:bg-gray-900/80 hover:shadow-lg ${
          isBeingEdited && !isMyEdit ? "cursor-not-allowed opacity-60" : ""
        } ${
          canEdit && !isBeingEdited ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        <div
          className={`absolute bottom-0 left-0 top-0 w-1 ${listColors[listType].bg} rounded-l-lg`}
        ></div>
        <div
          className={`absolute left-0 top-0 h-6 w-6 ${listColors[listType].bg} flex items-center justify-center rounded-br-md text-xs font-medium text-white`}
        >
          {index + 1}
        </div>

        <div className="ml-8 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="relative z-50">
              <div
                onClick={handleEdit}
                className={`cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium leading-relaxed text-white transition-colors duration-200 ${
                  canEdit && !isBeingEdited ? "hover:text-blue-500" : ""
                }`}
                style={{
                  maxWidth: "100%",
                }}
                title={task.title}
              >
                {task.title}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {getActionButtons()}
          </div>
        </div>

        {isBeingEdited && !isMyEdit && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm">
            <div className="rounded-md bg-gray-900/80 px-3 py-2 text-sm text-white shadow-lg backdrop-blur">
              {user ? user.name : "Another user"} is editing this...
            </div>
          </div>
        )}

        {isBeingDragged && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm">
            <div className="rounded-md bg-gray-900/80 px-3 py-2 text-sm text-white shadow-lg backdrop-blur">
              Currently Being dragged...
            </div>
          </div>
        )}
      </motion.div>

      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
