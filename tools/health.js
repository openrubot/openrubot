const { db } = require('../memory.js');
const logger = require('../security/logger.js');

// ── Save a health entry ───────────────────────────────────────
function saveHealth(userId, type, value) {
  return db.prepare(
    'INSERT INTO health (user_id, type, value) VALUES (?, ?, ?)'
  ).run(userId, type, value);
}

// ── Get health entries for current week ───────────────────────
function getWeeklyHealth(userId) {
  return db.prepare(`
    SELECT * FROM health
    WHERE user_id = ?
    AND date >= date('now', '-7 days')
    ORDER BY date DESC, id DESC
  `).all(userId);
}

// ── Get today's health entries ────────────────────────────────
function getTodayHealth(userId) {
  return db.prepare(`
    SELECT * FROM health
    WHERE user_id = ?
    AND date = date('now')
    ORDER BY id DESC
  `).all(userId);
}

// ── Format weekly health summary ──────────────────────────────
function formatWeeklySummary(entries) {
  if (entries.length === 0) return '📭 No health entries this week yet.';

  const grouped = {};
  entries.forEach(e => {
    if (!grouped[e.type]) grouped[e.type] = [];
    grouped[e.type].push(e.value);
  });

  const lines = [];

  if (grouped['sleep']) {
    const avg = grouped['sleep']
      .map(v => parseFloat(v))
      .reduce((a, b) => a + b, 0) / grouped['sleep'].length;
    lines.push(`😴 *Sleep* — avg ${avg.toFixed(1)} hrs/night (${grouped['sleep'].length} nights logged)`);
  }

  if (grouped['water']) {
    const avg = grouped['water']
      .map(v => parseFloat(v))
      .reduce((a, b) => a + b, 0) / grouped['water'].length;
    lines.push(`💧 *Water* — avg ${avg.toFixed(1)}L/day (${grouped['water'].length} days logged)`);
  }

  if (grouped['gym']) {
    lines.push(`🏋️ *Gym* — ${grouped['gym'].length} session(s) this week`);
  }

  if (grouped['workout']) {
    lines.push(`💪 *Workout* — ${grouped['workout'].length} session(s) this week`);
  }

  if (grouped['calories']) {
    const avg = grouped['calories']
      .map(v => parseFloat(v))
      .reduce((a, b) => a + b, 0) / grouped['calories'].length;
    lines.push(`🔥 *Calories* — avg ${avg.toFixed(0)} kcal/day`);
  }

  return `🏥 *Health this week*\n\n${lines.join('\n\n')}`;
}

module.exports = { saveHealth, getWeeklyHealth, getTodayHealth, formatWeeklySummary };
