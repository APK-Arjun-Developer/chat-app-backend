import { randomUUID } from "node:crypto";
import { db } from "../../infrastructure/db/sqlite.js";
import type { User } from "../../domain/entities.js";

export class AuthRepository {
  findByUsername(username: string): User | undefined {
    return db
      .prepare("SELECT id, username, password, socket_id as socketId FROM users WHERE username = ?")
      .get(username) as User | undefined;
  }

  findById(id: string): User | undefined {
    return db
      .prepare("SELECT id, username, password, socket_id as socketId FROM users WHERE id = ?")
      .get(id) as User | undefined;
  }

  createUser(username: string, password: string, socketId: string): User {
    const id = randomUUID();
    db.prepare("INSERT INTO users (id, username, password, socket_id) VALUES (?, ?, ?, ?)").run(
      id,
      username,
      password,
      socketId,
    );
    return { id, username, password, socketId };
  }

  updateSocket(id: string, socketId: string | null): void {
    db.prepare("UPDATE users SET socket_id = ? WHERE id = ?").run(socketId, id);
  }
}
