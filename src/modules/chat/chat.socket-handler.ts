import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "../../socket/types.js";
import { withSocketErrorHandling } from "../../socket/socket-error-wrapper.js";
import { ChatService } from "./chat.service.js";
import { SocketSessionStore } from "../../socket/socket-context.js";

export const registerChatHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  deps: { chatService: ChatService; sessions: SocketSessionStore },
) => {
  socket.on("message", (groupId, text) => {
    withSocketErrorHandling(socket, "message", () => {
      const session = deps.sessions.get(socket.id);
      if (!session) throw new Error("Authentication required");

      const msg = deps.chatService.sendMessage(groupId, text, session.username);
      io.to(groupId).emit("message", msg);
    });
  });
};
