const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/profile/:id?', authenticateToken, userController.getProfile);
router.put('/title', authenticateToken, userController.updateTitle);
router.get('/titles', authenticateToken, userController.getUnlockedTitles);

module.exports = router;