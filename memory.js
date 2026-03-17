const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'memory.db');
const db = new Database(DB_PATH);

// Enable WAL mode — faster writes, safer concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create tables ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, key)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    remind_at TEXT NOT NULL,
    recurring TEXT,
    done INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    description TEXT,
    date TEXT DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    date TEXT DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mcp_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    service TEXT NOT NULL,
    credentials TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    UNIQUE(user_id, service)
  );
`);

// ── User helpers ──────────────────────────────────────────────
function getUser(telegramId) {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
}

function isAuthorised(telegramId) {
  const user = getUser(telegramId);
  return user && user.active === 1;
}

function isAdmin(telegramId) {
  const user = getUser(telegramId);
  return user && user.role === 'admin';
}

function addUser(telegramId, name, role = 'user') {
  return db.prepare(
    'INSERT OR IGNORE INTO users (telegram_id, name, role) VALUES (?, ?, ?)'
  ).run(telegramId, name, role);
}

// ── Conversation helpers ──────────────────────────────────────
function getHistory(userId, limit = 20) {
  return db.prepare(
    'SELECT role, content FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit).reverse();
}

function saveMessage(userId, role, content) {
  return db.prepare(
    'INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)'
  ).run(userId, role, content);
}

function clearHistory(userId) {
  return db.prepare('DELETE FROM conversations WHERE user_id = ?').run(userId);
}

module.exports = {
  db,
  getUser, isAuthorised, isAdmin, addUser,
  getHistory, saveMessage, clearHistory
};
