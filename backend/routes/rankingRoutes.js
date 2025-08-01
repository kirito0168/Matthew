const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');

// Public routes
router.get('/', rankingController.getOverallRankings);
router.get('/category/:category', rankingController.getCategoryRankings);

// Protected routes
router.get('/user', authenticateToken, rankingController.getUserRank);  // Fixed: removed :userId?, using auth token

module.exports = router;