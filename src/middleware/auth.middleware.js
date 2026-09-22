const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

module.exports = asyncHandler(async (req, res, next) => {
  const authorization = req.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) throw new ApiError(401, 'Authentication is required');

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) throw new ApiError(401, 'Authentication is required');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token');
  }
  if (!payload || typeof payload.sub !== 'string') throw new ApiError(401, 'Invalid or expired token');

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) throw new ApiError(401, 'Invalid or expired token');
  req.user = user;
  next();
});
