import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { runMigrations } from "./infrastructure/db/sqlite.js";
import { registerSocketHandlers } from "./socket/register-handlers.js";
import type { ClientToServerEvents, ServerToClientEvents } from "./socket/types.js";

const start = () => {
  runMigrations();

  const app = express();
  const server = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: { origin: env.CORS_ORIGIN },
  });

  registerSocketHandlers(io);

  server.listen(env.PORT, "0.0.0.0", () => {
    logger.info({ port: env.PORT }, "Server started");
  });
};

start();
