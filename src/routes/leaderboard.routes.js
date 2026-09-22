const express = require('express');
const { globalLeaderboard } = require('../controllers/leaderboard.controller');

const router = express.Router();
router.get('/', globalLeaderboard);

module.exports = router;
