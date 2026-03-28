import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ClientToServerEvents, ServerToClientEvents, User, Message, Group } from "./types.js";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import bcrypt from "bcryptjs";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Socket ID to User ID mapping for quick lookup during disconnect
  const socketToUserId: Map<string, string> = new Map();

  const sendUserGroups = (socket: any, userId: string) => {
    try {
      const allGroups = db.prepare("SELECT id, name FROM groups WHERE type = 'group'").all() as { id: string; name: string }[];
      const joinedGroups = db.prepare(`
        SELECT g.id, g.name 
        FROM groups g 
        JOIN group_members gm ON g.id = gm.group_id 
        WHERE gm.user_id = ? AND g.type = 'group'
      `).all(userId) as { id: string; name: string }[];
      
      const joinedIds = new Set(joinedGroups.map(g => g.id));
      const availableGroups = allGroups.filter(g => !joinedIds.has(g.id));

      socket.emit("groupsList", availableGroups);
      socket.emit("joinedGroupsList", joinedGroups);
    } catch (err) {
      console.error("Error sending user groups:", err);
    }
  };

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("register", async (username, password) => {
      if (!username || !password) {
        socket.emit("error", "Username and password are required");
        return;
      }
      const trimmedUsername = username.trim();

      try {
        const existingUser = db.prepare("SELECT * FROM users WHERE username = ?").get(trimmedUsername);
        if (existingUser) {
          socket.emit("error", "Username already exists");
          return;
        }

        const userId = Math.random().toString(36).substring(2, 9);
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.prepare("INSERT INTO users (id, username, password, socket_id) VALUES (?, ?, ?, ?)").run(
          userId, trimmedUsername, hashedPassword, socket.id
        );

        socketToUserId.set(socket.id, userId);
        socket.emit("authSuccess", trimmedUsername, userId);
        sendUserGroups(socket, userId);
      } catch (err) {
        console.error("Register error:", err);
        socket.emit("error", "Registration failed");
      }
    });

    socket.on("login", async (username, password) => {
      if (!username || !password) {
        socket.emit("error", "Username and password are required");
        return;
      }
      const trimmedUsername = username.trim();
      try {
        const user = db.prepare("SELECT * FROM users WHERE username = ?").get(trimmedUsername) as any;
        if (!user?.password) {
          socket.emit("error", "Invalid username or password");
          return;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          socket.emit("error", "Invalid username or password");
          return;
        }

        db.prepare("UPDATE users SET socket_id = ? WHERE id = ?").run(socket.id, user.id);
        socketToUserId.set(socket.id, user.id);
        socket.emit("authSuccess", trimmedUsername, user.id);
        sendUserGroups(socket, user.id);
      } catch (err) {
        console.error("Login error:", err);
        socket.emit("error", "Login failed");
      }
    });

    socket.on("autoLogin", (username) => {
      if (!username) return;
      try {
        const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
        if (user) {
          db.prepare("UPDATE users SET socket_id = ? WHERE id = ?").run(socket.id, user.id);
          socketToUserId.set(socket.id, user.id);
          socket.emit("authSuccess", username, user.id);
          sendUserGroups(socket, user.id);
        }
      } catch (err) {
        console.error("Auto-login error:", err);
      }
    });

    socket.on("createGroup", (groupName) => {
      const userId = socketToUserId.get(socket.id);
      if (!userId) return;

      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
      if (!user) return;

      const groupNameTrimmed = groupName.trim();
      if (!groupNameTrimmed) {
        socket.emit("error", "Group name is required");
        return;
      }

      try {
        const existingGroup = db.prepare("SELECT id FROM groups WHERE name = ?").get(groupNameTrimmed);
        if (existingGroup) {
          socket.emit("error", "Group name already exists");
          return;
        }

        const groupId = Math.random().toString(36).substring(2, 9);
        db.prepare("INSERT INTO groups (id, name, admin_id, type) VALUES (?, ?, ?, ?)").run(groupId, groupNameTrimmed, userId, 'group');
        db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(groupId, userId);

        const newGroup: Group = {
          id: groupId,
          name: groupNameTrimmed,
          adminUserId: userId,
          members: [{ id: socket.id, userId: userId, username: user.username, isOnline: true }],
        };

        socket.join(groupId);
        socket.emit("groupCreated", newGroup);
        socket.emit("groupJoined", newGroup, []);
        
        // Update group lists for everyone
        io.sockets.sockets.forEach((s) => {
          const uId = socketToUserId.get(s.id);
          if (uId) sendUserGroups(s, uId);
        });
      } catch (err) {
        console.error("Create group error:", err);
        socket.emit("error", "Failed to create group");
      }
    });

    socket.on("leaveGroup", (groupId) => {
      const userId = socketToUserId.get(socket.id);
      if (!userId) return;

      try {
        socket.leave(groupId);
        
        // Notify others
        const user = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as any;
        if (user) {
          db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(groupId, userId);
          sendUserGroups(socket, userId);
          
          const systemMsg: Message = {
            id: Date.now().toString() + Math.random(),
            username: "System",
            text: `${user.username} left the group`,
            timestamp: Date.now(),
            type: "system",
            groupId,
          };
          db.prepare("INSERT INTO messages (id, group_id, username, text, timestamp, type) VALUES (?, ?, ?, ?, ?, ?)").run(
            systemMsg.id, systemMsg.groupId, systemMsg.username, systemMsg.text, systemMsg.timestamp, systemMsg.type
          );
          io.to(groupId).emit("message", systemMsg);

          const membersData = db.prepare(`
            SELECT u.socket_id as id, u.id as userId, u.username, 
            CASE WHEN u.socket_id IS NOT NULL THEN 1 ELSE 0 END as isOnline
            FROM users u 
            JOIN group_members gm ON u.id = gm.user_id 
            WHERE gm.group_id = ?
          `).all(groupId) as User[];
          io.to(groupId).emit("users", membersData);
        }
      } catch (err) {
        console.error("Leave group error:", err);
      }
    });

    socket.on("deleteGroup", (groupId) => {
      const userId = socketToUserId.get(socket.id);
      if (!userId) return;

      try {
        const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as any;
        if (group?.admin_id !== userId) {
          socket.emit("error", "Only admins can delete groups");
          return;
        }

        // Notify all members
        io.to(groupId).emit("groupDeleted", groupId);
        
        // Make everyone leave the room and update their lists
        const room = io.sockets.adapter.rooms.get(groupId);
        if (room) {
          const socketIds = Array.from(room);
          socketIds.forEach(id => {
            const s = io.sockets.sockets.get(id);
            if (s) {
              s.leave(groupId);
              const uId = socketToUserId.get(s.id);
              if (uId) sendUserGroups(s, uId);
            }
          });
        }
        
        // Clean up database
        db.prepare("DELETE FROM messages WHERE group_id = ?").run(groupId);
        db.prepare("DELETE FROM group_members WHERE group_id = ?").run(groupId);
        db.prepare("DELETE FROM groups WHERE id = ?").run(groupId);

      } catch (err) {
        console.error("Delete group error:", err);
        socket.emit("error", "Failed to delete group");
      }
    });

    socket.on("joinGroup", (groupId) => {
      const userId = socketToUserId.get(socket.id);
      if (!userId) return;

      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
      if (!user) return;

      try {
        const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as any;
        if (!group) {
          socket.emit("error", "Group not found");
          return;
        }

        // Check if already a member
        const isMember = db.prepare("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, userId);
        if (!isMember) {
          db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(groupId, userId);
        }

        socket.join(groupId);
        
        // Update user's group lists
        sendUserGroups(socket, userId);
        const membersData = db.prepare(`
          SELECT u.socket_id as id, u.id as userId, u.username,
          CASE WHEN u.socket_id IS NOT NULL THEN 1 ELSE 0 END as isOnline
          FROM users u 
          JOIN group_members gm ON u.id = gm.user_id 
          WHERE gm.group_id = ?
        `).all(groupId) as User[];

        const groupObj: Group = {
          id: group.id,
          name: group.name,
          adminUserId: group.admin_id,
          members: membersData,
        };

        const history = db.prepare("SELECT * FROM messages WHERE group_id = ? ORDER BY timestamp ASC").all(groupId) as Message[];
        socket.emit("groupJoined", groupObj, history);

        if (!isMember) {
          const systemMsg: Message = {
            id: Date.now().toString() + Math.random(),
            username: "System",
            text: `${user.username} joined the group`,
            timestamp: Date.now(),
            type: "system",
            groupId,
          };
          db.prepare("INSERT INTO messages (id, group_id, username, text, timestamp, type) VALUES (?, ?, ?, ?, ?, ?)").run(
            systemMsg.id, systemMsg.groupId, systemMsg.username, systemMsg.text, systemMsg.timestamp, systemMsg.type
          );
          io.to(groupId).emit("message", systemMsg);
          io.to(groupId).emit("users", membersData);
        }
      } catch (err) {
        console.error("Join group error:", err);
        socket.emit("error", "Failed to join group");
      }
    });

    socket.on("message", (groupId, text) => {
      const userId = socketToUserId.get(socket.id);
      if (!userId) return;

      const user = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as any;
      if (!user) return;

      try {
        const chatMsg: Message = {
          id: Date.now().toString() + Math.random(),
          username: user.username,
          text,
          timestamp: Date.now(),
          type: "chat",
          groupId,
        };

        db.prepare("INSERT INTO messages (id, group_id, username, text, timestamp, type) VALUES (?, ?, ?, ?, ?, ?)").run(
          chatMsg.id, chatMsg.groupId, chatMsg.username, chatMsg.text, chatMsg.timestamp, chatMsg.type
        );
        
        io.to(groupId).emit("message", chatMsg);
      } catch (err) {
        console.error("Send message error:", err);
      }
    });

    socket.on("kickUser", (groupId, targetUserId) => {
      const userId = socketToUserId.get(socket.id);
      if (!userId) return;

      try {
        const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as any;
        if (group?.admin_id !== userId) {
          socket.emit("error", "Only admins can kick users");
          return;
        }

        const targetUser = db.prepare("SELECT * FROM users WHERE id = ?").get(targetUserId) as any;
        if (!targetUser) return;

        db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(groupId, targetUserId);
        
        // Find all sockets for this user and make them leave
        io.sockets.sockets.forEach((s) => {
          if (socketToUserId.get(s.id) === targetUserId) {
            s.leave(groupId);
            s.emit("userKicked", groupId);
            sendUserGroups(s, targetUserId);
          }
        });

        const systemMsg: Message = {
          id: Date.now().toString() + Math.random(),
          username: "System",
          text: `${targetUser.username} was removed by admin`,
          timestamp: Date.now(),
          type: "system",
          groupId,
        };
        
        db.prepare("INSERT INTO messages (id, group_id, username, text, timestamp, type) VALUES (?, ?, ?, ?, ?, ?)").run(
          systemMsg.id, systemMsg.groupId, systemMsg.username, systemMsg.text, systemMsg.timestamp, systemMsg.type
        );
        
        const membersData = db.prepare(`
          SELECT u.socket_id as id, u.id as userId, u.username,
          CASE WHEN u.socket_id IS NOT NULL THEN 1 ELSE 0 END as isOnline
          FROM users u 
          JOIN group_members gm ON u.id = gm.user_id 
          WHERE gm.group_id = ?
        `).all(groupId) as User[];

        io.to(groupId).emit("message", systemMsg);
        io.to(groupId).emit("users", membersData);
      } catch (err) {
        console.error("Kick user error:", err);
      }
    });

    socket.on("typing", (groupId) => {
      const userId = socketToUserId.get(socket.id);
      if (!userId) return;

      try {
        const user = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as any;
        if (user) {
          socket.to(groupId).emit("typing", userId, user.username, groupId);
        }
      } catch (err) {
        console.error("Typing error:", err);
      }
    });

    socket.on("stopTyping", (groupId) => {
      const userId = socketToUserId.get(socket.id);
      if (!userId) return;
      socket.to(groupId).emit("stopTyping", userId, groupId);
    });

    socket.on("disconnect", () => {
      const userId = socketToUserId.get(socket.id);
      if (userId) {
        const user = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as any;
        if (user) {
          // Update socket_id to null or similar to indicate offline
          db.prepare("UPDATE users SET socket_id = NULL WHERE id = ?").run(userId);
          
          // Find groups this user was in
          const userGroups = db.prepare("SELECT group_id FROM group_members WHERE user_id = ?").all(userId) as { group_id: string }[];
          
          userGroups.forEach(({ group_id }) => {
            const membersData = db.prepare(`
              SELECT u.socket_id as id, u.id as userId, u.username,
              CASE WHEN u.socket_id IS NOT NULL THEN 1 ELSE 0 END as isOnline
              FROM users u 
              JOIN group_members gm ON u.id = gm.user_id 
              WHERE gm.group_id = ?
            `).all(group_id) as User[];

            io.to(group_id).emit("users", membersData);
          });
        }
        socketToUserId.delete(socket.id);
      }
      console.log("User disconnected:", socket.id);
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
