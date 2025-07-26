const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', rankingController.getOverallRankings);
router.get('/category/:category', rankingController.getCategoryRankings);
router.get('/user/:userId?', optionalAuth, rankingController.getUserRank);

module.exports = router;