const ReportModel = require('../models/reportModel');
const VulnerabilityModel = require('../models/vulnerabilityModel');
const UserModel = require('../models/userModel');
const ActivityLogModel = require('../models/activityLogModel');

// Validation helper
const validatePagination = (page, limit) => {
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    
    if (isNaN(parsedPage) || parsedPage < 1) {
        return { isValid: false, message: 'Invalid page number' };
    }
    
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return { isValid: false, message: 'Invalid limit (1-100)' };
    }
    
    return { 
        isValid: true, 
        page: parsedPage, 
        limit: parsedLimit 
    };
};

// Helper function to add experience to user
const addExperience = (userId, points, description) => {
    UserModel.addExperience(userId, points, (error) => {
        if (error) {
            console.error('Error adding experience:', error);
        } else {
            console.log(`Added ${points} EXP to user ${userId}: ${description}`);
        }
    });
};

// Create new report - POST /reports
const createReport = (req, res) => {
    const { vulnerability_id, findings } = req.body;
    const user_id = req.userId;

    console.log('Creating report:', { user_id, vulnerability_id, findingsLength: findings ? findings.length : 0 });

    // Validate required fields
    if (!vulnerability_id) {
        return res.status(400).json({ 
            success: false, 
            message: 'Vulnerability ID is required' 
        });
    }

    if (!findings || findings.trim().length === 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Report findings are required' 
        });
    }

    if (findings.trim().length < 10) {
        return res.status(400).json({ 
            success: false, 
            message: 'Report findings must be at least 10 characters long' 
        });
    }

    // Check if vulnerability exists
    VulnerabilityModel.findById(vulnerability_id, (error, vulnerabilities) => {
        if (error) {
            console.error('Vulnerability lookup error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error while checking vulnerability' 
            });
        }

        if (!vulnerabilities || vulnerabilities.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Vulnerability not found' 
            });
        }

        const vulnerability = vulnerabilities[0];
        console.log('Found vulnerability:', { id: vulnerability.id, title: vulnerability.title, severity: vulnerability.severity });

        // Check if user already reported this vulnerability
        ReportModel.checkExistingReport(user_id, vulnerability_id, (checkError, existingReports) => {
            if (checkError) {
                console.error('Existing report check error:', checkError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error while checking existing reports' 
                });
            }

            if (existingReports && existingReports.length > 0) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'You have already reported this vulnerability' 
                });
            }

            // Calculate points based on vulnerability severity
            const severityPoints = {
                'CRITICAL': 500,
                'HIGH': 300,
                'MEDIUM': 200,
                'LOW': 100,
                'INFO': 50
            };
            
            const points = severityPoints[vulnerability.severity] || vulnerability.exp_reward || 100;
            console.log('Calculated points:', points, 'for severity:', vulnerability.severity);

            // Create the report
            const reportData = {
                userId: user_id,
                vulnerabilityId: vulnerability_id,
                findings: findings.trim(),
                status: 0, // 0 = Open, 1 = In Progress, 2 = Resolved
                points: points
            };

            ReportModel.create(reportData, (createError, result) => {
                if (createError) {
                    console.error('Report creation error:', createError);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to create report. Please try again.' 
                    });
                }

                console.log('Report created with ID:', result.insertId);

                // Award EXP to user
                addExperience(user_id, points, `Reported vulnerability: ${vulnerability.title}`);

                // Log activity using ActivityLogModel
                ActivityLogModel.create({
                    userId: user_id,
                    actionType: 'vulnerability_report',
                    details: {
                        reportId: result.insertId,
                        vulnerabilityId: vulnerability_id,
                        vulnerabilityTitle: vulnerability.title,
                        severity: vulnerability.severity,
                        points: points,
                        findingsLength: findings.trim().length
                    }
                }, (logError) => {
                    if (logError) {
                        console.error('Activity log error:', logError);
                        // Don't fail the request if logging fails
                    }
                });

                res.status(201).json({
                    success: true,
                    message: 'Report created successfully! Thank you for your contribution.',
                    report: {
                        id: result.insertId,
                        user_id: user_id,
                        vulnerability_id: vulnerability_id,
                        findings: findings.trim(),
                        status: 0,
                        points: points,
                        vulnerability_title: vulnerability.title,
                        vulnerability_severity: vulnerability.severity,
                        created_at: new Date().toISOString()
                    }
                });
            });
        });
    });
};

