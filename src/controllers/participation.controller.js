const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { getContestStatus } = require('../utils/contestStatus');
const { ensureQuestionAccess } = require('../utils/contestAccess');
const { isExactAnswerCorrect } = require('../utils/scoring');

const joinContest = asyncHandler(async (req, res) => {
  const contest = await prisma.contest.findUnique({
    where: { id: req.params.id },
    select: { id: true, accessLevel: true, startTime: true, endTime: true },
  });
  if (!contest) throw new ApiError(404, 'Contest not found');
  ensureQuestionAccess(req.user, contest);

  const now = new Date();
  if (getContestStatus(contest, now) !== 'ACTIVE') throw new ApiError(409, 'Contest is not active');

  const existing = await prisma.participation.findUnique({
    where: { userId_contestId: { userId: req.user.id, contestId: contest.id } },
    select: { id: true },
  });
  if (existing) throw new ApiError(409, 'You have already joined this contest');

  const participation = await prisma.participation.create({
    data: { userId: req.user.id, contestId: contest.id, startedAt: now },
    select: { id: true, contestId: true, status: true, startedAt: true },
  });
  return res.status(201).json({ participation });
});

const saveAnswer = asyncHandler(async (req, res) => {
  const answer = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "Participation" WHERE "id" = ${req.params.participationId} FOR UPDATE`;

    const participation = await transaction.participation.findUnique({
      where: { id: req.params.participationId },
      include: { contest: { select: { id: true, endTime: true } } },
    });
    if (!participation) throw new ApiError(404, 'Participation not found');
    if (participation.userId !== req.user.id) throw new ApiError(403, 'You cannot modify this participation');
    if (participation.status !== 'IN_PROGRESS') throw new ApiError(409, 'This participation has already been submitted');

    const now = new Date();
    if (now >= participation.contest.endTime) throw new ApiError(409, 'The contest has ended; new answers are no longer accepted');

    const question = await transaction.question.findFirst({
      where: { id: req.params.questionId, contestId: participation.contest.id },
      include: { options: { select: { id: true, isCorrect: true } } },
    });
    if (!question) throw new ApiError(404, 'Question not found in this contest');

    const selectedOptionIds = req.body.selectedOptionIds;
    const validOptionIds = new Set(question.options.map((option) => option.id));
    if (selectedOptionIds.some((optionId) => !validOptionIds.has(optionId))) {
      throw new ApiError(400, 'One or more selected options do not belong to this question');
    }
    if (question.type !== 'MULTI_SELECT' && selectedOptionIds.length !== 1) {
      throw new ApiError(400, `${question.type} requires exactly one selected option`);
    }

    const isCorrect = isExactAnswerCorrect(question.options, selectedOptionIds);
    return transaction.answer.upsert({
      where: { participationId_questionId: { participationId: participation.id, questionId: question.id } },
      create: {
        participationId: participation.id, questionId: question.id, selectedOptions: selectedOptionIds,
        isCorrect, answeredAt: now,
      },
      update: { selectedOptions: selectedOptionIds, isCorrect, answeredAt: now },
      select: { id: true, participationId: true, questionId: true, selectedOptions: true, answeredAt: true },
    });
  });
  return res.status(200).json({ answer });
});

const submitParticipation = asyncHandler(async (req, res) => {
  const submitted = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "Participation" WHERE "id" = ${req.params.participationId} FOR UPDATE`;

    const participation = await transaction.participation.findUnique({
      where: { id: req.params.participationId },
      include: { contest: { select: { endTime: true, prize: { select: { id: true } } } } },
    });
    if (!participation) throw new ApiError(404, 'Participation not found');
    if (participation.userId !== req.user.id) throw new ApiError(403, 'You cannot submit this participation');
    if (participation.status !== 'IN_PROGRESS') throw new ApiError(409, 'This participation has already been submitted');
    if (participation.contest.prize) throw new ApiError(409, 'This contest has already been finalized');

    const answers = await transaction.answer.findMany({
      where: { participationId: participation.id, answeredAt: { lte: participation.contest.endTime } },
      include: { question: { include: { options: { select: { id: true, isCorrect: true } } } } },
    });

    let score = 0;
    for (const answer of answers) {
      const isCorrect = isExactAnswerCorrect(answer.question.options, answer.selectedOptions);
      if (isCorrect) score += 1;
      if (answer.isCorrect !== isCorrect) {
        await transaction.answer.update({ where: { id: answer.id }, data: { isCorrect } });
      }
    }

    return transaction.participation.update({
      where: { id: participation.id },
      data: { status: 'SUBMITTED', score, submittedAt: new Date() },
      select: { id: true, contestId: true, status: true, score: true, startedAt: true, submittedAt: true },
    });
  });

  return res.status(200).json({ participation: submitted });
});

module.exports = { joinContest, saveAnswer, submitParticipation };
