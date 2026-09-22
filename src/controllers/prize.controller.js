const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { getContestStatus } = require('../utils/contestStatus');
const { rankParticipations } = require('../utils/ranking');

const prizeInclude = {
  user: { select: { id: true, name: true } },
  contest: { select: { id: true, name: true } },
};

const finalizeContest = asyncHandler(async (req, res) => {
  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "Contest" WHERE "id" = ${req.params.id} FOR UPDATE`;
    const contest = await transaction.contest.findUnique({
      where: { id: req.params.id }, include: { prize: { include: prizeInclude } },
    });
    if (!contest) throw new ApiError(404, 'Contest not found');
    if (contest.prize) return { prize: contest.prize, created: false };
    if (getContestStatus(contest) !== 'ENDED') throw new ApiError(409, 'Contest cannot be finalized before it ends');

    await transaction.$queryRaw`SELECT "id" FROM "Participation" WHERE "contestId" = ${contest.id} FOR UPDATE`;
    const participations = await transaction.participation.findMany({
      where: { contestId: contest.id, status: 'SUBMITTED', submittedAt: { not: null } },
      select: {
        id: true, userId: true, score: true, startedAt: true, submittedAt: true,
        user: { select: { id: true, name: true } },
      },
    });
    const winner = rankParticipations(participations)[0];
    if (!winner) throw new ApiError(409, 'Contest has no submitted participants');

    const prize = await transaction.prize.create({
      data: { contestId: contest.id, userId: winner.userId, prizeDescription: contest.prizeDescription },
      include: prizeInclude,
    });
    return { prize, created: true };
  });

  return res.status(result.created ? 201 : 200).json({ prize: result.prize, alreadyFinalized: !result.created });
});

module.exports = { finalizeContest };
