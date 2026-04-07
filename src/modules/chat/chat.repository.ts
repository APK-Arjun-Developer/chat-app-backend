import { randomUUID } from "node:crypto";
import { db } from "../../infrastructure/db/sqlite.js";
import type { ChatMessage, TransportUser } from "../../domain/entities.js";

export class ChatRepository {
  listMembers(groupId: string): TransportUser[] {
    return db
      .prepare(
        `SELECT u.socket_id as id, u.id as userId, u.username,
        CASE WHEN u.socket_id IS NOT NULL THEN 1 ELSE 0 END as isOnline
        FROM users u
        JOIN group_members gm ON u.id = gm.user_id
        WHERE gm.group_id = ?`,
      )
      .all(groupId) as TransportUser[];
  }

  listMessages(groupId: string): ChatMessage[] {
    return db
      .prepare("SELECT id, group_id as groupId, username, text, timestamp, type FROM messages WHERE group_id = ? ORDER BY timestamp ASC")
      .all(groupId) as ChatMessage[];
  }

  createMessage(groupId: string, username: string, text: string, type: "chat" | "system" = "chat"): ChatMessage {
    const msg: ChatMessage = {
      id: randomUUID(),
      groupId,
      username,
      text,
      timestamp: Date.now(),
      type,
    };
    db.prepare("INSERT INTO messages (id, group_id, username, text, timestamp, type) VALUES (?, ?, ?, ?, ?, ?)").run(
      msg.id,
      msg.groupId,
      msg.username,
      msg.text,
      msg.timestamp,
      msg.type,
    );
    return msg;
  }
}
