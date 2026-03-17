const winston = require('winston');

const SECRET_PATTERNS = [
  /sk-ant-[a-zA-Z0-9-_]+/g,
  /[0-9]{8,10}:[a-zA-Z0-9-_]{35}/g,
  /ENCRYPTION_KEY=[a-f0-9]+/g,
];

function scrubSecrets(message) {
  if (typeof message !== 'string') return message;
  let scrubbed = message;
  SECRET_PATTERNS.forEach(pattern => {
    scrubbed = scrubbed.replace(pattern, '[REDACTED]');
  });
  return scrubbed;
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${scrubSecrets(String(message))}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;
