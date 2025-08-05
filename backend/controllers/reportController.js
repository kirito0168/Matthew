const db = require('../config/database');
const { addExperience, checkAchievements } = require('./userController');
const { validateRequired, validatePagination, sanitizeInput } = require('../utils/validation');

// Create a new report linking user to vulnerability (without transactions)
const createReport = (req, res) => {
    const { user_id, vulnerability_id } = req.body;

    // Validate required fields
    const validation = validateRequired({ user_id, vulnerability_id });
    if (!validation.isValid) {
        return res.status(400).json({ 
            success: false, 
            message: `${validation.field} is required` 
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
    db.query(
        'SELECT id, exp_reward, title FROM vulnerabilities WHERE id = ?',
        [vulnerability_id],
        (vulnError, vulnResults) => {
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
                    message: 'Vulnerability not found'
                });
            }

            const vulnerability = vulnResults[0];
            const points = vulnerability.exp_reward;

            // Check if user exists
            db.query(
                'SELECT id, username, reputation FROM users WHERE id = ?',
                [user_id],
                (userError, userResults) => {
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
                            message: 'User not found'
                        });
                    }

                    const user = userResults[0];
                    const currentReputation = user.reputation || 0;
                    const newReputation = currentReputation + points;

                    // Check if report already exists
                    db.query(
                        'SELECT id FROM reports WHERE user_id = ? AND vulnerability_id = ?',
                        [user_id, vulnerability_id],
                        (checkError, checkResults) => {
                            if (checkError) {
                                console.error('Report check error:', checkError);
                                return res.status(500).json({ 
                                    success: false, 
                                    message: 'Server error' 
                                });
                            }

                            if (checkResults.length > 0) {
                                return res.status(409).json({
                                    success: false,
                                    message: 'Report already exists for this user and vulnerability'
                                });
                            }

                            // Create the report with initial status of 0 (Open)
                            db.query(
                                'INSERT INTO reports (user_id, vulnerability_id, status) VALUES (?, ?, ?)',
                                [user_id, vulnerability_id, 0],
                                (insertError, insertResult) => {
                                    if (insertError) {
                                        console.error('Report creation error:', insertError);
                                        return res.status(500).json({ 
                                            success: false, 
                                            message: 'Server error' 
                                        });
                                    }

                                    const reportId = insertResult.insertId;

                                    // Update user's reputation
                                    db.query(
                                        'UPDATE users SET reputation = ? WHERE id = ?',
                                        [newReputation, user_id],
                                        (updateError) => {
                                            if (updateError) {
                                                console.error('Reputation update error:', updateError);
                                                return res.status(500).json({ 
                                                    success: false, 
                                                    message: 'Server error' 
                                                });
                                            }

                                            // Add experience points
                                            addExperience(user_id, points, `Linked to vulnerability: ${vulnerability.title}`);

                                            // Check for achievements related to reports
                                            db.query(
                                                'SELECT COUNT(*) as total FROM reports WHERE user_id = ?',
                                                [user_id],
                                                (countError, countResult) => {
                                                    if (!countError && countResult.length > 0) {
                                                        checkAchievements(user_id, 'reports_created', countResult[0].total);
                                                    }
                                                }
                                            );

                                            // Log activity
                                            db.query(
                                                'INSERT INTO activity_logs (user_id, action_type, details) VALUES (?, ?, ?)',
                                                [user_id, 'report_created', JSON.stringify({ 
                                                    reportId: reportId,
                                                    vulnerabilityId: vulnerability_id,
                                                    vulnerabilityTitle: vulnerability.title,
                                                    pointsAwarded: points
                                                })],
                                                (logError) => {
                                                    if (logError) {
                                                        console.error('Activity log error:', logError);
                                                    }
                                                }
                                            );

                                            // Return success response
                                            res.status(201).json({
                                                success: true,
                                                message: 'Report created successfully',
                                                report: {
                                                    id: reportId,
                                                    user_id: user_id,
                                                    vulnerability_id: vulnerability_id,
                                                    status: 0
                                                },
                                                user: {
                                                    id: user_id,
                                                    username: user.username,
                                                    previousReputation: currentReputation,
                                                    updatedReputation: newReputation,
                                                    pointsAwarded: points
                                                }
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

// Get all reports with pagination and filters
const getReports = (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Validate pagination
    const { page: validPage, limit: validLimit } = validatePagination(page, limit);
    const offset = (validPage - 1) * validLimit;

    let query = `
        SELECT 
            r.*,
            u.username,
            u.reputation as user_reputation,
            v.title as vulnerability_title,
            v.severity as vulnerability_severity,
            v.exp_reward as vulnerability_points
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
        WHERE 1=1
    `;
    const params = [];

    if (status !== undefined) {
        query += ' AND r.status = ?';
        params.push(parseInt(status));
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(validLimit, offset);

    db.query(query, params, (error, reports) => {
        if (error) {
            console.error('Get reports error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM reports WHERE 1=1';
        const countParams = [];

        if (status !== undefined) {
            countQuery += ' AND status = ?';
            countParams.push(parseInt(status));
        }

        db.query(countQuery, countParams, (countError, countResult) => {
            if (countError) {
                console.error('Count error:', countError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            res.json({
                success: true,
                reports,
                pagination: {
                    total: countResult[0].total,
                    page: validPage,
                    totalPages: Math.ceil(countResult[0].total / validLimit)
                }
            });
        });
    });
};

// Get specific report by ID
const getReport = (req, res) => {
    const { id } = req.params;

    db.query(
        `SELECT 
            r.*,
            u.username,
            u.reputation as user_reputation,
            v.title as vulnerability_title,
            v.description as vulnerability_description,
            v.severity as vulnerability_severity,
            v.exp_reward as vulnerability_points
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
        WHERE r.id = ?`,
        [id],
        (error, reports) => {
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
        }
    );
};

// Get reports for specific user
const getUserReports = (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Validate pagination
    const { page: validPage, limit: validLimit } = validatePagination(page, limit);
    const offset = (validPage - 1) * validLimit;

    db.query(
        `SELECT 
            r.*,
            v.title as vulnerability_title,
            v.severity as vulnerability_severity,
            v.exp_reward as vulnerability_points
        FROM reports r
        LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?`,
        [userId, validLimit, offset],
        (error, reports) => {
            if (error) {
                console.error('Get user reports error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            // Get total count
            db.query(
                'SELECT COUNT(*) as total FROM reports WHERE user_id = ?',
                [userId],
                (countError, countResult) => {
                    if (countError) {
                        console.error('Count error:', countError);
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Server error' 
                        });
                    }

                    res.json({
                        success: true,
                        reports,
                        pagination: {
                            total: countResult[0].total,
                            page: validPage,
                            totalPages: Math.ceil(countResult[0].total / validLimit)
                        }
                    });
                }
            );
        }
    );
};

// Update report status
const updateReportStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status (0: Open, 1: In Progress, 2: Resolved, 3: Closed)
    if (![0, 1, 2, 3].includes(status)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid status. Must be 0 (Open), 1 (In Progress), 2 (Resolved), or 3 (Closed)' 
        });
    }

    // Check if report exists
    db.query(
        'SELECT * FROM reports WHERE id = ?',
        [id],
        (error, reports) => {
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

            const report = reports[0];

            // Update the status
            db.query(
                'UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, id],
                (updateError) => {
                    if (updateError) {
                        console.error('Update report status error:', updateError);
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Server error' 
                        });
                    }

                    // Log activity
                    const statusNames = ['Open', 'In Progress', 'Resolved', 'Closed'];
                    db.query(
                        'INSERT INTO activity_logs (user_id, action_type, details) VALUES (?, ?, ?)',
                        [req.userId, 'report_status_updated', JSON.stringify({ 
                            reportId: id,
                            oldStatus: report.status,
                            newStatus: status,
                            statusName: statusNames[status]
                        })],
                        (logError) => {
                            if (logError) {
                                console.error('Activity log error:', logError);
                            }
                        }
                    );

                    res.json({
                        success: true,
                        message: 'Report status updated successfully',
                        report: {
                            id: parseInt(id),
                            status: status,
                            statusName: statusNames[status]
                        }
                    });
                }
            );
        }
    );
};

module.exports = {
    createReport,
    getReports,
    getReport,
    getUserReports,
    updateReportStatus
};