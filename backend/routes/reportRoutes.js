const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Protected routes - all report operations require authentication
router.post('/', authenticateToken, reportController.createReport);
router.get('/', authenticateToken, reportController.getReports);
router.get('/user/:userId', authenticateToken, reportController.getUserReports);
router.get('/:id', authenticateToken, reportController.getReport);
router.put('/:id/status', authenticateToken, reportController.updateReportStatus);

module.exports = router;