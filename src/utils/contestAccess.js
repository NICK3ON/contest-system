const ApiError = require('./apiError');

function ensureQuestionAccess(user, contest) {
  if (user.role === 'ADMIN') {
    throw new ApiError(403, 'Administrators cannot access participant questions');
  }
  if (contest.accessLevel === 'VIP' && user.role !== 'VIP') {
    throw new ApiError(403, 'This contest is available to VIP participants only');
  }
}

module.exports = { ensureQuestionAccess };
