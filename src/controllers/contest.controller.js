const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { getContestStatus } = require('../utils/contestStatus');

const contestSelect = {
  id: true, name: true, description: true, accessLevel: true, topic: true, difficulty: true,
  startTime: true, endTime: true, prizeDescription: true, createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, name: true } },
};

function withStatus(contest) {
  return { ...contest, status: getContestStatus(contest) };
}

const listContests = asyncHandler(async (req, res) => {
  const contests = await prisma.contest.findMany({ select: contestSelect, orderBy: { startTime: 'asc' } });
  return res.status(200).json({ contests: contests.map(withStatus) });
});

const getContest = asyncHandler(async (req, res) => {
  const contest = await prisma.contest.findUnique({ where: { id: req.params.id }, select: contestSelect });
  if (!contest) throw new ApiError(404, 'Contest not found');
  return res.status(200).json({ contest: withStatus(contest) });
});

const createContest = asyncHandler(async (req, res) => {
  const contest = await prisma.contest.create({
    data: { ...req.body, createdById: req.user.id },
    select: contestSelect,
  });
  return res.status(201).json({ contest: withStatus(contest) });
});

const updateContest = asyncHandler(async (req, res) => {
  const existing = await prisma.contest.findUnique({ where: { id: req.params.id }, select: { id: true, startTime: true, endTime: true } });
  if (!existing) throw new ApiError(404, 'Contest not found');
  const startTime = req.body.startTime || existing.startTime;
  const endTime = req.body.endTime || existing.endTime;
  if (startTime >= endTime) throw new ApiError(400, 'endTime must be after startTime');

  const contest = await prisma.contest.update({ where: { id: req.params.id }, data: req.body, select: contestSelect });
  return res.status(200).json({ contest: withStatus(contest) });
});

const deleteContest = asyncHandler(async (req, res) => {
  const existing = await prisma.contest.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) throw new ApiError(404, 'Contest not found');
  await prisma.contest.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

module.exports = { listContests, getContest, createContest, updateContest, deleteContest };
