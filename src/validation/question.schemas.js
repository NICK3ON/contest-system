const { z } = require('zod');
const { difficultyLevels } = require('../constants/difficulty');

const questionTypes = ['SINGLE_SELECT', 'MULTI_SELECT', 'TRUE_FALSE'];
const optionSchema = z.object({
  optionText: z.string().trim().min(1).max(500),
  isCorrect: z.boolean(),
}).strict();

const questionSchema = z.object({
  questionText: z.string().trim().min(1).max(5000),
  type: z.enum(questionTypes),
  difficulty: z.enum(difficultyLevels),
  topic: z.string().trim().min(1).max(100),
  explanation: z.string().trim().min(1).max(5000).optional(),
  options: z.array(optionSchema).min(2).max(10),
}).strict().superRefine((value, context) => {
  const normalized = value.options.map((option) => option.optionText.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Option text must be unique' });
  }

  const correct = value.options.filter((option) => option.isCorrect).length;
  if (value.type === 'SINGLE_SELECT' && correct !== 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'SINGLE_SELECT requires exactly one correct option' });
  }
  if (value.type === 'MULTI_SELECT' && correct < 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'MULTI_SELECT requires at least one correct option' });
  }
  if (value.type === 'TRUE_FALSE') {
    if (value.options.length !== 2 || correct !== 1) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'TRUE_FALSE requires exactly two options and one correct option' });
    }
    const values = new Set(normalized);
    if (!values.has('true') || !values.has('false')) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'TRUE_FALSE options must be True and False' });
    }
  }
});

module.exports = { questionSchema, questionTypes };
