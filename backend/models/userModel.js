const db = require('../services/db');

class UserModel {
    // Find user by ID
    static findById(userId, callback) {
        const query = `
            SELECT 
                u.id, u.username, u.email, u.level, u.exp, u.current_title, 
                u.avatar_url, u.created_at, u.password, u.reputation
            FROM users u
            WHERE u.id = ?
        `;
        db.query(query, [userId], callback);
    }

    // Find user by username or email
    static findByUsernameOrEmail(identifier, callback) {
        const query = 'SELECT * FROM users WHERE username = ? OR email = ?';
        db.query(query, [identifier, identifier], callback);
    }

    // Check if user exists
    static checkExists(username, email, callback) {
        const query = 'SELECT id FROM users WHERE username = ? OR email = ?';
        db.query(query, [username, email], callback);
    }

    // Create new user
    static create(userData, callback) {
        const { username, email, hashedPassword } = userData;
        const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        db.query(query, [username, email, hashedPassword], callback);
    }

    // Update user experience and level
    static updateExpAndLevel(userId, exp, level, callback) {
        const query = 'UPDATE users SET exp = ?, level = ? WHERE id = ?';
        db.query(query, [exp, level, userId], callback);
    }

    // Update user title
    static updateTitle(userId, title, callback) {
        const query = 'UPDATE users SET current_title = ? WHERE id = ?';
        db.query(query, [title, userId], callback);
    }

    // Get user profile with stats
    static getProfileWithStats(userId, callback) {
        const query = `
            SELECT 
                u.id, u.username, u.level, u.exp, u.current_title, u.avatar_url, u.created_at,
                COUNT(DISTINCT v.id) as vulnerabilities_reported,
                COUNT(DISTINCT vr.id) as vulnerabilities_resolved,
                COUNT(DISTINCT uq.id) as quests_completed,
                COUNT(DISTINCT r.id) as reviews_given
            FROM users u
            LEFT JOIN vulnerabilities v ON u.id = v.reporter_id
            LEFT JOIN vulnerabilities vr ON u.id = vr.resolver_id AND vr.status = 'resolved'
            LEFT JOIN user_quests uq ON u.id = uq.user_id
            LEFT JOIN reviews r ON u.id = r.user_id
            WHERE u.id = ?
            GROUP BY u.id, u.username, u.level, u.exp, u.current_title, u.avatar_url, u.created_at
        `;
        db.query(query, [userId], callback);
    }

    // Get user achievements
    static getUserAchievements(userId, callback) {
        const query = `
            SELECT a.*, ua.unlocked_at
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = ?
            ORDER BY ua.unlocked_at DESC
        `;
        db.query(query, [userId], callback);
    }

    // Get user activity logs
    static getUserActivityLogs(userId, limit = 10, callback) {
        const query = `
            SELECT * FROM activity_logs
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `;
        db.query(query, [userId, limit], callback);
    }

    // Get unlocked titles
    static getUnlockedTitles(userId, callback) {
        const query = `
            SELECT a.title as title, a.description, ua.unlocked_at
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = ?
            ORDER BY ua.unlocked_at DESC
        `;
        db.query(query, [userId], callback);
    }

    // Verify user owns title
    static verifyTitleOwnership(userId, title, callback) {
        const query = `
            SELECT a.title FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = ? AND a.title = ?
        `;
        db.query(query, [userId, title], callback);
    }

    // Update review count (not used in your schema, but kept for compatibility)
    static incrementReviewCount(userId, callback) {
        // Since reviews_given doesn't exist in your schema, just return success
        callback(null, { affectedRows: 1 });
    }

    // Get user for auth
    static getUserForAuth(userId, callback) {
        const query = 'SELECT id, username, email, level, exp, current_title, avatar_url FROM users WHERE id = ?';
        db.query(query, [userId], callback);
    }
}

module.exports = UserModel;