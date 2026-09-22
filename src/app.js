const express = require('express');
const pinoHttp = require('pino-http');
const logger = require('./config/logger');
const { standardLimiter } = require('./middleware/rateLimit.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const contestRoutes = require('./routes/contest.routes');

const app = express();

app.disable('x-powered-by');
app.use(pinoHttp({ logger, genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID() }));
app.use(express.json({ limit: '100kb' }));
app.use(standardLimiter);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
