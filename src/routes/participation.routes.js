const express = require('express');
const { z } = require('zod');
const { saveAnswer, submitParticipation } = require('../controllers/participation.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();
const answerSchema = z.object({
  selectedOptionIds: z.array(z.string().trim().min(1)).min(1).max(10)
    .refine((ids) => new Set(ids).size === ids.length, 'Selected option IDs must be unique'),
}).strict();

router.use(authenticate);
router.put('/:participationId/answers/:questionId', validate(answerSchema), saveAnswer);
router.post('/:participationId/submit', submitParticipation);

module.exports = router;
