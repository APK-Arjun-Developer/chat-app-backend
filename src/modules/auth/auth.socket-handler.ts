import type { Socket } from "socket.io";
import { withSocketErrorHandling } from "../../socket/socket-error-wrapper.js";
import type { ClientToServerEvents, ServerToClientEvents } from "../../socket/types.js";
import { AuthService } from "./auth.service.js";
import { GroupService } from "../group/group.service.js";
import { SocketSessionStore } from "../../socket/socket-context.js";

export const registerAuthHandlers = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  deps: { authService: AuthService; groupService: GroupService; sessions: SocketSessionStore },
) => {
  socket.on("register", (username, password) => {
    withSocketErrorHandling(socket, "register", async () => {
      const user = await deps.authService.register(username, password, socket.id);
      deps.sessions.set(socket.id, { userId: user.id, username: user.username });
      socket.emit("authSuccess", user.username, user.id);
      const groups = deps.groupService.getUserGroups(user.id);
      socket.emit("groupsList", groups.available);
      socket.emit("joinedGroupsList", groups.joined);
    });
  });

  socket.on("login", (username, password) => {
    withSocketErrorHandling(socket, "login", async () => {
      const user = await deps.authService.login(username, password, socket.id);
      deps.sessions.set(socket.id, { userId: user.id, username: user.username });
      socket.emit("authSuccess", user.username, user.id);
      const groups = deps.groupService.getUserGroups(user.id);
      socket.emit("groupsList", groups.available);
      socket.emit("joinedGroupsList", groups.joined);
    });
  });
};
