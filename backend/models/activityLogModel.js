const db = require('../config/database');

class ActivityLogModel {
    // Create new activity log
    static create(logData, callback) {
        const { userId, actionType, details } = logData;
        const query = 'INSERT INTO activity_logs (user_id, action_type, details) VALUES (?, ?, ?)';
        const detailsJson = typeof details === 'object' ? JSON.stringify(details) : details;
        db.query(query, [userId, actionType, detailsJson], callback);
    }

    // Get user's activity logs
    static getUserLogs(userId, limit = 10, callback) {
        const query = `
            SELECT * FROM activity_logs
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `;
        db.query(query, [userId, limit], callback);
    }

    // Get all activity logs with pagination
    static getAllLogs(limit, offset, callback) {
        const query = `
            SELECT 
                al.*,
                u.username
            FROM activity_logs al
            JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `;
        db.query(query, [limit, offset], callback);
    }

    // Get activity logs by type
    static getLogsByType(actionType, limit = 50, callback) {
        const query = `
            SELECT 
                al.*,
                u.username
            FROM activity_logs al
            JOIN users u ON al.user_id = u.id
            WHERE al.action_type = ?
            ORDER BY al.created_at DESC
            LIMIT ?
        `;
        db.query(query, [actionType, limit], callback);
    }

    // Delete old logs
    static deleteOldLogs(daysOld, callback) {
        const query = 'DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
        db.query(query, [daysOld], callback);
    }
}

module.exports = ActivityLogModel;