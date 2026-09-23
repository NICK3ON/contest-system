const express = require('express');
const pinoHttp = require('pino-http');
const logger = require('./config/logger');
const { standardLimiter } = require('./middleware/rateLimit.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const contestRoutes = require('./routes/contest.routes');
const participationRoutes = require('./routes/participation.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

app.disable('x-powered-by');
app.use(pinoHttp({
  logger,
  genReqId: (req) => {
    const supplied = req.headers['x-request-id'];
    return typeof supplied === 'string' && supplied.length <= 100 ? supplied : crypto.randomUUID();
  },
}));
app.use(express.json({ limit: '100kb' }));
app.use(standardLimiter);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/participations', participationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
