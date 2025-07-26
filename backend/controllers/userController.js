const db = require('../config/database');

// Get user profile
const getProfile = (req, res) => {
    const userId = req.params.id || req.userId;

    db.query(`
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
    `, [userId], (error, users) => {
        if (error) {
            console.error('Get profile error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Get user achievements
        db.query(`
            SELECT a.*, ua.unlocked_at
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = ?
            ORDER BY ua.unlocked_at DESC
        `, [userId], (achievementError, achievements) => {
            if (achievementError) {
                console.error('Get achievements error:', achievementError);
                achievements = [];
            }

            // Get recent activity
            db.query(`
                SELECT * FROM activity_logs
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 10
            `, [userId], (activityError, activities) => {
                if (activityError) {
                    console.error('Get activities error:', activityError);
                    activities = [];
                }

                res.json({
                    success: true,
                    profile: {
                        ...users[0],
                        achievements,
                        recentActivities: activities,
                        nextLevelExp: calculateNextLevelExp(users[0].level)
                    }
                });
            });
        });
    });
};

// Update user title
const updateTitle = (req, res) => {
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ 
            success: false, 
            message: 'Title is required' 
        });
    }

    // Verify user owns this title
    db.query(`
        SELECT a.name FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ? AND a.name = ?
    `, [req.userId, title], (error, achievements) => {
        if (error) {
            console.error('Check title error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        if (achievements.length === 0 && title !== 'Novice Player') {
            return res.status(403).json({ 
                success: false, 
                message: 'You have not unlocked this title' 
            });
        }

        db.query(
            'UPDATE users SET current_title = ? WHERE id = ?',
            [title, req.userId],
            (updateError) => {
                if (updateError) {
                    console.error('Update title error:', updateError);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Server error' 
                    });
                }

                res.json({
                    success: true,
                    message: 'Title updated successfully'
                });
            }
        );
    });
};

// Get user's unlocked titles
const getUnlockedTitles = (req, res) => {
    db.query(`
        SELECT a.name as title, a.description, ua.unlocked_at
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ?
        ORDER BY ua.unlocked_at DESC
    `, [req.userId], (error, titles) => {
        if (error) {
            console.error('Get titles error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        // Add default title
        titles.unshift({
            title: 'Novice Player',
            description: 'Default title for all players',
            unlocked_at: null
        });

        res.json({
            success: true,
            titles
        });
    });
};

// Helper function to calculate exp needed for next level
function calculateNextLevelExp(currentLevel) {
    return currentLevel * 1000; // Simple formula: level * 1000
}

// Add experience to user
const addExperience = (userId, expAmount, reason) => {
    // Get current user data
    db.query(
        'SELECT level, exp FROM users WHERE id = ?',
        [userId],
        (error, users) => {
            if (error || users.length === 0) {
                console.error('Get user error:', error);
                return;
            }

            const currentUser = users[0];
            let newExp = currentUser.exp + expAmount;
            let newLevel = currentUser.level;
            let leveledUp = false;

            // Check for level up
            while (newExp >= calculateNextLevelExp(newLevel)) {
                newExp -= calculateNextLevelExp(newLevel);
                newLevel++;
                leveledUp = true;
            }

            // Update user
            db.query(
                'UPDATE users SET exp = ?, level = ? WHERE id = ?',
                [newExp, newLevel, userId],
                (updateError) => {
                    if (updateError) {
                        console.error('Update user exp error:', updateError);
                        return;
                    }

                    // Log level up if it happened
                    if (leveledUp) {
                        db.query(
                            'INSERT INTO activity_logs (user_id, action_type, details) VALUES (?, ?, ?)',
                            [userId, 'level_up', JSON.stringify({ 
                                oldLevel: currentUser.level, 
                                newLevel: newLevel,
                                reason: reason 
                            })],
                            (logError) => {
                                if (logError) {
                                    console.error('Log level up error:', logError);
                                }
                            }
                        );

                        // Check for level-based achievements
                        checkAchievements(userId, 'level_reached', newLevel);
                    }
                }
            );
        }
    );
};

// Check and unlock achievements
const checkAchievements = (userId, type, value) => {
    // Get achievements that can be unlocked
    db.query(`
        SELECT a.* FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
        WHERE a.requirement_type = ? AND a.requirement_value <= ? AND ua.id IS NULL
    `, [userId, type, value], (error, achievements) => {
        if (error) {
            console.error('Check achievements error:', error);
            return;
        }

        achievements.forEach(achievement => {
            // Unlock achievement
            db.query(
                'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
                [userId, achievement.id],
                (insertError) => {
                    if (insertError) {
                        console.error('Unlock achievement error:', insertError);
                        return;
                    }

                    // Add exp reward
                    addExperience(userId, achievement.exp_reward, `Achievement: ${achievement.name}`);

                    // Log achievement unlock
                    db.query(
                        'INSERT INTO activity_logs (user_id, action_type, details) VALUES (?, ?, ?)',
                        [userId, 'achievement_unlocked', JSON.stringify({ 
                            achievementName: achievement.name,
                            expReward: achievement.exp_reward
                        })],
                        (logError) => {
                            if (logError) {
                                console.error('Log achievement error:', logError);
                            }
                        }
                    );
                }
            );
        });
    });
};

module.exports = {
    getProfile,
    updateTitle,
    getUnlockedTitles,
    addExperience,
    checkAchievements
};