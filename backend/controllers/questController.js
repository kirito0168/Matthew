const db = require('../config/database');
const { addExperience, checkAchievements } = require('./userController');

// Get all quests
const getQuests = (req, res) => {
    const { difficulty, isActive = true } = req.query;
    const userId = req.userId || 0;

    let query = `
        SELECT 
            q.*,
            COUNT(DISTINCT uq.user_id) as total_clears,
            (SELECT COUNT(*) FROM user_quests WHERE quest_id = q.id AND user_id = ?) as user_completed
        FROM quests q
        LEFT JOIN user_quests uq ON q.id = uq.quest_id
        WHERE q.is_active = ?
    `;
    const params = [userId, isActive === 'true'];

    if (difficulty) {
        query += ' AND q.difficulty = ?';
        params.push(difficulty);
    }

    query += ' GROUP BY q.id ORDER BY q.floor_number';

    db.query(query, params, (error, quests) => {
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

    db.query(`
        SELECT 
            q.*,
            COUNT(DISTINCT uq.user_id) as total_clears,
            (SELECT COUNT(*) FROM user_quests WHERE quest_id = q.id AND user_id = ?) as user_completed
        FROM quests q
        LEFT JOIN user_quests uq ON q.id = uq.quest_id
        WHERE q.id = ?
        GROUP BY q.id
    `, [userId, id], (error, quests) => {
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
        db.query(`
            SELECT 
                u.username,
                u.level,
                uq.completed_at,
                uq.damage_dealt
            FROM user_quests uq
            JOIN users u ON uq.user_id = u.id
            WHERE uq.quest_id = ?
            ORDER BY uq.completed_at DESC
            LIMIT 10
        `, [id], (clearsError, recentClears) => {
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
    const { action } = req.body; // 'attack', 'defend', 'skill'

    if (!action || !['attack', 'defend', 'skill'].includes(action)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid action' 
        });
    }

    // Check if quest exists
    db.query(
        'SELECT * FROM quests WHERE id = ? AND is_active = true',
        [id],
        (error, quests) => {
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
            db.query(
                'SELECT * FROM user_quests WHERE user_id = ? AND quest_id = ?',
                [req.userId, id],
                (checkError, existing) => {
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
                    db.query(
                        'SELECT level FROM users WHERE id = ?',
                        [req.userId],
                        (userError, users) => {
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
                                db.query(
                                    'INSERT INTO user_quests (user_id, quest_id, damage_dealt) VALUES (?, ?, ?)',
                                    [req.userId, id, battleResult.damageDealt],
                                    (completeError) => {
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
                                        db.query(
                                            'SELECT COUNT(*) as total FROM user_quests WHERE user_id = ?',
                                            [req.userId],
                                            (countError, countResult) => {
                                                if (!countError && countResult.length > 0) {
                                                    checkAchievements(req.userId, 'quests_completed', countResult[0].total);
                                                }
                                            }
                                        );

                                        // Log activity
                                        db.query(
                                            'INSERT INTO activity_logs (user_id, action_type, details) VALUES (?, ?, ?)',
                                            [req.userId, 'quest_completed', JSON.stringify({ 
                                                questId: id,
                                                bossName: quest.boss_name,
                                                floor: quest.floor_number,
                                                expReward: quest.exp_reward,
                                                damageDealt: battleResult.damageDealt
                                            })],
                                            (logError) => {
                                                if (logError) {
                                                    console.error('Activity log error:', logError);
                                                }
                                            }
                                        );
                                    }
                                );
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
                        }
                    );
                }
            );
        }
    );
};

// Get user's quest history
const getUserQuestHistory = (req, res) => {
    const userId = req.params.userId || req.userId;

    db.query(`
        SELECT 
            q.*,
            uq.completed_at,
            uq.damage_dealt
        FROM user_quests uq
        JOIN quests q ON uq.quest_id = q.id
        WHERE uq.user_id = ?
        ORDER BY uq.completed_at DESC
    `, [userId], (error, questHistory) => {
        if (error) {
            console.error('Get quest history error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            questHistory
        });
    });
};

// Simulate battle logic
function simulateBattle(userLevel, quest, action) {
    const battleLog = [];
    let playerHP = 100 + (userLevel * 10);
    let bossHP = quest.health_points;
    let turn = 1;
    let totalDamage = 0;

    battleLog.push(`Battle started against ${quest.boss_name}!`);
    battleLog.push(`Player HP: ${playerHP} | Boss HP: ${bossHP}`);

    // Difficulty multipliers
    const difficultyMultipliers = {
        easy: 0.7,
        medium: 1,
        hard: 1.5,
        nightmare: 2
    };

    const bossDamageMultiplier = difficultyMultipliers[quest.difficulty];

    while (playerHP > 0 && bossHP > 0 && turn <= 20) {
        // Player turn
        let playerDamage = Math.floor(Math.random() * 20) + 10 + (userLevel * 2);
        
        if (action === 'skill' && Math.random() > 0.3) {
            playerDamage *= 2;
            battleLog.push(`Turn ${turn}: Critical hit! You dealt ${playerDamage} damage!`);
        } else if (action === 'attack') {
            battleLog.push(`Turn ${turn}: You dealt ${playerDamage} damage!`);
        } else if (action === 'defend') {
            playerDamage *= 0.5;
            battleLog.push(`Turn ${turn}: Defensive stance! You dealt ${Math.floor(playerDamage)} damage!`);
        }

        bossHP -= playerDamage;
        totalDamage += playerDamage;

        if (bossHP <= 0) {
            battleLog.push(`Victory! ${quest.boss_name} has been defeated!`);
            break;
        }

        // Boss turn
        let bossDamage = Math.floor(Math.random() * 15 + 5) * bossDamageMultiplier;
        
        if (action === 'defend') {
            bossDamage *= 0.5;
        }

        playerHP -= bossDamage;
        battleLog.push(`${quest.boss_name} dealt ${Math.floor(bossDamage)} damage! Your HP: ${Math.floor(playerHP)}`);

        if (playerHP <= 0) {
            battleLog.push(`Defeat! You were defeated by ${quest.boss_name}!`);
            break;
        }

        turn++;
    }

    return {
        success: bossHP <= 0,
        message: bossHP <= 0 ? 'Quest completed successfully!' : 'Quest failed. Try again!',
        damageDealt: totalDamage,
        log: battleLog
    };
}

module.exports = {
    getQuests,
    getQuest,
    attemptQuest,
    getUserQuestHistory
};