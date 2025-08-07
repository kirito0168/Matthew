const db = require('../config/database');

class ReportModel {
    // Create new report
    static create(reportData, callback) {
        const { userId, vulnerabilityId, status, points } = reportData;
        const query = 'INSERT INTO reports (user_id, vulnerability_id, status, points) VALUES (?, ?, ?, ?)';
        db.query(query, [userId, vulnerabilityId, status, points], callback);
    }

    // Get all reports with pagination
    static getAll(limit, offset, callback) {
        const query = `
            SELECT 
                r.*,
                u.username,
                v.title as vulnerability_title,
                v.severity
            FROM reports r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `;
        db.query(query, [limit, offset], callback);
    }

    // Get report by ID
    static findById(reportId, callback) {
        const query = `
            SELECT 
                r.*,
                u.username,
                u.email,
                v.title as vulnerability_title,
                v.description as vulnerability_description,
                v.severity,
                v.exp_reward
            FROM reports r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
            WHERE r.id = ?
        `;
        db.query(query, [reportId], callback);
    }

    // Get user's reports
    static getUserReports(userId, callback) {
        const query = `
            SELECT 
                r.*,
                v.title as vulnerability_title,
                v.severity
            FROM reports r
            LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `;
        db.query(query, [userId], callback);
    }

    // Update report status
    static updateStatus(reportId, status, callback) {
        const query = 'UPDATE reports SET status = ?, updated_at = NOW() WHERE id = ?';
        db.query(query, [status, reportId], callback);
    }

    // Check if report exists for user and vulnerability
    static checkExistingReport(userId, vulnerabilityId, callback) {
        const query = 'SELECT * FROM reports WHERE user_id = ? AND vulnerability_id = ?';
        db.query(query, [userId, vulnerabilityId], callback);
    }

    // Get report count
    static getCount(filters, callback) {
        let query = 'SELECT COUNT(*) as total FROM reports WHERE 1=1';
        const params = [];

        if (filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        db.query(query, params, callback);
    }

    // Update report
    static update(reportId, updateData, callback) {
        const { status, points } = updateData;
        const query = 'UPDATE reports SET status = ?, points = ?, updated_at = NOW() WHERE id = ?';
        db.query(query, [status, points, reportId], callback);
    }
}

module.exports = ReportModel;