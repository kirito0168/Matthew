const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, achievementController.getAchievements);
router.get('/user/:userId?', optionalAuth, achievementController.getUserAchievements);
router.get('/progress', authenticateToken, achievementController.getAchievementProgress);

module.exports = router;