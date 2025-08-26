import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import type { DragOperation, SocketMessage, Task } from "../lib/types";
import { compressMessage } from "./compression";
import { StateManager } from "./state";

export class WebSocketServer {
  private io: Server;
  private stateManager: StateManager;

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.stateManager = new StateManager();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("user-join", (data) => {
        try {
          const user = this.stateManager.addUser(socket.id, data.name);

          this.sendMessage(socket, "initial-state", {
            currentUser: user,
            users: this.stateManager.getUsers(),
            tasks: this.stateManager.getTasks(),
            editingLocks: Object.fromEntries(
              this.stateManager.getEditingLocks(),
            ),
            dragOperations: Object.fromEntries(
              this.stateManager.getDragOperations(),
            ),
          });

          this.broadcastMessage("users-update", {
            users: this.stateManager.getUsers(),
          });
        } catch (error) {
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("mouse-move", (data) => {
        this.stateManager.updateUserMouse(socket.id, data);
        socket.broadcast.emit("mouse-move", {
          userId: socket.id,
          ...data,
        });
      });

      socket.on("editing-start", (data) => {
        const success = this.stateManager.acquireEditingLock(
          socket.id,
          data.taskId,
          data.type,
        );
        if (success) {
          this.broadcastMessage("editing-start", {
            userId: socket.id,
            taskId: data.taskId,
            type: data.type,
          });
        } else {
          socket.emit("editing-failed", { taskId: data.taskId });
        }
      });

      socket.on("editing-end", (data) => {
        this.stateManager.releaseEditingLock(data.taskId);
        this.broadcastMessage("editing-end", {
          userId: socket.id,
          taskId: data.taskId,
        });
      });

      socket.on("task-add", (data) => {
        const task: Task = {
          id: uuidv4(),
          title: data.title,
          description: data.description,
          timestamp: new Date().toISOString(),
        };

        this.stateManager.addTask(task);
        this.broadcastMessage("document-change", {
          type: "task-add",
          task,
          tasks: this.stateManager.getTasks(),
        });
      });

      socket.on("task-update", (data) => {
        const success = this.stateManager.updateTask(data.taskId, data.updates);
        if (success) {
          this.broadcastMessage("document-change", {
            type: "task-update",
            taskId: data.taskId,
            updates: data.updates,
            tasks: this.stateManager.getTasks(),
          });
          this.stateManager.releaseEditingLock(data.taskId);
        }
      });

      socket.on("task-move", (data) => {
        const success = this.stateManager.moveTask(
          data.taskId,
          data.fromList,
          data.toList,
        );
        if (success) {
          this.broadcastMessage("document-change", {
            type: "task-move",
            taskId: data.taskId,
            fromList: data.fromList,
            toList: data.toList,
            tasks: this.stateManager.getTasks(),
          });
        }
      });

      socket.on("task-delete", (data) => {
        const success = this.stateManager.deleteTask(
          data.taskId,
          data.fromList,
        );
        if (success) {
          this.broadcastMessage("document-change", {
            type: "task-delete",
            taskId: data.taskId,
            fromList: data.fromList,
            tasks: this.stateManager.getTasks(),
          });
        }
      });

      socket.on("list-clear", (data) => {
        this.stateManager.clearList(data.listType);
        this.broadcastMessage("document-change", {
          type: "list-clear",
          listType: data.listType,
          tasks: this.stateManager.getTasks(),
        });
      });

      socket.on("drag-start", (data) => {
        const success = this.stateManager.acquireEditingLock(
          socket.id,
          data.taskId,
          "drag",
        );
        if (success) {
          const dragOp: DragOperation = {
            taskId: data.taskId,
            userId: socket.id,
            startPos: data.startPos,
            relativePos: data.relativePos,
            currentPos: data.startPos,
            fromList: data.fromList,
          };

          this.stateManager.startDrag(socket.id, dragOp);
          this.broadcastMessage("drag-start", dragOp);
        }
      });

      socket.on("drag-move", (data) => {
        this.stateManager.updateDrag(socket.id, data.currentPos);
        socket.broadcast.emit("drag-move", {
          userId: socket.id,
          currentPos: data.currentPos,
        });
      });

      socket.on("drag-end", (data) => {
        const dragOp = this.stateManager.endDrag(socket.id);

        if (dragOp && data.dropList) {
          let success = false;

          if (data.beforeTaskId) {
            success = this.stateManager.moveTaskWithPosition(
              dragOp.taskId,
              dragOp.fromList as any,
              data.dropList,
              data.beforeTaskId,
            );
          } else {
            success = this.stateManager.moveTaskWithPosition(
              dragOp.taskId,
              dragOp.fromList as any,
              data.dropList,
              "-1",
            );
          }

          if (success) {
            this.broadcastMessage("document-change", {
              type: "task-move",
              taskId: dragOp.taskId,
              fromList: dragOp.fromList,
              toList: data.dropList,
              beforeTaskId: data.beforeTaskId,
              tasks: this.stateManager.getTasks(),
            });
          }
        }

        // Always broadcast drag end for cleanup
        this.broadcastMessage("drag-end", {
          userId: socket.id,
          taskId: dragOp?.taskId,
          success: !!(dragOp && data.dropList),
        });
      });

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        this.stateManager.removeUser(socket.id);
        this.broadcastMessage("users-update", {
          users: this.stateManager.getUsers(),
        });
      });
    });
  }

  private sendMessage(socket: any, type: string, data: any): void {
    const message: SocketMessage = {
      type: type as any,
      data,
      timestamp: Date.now(),
    };

    const compressed = compressMessage(message);
    message.compressed = typeof compressed !== "string";

    socket.emit("message", compressed);
  }

  private broadcastMessage(type: string, data: any): void {
    const message: SocketMessage = {
      type: type as any,
      data,
      timestamp: Date.now(),
    };

    const compressed = compressMessage(message);
    message.compressed = typeof compressed !== "string";

    this.io.emit("message", compressed);
  }
}
