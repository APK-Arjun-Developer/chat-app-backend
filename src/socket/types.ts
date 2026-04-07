import type { ChatMessage, TransportUser } from "../domain/entities.js";

export interface ServerToClientEvents {
  message: (message: ChatMessage) => void;
  users: (users: TransportUser[]) => void;
  error: (message: string) => void;
  authSuccess: (username: string, userId: string) => void;
  groupCreated: (group: { id: string; name: string; adminUserId: string }) => void;
  groupJoined: (group: { id: string; name: string; adminUserId: string }, history: ChatMessage[]) => void;
  groupsList: (groups: { id: string; name: string }[]) => void;
  joinedGroupsList: (groups: { id: string; name: string }[]) => void;
}

export interface ClientToServerEvents {
  register: (username: string, pass: string) => void;
  login: (username: string, pass: string) => void;
  createGroup: (groupName: string) => void;
  joinGroup: (groupId: string) => void;
  message: (groupId: string, text: string) => void;
}
