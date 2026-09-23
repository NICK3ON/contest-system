const pino = require('pino');
const env = require('./env');

const logger = pino({
  level: env.logLevel,
  base: undefined,
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.password',
    'req.body.token',
    'err.body',
    'password',
    'passwordHash',
    'token',
    'geminiApiKey',
  ],
  ...(env.nodeEnv === 'development' ? { transport: { target: 'pino/file', options: { destination: 1 } } } : {}),
});

module.exports = logger;