// Get all reports - GET /reports
const getReports = (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const validation = validatePagination(page, limit);
    
    console.log('Getting reports:', { page, limit, status });
    
    if (!validation.isValid) {
        return res.status(400).json({ 
            success: false, 
            message: validation.message 
        });
    }

    const offset = (validation.page - 1) * validation.limit;

    // If status filter is provided, use getByStatus method
    if (status !== undefined && status !== null && status !== '') {
        const statusValue = parseInt(status);
        if (isNaN(statusValue) || statusValue < -1 || statusValue > 2) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status value. Must be -1, 0, 1, or 2' 
            });
        }

        console.log('Filtering by status:', statusValue);
        ReportModel.getByStatus(statusValue, validation.limit, offset, (error, reports) => {
            if (error) {
                console.error('Get reports by status error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error while fetching reports' 
                });
            }

            console.log(`Found ${reports ? reports.length : 0} reports with status ${statusValue}`);
            res.json({
                success: true,
                reports: reports || [],
                pagination: {
                    page: validation.page,
                    limit: validation.limit,
                    status: statusValue
                }
            });
        });
    } else {
        // Get all reports
        ReportModel.getAll(validation.limit, offset, (error, reports) => {
            if (error) {
                console.error('Get reports error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error while fetching reports' 
                });
            }

            console.log(`Found ${reports ? reports.length : 0} total reports`);
            res.json({
                success: true,
                reports: reports || [],
                pagination: {
                    page: validation.page,
                    limit: validation.limit
                }
            });
        });
    }
};

// Get specific report - GET /reports/{id}
const getReport = (req, res) => {
    const { id } = req.params;

    console.log('Getting specific report:', id);

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid report ID' 
        });
    }

    ReportModel.findById(parseInt(id), (error, reports) => {
        if (error) {
            console.error('Get report error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error while fetching report' 
            });
        }

        if (!reports || reports.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Report not found' 
            });
        }

        console.log('Found report:', reports[0].id);
        res.json({
            success: true,
            report: reports[0]
        });
    });
};

// Get user's reports - GET /reports/user/{userId}
const getUserReports = (req, res) => {
    const userId = req.params.userId || req.userId;

    console.log('Getting user reports for user:', userId);

    if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid user ID' 
        });
    }

    // Check if requesting user is the same as the user whose reports are being requested
    // or if they have admin privileges (for future implementation)
    if (req.userId && parseInt(userId) !== req.userId) {
        // For now, allow all authenticated users to view any user's reports
        // In production, you might want to restrict this
        console.log('User requesting different user reports:', { requester: req.userId, target: userId });
    }

    ReportModel.getUserReports(parseInt(userId), (error, reports) => {
        if (error) {
            console.error('Get user reports error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error while fetching user reports' 
            });
        }

        console.log(`Found ${reports ? reports.length : 0} reports for user ${userId}`);
        res.json({
            success: true,
            reports: reports || []
        });
    });
};

