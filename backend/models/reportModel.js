const db = require('../services/db');

class ReportModel {
    // Create new report
    static create(reportData, callback) {
        const { userId, vulnerabilityId, findings, status, points } = reportData;
        const query = `
            INSERT INTO reports (user_id, vulnerability_id, findings, status, points, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `;
        db.query(query, [userId, vulnerabilityId, findings || '', status || 0, points || 0], callback);
    }

    // Get all reports with pagination
    static getAll(limit, offset, callback) {
        const query = `
            SELECT 
                r.id,
                r.user_id,
                r.vulnerability_id,
                r.findings,
                r.status,
                r.points,
                r.created_at,
                r.updated_at,
                COALESCE(u.username, 'Anonymous') as username,
                COALESCE(v.title, 'Vulnerability Not Found') as vulnerability_title,
                COALESCE(v.description, '') as vulnerability_description,
                COALESCE(v.severity, 'UNKNOWN') as vulnerability_severity,
                COALESCE(v.exp_reward, 0) as vulnerability_points,
                COALESCE(v.reporter_id, 0) as vulnerability_reporter_id
            FROM reports r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `;
        db.query(query, [parseInt(limit), parseInt(offset)], (error, results) => {
            if (error) {
                console.error('Database error in getAll:', error);
                return callback(error, null);
            }
            callback(null, results);
        });
    }

    // Get report by ID
    static findById(reportId, callback) {
        const query = `
            SELECT 
                r.id,
                r.user_id,
                r.vulnerability_id,
                r.findings,
                r.status,
                r.points,
                r.created_at,
                r.updated_at,
                COALESCE(u.username, 'Anonymous') as username,
                COALESCE(u.email, '') as email,
                COALESCE(v.title, 'Vulnerability Not Found') as vulnerability_title,
                COALESCE(v.description, '') as vulnerability_description,
                COALESCE(v.severity, 'UNKNOWN') as vulnerability_severity,
                COALESCE(v.exp_reward, 0) as exp_reward
            FROM reports r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
            WHERE r.id = ?
        `;
        db.query(query, [reportId], (error, results) => {
            if (error) {
                console.error('Database error in findById:', error);
                return callback(error, null);
            }
            callback(null, results);
        });
    }

    // Get user's reports
    static getUserReports(userId, callback) {
        const query = `
            SELECT 
                r.id,
                r.user_id,
                r.vulnerability_id,
                r.findings,
                r.status,
                r.points,
                r.created_at,
                r.updated_at,
                COALESCE(v.title, 'Vulnerability Not Found') as vulnerability_title,
                COALESCE(v.severity, 'UNKNOWN') as vulnerability_severity,
                COALESCE(v.exp_reward, 0) as vulnerability_points
            FROM reports r
            LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `;
        db.query(query, [userId], (error, results) => {
            if (error) {
                console.error('Database error in getUserReports:', error);
                return callback(error, null);
            }
            callback(null, results);
        });
    }

    // Update report status
    static updateStatus(reportId, status, callback) {
        const query = 'UPDATE reports SET status = ?, updated_at = NOW() WHERE id = ?';
        db.query(query, [status, reportId], (error, results) => {
            if (error) {
                console.error('Database error in updateStatus:', error);
                return callback(error, null);
            }
            callback(null, results);
        });
    }

    // Check if report exists for user and vulnerability
    static checkExistingReport(userId, vulnerabilityId, callback) {
        const query = 'SELECT * FROM reports WHERE user_id = ? AND vulnerability_id = ?';
        db.query(query, [userId, vulnerabilityId], (error, results) => {
            if (error) {
                console.error('Database error in checkExistingReport:', error);
                return callback(error, null);
            }
            callback(null, results);
        });
    }

    // Get report count
    static getCount(filters, callback) {
        let query = 'SELECT COUNT(*) as total FROM reports WHERE 1=1';
        const params = [];

        if (filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }

        if (filters.status !== undefined && filters.status !== null) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        db.query(query, params, (error, results) => {
            if (error) {
                console.error('Database error in getCount:', error);
                return callback(error, null);
            }
            callback(null, results);
        });
    }

    // Update report
    static update(reportId, updateData, callback) {
        const { status, points, findings } = updateData;
        let query = 'UPDATE reports SET updated_at = NOW()';
        const params = [];

        if (status !== undefined && status !== null) {
            query += ', status = ?';
            params.push(status);
        }

        if (points !== undefined && points !== null) {
            query += ', points = ?';
            params.push(points);
        }

        if (findings !== undefined && findings !== null) {
            query += ', findings = ?';
            params.push(findings);
        }

        query += ' WHERE id = ?';
        params.push(reportId);

        db.query(query, params, (error, results) => {
            if (error) {
                console.error('Database error in update:', error);
                return callback(error, null);
            }
            callback(null, results);
        });
    }

    // Get reports by status
    static getByStatus(status, limit, offset, callback) {
        const query = `
            SELECT 
                r.id,
                r.user_id,
                r.vulnerability_id,
                r.findings,
                r.status,
                r.points,
                r.created_at,
                r.updated_at,
                COALESCE(u.username, 'Anonymous') as username,
                COALESCE(v.title, 'Vulnerability Not Found') as vulnerability_title,
                COALESCE(v.severity, 'UNKNOWN') as vulnerability_severity,
                COALESCE(v.exp_reward, 0) as vulnerability_points
            FROM reports r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
            WHERE r.status = ?
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `;
        db.query(query, [status, parseInt(limit), parseInt(offset)], (error, results) => {
            if (error) {
                console.error('Database error in getByStatus:', error);
                return callback(error, null);
            }
            callback(null, results);
        });
    }
}

module.exports = ReportModel;