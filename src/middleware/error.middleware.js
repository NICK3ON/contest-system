const { Prisma } = require('@prisma/client');
const logger = require('../config/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: 'Route not found' } });
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error({ err: error, requestId: req.id }, 'Request failed');

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return res.status(409).json({ error: { message: 'A record with this value already exists' } });
  }

  const statusCode = error.isOperational ? error.statusCode : 500;
  const body = { error: { message: error.isOperational ? error.message : 'Internal server error' } };
  if (error.isOperational && error.details) body.error.details = error.details;
  return res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
