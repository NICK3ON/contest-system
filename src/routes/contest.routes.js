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

const router = express.Router();
const date = z.coerce.date();
const contestFields = {
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  accessLevel: z.enum(['NORMAL', 'VIP']),
  topic: z.string().trim().min(1).max(100),
  difficulty: z.string().trim().min(1).max(50),
  startTime: date,
  endTime: date,
  prizeDescription: z.string().trim().min(1).max(1000),
};
const contestCreateSchema = z.object(contestFields).superRefine((value, context) => {
  if (value.startTime >= value.endTime) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'endTime must be after startTime' });
});
const contestUpdateSchema = z.object(contestFields).partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const optionSchema = z.object({ optionText: z.string().trim().min(1).max(500), isCorrect: z.boolean() });
const questionSchema = z.object({
  questionText: z.string().trim().min(1).max(5000), type: z.enum(['SINGLE_SELECT', 'MULTI_SELECT', 'TRUE_FALSE']),
  difficulty: z.string().trim().min(1).max(50), topic: z.string().trim().min(1).max(100),
  explanation: z.string().trim().min(1).max(5000).optional(), options: z.array(optionSchema).min(2).max(10),
}).superRefine((value, context) => {
  const normalized = value.options.map((option) => option.optionText.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Option text must be unique' });
  const correct = value.options.filter((option) => option.isCorrect).length;
  if (value.type === 'SINGLE_SELECT' && correct !== 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'SINGLE_SELECT requires exactly one correct option' });
  if (value.type === 'MULTI_SELECT' && correct < 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'MULTI_SELECT requires at least one correct option' });
  if (value.type === 'TRUE_FALSE') {
    if (value.options.length !== 2 || correct !== 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'TRUE_FALSE requires exactly two options and one correct option' });
    const values = new Set(normalized);
    if (!values.has('true') || !values.has('false')) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'TRUE_FALSE options must be True and False' });
  }
});

router.get('/', listContests);
router.get('/:id', getContest);
router.post('/', authenticate, authorize('ADMIN'), validate(contestCreateSchema), createContest);
router.patch('/:id', authenticate, authorize('ADMIN'), validate(contestUpdateSchema), updateContest);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteContest);
router.post('/:id/join', authenticate, joinContest);
router.get('/:id/leaderboard', contestLeaderboard);
router.post('/:id/finalize', authenticate, authorize('ADMIN'), finalizeContest);
router.get('/:id/questions', authenticate, listQuestions);
router.post('/:id/questions', authenticate, authorize('ADMIN'), validate(questionSchema), createQuestion);

module.exports = router;
