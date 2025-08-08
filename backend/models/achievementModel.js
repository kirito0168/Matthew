const db = require('../services/db');

class AchievementModel {
    // Get all achievements
    static getAll(callback) {
        const query = 'SELECT * FROM achievements ORDER BY requirement_value';
        db.query(query, callback);
    }

    // Get user's achievements
    static getUserAchievements(userId, callback) {
        const query = `
            SELECT 
                a.*,
                ua.unlocked_at
            FROM achievements a
            LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
            ORDER BY a.requirement_value
        `;
        db.query(query, [userId], callback);
    }

    // Get achievements by requirement type
    static getByRequirement(requirementType, requirementValue, userId, callback) {
        const query = `
            SELECT a.* FROM achievements a
            LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
            WHERE a.requirement_type = ? AND a.requirement_value <= ? AND ua.id IS NULL
        `;
        db.query(query, [userId, requirementType, requirementValue], callback);
    }

    // Unlock achievement for user
    static unlockForUser(userId, achievementId, callback) {
        const query = 'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)';
        db.query(query, [userId, achievementId], callback);
    }

    // Check if user has achievement
    static checkUserHasAchievement(userId, achievementId, callback) {
        const query = 'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?';
        db.query(query, [userId, achievementId], callback);
    }

    // Get achievement progress for user
    static getUserProgress(userId, callback) {
        // This is a complex query that gets all the counts needed for achievement progress
        const queries = [
            // Vulnerabilities reported count
            'SELECT COUNT(*) as count FROM vulnerabilities WHERE reporter_id = ?',
            // Vulnerabilities resolved count  
            'SELECT COUNT(*) as count FROM vulnerabilities WHERE resolver_id = ? AND status = "resolved"',
            // Quests completed count
            'SELECT COUNT(*) as count FROM user_quests WHERE user_id = ?',
            // User level
            'SELECT level FROM users WHERE id = ?',
            // Reviews given count
            'SELECT COUNT(*) as count FROM reviews WHERE user_id = ?'
        ];

        const results = {};
        let completed = 0;

        const checkCompletion = () => {
            completed++;
            if (completed === queries.length) {
                callback(null, results);
            }
        };

        // Execute all queries
        db.query(queries[0], [userId], (err, res) => {
            if (!err && res.length > 0) results.vulnerabilities_reported = res[0].count;
            checkCompletion();
        });

        db.query(queries[1], [userId], (err, res) => {
            if (!err && res.length > 0) results.vulnerabilities_resolved = res[0].count;
            checkCompletion();
        });

        db.query(queries[2], [userId], (err, res) => {
            if (!err && res.length > 0) results.quests_completed = res[0].count;
            checkCompletion();
        });

        db.query(queries[3], [userId], (err, res) => {
            if (!err && res.length > 0) results.level_reached = res[0].level;
            checkCompletion();
        });

        db.query(queries[4], [userId], (err, res) => {
            if (!err && res.length > 0) results.reviews_given = res[0].count;
            checkCompletion();
        });
    }
}

module.exports = AchievementModel;