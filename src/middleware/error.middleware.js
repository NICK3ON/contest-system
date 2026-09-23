const { Prisma } = require('@prisma/client');
const logger = require('../config/logger');

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: 'Route not found' } });
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  const knownPrismaError = error instanceof Prisma.PrismaClientKnownRequestError;
  const expectedClientError = (error.statusCode >= 400 && error.statusCode < 500)
    || ['entity.parse.failed', 'entity.too.large'].includes(error.type)
    || (knownPrismaError && ['P2002', 'P2003', 'P2025'].includes(error.code));
  const log = expectedClientError ? logger.warn.bind(logger) : logger.error.bind(logger);
  log({ err: error, requestId: req.id }, 'Request failed');

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Invalid JSON body' } });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Request body is too large' } });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return res.status(409).json({ error: { message: 'A record with this value already exists' } });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
    return res.status(409).json({ error: { message: 'This operation conflicts with a related record' } });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return res.status(404).json({ error: { message: 'Record not found' } });
  }

  const statusCode = error.isOperational ? error.statusCode : 500;
  const body = { error: { message: error.isOperational ? error.message : 'Internal server error' } };
  if (error.isOperational && error.details) body.error.details = error.details;
  return res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
