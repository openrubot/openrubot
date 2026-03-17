const { chat } = require('./claude.js');
const { isAuthorised, isAdmin, addUser, clearHistory, getUser } = require('./memory.js');
const logger = require('./security/logger.js');

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

// ── Slash command handler ─────────────────────────────────────
async function handleCommand(command, userId, userName, reply) {
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
        `*/reminders* — View your reminders\n` +
        `*/expenses* — Monthly expense summary\n\n` +
        `Or just talk naturally — I understand plain English!`
      );

    case '/clear':
      clearHistory(userId);
      return reply('🧹 Conversation history cleared.');

    case '/status':
      const user = getUser(userId);
      return reply(`✅ openrubot is online\n👤 User: ${user?.name}\n🔑 Role: ${user?.role}\n🧠 Model fast: ${process.env.CLAUDE_MODEL_FAST}\n🧠 Model smart: ${process.env.CLAUDE_MODEL_SMART}`);

    case '/adduser':
      if (!isAdmin(userId)) return reply('❌ Admin only.');
      return reply('Usage: /adduser [telegram_id] [name]');

    default:
      return reply(`Unknown command: ${command}. Try /help`);
  }
}

// ── Main router — called by any platform adapter ──────────────
async function handleMessage(ctx) {
  const { userId, userName, text, reply } = ctx;

  // Block unauthorised users silently except for /start
  if (!isAuthorised(userId)) {
    if (text === '/start') return handleCommand('/start', userId, userName, reply);
    logger.warn(`Unauthorised access attempt from ${userId}`);
    return;
  }

  // Handle slash commands
  if (text.startsWith('/')) {
    const command = text.split(' ')[0].toLowerCase();
    return handleCommand(command, userId, userName, reply);
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
