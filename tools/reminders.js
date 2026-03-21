const { db } = require('../memory.js');
const logger = require('../security/logger.js');

// ── Save a reminder ───────────────────────────────────────────
function saveReminder(userId, task, remindAt, recurring = null) {
  return db.prepare(
    'INSERT INTO reminders (user_id, message, remind_at, recurring) VALUES (?, ?, ?, ?)'
  ).run(userId, task, remindAt, recurring);
}

// ── Get all pending reminders for a user ─────────────────────
function getUserReminders(userId) {
  return db.prepare(
    'SELECT * FROM reminders WHERE user_id = ? AND done = 0 ORDER BY remind_at ASC'
  ).all(userId);
}

// ── Get all reminders due right now (across all users) ────────
function getDueReminders() {
  const now = new Date().toISOString();
  return db.prepare(
    'SELECT * FROM reminders WHERE done = 0 AND remind_at <= ?'
  ).all(now);
}

// ── Mark reminder as done ─────────────────────────────────────
function markDone(reminderId) {
  return db.prepare(
    'UPDATE reminders SET done = 1 WHERE id = ?'
  ).run(reminderId);
}

// ── Format reminders list for Telegram ───────────────────────
function formatReminders(reminders) {
  if (reminders.length === 0) return '📭 You have no upcoming reminders.';
  return '📋 *Your reminders:*\n\n' + reminders.map((r, i) => {
    const date = new Date(r.remind_at).toLocaleString('en-CA', {
      timeZone: 'America/Toronto',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    const recurring = r.recurring ? ` 🔁 ${r.recurring}` : '';
    return `${i + 1}. *${r.message}*\n   📅 ${date}${recurring}`;
  }).join('\n\n');
}

module.exports = { saveReminder, getUserReminders, getDueReminders, markDone, formatReminders };
