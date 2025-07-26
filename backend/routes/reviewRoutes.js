const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, reviewController.createReview);
router.get('/', reviewController.getReviews);
router.put('/:id', authenticateToken, reviewController.updateReview);
router.delete('/:id', authenticateToken, reviewController.deleteReview);
router.get('/user/:userId?', authenticateToken, reviewController.getUserReviews);

module.exports = router;