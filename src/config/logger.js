const pino = require('pino');
const env = require('./env');

const logger = pino({
  level: env.logLevel,
  base: undefined,
  redact: ['req.headers.authorization', 'password', 'passwordHash', 'token'],
  ...(env.nodeEnv === 'development' ? { transport: { target: 'pino/file', options: { destination: 1 } } } : {}),
});

module.exports = logger;
