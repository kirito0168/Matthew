const QuestModel = require('../models/questModel');
const UserModel = require('../models/userModel');
const ActivityLogModel = require('../models/activityLogModel');
const { addExperience, checkAchievements } = require('./userController');

// Get all quests
const getQuests = (req, res) => {
    const { difficulty, isActive = true } = req.query;
    const userId = req.userId || 0;

    QuestModel.getAll(userId, isActive === 'true', difficulty, (error, quests) => {
        if (error) {
            console.error('Get quests error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            quests
        });
    });
};

// Get single quest
const getQuest = (req, res) => {
    const { id } = req.params;
    const userId = req.userId || 0;

    QuestModel.findById(id, userId, (error, quests) => {
        if (error) {
            console.error('Get quest error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        if (quests.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Quest not found' 
            });
        }

        // Get recent clears
        QuestModel.getRecentClears(id, 10, (clearsError, recentClears) => {
            if (clearsError) {
                console.error('Get recent clears error:', clearsError);
                recentClears = [];
            }

            res.json({
                success: true,
                quest: {
                    ...quests[0],
                    recentClears
                }
            });
        });
    });
};

// Attempt quest (battle simulation)
const attemptQuest = (req, res) => {
    const { id } = req.params;
    const { action } = req.body;

    if (!action || !['attack', 'defend', 'skill'].includes(action)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid action' 
        });
    }

    // Check if quest exists
    QuestModel.findActiveById(id, (error, quests) => {
        if (error) {
            console.error('Check quest error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        if (quests.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Quest not found or inactive' 
            });
        }

        const quest = quests[0];

        // Check if already completed
        QuestModel.checkUserCompletion(req.userId, id, (checkError, existing) => {
            if (checkError) {
                console.error('Check completion error:', checkError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            if (existing.length > 0) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'You have already completed this quest' 
                });
            }

            // Get user data
            UserModel.findById(req.userId, (userError, users) => {
                if (userError || users.length === 0) {
                    console.error('Get user error:', userError);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Server error' 
                    });
                }

                const userLevel = users[0].level;

                // Simple battle simulation
                const battleResult = simulateBattle(userLevel, quest, action);

                if (battleResult.success) {
                    // Record quest completion
                    QuestModel.recordCompletion(req.userId, id, battleResult.damageDealt, (completeError) => {
                        if (completeError) {
                            console.error('Complete quest error:', completeError);
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Server error' 
                            });
                        }

                        // Add experience
                        addExperience(req.userId, quest.exp_reward, `Defeated ${quest.boss_name}`);

                        // Check for quest achievements
                        QuestModel.getUserQuestCount(req.userId, (countError, countResult) => {
                            if (!countError && countResult.length > 0) {
                                checkAchievements(req.userId, 'quests', countResult[0].total);
                            }
                        });

                        // Log activity
                        ActivityLogModel.create({
                            userId: req.userId,
                            actionType: 'quest_completed',
                            details: { 
                                questId: id,
                                bossName: quest.boss_name,
                                floor: quest.floor_number,
                                expReward: quest.exp_reward,
                                damageDealt: battleResult.damageDealt
                            }
                        }, (logError) => {
                            if (logError) {
                                console.error('Activity log error:', logError);
                            }
                        });
                    });
                }

                res.json({
                    success: battleResult.success,
                    message: battleResult.message,
                    battleLog: battleResult.log,
                    rewards: battleResult.success ? {
                        exp: quest.exp_reward,
                        damageDealt: battleResult.damageDealt
                    } : null
                });
            });
        });
    });
};

// Get user's quest history
const getUserQuestHistory = (req, res) => {
    const userId = req.params.userId || req.userId;

    QuestModel.getUserHistory(userId, 50, (error, quests) => {
        if (error) {
            console.error('Get quest history error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            quests
        });
    });
};

// Battle simulation function
function simulateBattle(userLevel, quest, action) {
    // Use health_points from your schema instead of boss_level
    const userPower = userLevel * 100;
    const bossPower = (quest.health_points || 1000) / 10; // Scale down health points for calculation
    
    let successRate = 0.5;
    let damageMultiplier = 1;
    
    // Adjust based on action
    switch(action) {
        case 'attack':
            successRate = 0.5 + (userPower - bossPower) / 1000;
            damageMultiplier = 1.2;
            break;
        case 'defend':
            successRate = 0.6 + (userPower - bossPower) / 1500;
            damageMultiplier = 0.8;
            break;
        case 'skill':
            successRate = 0.4 + (userPower - bossPower) / 800;
            damageMultiplier = 1.5;
            break;
    }
    
    // Cap success rate between 0.1 and 0.9
    successRate = Math.max(0.1, Math.min(0.9, successRate));
    
    const success = Math.random() < successRate;
    const damageDealt = Math.floor(userPower * damageMultiplier * (0.8 + Math.random() * 0.4));
    
    const log = [
        `You encounter ${quest.boss_name} on Floor ${quest.floor_number}!`,
        `You chose to ${action}!`,
        success 
            ? `Critical hit! You dealt ${damageDealt} damage and defeated the boss!`
            : `The boss countered your attack! You were defeated!`
    ];
    
    return {
        success,
        message: success ? 'Quest completed successfully!' : 'Quest failed. Try again!',
        damageDealt: success ? damageDealt : 0,
        log
    };
}

module.exports = {
    getQuests,
    getQuest,
    attemptQuest,
    getUserQuestHistory
};