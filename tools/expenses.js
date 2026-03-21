const { db } = require('../memory.js');
const logger = require('../security/logger.js');

// ── Categories ────────────────────────────────────────────────
const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Utilities',
  'Entertainment',
  'Health',
  'Shopping',
  'Other'
];

// ── Save an expense ───────────────────────────────────────────
function saveExpense(userId, amount, category, description) {
  return db.prepare(
    'INSERT INTO expenses (user_id, amount, category, description) VALUES (?, ?, ?, ?)'
  ).run(userId, amount, category, description);
}

// ── Get expenses for current month ───────────────────────────
function getMonthlyExpenses(userId) {
  return db.prepare(`
    SELECT * FROM expenses
    WHERE user_id = ?
    AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    ORDER BY date DESC
  `).all(userId);
}

// ── Get monthly summary by category ──────────────────────────
function getMonthlySummary(userId) {
  return db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM expenses
    WHERE user_id = ?
    AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    GROUP BY category
    ORDER BY total DESC
  `).all(userId);
}

// ── Get total spent this month ────────────────────────────────
function getMonthlyTotal(userId) {
  const result = db.prepare(`
    SELECT SUM(amount) as total
    FROM expenses
    WHERE user_id = ?
    AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
  `).get(userId);
  return result?.total || 0;
}

// ── Format monthly summary for Telegram ──────────────────────
function formatSummary(summary, total) {
  if (summary.length === 0) return '📭 No expenses logged this month yet.';

  const lines = summary.map(row => {
    const bar = '█'.repeat(Math.round((row.total / total) * 10));
    return `${row.category}\n  ${bar} $${row.total.toFixed(2)} (${row.count} items)`;
  });

  return `📊 *This month so far*\n\n${lines.join('\n\n')}\n\n💰 *Total: $${total.toFixed(2)}*`;
}

module.exports = {
  saveExpense,
  getMonthlyExpenses,
  getMonthlySummary,
  getMonthlyTotal,
  formatSummary,
  CATEGORIES
};
