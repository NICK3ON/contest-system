const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (event) => logger.error({ event }, 'Prisma error'));
prisma.$on('warn', (event) => logger.warn({ event }, 'Prisma warning'));

module.exports = prisma;
