export type MessageType = "chat" | "system";

export interface User {
  id: string;
  username: string;
  password: string;
  socketId: string | null;
}

export interface Group {
  id: string;
  name: string;
  adminId: string;
  type: "group";
}

export interface GroupMember {
  groupId: string;
  userId: string;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  username: string;
  text: string;
  timestamp: number;
  type: MessageType;
}

export interface TransportUser {
  id: string | null;
  userId: string;
  username: string;
  isOnline: 0 | 1;
}
