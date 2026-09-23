const express = require('express');
const { z } = require('zod');
const { register, login, me } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();
const credentials = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
}).strict();
const registration = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
}).strict();

router.post('/register', authLimiter, validate(registration), register);
router.post('/login', authLimiter, validate(credentials), login);
router.get('/me', authenticate, me);

module.exports = router;
