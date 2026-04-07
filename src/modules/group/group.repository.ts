import { randomUUID } from "node:crypto";
import { db } from "../../infrastructure/db/sqlite.js";
import type { Group } from "../../domain/entities.js";

export class GroupRepository {
  create(name: string, adminId: string): Group {
    const id = randomUUID();
    db.prepare("INSERT INTO groups (id, name, admin_id, type) VALUES (?, ?, ?, 'group')").run(id, name, adminId);
    db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(id, adminId);
    return { id, name, adminId, type: "group" };
  }

  findById(groupId: string): Group | undefined {
    const row = db.prepare("SELECT id, name, admin_id as adminId, type FROM groups WHERE id = ?").get(groupId) as Group | undefined;
    return row;
  }

  findAllGroups() {
    return db.prepare("SELECT id, name FROM groups WHERE type = 'group'").all() as { id: string; name: string }[];
  }

  findJoinedByUser(userId: string) {
    return db
      .prepare(
        `SELECT g.id, g.name
         FROM groups g
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ? AND g.type = 'group'`,
      )
      .all(userId) as { id: string; name: string }[];
  }

  ensureMembership(groupId: string, userId: string): boolean {
    const member = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, userId);
    if (member) return false;
    db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(groupId, userId);
    return true;
  }
}
