import type { Socket } from "socket.io";
import { logger } from "../config/logger.js";
import { toErrorMessage } from "../shared/errors/app-error.js";

export const withSocketErrorHandling = (
  socket: Socket,
  handlerName: string,
  fn: () => Promise<void> | void,
): void => {
  Promise.resolve(fn()).catch((error: unknown) => {
    logger.error({ err: error, handlerName, socketId: socket.id }, "Socket handler failed");
    socket.emit("error", toErrorMessage(error));
  });
};
