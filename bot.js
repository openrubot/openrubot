const { Telegraf } = require('telegraf');
const { handleMessage } = require('./router.js');
const logger = require('./security/logger.js');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// ── Message handler ───────────────────────────────────────────
bot.on('text', async (ctx) => {
  const userId   = String(ctx.from.id);
  const userName = ctx.from.first_name || ctx.from.username || 'Friend';
  const text     = ctx.message.text;

  logger.info(`Message from ${userName} (${userId}): ${text.substring(0, 50)}`);

  // Show typing indicator while processing
  await ctx.sendChatAction('typing');

  await handleMessage({
    userId,
    userName,
    text,
    reply: (msg) => ctx.reply(msg, { parse_mode: 'Markdown' })
  });
});

// ── Error handler ─────────────────────────────────────────────
bot.catch((err, ctx) => {
  logger.error(`Telegraf error for ${ctx?.from?.id}: ${err.message}`);
});

// ── Start ─────────────────────────────────────────────────────
async function startBot() {
  try {
    const botInfo = await bot.telegram.getMe();
    logger.info(`🤖 openrubot started — @${botInfo.username}`);
    bot.launch();
    logger.info('✅ Bot is listening for messages...');
  } catch (error) {
    logger.error(`Failed to start bot: ${error.message}`);
    process.exit(1);
  }
}

// ── Graceful shutdown ─────────────────────────────────────────
process.once('SIGINT',  () => { logger.info('Shutting down...'); bot.stop('SIGINT');  });
process.once('SIGTERM', () => { logger.info('Shutting down...'); bot.stop('SIGTERM'); });

module.exports = { startBot };
