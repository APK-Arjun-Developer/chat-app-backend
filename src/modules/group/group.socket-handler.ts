import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "../../socket/types.js";
import { withSocketErrorHandling } from "../../socket/socket-error-wrapper.js";
import { GroupService } from "./group.service.js";
import { ChatService } from "../chat/chat.service.js";
import { SocketSessionStore } from "../../socket/socket-context.js";

export const registerGroupHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  deps: { groupService: GroupService; chatService: ChatService; sessions: SocketSessionStore },
) => {
  socket.on("createGroup", (groupName) => {
    withSocketErrorHandling(socket, "createGroup", () => {
      const session = deps.sessions.get(socket.id);
      if (!session) throw new Error("Authentication required");

      const group = deps.groupService.createGroup(groupName, session.userId);
      socket.join(group.id);
      socket.emit("groupCreated", { id: group.id, name: group.name, adminUserId: group.adminId });
    });
  });

  socket.on("joinGroup", (groupId) => {
    withSocketErrorHandling(socket, "joinGroup", () => {
      const session = deps.sessions.get(socket.id);
      if (!session) throw new Error("Authentication required");

      const { group } = deps.groupService.joinGroup(groupId, session.userId);
      socket.join(group.id);
      const snapshot = deps.chatService.getGroupSnapshot(group.id);
      socket.emit("groupJoined", { id: group.id, name: group.name, adminUserId: group.adminId }, snapshot.history);
      io.to(group.id).emit("users", snapshot.users);
    });
  });
};