// Update report - PUT /reports/{id}
const updateReport = (req, res) => {
    const { id } = req.params;
    const { status, points, findings } = req.body;

    console.log('Updating report:', { id, status, points, findingsLength: findings ? findings.length : 0 });

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid report ID' 
        });
    }

    if (status === undefined && points === undefined && findings === undefined) {
        return res.status(400).json({ 
            success: false, 
            message: 'At least one field (status, points, or findings) is required' 
        });
    }

    // Validate status if provided
    if (status !== undefined && (!Number.isInteger(status) || status < -1 || status > 2)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Status must be an integer (-1=Deleted, 0=Open, 1=In Progress, 2=Resolved)' 
        });
    }

    // Validate points if provided
    if (points !== undefined && (!Number.isInteger(points) || points < 0)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Points must be a non-negative integer' 
        });
    }

    // Validate findings if provided
    if (findings !== undefined && (typeof findings !== 'string' || findings.trim().length < 10)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Findings must be at least 10 characters long' 
        });
    }

    // First, check if report exists and get current data
    ReportModel.findById(parseInt(id), (findError, reports) => {
        if (findError) {
            console.error('Find report error:', findError);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error while finding report' 
            });
        }

        if (!reports || reports.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Report not found' 
            });
        }

        const currentReport = reports[0];
        console.log('Current report status:', currentReport.status);

        // Check permissions (basic implementation)
        // In a more complete system, you'd check if user owns the report or has admin rights
        const userId = req.userId;
        const isOwner = currentReport.user_id === userId;
        const isVulnOwner = currentReport.vulnerability_reporter_id === userId;
        
        // Allow report owner to update their own report, or vuln owner to resolve reports
        if (!isOwner && !(isVulnOwner && status === 2)) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only update your own reports or resolve reports for your vulnerabilities' 
            });
        }

        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (points !== undefined) updateData.points = points;
        if (findings !== undefined) updateData.findings = findings.trim();

        ReportModel.update(parseInt(id), updateData, (updateError) => {
            if (updateError) {
                console.error('Update report error:', updateError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error while updating report' 
                });
            }

            console.log('Report updated successfully:', id);

            // Log the update activity
            ActivityLogModel.create({
                userId: userId,
                actionType: 'report_updated',
                details: {
                    reportId: parseInt(id),
                    previousStatus: currentReport.status,
                    newStatus: status,
                    updatedFields: Object.keys(updateData),
                    isOwner: isOwner,
                    isVulnOwner: isVulnOwner
                }
            }, (logError) => {
                if (logError) {
                    console.error('Activity log error:', logError);
                }
            });

            res.json({
                success: true,
                message: 'Report updated successfully'
            });
        });
    });
};

// Delete report - DELETE /reports/{id}
const deleteReport = (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    console.log('Deleting report:', { id, userId });

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid report ID' 
        });
    }

    // First check if report exists and belongs to user
    ReportModel.findById(parseInt(id), (error, reports) => {
        if (error) {
            console.error('Find report error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error while finding report' 
            });
        }

        if (!reports || reports.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Report not found' 
            });
        }

        const report = reports[0];

        // Check if user owns the report
        if (report.user_id !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only delete your own reports' 
            });
        }

        // Only allow deletion if report is still open (status 0)
        if (report.status !== 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete reports that are in progress or resolved' 
            });
        }

        console.log('Report can be deleted, updating status to -1');

        // Instead of actual deletion, mark as deleted (status -1)
        ReportModel.update(parseInt(id), { status: -1 }, (deleteError) => {
            if (deleteError) {
                console.error('Delete report error:', deleteError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to delete report' 
                });
            }

            console.log('Report marked as deleted:', id);

            // Log the deletion activity
            ActivityLogModel.create({
                userId: userId,
                actionType: 'report_deleted',
                details: {
                    reportId: parseInt(id),
                    vulnerabilityId: report.vulnerability_id,
                    vulnerabilityTitle: report.vulnerability_title,
                    originalStatus: report.status
                }
            }, (logError) => {
                if (logError) {
                    console.error('Activity log error:', logError);
                }
            });

            res.json({
                success: true,
                message: 'Report deleted successfully'
            });
        });
    });
};

// Get report statistics - GET /reports/stats
const getReportStats = (req, res) => {
    console.log('Getting report statistics');

    // This could be expanded to get actual statistics from the database
    // For now, return basic structure
    res.json({
        success: true,
        stats: {
            total: 0,
            open: 0,
            inProgress: 0,
            resolved: 0,
            deleted: 0
        },
        message: 'Statistics endpoint - implementation in progress'
    });
};

module.exports = {
    createReport,
    getReports,
    getReport,
    getUserReports,
    updateReport,
    deleteReport,
    getReportStats
};