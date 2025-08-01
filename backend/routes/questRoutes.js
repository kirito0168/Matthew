const express = require('express');
const router = express.Router();
const questController = require('../controllers/questController');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');

// Public routes (with optional auth for user-specific data)
router.get('/', optionalAuth, questController.getQuests);
router.get('/history', authenticateToken, questController.getUserQuestHistory);  // Fixed: moved before /:id
router.get('/:id', optionalAuth, questController.getQuest);

// Protected routes
router.post('/:id/attempt', authenticateToken, questController.attemptQuest);

module.exports = router;