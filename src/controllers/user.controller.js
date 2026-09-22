const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { getContestStatus } = require('../utils/contestStatus');

const contestSelect = {
  id: true, name: true, accessLevel: true, topic: true, difficulty: true,
  startTime: true, endTime: true, prizeDescription: true,
};

function withDerivedContestStatus(participation) {
  return { ...participation, contest: { ...participation.contest, status: getContestStatus(participation.contest) } };
}

const history = asyncHandler(async (req, res) => {
  const participations = await prisma.participation.findMany({
    where: { userId: req.user.id },
    select: {
      id: true, status: true, score: true, startedAt: true, submittedAt: true,
      contest: { select: contestSelect },
    },
    orderBy: { startedAt: 'desc' },
  });
  return res.status(200).json({ participations: participations.map(withDerivedContestStatus) });
});

const inProgress = asyncHandler(async (req, res) => {
  const participations = await prisma.participation.findMany({
    where: { userId: req.user.id, status: 'IN_PROGRESS' },
    select: { id: true, status: true, startedAt: true, contest: { select: contestSelect } },
    orderBy: { startedAt: 'desc' },
  });
  return res.status(200).json({ participations: participations.map(withDerivedContestStatus) });
});

const prizes = asyncHandler(async (req, res) => {
  const wonPrizes = await prisma.prize.findMany({
    where: { userId: req.user.id },
    select: {
      id: true, prizeDescription: true, awardedAt: true,
      contest: { select: { id: true, name: true, topic: true, difficulty: true } },
    },
    orderBy: { awardedAt: 'desc' },
  });
  return res.status(200).json({ prizes: wonPrizes });
});

module.exports = { history, inProgress, prizes };
