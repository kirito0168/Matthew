const db = require('../services/db');

class RankingModel {
    // Get overall rankings
    static getOverallRankings(limit, offset, callback) {
        const query = `
            SELECT 
                u.id,
                u.username,
                u.level,
                u.exp,
                u.current_title,
                u.avatar_url,
                (u.level * 1000 + u.exp) as total_exp,
                COUNT(DISTINCT v.id) as vulnerabilities_reported,
                COUNT(DISTINCT vr.id) as vulnerabilities_resolved,
                COUNT(DISTINCT uq.id) as quests_completed
            FROM users u
            LEFT JOIN vulnerabilities v ON u.id = v.reporter_id
            LEFT JOIN vulnerabilities vr ON u.id = vr.resolver_id AND vr.status = 'resolved'
            LEFT JOIN user_quests uq ON u.id = uq.user_id
            GROUP BY u.id, u.username, u.level, u.exp, u.current_title, u.avatar_url
            ORDER BY total_exp DESC
            LIMIT ? OFFSET ?
        `;
        db.query(query, [limit, offset], callback);
    }

    // Get total users count for pagination
    static getTotalUsersCount(callback) {
        const query = 'SELECT COUNT(*) as total FROM users';
        db.query(query, callback);
    }

    // Get rankings by category
    static getCategoryRankings(category, limit, offset, callback) {
        let query = '';
        const params = [limit, offset];

        switch (category) {
            case 'vulnerabilities':
                query = `
                    SELECT 
                        u.id,
                        u.username,
                        u.level,
                        u.current_title,
                        u.avatar_url,
                        COUNT(DISTINCT v.id) as vulnerabilities_reported,
                        COUNT(DISTINCT vr.id) as vulnerabilities_resolved,
                        (COUNT(DISTINCT v.id) + COUNT(DISTINCT vr.id) * 2) as score
                    FROM users u
                    LEFT JOIN vulnerabilities v ON u.id = v.reporter_id
                    LEFT JOIN vulnerabilities vr ON u.id = vr.resolver_id AND vr.status = 'resolved'
                    WHERE v.id IS NOT NULL OR vr.id IS NOT NULL
                    GROUP BY u.id, u.username, u.level, u.current_title, u.avatar_url
                    ORDER BY score DESC, u.level DESC
                    LIMIT ? OFFSET ?
                `;
                break;

            case 'quests':
                query = `
                    SELECT 
                        u.id,
                        u.username,
                        u.level,
                        u.current_title,
                        u.avatar_url,
                        COUNT(DISTINCT uq.id) as quests_completed,
                        SUM(uq.damage_dealt) as total_damage,
                        COUNT(DISTINCT uq.id) as score
                    FROM users u
                    INNER JOIN user_quests uq ON u.id = uq.user_id
                    GROUP BY u.id, u.username, u.level, u.current_title, u.avatar_url
                    ORDER BY score DESC, total_damage DESC
                    LIMIT ? OFFSET ?
                `;
                break;

            case 'achievements':
                query = `
                    SELECT 
                        u.id,
                        u.username,
                        u.level,
                        u.current_title,
                        u.avatar_url,
                        COUNT(DISTINCT ua.id) as achievements_unlocked,
                        COUNT(DISTINCT ua.id) as score
                    FROM users u
                    INNER JOIN user_achievements ua ON u.id = ua.user_id
                    GROUP BY u.id, u.username, u.level, u.current_title, u.avatar_url
                    ORDER BY score DESC, u.level DESC
                    LIMIT ? OFFSET ?
                `;
                break;

            default:
                return callback(new Error('Invalid category'), null);
        }

        db.query(query, params, callback);
    }

    // Get category count for pagination
    static getCategoryCount(category, callback) {
        let query = '';

        switch (category) {
            case 'vulnerabilities':
                query = `
                    SELECT COUNT(DISTINCT u.id) as total
                    FROM users u
                    LEFT JOIN vulnerabilities v ON u.id = v.reporter_id
                    LEFT JOIN vulnerabilities vr ON u.id = vr.resolver_id AND vr.status = 'resolved'
                    WHERE v.id IS NOT NULL OR vr.id IS NOT NULL
                `;
                break;

            case 'quests':
                query = `
                    SELECT COUNT(DISTINCT u.id) as total
                    FROM users u
                    INNER JOIN user_quests uq ON u.id = uq.user_id
                `;
                break;

            case 'achievements':
                query = `
                    SELECT COUNT(DISTINCT u.id) as total
                    FROM users u
                    INNER JOIN user_achievements ua ON u.id = ua.user_id
                `;
                break;

            default:
                return callback(new Error('Invalid category'), null);
        }

        db.query(query, callback);
    }

    // Get user's rank in overall rankings
    static getUserRank(userId, callback) {
        const query = `
            SELECT 
                rank_table.user_rank,
                total_users.total as total_users
            FROM (
                SELECT 
                    u.id,
                    ROW_NUMBER() OVER (ORDER BY (u.level * 1000 + u.exp) DESC) as user_rank
                FROM users u
            ) rank_table,
            (SELECT COUNT(*) as total FROM users) total_users
            WHERE rank_table.id = ?
        `;
        db.query(query, [userId], callback);
    }
}

module.exports = RankingModel;