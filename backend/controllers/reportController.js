const ReportModel = require('../models/reportModel');
const VulnerabilityModel = require('../models/vulnerabilityModel');
const UserModel = require('../models/userModel');
const ActivityLogModel = require('../models/activityLogModel');
const { addExperience, checkAchievements } = require('./userController');
const { validateRequired, validatePagination, sanitizeInput } = require('../utils/validation');

// Create a new report linking user to vulnerability - POST /reports
const createReport = (req, res) => {
    const { user_id, vulnerability_id } = req.body;

    // Validate required fields
    if (!user_id || !vulnerability_id) {
        return res.status(400).json({ 
            success: false, 
            message: 'user_id and vulnerability_id are required' 
        });
    }

    // Validate that user_id and vulnerability_id are numbers
    if (!Number.isInteger(user_id) || !Number.isInteger(vulnerability_id)) {
        return res.status(400).json({
            success: false,
            message: 'user_id and vulnerability_id must be integers'
        });
    }

    // Check if vulnerability exists and get its points
    VulnerabilityModel.checkExists(vulnerability_id, (vulnError, vulnResults) => {
        if (vulnError) {
            console.error('Vulnerability lookup error:', vulnError);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        if (vulnResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'vulnerability_id does not exist'
            });
        }

        const vulnerability = vulnResults[0];
        const points = vulnerability.exp_reward || 0;

        // Check if user exists
        UserModel.findById(user_id, (userError, userResults) => {
            if (userError) {
                console.error('User lookup error:', userError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            if (userResults.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'user_id does not exist'
                });
            }

            // Check for existing report
            ReportModel.checkExistingReport(user_id, vulnerability_id, (existError, existingReports) => {
                if (existError) {
                    console.error('Check existing report error:', existError);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Server error' 
                    });
                }

                if (existingReports.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Report already exists for this user and vulnerability'
                    });
                }

                // Create the report (status is INT in your schema, not ENUM)
                ReportModel.create({
                    userId: user_id,
                    vulnerabilityId: vulnerability_id,
                    status: 0,  // 0 for pending (since it's INT in your schema)
                    points: points
                }, (createError, result) => {
                    if (createError) {
                        console.error('Create report error:', createError);
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Server error' 
                        });
                    }

                    // Add experience to user
                    addExperience(user_id, points, `Reported vulnerability: ${vulnerability.title}`);

                    // Log activity
                    ActivityLogModel.create({
                        userId: user_id,
                        actionType: 'vulnerability_reported',
                        details: {
                            reportId: result.insertId,
                            vulnerabilityTitle: vulnerability.title,
                            points: points
                        }
                    }, (logError) => {
                        if (logError) {
                            console.error('Activity log error:', logError);
                        }
                    });

                    res.status(201).json({
                        success: true,
                        message: 'Report created successfully',
                        report: {
                            id: result.insertId,
                            user_id: user_id,
                            vulnerability_id: vulnerability_id,
                            status: 0,
                            points: points
                        }
                    });
                });
            });
        });
    });
};

// Get all reports - GET /reports
const getReports = (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const validation = validatePagination(page, limit);
    
    if (!validation.isValid) {
        return res.status(400).json({ 
            success: false, 
            message: validation.message 
        });
    }

    const offset = (validation.page - 1) * validation.limit;

    ReportModel.getAll(validation.limit, offset, (error, reports) => {
        if (error) {
            console.error('Get reports error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            reports,
            pagination: {
                page: validation.page,
                limit: validation.limit
            }
        });
    });
};

// Get specific report - GET /reports/{id}
const getReport = (req, res) => {
    const { id } = req.params;

    ReportModel.findById(id, (error, reports) => {
        if (error) {
            console.error('Get report error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        if (reports.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Report not found' 
            });
        }

        res.json({
            success: true,
            report: reports[0]
        });
    });
};

// Get user's reports - GET /reports/user/{userId}
const getUserReports = (req, res) => {
    const userId = req.params.userId || req.userId;

    ReportModel.getUserReports(userId, (error, reports) => {
        if (error) {
            console.error('Get user reports error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            reports
        });
    });
};

// Update report - PUT /reports/{report_id}
const updateReport = (req, res) => {
    const { id } = req.params;
    const { status, points } = req.body;

    if (status === undefined) {
        return res.status(400).json({ 
            success: false, 
            message: 'Status is required' 
        });
    }

    // Since status is INT in your schema, validate it's a number
    if (!Number.isInteger(status)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Status must be an integer' 
        });
    }

    ReportModel.update(id, { status, points }, (error) => {
        if (error) {
            console.error('Update report error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            message: 'Report updated successfully'
        });
    });
};

module.exports = {
    createReport,
    getReports,
    getReport,
    getUserReports,
    updateReport
};