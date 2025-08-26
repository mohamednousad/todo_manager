import { useEffect, useState } from "react";
import { useTodoStore } from "../lib/store";
import TodoList from "./TodoList";
import UserBar from "./UserBar";

export default function TodoApp() {
  const {
    currentUser,
    tasks,
    joinUser,
    canEdit,
    dragState,
    connectedUsers,
    isConnected,
  } = useTodoStore();

  const [userName, setUserName] = useState("");
  const [showNameInput, setShowNameInput] = useState(true);
  const [nameError, setNameError] = useState("");
  const [showDisconnectedModal, setShowDisconnectedModal] = useState(false);
  const [wasConnected, setWasConnected] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setShowNameInput(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isConnected && currentUser) {
      setWasConnected(true);
      setShowDisconnectedModal(false);
    } else if (!isConnected && currentUser && wasConnected) {
      setShowDisconnectedModal(true);
    }
  }, [isConnected, currentUser, wasConnected]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      useTodoStore
        .getState()
        .sendMouseMove(
          e.clientX,
          e.clientY,
          window.innerWidth,
          window.innerHeight,
          window.devicePixelRatio,
        );
    };

    if (currentUser) {
      document.addEventListener("mousemove", handleMouseMove);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, [currentUser]);

  const handleJoin = () => {
    const name = userName.trim();
    if (!name) {
      setNameError("Name is required");
      return;
    }
    if (name.length > 20) {
      setNameError("Name must be 20 characters or less");
      return;
    }

    try {
      joinUser(name);
      setNameError("");
    } catch (error) {
      setNameError("Name already taken");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  const getDraggedTaskInfo = () => {
    if (!dragState) return null;

    for (const [listName, taskList] of Object.entries(tasks)) {
      const task = taskList.find((t: any) => t.id === dragState.taskId);
      if (task) {
        return { task, listName };
      }
    }
    return null;
  };

  const draggedTaskInfo = getDraggedTaskInfo();

  if (showNameInput) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 p-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-700/50 bg-gray-900/80 p-6 shadow-2xl backdrop-blur-sm">
          <h1 className="mb-4 text-center text-xl font-semibold text-white">
            Join Workspace
          </h1>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Display Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 px-3 py-2 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none"
                placeholder="Enter your name"
                maxLength={20}
                autoFocus
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-400">{nameError}</p>
              )}
            </div>

            <button
              onClick={handleJoin}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
      <UserBar />

      <div className="mx-auto w-full max-w-full flex-1 p-6 xl:max-w-[95%] 2xl:max-w-[90%]">
        <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-3">
          <TodoList listType="todo" title="Todo" tasks={tasks.todo} />

          <TodoList listType="done" title="Done" tasks={tasks.done} />

          <TodoList listType="ignored" title="Ignored" tasks={tasks.ignored} />
        </div>
      </div>

      {!canEdit && isConnected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl border border-gray-700/50 bg-gray-900/90 p-6 shadow-2xl backdrop-blur">
            <div className="text-center text-white">
              <div className="mb-2 text-base font-medium">Edit in Progress</div>
              <div className="text-sm text-gray-300">
                Another user is currently editing...
              </div>
            </div>
          </div>
        </div>
      )}

      {!isConnected && currentUser && !wasConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-yellow-700/50 bg-gray-900/95 p-6 shadow-2xl backdrop-blur">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
                  <svg
                    className="h-6 w-6 animate-spin text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              </div>

              <h3 className="mb-2 text-lg font-semibold text-yellow-400">
                Connecting...
              </h3>

              <p className="mb-4 text-sm text-gray-300">
                Establishing connection to the server
              </p>
            </div>
          </div>
        </div>
      )}

      {showDisconnectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-red-700/50 bg-gray-900/95 p-6 shadow-2xl backdrop-blur">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
                  <svg
                    className="h-6 w-6 animate-spin text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              </div>

              <h3 className="mb-2 text-lg font-semibold text-white">
                Reconnecting...
              </h3>

              <p className="mb-4 text-sm text-gray-300">
                Disconnected from socket. If you edit anything it won't reflect
                to other users or be saved. unless you change and stay till you
                get reconnected
              </p>

              <p className="mb-6 text-xs text-gray-400">
                If reconnecting for long, try refreshing the page. If that
                doesn't work, contact{" "}
                <span className="font-medium text-blue-400">dhextras</span>.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Refresh Page
                </button>

                <button
                  onClick={() => {
                    setShowDisconnectedModal(false);
                  }}
                  className="w-full rounded-lg bg-gray-600 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
                >
                  Continue Reading (Read Only)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dragState &&
        dragState.currentPos &&
        draggedTaskInfo &&
        dragState.userId !== currentUser?.id && (
          <div
            className="pointer-events-none fixed backdrop-blur-lg"
            style={{
              left: dragState.currentPos.x || 0,
              top: dragState.currentPos.y || 0,
              transform: "translate(-20px, -10px)",
            }}
          >
            <div className="transition-all duration-100">
              {(() => {
                const dragUser = connectedUsers?.find(
                  (u) => u.id === dragState.userId,
                );
                const userColor = dragUser?.avatar.split("-")[0] || "#8B5CF6";

                return (
                  <div className="relative">
                    <div className="w-[calc(100vw-3rem)] overflow-visible rounded-lg border border-gray-700/50 bg-gray-900/90 p-3 shadow-2xl lg:w-[calc((95vw-4.5rem)/3)] xl:w-[calc((95vw-4.5rem)/3)] 2xl:w-[calc((90vw-4.5rem)/3)]">
                      <div
                        className={`absolute bottom-0 left-0 top-0 w-1 ${
                          draggedTaskInfo.listName === "todo"
                            ? "bg-blue-500"
                            : draggedTaskInfo.listName === "done"
                              ? "bg-emerald-500"
                              : "bg-gray-500"
                        } rounded-l-lg`}
                      ></div>

                      <div
                        className="absolute -left-2.5 -top-7 flex items-center space-x-2 px-3 py-1.5 text-sm font-bold shadow-lg"
                        style={{ color: userColor }}
                      >
                        <div
                          className="h-1.5 w-1.5 animate-pulse rounded-full"
                          style={{ backgroundColor: userColor }}
                        ></div>
                        <span className="whitespace-nowrap">
                          {dragUser?.name || "User"}
                        </span>
                      </div>

                      <div className="ml-4 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium leading-relaxed text-white">
                            {draggedTaskInfo.task.title}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
    </div>
  );
}
