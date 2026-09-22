const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { ensureQuestionAccess } = require('../utils/contestAccess');

const participantQuestionSelect = {
  id: true, questionText: true, type: true, difficulty: true, topic: true,
  options: { select: { id: true, optionText: true }, orderBy: { id: 'asc' } },
};

const listQuestions = asyncHandler(async (req, res) => {
  const contest = await prisma.contest.findUnique({ where: { id: req.params.id }, select: { id: true, accessLevel: true } });
  if (!contest) throw new ApiError(404, 'Contest not found');
  ensureQuestionAccess(req.user, contest);
  const questions = await prisma.question.findMany({
    where: { contestId: contest.id }, select: participantQuestionSelect, orderBy: { createdAt: 'asc' },
  });
  return res.status(200).json({ questions });
});

const createQuestion = asyncHandler(async (req, res) => {
  const contest = await prisma.contest.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!contest) throw new ApiError(404, 'Contest not found');
  const { options, ...question } = req.body;
  const created = await prisma.question.create({
    data: { ...question, contestId: contest.id, options: { create: options } },
    include: { options: true },
  });
  return res.status(201).json({ question: created });
});

module.exports = { listQuestions, createQuestion };
