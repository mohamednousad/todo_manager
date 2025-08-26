import { create } from "zustand";
import { socketClient } from "./socket";
import type {
  ClientState,
  DragOperation,
  MousePosition,
  TaskLists,
  User,
} from "./types";

interface TodoStore extends ClientState {
  isConnected: boolean;

  // Actions
  setCurrentUser: (user: User) => void;
  setConnectedUsers: (users: User[]) => void;
  setTasks: (tasks: TaskLists) => void;
  updateMousePosition: (userId: string, position: MousePosition) => void;
  setEditingState: (taskId: string, userId: string) => void;
  removeEditingState: (taskId: string) => void;
  setDragState: (drag: DragOperation | null) => void;
  setCanEdit: (canEdit: boolean) => void;
  setIsEditing: (isEditing: boolean) => void;
  setIsConnected: (isConnected: boolean) => void;

  // Socket actions
  joinUser: (name: string) => void;
  addTask: (title: string, description: string) => void;
  updateTask: (taskId: string, updates: any) => void;
  moveTask: (taskId: string, fromList: string, toList: string) => void;
  deleteTask: (taskId: string, fromList: string) => void;
  clearList: (listType: string) => void;
  startDrag: (
    taskId: string,
    startPos: { x: number; y: number },
    relativePos: { x: number; y: number },
    fromList: string,
  ) => void;
  updateDrag: (currentPos: { x: number; y: number }) => void;
  endDrag: (taskId: string, dropList?: string, beforeTaskId?: string) => void;
  sendMouseMove: (
    x: number,
    y: number,
    vw: number,
    vh: number,
    pr: number,
  ) => void;
  startEditing: (taskId: string, type?: "edit" | "drag" | "move") => void;
  endEditing: (taskId: string) => void;
}

export const useTodoStore = create<TodoStore>((set, get) => {
  // Setup socket event handlers
  const cleanupInvalidStates = () => {
    const { connectedUsers, editingState, dragState } = get();
    const connectedUserIds = new Set(connectedUsers.map((user) => user.id));

    let editingChanged = false;
    const newEditingState = new Map(editingState);

    for (const [taskId, user] of editingState) {
      const userId = user.userId;
      if (!connectedUserIds.has(userId)) {
        newEditingState.delete(taskId);
        editingChanged = true;
      }
    }

    let dragChanged = false;
    let newDragState = dragState;

    if (dragState && !connectedUserIds.has(dragState.userId)) {
      newDragState = null;
      dragChanged = true;
    }

    if (editingChanged || dragChanged) {
      set({
        ...(editingChanged && { editingState: newEditingState }),
        ...(dragChanged && { dragState: newDragState }),
      });
    }
  };

  setInterval(cleanupInvalidStates, 60 * 1000); // Cleanup per min

  socketClient.on("initial-state", (data) => {
    set({
      currentUser: data.currentUser,
      connectedUsers: data.users,
      tasks: data.tasks,
      editingState: new Map(Object.entries(data.editingLocks || {})),
      dragState: null,
    });
  });

  socketClient.on("users-update", (data) => {
    set({ connectedUsers: data.users });
    // Run cleanup immediately when users update (someone disconnected)
    setTimeout(cleanupInvalidStates, 100);
  });

  socketClient.on("mouse-move", (data) => {
    const { mousePositions } = get();
    const newPositions = new Map(mousePositions);
    newPositions.set(data.userId, {
      x: data.x,
      y: data.y,
      vw: data.vw,
      vh: data.vh,
      pr: data.pr,
      timestamp: Date.now(),
    });
    set({ mousePositions: newPositions });
  });

  socketClient.on("editing-start", (data) => {
    const { editingState } = get();
    const newState = new Map(editingState);
    newState.set(data.taskId, data.userId);
    set({ editingState: newState });
  });

  socketClient.on("editing-end", (data) => {
    const { editingState } = get();
    const newState = new Map(editingState);
    newState.delete(data.taskId);
    set({ editingState: newState });
  });

  socketClient.on("editing-failed", (data) => {
    set({ canEdit: false });
    setTimeout(() => set({ canEdit: true }), 1000);
  });

  socketClient.on("document-change", (data) => {
    set({ tasks: data.tasks });
  });

  socketClient.on("drag-start", (data) => {
    set({ dragState: data });
  });

  socketClient.on("drag-move", (data) => {
    const { dragState } = get();
    if (dragState && dragState.userId === data.userId) {
      set({
        dragState: {
          ...dragState,
          currentPos: data.currentPos,
        },
      });
    }
  });

  socketClient.on("drag-end", (data) => {
    set({ dragState: null });
  });

  return {
    currentUser: null,
    connectedUsers: [],
    tasks: { todo: [], done: [], ignored: [] },
    editingState: new Map(),
    dragState: null,
    mousePositions: new Map(),
    isEditing: false,
    canEdit: true,
    isConnected: false,

    // FIXME: Don't know why but for some fucking reason these aren't being used
    // And i forgot why i added them & Might be useful sometime later so just fucking leave it be...
    setCurrentUser: (user) => set({ currentUser: user }),
    setConnectedUsers: (users) => set({ connectedUsers: users }),
    setTasks: (tasks) => set({ tasks }),
    setIsConnected: (isConnected) => set({ isConnected }),

    updateMousePosition: (userId, position) => {
      const { mousePositions } = get();
      const newPositions = new Map(mousePositions);
      newPositions.set(userId, position);
      set({ mousePositions: newPositions });
    },

    setEditingState: (taskId, userId) => {
      const { editingState } = get();
      const newState = new Map(editingState);
      newState.set(taskId, userId);
      set({ editingState: newState });
    },

    removeEditingState: (taskId) => {
      const { editingState } = get();
      const newState = new Map(editingState);
      newState.delete(taskId);
      set({ editingState: newState });
    },

    setDragState: (drag) => set({ dragState: drag }),
    setCanEdit: (canEdit) => set({ canEdit }),
    setIsEditing: (isEditing) => set({ isEditing }),

    joinUser: (name) => socketClient.joinUser(name),
    addTask: (title, description) => socketClient.addTask(title, description),
    updateTask: (taskId, updates) => socketClient.updateTask(taskId, updates),
    moveTask: (taskId, fromList, toList) =>
      socketClient.moveTask(taskId, fromList, toList),
    deleteTask: (taskId, fromList) => socketClient.deleteTask(taskId, fromList),
    clearList: (listType) => socketClient.clearList(listType),
    startDrag: (taskId, startPos, relativePos, fromList) =>
      socketClient.startDrag(taskId, startPos, relativePos, fromList),
    updateDrag: (currentPos) => socketClient.updateDrag(currentPos),
    endDrag: (taskId, dropList, beforeTaskId) =>
      socketClient.endDrag(taskId, dropList, beforeTaskId),
    sendMouseMove: (x, y, vw, vh, pr) =>
      socketClient.sendMouseMove(x, y, vw, vh, pr),
    startEditing: (taskId, type) => socketClient.startEditing(taskId, type),
    endEditing: (taskId) => socketClient.endEditing(taskId),
  };
});
