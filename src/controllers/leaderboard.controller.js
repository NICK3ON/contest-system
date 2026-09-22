const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { rankParticipations } = require('../utils/ranking');

const contestLeaderboard = asyncHandler(async (req, res) => {
  const contest = await prisma.contest.findUnique({
    where: { id: req.params.id }, select: { id: true, name: true },
  });
  if (!contest) throw new ApiError(404, 'Contest not found');

  const participations = await prisma.participation.findMany({
    where: { contestId: contest.id, status: 'SUBMITTED', submittedAt: { not: null } },
    select: {
      id: true, score: true, startedAt: true, submittedAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  return res.status(200).json({ contest, leaderboard: rankParticipations(participations) });
});

const globalLeaderboard = asyncHandler(async (req, res) => {
  const totals = await prisma.participation.groupBy({
    by: ['userId'], where: { status: 'SUBMITTED' },
    _sum: { score: true }, _count: { id: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: totals.map((entry) => entry.userId) } },
    select: { id: true, name: true },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));
  const leaderboard = totals
    .map((entry) => ({
      user: usersById.get(entry.userId), totalScore: entry._sum.score || 0,
      submittedContests: entry._count.id,
    }))
    .sort((left, right) => right.totalScore - left.totalScore || left.user.id.localeCompare(right.user.id))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return res.status(200).json({ leaderboard });
});

module.exports = { contestLeaderboard, globalLeaderboard };
