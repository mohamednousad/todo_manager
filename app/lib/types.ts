export interface User {
  id: string;
  name: string;
  avatar: string;
  mouse: { x: number; y: number };
  editing?: string;
  connected: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface TaskLists {
  todo: Task[];
  done: Task[];
  ignored: Task[];
}

export interface EditingLock {
  userId: string;
  timestamp: number;
  type: "edit" | "drag" | "move";
}

export interface DragOperation {
  taskId: string;
  userId: string;
  startPos: { x: number; y: number };
  relativePos: { x: number; y: number };
  currentPos: { x: number; y: number };
  fromList: string;
}

export interface MousePosition {
  x: number;
  y: number;
  vw: number;
  vh: number;
  pr: number; // NOTE: Just useless but i dont wanna change it on bunch places
  timestamp: number;
}

export type MessageType =
  | "user-join"
  | "user-leave"
  | "users-update"
  | "mouse-move"
  | "editing-start"
  | "editing-end"
  | "editing-timeout"
  | "task-add"
  | "task-move"
  | "task-update"
  | "task-delete"
  | "list-clear"
  | "drag-start"
  | "drag-move"
  | "drag-end"
  | "document-change"
  | "initial-state";

export interface SocketMessage {
  type: MessageType;
  data: any;
  timestamp: number;
  compressed?: boolean;
}

export interface ServerState {
  users: Map<string, User>;
  tasks: TaskLists;
  editingLocks: Map<string, EditingLock>;
  dragOperations: Map<string, DragOperation>;
}

export interface ClientState {
  currentUser: User | null;
  connectedUsers: User[];
  tasks: TaskLists;
  editingState: Map<string, string>;
  dragState: DragOperation | null;
  mousePositions: Map<string, MousePosition>;
  isEditing: boolean;
  canEdit: boolean;
}
