import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import type {
  DragOperation,
  EditingLock,
  ServerState,
  Task,
  TaskLists,
  User,
} from "../lib/types";

import { SimpleBackupManager } from "./backup";

const DATA_FILE = "data/data.json";
const EDIT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export class StateManager {
  private state: ServerState;
  private backupManager: SimpleBackupManager;

  constructor() {
    if (!existsSync("data")) {
      mkdirSync("data", { recursive: true });
    }

    this.state = {
      users: new Map(),
      tasks: this.loadTasks(),
      editingLocks: new Map(),
      dragOperations: new Map(),
    };

    this.backupManager = new SimpleBackupManager();
    this.startCleanupTimer();
  }

  private loadTasks(): TaskLists {
    if (!existsSync(DATA_FILE)) {
      return { todo: [], done: [], ignored: [] };
    }

    try {
      const data = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
      return data.tasks || { todo: [], done: [], ignored: [] };
    } catch {
      return { todo: [], done: [], ignored: [] };
    }
  }

  private saveTasks(): void {
    const data = {
      tasks: this.state.tasks,
      lastModified: new Date().toISOString(),
    };
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [taskId, lock] of this.state.editingLocks) {
        if (now - lock.timestamp > EDIT_TIMEOUT) {
          this.state.editingLocks.delete(taskId);
          const user = this.state.users.get(lock.userId);
          if (user && user.editing === taskId) {
            user.editing = undefined;
          }
        }
      }

      for (const [userId, drag] of this.state.dragOperations) {
        if (now - drag.startPos.x > 30000) {
          this.state.dragOperations.delete(userId);
          this.releaseEditingLock(drag.taskId);
        }
      }
    }, 30000);
  }

  addUser(socketId: string, name: string): User {
    const existingUser = Array.from(this.state.users.values()).find(
      (u) => u.name === name,
    );
    if (existingUser) {
      throw new Error(`User "${name}" already exists`);
    }

    const user: User = {
      id: socketId,
      name,
      avatar: this.generateAvatar(),
      mouse: { x: 0, y: 0 },
      connected: true,
    };

    this.state.users.set(socketId, user);
    return user;
  }

  removeUser(socketId: string): void {
    const user = this.state.users.get(socketId);
    if (user) {
      if (user.editing) {
        this.releaseEditingLock(user.editing);
      }
      this.state.dragOperations.delete(socketId);
      this.state.users.delete(socketId);
    }
  }

  updateUserMouse(
    socketId: string,
    mouse: { x: number; y: number; vw: number; vh: number; pr: number },
  ): void {
    const user = this.state.users.get(socketId);
    if (user) {
      user.mouse = mouse;
    }
  }

  getUsers(): User[] {
    return Array.from(this.state.users.values());
  }

  acquireEditingLock(
    userId: string,
    taskId: string,
    type: "edit" | "drag" | "move" = "edit",
  ): boolean {
    const existing = this.state.editingLocks.get(taskId);
    if (existing && existing.userId !== userId) {
      return false;
    }

    this.state.editingLocks.set(taskId, {
      userId,
      timestamp: Date.now(),
      type,
    });

    const user = this.state.users.get(userId);
    if (user) {
      user.editing = taskId;
    }

    return true;
  }

  releaseEditingLock(taskId: string): void {
    const lock = this.state.editingLocks.get(taskId);
    if (lock) {
      this.state.editingLocks.delete(taskId);
      const user = this.state.users.get(lock.userId);
      if (user && user.editing === taskId) {
        user.editing = undefined;
      }
    }
  }

  getEditingLocks(): Map<string, EditingLock> {
    return this.state.editingLocks;
  }

  addTask(task: Task): void {
    this.state.tasks.todo.push(task);
    this.saveTasks();
  }

  moveTaskWithPosition(
    taskId: string,
    fromList: keyof TaskLists,
    toList: keyof TaskLists,
    beforeTaskId: string,
  ): boolean {
    const fromArray = this.state.tasks[fromList];
    const toArray = this.state.tasks[toList];

    const taskIndex = fromArray.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return false;

    const [task] = fromArray.splice(taskIndex, 1);

    if (fromList === toList) {
      const targetIndex = fromArray.findIndex((t) => t.id === beforeTaskId);
      if (targetIndex === -1) {
        fromArray.splice(0, 0, task);
      } else {
        fromArray.splice(targetIndex + 1, 0, task);
      }
    } else {
      const targetIndex = toArray.findIndex((t) => t.id === beforeTaskId);
      if (targetIndex === -1) {
        toArray.splice(0, 0, task);
      } else {
        toArray.splice(targetIndex + 1, 0, task);
      }
    }

    this.releaseEditingLock(taskId);
    this.saveTasks();
    return true;
  }

  moveTask(
    taskId: string,
    fromList: keyof TaskLists,
    toList: keyof TaskLists,
  ): boolean {
    const fromArray = this.state.tasks[fromList];
    const toArray = this.state.tasks[toList];

    const taskIndex = fromArray.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return false;

    const [task] = fromArray.splice(taskIndex, 1);
    toArray.push(task);

    this.releaseEditingLock(taskId);
    this.saveTasks();
    return true;
  }

  updateTask(taskId: string, updates: Partial<Task>): boolean {
    for (const list of Object.values(this.state.tasks)) {
      const task = list.find((t: any) => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
        this.saveTasks();
        return true;
      }
    }
    return false;
  }

  deleteTask(taskId: string, fromList: keyof TaskLists): boolean {
    const array = this.state.tasks[fromList];
    const index = array.findIndex((t) => t.id === taskId);
    if (index === -1) return false;

    array.splice(index, 1);
    this.releaseEditingLock(taskId);
    this.saveTasks();
    return true;
  }

  clearList(listType: keyof TaskLists): void {
    const tasks = this.state.tasks[listType];
    tasks.forEach((task) => this.releaseEditingLock(task.id));
    this.state.tasks[listType] = [];
    this.saveTasks();
  }

  getTasks(): TaskLists {
    return this.state.tasks;
  }

  startDrag(userId: string, drag: DragOperation): void {
    this.state.dragOperations.set(userId, drag);
  }

  updateDrag(userId: string, currentPos: { x: number; y: number }): void {
    const drag = this.state.dragOperations.get(userId);
    if (drag) {
      drag.currentPos = currentPos;
    }
  }

  endDrag(userId: string): DragOperation | null {
    const drag = this.state.dragOperations.get(userId);
    if (drag) {
      this.state.dragOperations.delete(userId);
      return drag;
    }
    return null;
  }

  getDragOperations(): Map<string, DragOperation> {
    return this.state.dragOperations;
  }

  getBackupInfo() {
    return this.backupManager.getBackupInfo();
  }

  private generateAvatar(): string {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FECA57",
      "#FF9FF3",
      "#54A0FF",
    ];

    const shapes = ["circle", "square", "diamond", "pentagon"];

    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    return `${color}-${shape}`;
  }
}
