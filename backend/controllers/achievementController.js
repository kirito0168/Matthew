const AchievementModel = require('../models/achievementModel');

// Get all achievements
const getAchievements = (req, res) => {
    AchievementModel.getAll((error, achievements) => {
        if (error) {
            console.error('Get achievements error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            achievements
        });
    });
};

// Get user's achievements
const getUserAchievements = (req, res) => {
    const userId = req.params.userId || req.userId || 0;

    AchievementModel.getUserAchievements(userId, (error, achievements) => {
        if (error) {
            console.error('Get user achievements error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            achievements
        });
    });
};

// Get achievement progress
const getAchievementProgress = (req, res) => {
    const userId = req.userId;

    AchievementModel.getUserProgress(userId, (error, progress) => {
        if (error) {
            console.error('Get achievement progress error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        // Get all achievements to show progress
        AchievementModel.getUserAchievements(userId, (achError, achievements) => {
            if (achError) {
                console.error('Get achievements for progress error:', achError);
                achievements = [];
            }

            // Calculate progress for each achievement
            const achievementProgress = achievements.map(achievement => {
                let currentValue = 0;
                let progressPercentage = 0;

                switch (achievement.requirement_type) {
                    case 'vulnerabilities_reported':
                        currentValue = progress.vulnerabilities_reported || 0;
                        break;
                    case 'vulnerabilities_resolved':
                        currentValue = progress.vulnerabilities_resolved || 0;
                        break;
                    case 'quests_completed':
                        currentValue = progress.quests_completed || 0;
                        break;
                    case 'level_reached':
                        currentValue = progress.level_reached || 1;
                        break;
                    case 'reviews_given':
                        currentValue = progress.reviews_given || 0;
                        break;
                }

                if (achievement.unlocked_at) {
                    progressPercentage = 100;
                } else {
                    progressPercentage = Math.min(100, (currentValue / achievement.requirement_value) * 100);
                }

                return {
                    ...achievement,
                    current_value: currentValue,
                    progress_percentage: Math.floor(progressPercentage)
                };
            });

            res.json({
                success: true,
                progress: achievementProgress,
                stats: progress
            });
        });
    });
};

module.exports = {
    getAchievements,
    getUserAchievements,
    getAchievementProgress
};