const db = require('../config/database');
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
                    message: 'vulnerability_id does not exist'
                });
            }

            const vulnerability = vulnResults[0];
            const points = vulnerability.exp_reward || 0;

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
                            message: 'user_id does not exist'
                        });
                    }

                    const user = userResults[0];
                    const currentReputation = user.reputation || 0;
                    const newReputation = currentReputation + points;

                    // Create the report with initial status of 0 (Open)
                    db.query(
                        'INSERT INTO reports (user_id, vulnerability_id, status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
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
                                    addExperience(user_id, points, `Found vulnerability: ${vulnerability.title}`);

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

                                    // Return response in exact format specified
                                    res.status(201).json({
                                        id: reportId,
                                        user_id: user_id,
                                        vulnerability_id: vulnerability_id,
                                        status: 0,
                                        user_reputation: newReputation
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

// Update report status - PUT /reports/{report_id}
const updateReport = (req, res) => {
    const { id } = req.params;
    const { status, user_id } = req.body;

    // Validate required fields
    if (status === undefined || !user_id) {
        return res.status(400).json({ 
            success: false, 
            message: 'status and user_id are required' 
        });
    }

    // Validate that status and user_id are numbers
    if (!Number.isInteger(status) || !Number.isInteger(user_id)) {
        return res.status(400).json({
            success: false,
            message: 'status and user_id must be integers'
        });
    }

    // Check if report exists and get vulnerability points
    db.query(
        `SELECT r.*, v.exp_reward, v.title 
         FROM reports r 
         JOIN vulnerabilities v ON r.vulnerability_id = v.id 
         WHERE r.id = ?`,
        [id],
        (reportError, reportResults) => {
            if (reportError) {
                console.error('Report lookup error:', reportError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            if (reportResults.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'report_id does not exist' 
                });
            }

            const report = reportResults[0];
            const points = report.exp_reward || 0;

            // Check if user exists (the one closing the report)
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
                            message: 'user_id does not exist'
                        });
                    }

                    const closingUser = userResults[0];
                    let updatedReputation = closingUser.reputation || 0;

                    // If status is being updated to 1 (Closed), add points to closing user
                    if (status === 1 && report.status !== 1) {
                        updatedReputation += points;

                        // Update the closing user's reputation
                        db.query(
                            'UPDATE users SET reputation = ? WHERE id = ?',
                            [updatedReputation, user_id],
                            (repUpdateError) => {
                                if (repUpdateError) {
                                    console.error('Reputation update error:', repUpdateError);
                                    return res.status(500).json({ 
                                        success: false, 
                                        message: 'Server error' 
                                    });
                                }

                                // Add experience points to closing user
                                addExperience(user_id, points, `Resolved vulnerability: ${report.title}`);

                                // Update report with new status and override user_id
                                db.query(
                                    'UPDATE reports SET status = ?, user_id = ?, updated_at = NOW() WHERE id = ?',
                                    [status, user_id, id],
                                    (updateError) => {
                                        if (updateError) {
                                            console.error('Report update error:', updateError);
                                            return res.status(500).json({ 
                                                success: false, 
                                                message: 'Server error' 
                                            });
                                        }

                                        // Log activity
                                        db.query(
                                            'INSERT INTO activity_logs (user_id, action_type, details) VALUES (?, ?, ?)',
                                            [user_id, 'report_closed', JSON.stringify({ 
                                                reportId: parseInt(id),
                                                originalUserId: report.user_id,
                                                closingUserId: user_id,
                                                vulnerabilityTitle: report.title,
                                                pointsAwarded: points
                                            })],
                                            (logError) => {
                                                if (logError) {
                                                    console.error('Activity log error:', logError);
                                                }
                                            }
                                        );

                                        // Return response in exact format specified
                                        res.status(200).json({
                                            id: parseInt(id),
                                            status: status,
                                            closer_id: user_id,
                                            user_reputation: updatedReputation
                                        });
                                    }
                                );
                            }
                        );
                    } else {
                        // Just update status without changing reputation
                        db.query(
                            'UPDATE reports SET status = ?, user_id = ?, updated_at = NOW() WHERE id = ?',
                            [status, user_id, id],
                            (updateError) => {
                                if (updateError) {
                                    console.error('Report update error:', updateError);
                                    return res.status(500).json({ 
                                        success: false, 
                                        message: 'Server error' 
                                    });
                                }

                                // Return response in exact format specified
                                res.status(200).json({
                                    id: parseInt(id),
                                    status: status,
                                    closer_id: user_id,
                                    user_reputation: updatedReputation
                                });
                            }
                        );
                    }
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

module.exports = {
    createReport,
    updateReport,
    getReports,
    getReport,
    getUserReports
};