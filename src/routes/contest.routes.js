const express = require('express');
const { z } = require('zod');
const { listContests, getContest, createContest, updateContest, deleteContest } = require('../controllers/contest.controller');
const { listQuestions, createQuestion } = require('../controllers/question.controller');
const { joinContest } = require('../controllers/participation.controller');
const { contestLeaderboard } = require('../controllers/leaderboard.controller');
const { finalizeContest } = require('../controllers/prize.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { questionSchema } = require('../validation/question.schemas');
const { searchContests, generateQuestions } = require('../controllers/ai.controller');
const { aiLimiter } = require('../middleware/rateLimit.middleware');
const { difficultyLevels } = require('../constants/difficulty');

const router = express.Router();
const date = z.coerce.date();
const contestFields = {
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  accessLevel: z.enum(['NORMAL', 'VIP']),
  topic: z.string().trim().min(1).max(100),
  difficulty: z.enum(difficultyLevels),
  startTime: date,
  endTime: date,
  prizeDescription: z.string().trim().min(1).max(1000),
};
const contestCreateSchema = z.object(contestFields).strict().superRefine((value, context) => {
  if (value.startTime >= value.endTime) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'endTime must be after startTime' });
});
const contestUpdateSchema = z.object(contestFields).strict().partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
const searchSchema = z.object({ query: z.string().trim().min(2).max(500) }).strict();
const generateSchema = z.object({
  topic: z.string().trim().min(1).max(100).optional(),
  difficulty: z.enum(difficultyLevels).optional(),
  count: z.number().int().min(1).max(20).default(5),
  questionTypes: z.array(z.enum(['SINGLE_SELECT', 'MULTI_SELECT', 'TRUE_FALSE'])).min(1).max(3)
    .refine((types) => new Set(types).size === types.length, 'Question types must be unique')
    .default(['SINGLE_SELECT', 'MULTI_SELECT', 'TRUE_FALSE']),
}).strict();

router.get('/', listContests);
router.post('/search', aiLimiter, validate(searchSchema), searchContests);
router.get('/:id', getContest);
router.post('/', authenticate, authorize('ADMIN'), validate(contestCreateSchema), createContest);
router.patch('/:id', authenticate, authorize('ADMIN'), validate(contestUpdateSchema), updateContest);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteContest);
router.post('/:id/join', authenticate, joinContest);
router.get('/:id/leaderboard', contestLeaderboard);
router.post('/:id/finalize', authenticate, authorize('ADMIN'), finalizeContest);
router.get('/:id/questions', authenticate, listQuestions);
router.post('/:id/questions', authenticate, authorize('ADMIN'), validate(questionSchema), createQuestion);
router.post('/:id/questions/generate', authenticate, authorize('ADMIN'), aiLimiter, validate(generateSchema), generateQuestions);

module.exports = router;
