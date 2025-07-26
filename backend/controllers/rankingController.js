const db = require('../config/database');

// Get overall rankings
const getOverallRankings = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const query = `
            SELECT 
                u.id,
                u.username,
                u.level,
                u.exp,
                u.current_title,
                u.avatar_url,
                COUNT(DISTINCT v.id) as vulnerabilities_reported,
                COUNT(DISTINCT vr.id) as vulnerabilities_resolved,
                COUNT(DISTINCT uq.id) as quests_completed,
                COUNT(DISTINCT ua.id) as achievements_unlocked,
                (u.level * 1000 + u.exp) as total_score
            FROM users u
            LEFT JOIN vulnerabilities v ON u.id = v.reporter_id
            LEFT JOIN vulnerabilities vr ON u.id = vr.resolver_id AND vr.status = 'resolved'
            LEFT JOIN user_quests uq ON u.id = uq.user_id
            LEFT JOIN user_achievements ua ON u.id = ua.user_id
            GROUP BY u.id, u.username, u.level, u.exp, u.current_title, u.avatar_url
            ORDER BY total_score DESC, u.level DESC, u.exp DESC
            LIMIT ? OFFSET ?
        `;

        db.query(query, [parseInt(limit), parseInt(offset)], (error, rankings) => {
            if (error) {
                console.error('Get rankings error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            // Get total users count
            db.query('SELECT COUNT(*) as total FROM users', (error, countResult) => {
                if (error) {
                    console.error('Count error:', error);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Server error' 
                    });
                }

                // Add rank number
                rankings.forEach((user, index) => {
                    user.rank = offset + index + 1;
                });

                res.json({
                    success: true,
                    rankings,
                    pagination: {
                        total: countResult[0].total,
                        page: parseInt(page),
                        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
                    }
                });
            });
        });

    } catch (error) {
        console.error('Get rankings error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

// Get rankings by category
const getCategoryRankings = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = '';
        let countQuery = '';

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
                    GROUP BY u.id, u.username, u.level, u.current_title, u.avatar_url
                    HAVING score > 0
                    ORDER BY score DESC, u.level DESC
                    LIMIT ? OFFSET ?
                `;
                countQuery = `
                    SELECT COUNT(DISTINCT u.id) as total
                    FROM users u
                    LEFT JOIN vulnerabilities v ON u.id = v.reporter_id
                    LEFT JOIN vulnerabilities vr ON u.id = vr.resolver_id AND vr.status = 'resolved'
                    WHERE v.id IS NOT NULL OR vr.id IS NOT NULL
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
                countQuery = `
                    SELECT COUNT(DISTINCT user_id) as total FROM user_quests
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
                countQuery = `
                    SELECT COUNT(DISTINCT user_id) as total FROM user_achievements
                `;
                break;

            default:
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid category' 
                });
        }

        db.query(query, [parseInt(limit), parseInt(offset)], (error, rankings) => {
            if (error) {
                console.error('Get category rankings error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            db.query(countQuery, (error, countResult) => {
                if (error) {
                    console.error('Count error:', error);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Server error' 
                    });
                }

                // Add rank number
                rankings.forEach((user, index) => {
                    user.rank = offset + index + 1;
                });

                res.json({
                    success: true,
                    category,
                    rankings,
                    pagination: {
                        total: countResult[0].total,
                        page: parseInt(page),
                        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
                    }
                });
            });
        });

    } catch (error) {
        console.error('Get category rankings error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

// Get user's rank
const getUserRank = async (req, res) => {
    try {
        const userId = req.params.userId || req.userId;

        // Get user's overall rank
        const rankQuery = `
            SELECT COUNT(*) + 1 as rank
            FROM users u1
            WHERE (u1.level * 1000 + u1.exp) > (
                SELECT u2.level * 1000 + u2.exp
                FROM users u2
                WHERE u2.id = ?
            )
        `;

        db.query(rankQuery, [userId], (error, overallRank) => {
            if (error) {
                console.error('Get rank error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            // Get user stats
            const statsQuery = `
                SELECT 
                    u.id,
                    u.username,
                    u.level,
                    u.exp,
                    u.current_title,
                    u.avatar_url,
                    COUNT(DISTINCT v.id) as vulnerabilities_reported,
                    COUNT(DISTINCT vr.id) as vulnerabilities_resolved,
                    COUNT(DISTINCT uq.id) as quests_completed,
                    COUNT(DISTINCT ua.id) as achievements_unlocked
                FROM users u
                LEFT JOIN vulnerabilities v ON u.id = v.reporter_id
                LEFT JOIN vulnerabilities vr ON u.id = vr.resolver_id AND vr.status = 'resolved'
                LEFT JOIN user_quests uq ON u.id = uq.user_id
                LEFT JOIN user_achievements ua ON u.id = ua.user_id
                WHERE u.id = ?
                GROUP BY u.id, u.username, u.level, u.exp, u.current_title, u.avatar_url
            `;

            db.query(statsQuery, [userId], (error, userStats) => {
                if (error) {
                    console.error('Get user stats error:', error);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Server error' 
                    });
                }

                if (userStats.length === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'User not found' 
                    });
                }

                res.json({
                    success: true,
                    rank: overallRank[0].rank,
                    stats: userStats[0]
                });
            });
        });

    } catch (error) {
        console.error('Get user rank error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

module.exports = {
    getOverallRankings,
    getCategoryRankings,
    getUserRank
};