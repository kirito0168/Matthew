const express = require('express');
const router = express.Router();
const questController = require('../controllers/questController');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, questController.getQuests);
router.get('/:id', optionalAuth, questController.getQuest);
router.post('/:id/attempt', authenticateToken, questController.attemptQuest);
router.get('/history/:userId?', authenticateToken, questController.getUserQuestHistory);

module.exports = router;