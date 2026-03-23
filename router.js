const { chat } = require('./claude.js');
const { isAuthorised, isAdmin, addUser, clearHistory, getUser } = require('./memory.js');
const { saveReminder, getUserReminders, formatReminders } = require('./tools/reminders.js');
const logger = require('./security/logger.js');
const { saveExpense, getMonthlySummary, getMonthlyTotal, formatSummary } = require('./tools/expenses.js');
const { saveHealth, getWeeklyHealth, formatWeeklySummary } = require('./tools/health.js');

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

// ── Parse reminder intent via Claude ─────────────────────────
async function parseReminder(userId, text) {
  const now = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' });
  const offset = '-04:00'; // EDT — update to -05:00 in November when clocks fall back
  const prompt = `Extract reminder details from: "${text}"

Current date/time in Toronto: ${now} (Eastern Daylight Time, UTC-4)
The user is in Toronto, Canada. All times they mention are Toronto local time (EDT, UTC-4).

Reply with ONLY a JSON object, no explanation, no markdown:
{
  "task": "what to remind about",
  "remind_at": "ISO 8601 datetime in UTC, converted from Toronto EDT (UTC-4)",
  "recurring": null
}

Example: if user says 5:00 PM Toronto time, remind_at should be the equivalent UTC time.
If no valid future date/time found, set remind_at to null.`;

  try {
    const response = await chat(userId, prompt);
    const clean = response.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (error) {
    logger.error(`Reminder parse failed: ${error.message}`);
    return null;
  }
}

// ── Parse expense intent via Claude ──────────────────────────
async function parseExpense(userId, text) {
  const prompt = `Extract expense details from: "${text}"

Categories: Food & Dining, Groceries, Transport, Utilities, Entertainment, Health, Shopping, Other

Reply with ONLY a JSON object, no explanation, no markdown:
{
  "amount": 14.00,
  "category": "Food & Dining",
  "description": "lunch at food court"
}

If no valid amount found, set amount to null.`;

  try {
    const response = await chat(userId, prompt);
    const clean = response.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (error) {
    logger.error(`Expense parse failed: ${error.message}`);
    return null;
  }
}

// ── Parse health intent via Claude ────────────────────────────
async function parseHealth(userId, text) {
  const prompt = `Extract health log entries from: "${text}"

Reply with ONLY a JSON array of entries, no explanation, no markdown:
[
  { "type": "sleep", "value": "7" },
  { "type": "water", "value": "2.5" }
]

Types: sleep (hours), water (litres), gym (duration e.g. "45 min"), workout (description), calories (kcal)
Extract ALL health entries mentioned. If none found, return empty array [].`;

  try {
    const response = await chat(userId, prompt);
    const clean = response.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (error) {
    logger.error(`Health parse failed: ${error.message}`);
    return [];
  }
}

// ── Slash command handler ─────────────────────────────────────
async function handleCommand(command, userId, userName, text, reply) {
  switch (command) {
    case '/start':
      if (!isAuthorised(userId)) {
        return reply('👋 Hi! You are not authorised to use this bot. Contact the admin to get access.');
      }
      return reply(`👋 Hey ${userName}! I\'m openrubot — Born out of boredom. Raised to be useful.\n\nJust talk to me naturally. Try:\n• "remind me Friday 6pm dentist"\n• "spent $14 on lunch"\n• "log 7 hours sleep"\n• /help for all commands`);

    case '/help':
      return reply(
        `🤖 *openrubot commands*\n\n` +
        `*/start* — Welcome message\n` +
        `*/help* — This list\n` +
        `*/clear* — Clear conversation history\n` +
        `*/status* — Bot status\n` +
        `*/reminders* — View your reminders\n\n` +
        `Or just talk naturally — I understand plain English!`
      );

    case '/clear':
      clearHistory(userId);
      return reply('🧹 Conversation history cleared.');

    case '/status':
      const user = getUser(userId);
      return reply(`✅ openrubot is online\n👤 User: ${user?.name}\n🔑 Role: ${user?.role}\n🧠 Fast model: ${process.env.CLAUDE_MODEL_FAST}\n🧠 Smart model: ${process.env.CLAUDE_MODEL_SMART}`);

    case '/reminders':
      const reminders = getUserReminders(userId);
      return reply(formatReminders(reminders));

    case '/expenses':
      const summary = getMonthlySummary(userId);
      const total = getMonthlyTotal(userId);
      return reply(formatSummary(summary, total));

    case '/health':
      const healthEntries = getWeeklyHealth(userId);
      return reply(formatWeeklySummary(healthEntries));

    case '/adduser':
      if (!isAdmin(userId)) return reply('❌ Admin only.');
      const parts = text.split(' ');
      if (parts.length < 3) return reply('Usage: /adduser [telegram_id] [name]');
      addUser(parts[1], parts.slice(2).join(' '));
      return reply(`✅ Added user ${parts.slice(2).join(' ')}`);

    default:
      return reply(`Unknown command: ${command}. Try /help`);
  }
}

// ── Main router ───────────────────────────────────────────────
async function handleMessage(ctx) {
  const { userId, userName, text, reply } = ctx;

  // Block unauthorised users silently except /start
  if (!isAuthorised(userId)) {
    if (text === '/start') return handleCommand('/start', userId, userName, text, reply);
    logger.warn(`Unauthorised access attempt from ${userId}`);
    return;
  }

  // Slash commands
  if (text.startsWith('/')) {
    const command = text.split(' ')[0].toLowerCase();
    return handleCommand(command, userId, userName, text, reply);
  }

  // Detect reminder intent
  const lower = text.toLowerCase();
  const isReminder = lower.includes('remind') || lower.includes('reminder');

  if (isReminder) {
    const parsed = await parseReminder(userId, text);
    if (parsed && parsed.remind_at) {
      saveReminder(userId, parsed.task, parsed.remind_at, parsed.recurring);
      const date = new Date(parsed.remind_at).toLocaleString('en-CA', {
        timeZone: 'America/Toronto',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      return reply(`✅ Reminder set!\n📝 ${parsed.task}\n📅 ${date}${parsed.recurring ? '\n🔁 ' + parsed.recurring : ''}`);
    }
    return reply('⚠️ I couldn\'t figure out the date/time. Try: "remind me Friday 6pm dentist"');
  }

  // Detect expense intent
  const isExpense = lower.includes('spent') ||
    lower.includes('paid') ||
    lower.includes('bought') ||
    lower.includes('purchased') ||
    lower.includes('cost me');

  if (isExpense) {
    const parsed = await parseExpense(userId, text);
    if (parsed && parsed.amount) {
      saveExpense(userId, parsed.amount, parsed.category, parsed.description);
      return reply(`✅ Logged!\n💸 $${parsed.amount.toFixed(2)} — ${parsed.category}\n📝 ${parsed.description}`);
    }
  }
  
  // Detect health intent
  const isHealth = lower.includes('sleep') ||
    lower.includes('water') ||
    lower.includes('gym') ||
    lower.includes('workout') ||
    lower.includes('log ') ||
    lower.includes('calories') ||
    lower.includes('ran') ||
    lower.includes('walked');

  if (isHealth) {
    const entries = await parseHealth(userId, text);
    if (entries.length > 0) {
      entries.forEach(e => saveHealth(userId, e.type, e.value));
      const lines = entries.map(e => {
        const icons = { sleep: '😴', water: '💧', gym: '🏋️', workout: '💪', calories: '🔥' };
        const units = { sleep: 'hrs', water: 'L', gym: '', workout: '', calories: 'kcal' };
        return `${icons[e.type] || '📝'} ${e.type}: ${e.value}${units[e.type] || ''}`;
      });
      return reply(`✅ Health logged!\n\n${lines.join('\n')}`);
    }
  }

  // Everything else goes to Claude
  try {
    const response = await chat(userId, text);
    return reply(response);
  } catch (error) {
    logger.error(`Router error for ${userId}: ${error.message}`);
    return reply('Something went wrong. Please try again.');
  }
}

module.exports = { handleMessage };
