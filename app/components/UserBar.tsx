import { useEffect, useState } from "react";
import { MousePosition } from "~/lib/types";
import { useTodoStore } from "../lib/store";

export default function UserBar() {
  const {
    currentUser,
    connectedUsers,
    mousePositions,
    dragState,
    addTask,
    canEdit,
    isConnected,
  } = useTodoStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const getAvatarStyle = (avatar: string) => {
    const [color, shape] = avatar.split("-");

    const baseStyle = {
      backgroundColor: color,
      width: "28px",
      height: "28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };

    switch (shape) {
      case "circle":
        return {
          ...baseStyle,
          borderRadius: "50%",
        };

      case "square":
        return {
          ...baseStyle,
          borderRadius: "6px",
        };

      case "diamond":
        return {
          ...baseStyle,
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          borderRadius: "0",
        };

      case "pentagon":
        return {
          ...baseStyle,
          clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
          borderRadius: "0",
          paddingTop: "2px",
        };

      default:
        return {
          ...baseStyle,
          borderRadius: "6px",
        };
    }
  };

  const handleAddTask = () => {
    const title = newTitle.trim();
    if (!title) return;

    addTask(title, newDesc.trim());
    setNewTitle("");
    setNewDesc("");
    setShowAddModal(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    } else if (e.key === "Escape") {
      setShowAddModal(false);
    }
  };

  const handleModalBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowAddModal(false);
    }
  };

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAddModal) {
        setShowAddModal(false);
      }
    };

    if (showAddModal) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [showAddModal]);

  return (
    <>
      <div className="border-b border-gray-700/50 bg-gray-900/80 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-white">Todo Manager</h1>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!canEdit || !isConnected}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              Add Task
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected
                    ? "bg-green-400"
                    : currentUser
                      ? "animate-pulse bg-red-400"
                      : "animate-pulse bg-yellow-400"
                }`}
              ></div>
              <span
                className={`text-xs font-medium ${
                  isConnected
                    ? "text-green-400"
                    : currentUser
                      ? "text-red-400"
                      : "text-yellow-400"
                }`}
              >
                {isConnected
                  ? "Connected"
                  : currentUser
                    ? "Disconnected"
                    : "Connecting..."}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {connectedUsers.length} online
            </span>
            <div className="flex items-center space-x-1.5">
              {connectedUsers.map((user) => (
                <div
                  key={user.id}
                  className={
                    "relative flex h-7 w-7 items-center justify-center text-xs font-bold text-white transition-all"
                  }
                  style={getAvatarStyle(user.avatar)}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {Array.from(mousePositions.entries()).map(([userId, pos]) => {
        const user = connectedUsers.find((u) => u.id === userId);
        if (
          !user ||
          userId === currentUser?.id ||
          (dragState && dragState.userId === user.id)
        )
          return null;

        const normalizeCoordinates = (senderPos: MousePosition) => {
          const relativeX = senderPos.x / senderPos.vw;
          const relativeY = senderPos.y / senderPos.vh;

          const currentVW = window.innerWidth;
          const currentVH = window.innerHeight;
          const currentPR = window.devicePixelRatio;

          const localX = relativeX * currentVW;
          // NOTE: Dont apply the prRatio to X, i dont wanna explain why
          // so just fucking listen and leave it be alr
          const prRatio = currentPR / senderPos.pr;
          const localY = relativeY * currentVH * prRatio;

          return { x: localX, y: localY };
        };

        const normalizedPos = normalizeCoordinates(pos);

        return (
          <div
            key={userId}
            className="pointer-events-none fixed z-40"
            style={{
              left: normalizedPos.x,
              top: normalizedPos.y,
              transform: "translate(-2px, -2px)",
            }}
          >
            <div className="flex items-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                className="mr-0.5 mt-1 drop-shadow-sm"
              >
                <path
                  d="M2 2L14 8L8 9L6 14L2 2Z"
                  fill={user.avatar.split("-")[0]}
                  stroke={user.avatar.split("-")[0]}
                  strokeWidth="1.2"
                />
              </svg>
              <span className="whitespace-nowrap rounded-md border border-white/10 bg-slate-800/90 px-2 py-1 text-xs text-white shadow-lg backdrop-blur">
                {user.name}
              </span>
            </div>
          </div>
        );
      })}

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleModalBackdropClick}
        >
          <div className="w-full max-w-4xl rounded-xl border border-gray-700/50 bg-gray-900/90 p-6 shadow-2xl backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                Add New Task
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
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
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 px-3 py-2 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none"
                  placeholder="Task title"
                  maxLength={40}
                  autoFocus
                />
                <div className="mt-1 text-right text-xs text-gray-400">
                  {newTitle.length}/40
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-600/50 bg-gray-800/50 px-3 py-2 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none"
                  placeholder="Optional description"
                  rows={10}
                  maxLength={2000}
                />
                <div className="mt-1 text-right text-xs text-gray-400">
                  {newDesc.length}/2000
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  disabled={!newTitle.trim()}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
