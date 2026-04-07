import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";
import { logger } from "../config/logger.js";
import { AuthRepository } from "../modules/auth/auth.repository.js";
import { AuthService } from "../modules/auth/auth.service.js";
import { GroupRepository } from "../modules/group/group.repository.js";
import { GroupService } from "../modules/group/group.service.js";
import { ChatRepository } from "../modules/chat/chat.repository.js";
import { ChatService } from "../modules/chat/chat.service.js";
import { registerAuthHandlers } from "../modules/auth/auth.socket-handler.js";
import { registerGroupHandlers } from "../modules/group/group.socket-handler.js";
import { registerChatHandlers } from "../modules/chat/chat.socket-handler.js";
import { SocketSessionStore } from "./socket-context.js";

export const registerSocketHandlers = (io: Server<ClientToServerEvents, ServerToClientEvents>): void => {
  const sessions = new SocketSessionStore();

  const authService = new AuthService(new AuthRepository());
  const groupService = new GroupService(new GroupRepository());
  const chatService = new ChatService(new ChatRepository());

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    registerAuthHandlers(socket, { authService, groupService, sessions });
    registerGroupHandlers(io, socket, { groupService, chatService, sessions });
    registerChatHandlers(io, socket, { chatService, sessions });

    socket.on("disconnect", () => {
      sessions.delete(socket.id);
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });
};
