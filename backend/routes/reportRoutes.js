const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Routes
router.post('/', reportController.createReport);              // POST /api/reports
router.get('/', reportController.getReports);                // GET /api/reports
router.get('/user/:userId', reportController.getUserReports); // GET /api/reports/user/:userId
router.get('/:id', reportController.getReport);              // GET /api/reports/:id
router.put('/:id', reportController.updateReport);           // PUT /api/reports/:id
router.delete('/:id', reportController.deleteReport);        // DELETE /api/reports/:id

module.exports = router;