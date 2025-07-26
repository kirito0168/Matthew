const db = require('../config/database');

// Get all achievements
const getAchievements = (req, res) => {
    const userId = req.userId || 0;

    db.query(`
        SELECT 
            a.*,
            ua.unlocked_at,
            CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as is_unlocked
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
        ORDER BY a.requirement_value, a.requirement_type
    `, [userId], (error, achievements) => {
        if (error) {
            console.error('Get achievements error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        // Group by type
        const groupedAchievements = {};
        achievements.forEach(achievement => {
            if (!groupedAchievements[achievement.requirement_type]) {
                groupedAchievements[achievement.requirement_type] = [];
            }
            groupedAchievements[achievement.requirement_type].push(achievement);
        });

        res.json({
            success: true,
            achievements: groupedAchievements,
            total: achievements.length,
            unlocked: achievements.filter(a => a.is_unlocked).length
        });
    });
};

// Get user's achievements
const getUserAchievements = (req, res) => {
    const userId = req.params.userId || req.userId;

    db.query(`
        SELECT 
            a.*,
            ua.unlocked_at
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ?
        ORDER BY ua.unlocked_at DESC
    `, [userId], (error, achievements) => {
        if (error) {
            console.error('Get user achievements error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            achievements,
            total: achievements.length
        });
    });
};

// Get achievement progress
const getAchievementProgress = (req, res) => {
    const userId = req.userId;

    // Get vulnerabilities reported count
    db.query(
        'SELECT COUNT(*) as count FROM vulnerabilities WHERE reporter_id = ?',
        [userId],
        (error1, vulnReported) => {
            if (error1) {
                console.error('Count vulnerabilities reported error:', error1);
                vulnReported = [{ count: 0 }];
            }

            // Get vulnerabilities resolved count
            db.query(
                'SELECT COUNT(*) as count FROM vulnerabilities WHERE resolver_id = ? AND status = "resolved"',
                [userId],
                (error2, vulnResolved) => {
                    if (error2) {
                        console.error('Count vulnerabilities resolved error:', error2);
                        vulnResolved = [{ count: 0 }];
                    }

                    // Get quests completed count
                    db.query(
                        'SELECT COUNT(*) as count FROM user_quests WHERE user_id = ?',
                        [userId],
                        (error3, questsCompleted) => {
                            if (error3) {
                                console.error('Count quests completed error:', error3);
                                questsCompleted = [{ count: 0 }];
                            }

                            // Get user level
                            db.query(
                                'SELECT level FROM users WHERE id = ?',
                                [userId],
                                (error4, userLevel) => {
                                    if (error4) {
                                        console.error('Get user level error:', error4);
                                        userLevel = [{ level: 1 }];
                                    }

                                    // Get reviews given count
                                    db.query(
                                        'SELECT COUNT(*) as count FROM reviews WHERE user_id = ?',
                                        [userId],
                                        (error5, reviewsGiven) => {
                                            if (error5) {
                                                console.error('Count reviews given error:', error5);
                                                reviewsGiven = [{ count: 0 }];
                                            }

                                            const progress = {
                                                'vulnerabilities_reported': vulnReported[0].count,
                                                'vulnerabilities_resolved': vulnResolved[0].count,
                                                'quests_completed': questsCompleted[0].count,
                                                'level_reached': userLevel[0].level,
                                                'reviews_given': reviewsGiven[0].count
                                            };

                                            // Get all achievements with progress
                                            db.query(`
                                                SELECT 
                                                    a.*,
                                                    CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as is_unlocked
                                                FROM achievements a
                                                LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
                                                ORDER BY a.requirement_type, a.requirement_value
                                            `, [userId], (achievementError, achievements) => {
                                                if (achievementError) {
                                                    console.error('Get achievements error:', achievementError);
                                                    return res.status(500).json({ 
                                                        success: false, 
                                                        message: 'Server error' 
                                                    });
                                                }

                                                const achievementProgress = {};
                                                
                                                achievements.forEach(achievement => {
                                                    const type = achievement.requirement_type;
                                                    const currentValue = progress[type] || 0;
                                                    
                                                    if (!achievementProgress[type]) {
                                                        achievementProgress[type] = {
                                                            current: currentValue,
                                                            achievements: []
                                                        };
                                                    }
                                                    
                                                    achievementProgress[type].achievements.push({
                                                        ...achievement,
                                                        progress: Math.min(100, Math.floor((currentValue / achievement.requirement_value) * 100))
                                                    });
                                                });

                                                res.json({
                                                    success: true,
                                                    progress: achievementProgress
                                                });
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

module.exports = {
    getAchievements,
    getUserAchievements,
    getAchievementProgress
};