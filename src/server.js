const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const prisma = require('./lib/prisma');

const server = app.listen(env.port, () => logger.info({ port: env.port }, 'Server listening'));

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
