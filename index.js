require('dotenv').config();
const { startBot } = require('./bot.js');
const logger = require('./security/logger.js');

logger.info('🚀 Starting openrubot...');
startBot();
