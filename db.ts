import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'chat.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    socket_id TEXT
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'group',
    FOREIGN KEY (admin_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);

  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    username TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );
`);

// Migration: Add password column if it doesn't exist
try {
  db.prepare("SELECT password FROM users LIMIT 1").get();
} catch (e) {
  console.log("Migrating users table: adding password column");
  db.exec("ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT ''");
}

// Migration: Add type column to groups if it doesn't exist
try {
  db.prepare("SELECT type FROM groups LIMIT 1").get();
} catch (e) {
  console.log("Migrating groups table: adding type column");
  db.exec("ALTER TABLE groups ADD COLUMN type TEXT NOT NULL DEFAULT 'group'");
}

// Migration: Add type column to messages if it doesn't exist
try {
  db.prepare("SELECT type FROM messages LIMIT 1").get();
} catch (e) {
  console.log("Migrating messages table: adding type column");
  db.exec("ALTER TABLE messages ADD COLUMN type TEXT NOT NULL DEFAULT 'chat'");
}

export default db;
