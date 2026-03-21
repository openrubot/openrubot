require('dotenv').config();
const { startBot, sendMessage } = require('./bot.js');
const { startAPI } = require('./dashboard/server.js');
const logger = require('./security/logger.js');

logger.info('🚀 Starting openrubot...');
startBot();
startAPI();
