const UserModel = require('../models/userModel');
const AchievementModel = require('../models/achievementModel');
const ActivityLogModel = require('../models/activityLogModel');

// Get user profile
const getProfile = (req, res) => {
    const userId = req.params.id || req.userId;

    UserModel.getProfileWithStats(userId, (error, users) => {
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
        UserModel.getUserAchievements(userId, (achievementError, achievements) => {
            if (achievementError) {
                console.error('Get achievements error:', achievementError);
                achievements = [];
            }

            // Get recent activity
            UserModel.getUserActivityLogs(userId, 10, (activityError, activities) => {
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
    UserModel.verifyTitleOwnership(req.userId, title, (error, achievements) => {
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

        UserModel.updateTitle(req.userId, title, (updateError) => {
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
        });
    });
};

// Get user's unlocked titles
const getUnlockedTitles = (req, res) => {
    UserModel.getUnlockedTitles(req.userId, (error, titles) => {
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
    UserModel.findById(userId, (error, users) => {
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
        UserModel.updateExpAndLevel(userId, newExp, newLevel, (updateError) => {
            if (updateError) {
                console.error('Update user exp error:', updateError);
                return;
            }

            // Log level up if it happened
            if (leveledUp) {
                ActivityLogModel.create({
                    userId,
                    actionType: 'level_up',
                    details: { 
                        oldLevel: currentUser.level, 
                        newLevel: newLevel,
                        reason: reason 
                    }
                }, (logError) => {
                    if (logError) {
                        console.error('Log level up error:', logError);
                    }
                });

                // Check for level-based achievements
                checkAchievements(userId, 'level', newLevel);
            }
        });
    });
};

// Check and unlock achievements
const checkAchievements = (userId, type, value) => {
    // Get achievements that can be unlocked
    AchievementModel.getByRequirement(type, value, userId, (error, achievements) => {
        if (error) {
            console.error('Check achievements error:', error);
            return;
        }

        achievements.forEach(achievement => {
            // Unlock achievement
            AchievementModel.unlockForUser(userId, achievement.id, (insertError) => {
                if (insertError) {
                    console.error('Unlock achievement error:', insertError);
                    return;
                }

                // Add exp reward
                addExperience(userId, achievement.exp_reward, `Achievement: ${achievement.title}`);

                // Log achievement unlock
                ActivityLogModel.create({
                    userId,
                    actionType: 'achievement_unlocked',
                    details: { 
                        achievementName: achievement.title,
                        expReward: achievement.exp_reward
                    }
                }, (logError) => {
                    if (logError) {
                        console.error('Log achievement error:', logError);
                    }
                });
            });
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