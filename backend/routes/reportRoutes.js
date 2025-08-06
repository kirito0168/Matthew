const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes (no authentication required as per requirements)
router.post('/', reportController.createReport);                    // POST /reports - Create new report
router.put('/:id', reportController.updateReport);                  // PUT /reports/{report_id} - Update report

// Protected routes (require authentication for viewing)
router.get('/', authenticateToken, reportController.getReports);                    // GET /reports - Get all reports
router.get('/user/:userId', authenticateToken, reportController.getUserReports);    // GET /reports/user/{userId} - Get user's reports
router.get('/:id', authenticateToken, reportController.getReport);                  // GET /reports/{id} - Get specific report

module.exports = router;