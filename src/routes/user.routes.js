const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const { history, inProgress, prizes } = require('../controllers/user.controller');

const router = express.Router();
router.use(authenticate);
router.get('/me/history', history);
router.get('/me/in-progress', inProgress);
router.get('/me/prizes', prizes);

module.exports = router;
