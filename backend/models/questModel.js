const db = require('../services/db');

class QuestModel {
    // Get all quests with user completion status
    static getAll(userId, isActive, difficulty, callback) {
        let query = `
            SELECT 
                q.*,
                COUNT(DISTINCT uq.user_id) as total_clears,
                (SELECT COUNT(*) FROM user_quests WHERE quest_id = q.id AND user_id = ?) as user_completed
            FROM quests q
            LEFT JOIN user_quests uq ON q.id = uq.quest_id
            WHERE q.is_active = ?
        `;
        const params = [userId, isActive];

        if (difficulty) {
            query += ' AND q.difficulty = ?';
            params.push(difficulty);
        }

        query += ' GROUP BY q.id ORDER BY q.floor_number';
        db.query(query, params, callback);
    }

    // Get single quest by ID
    static findById(questId, userId, callback) {
        const query = `
            SELECT 
                q.*,
                COUNT(DISTINCT uq.user_id) as total_clears,
                (SELECT COUNT(*) FROM user_quests WHERE quest_id = q.id AND user_id = ?) as user_completed
            FROM quests q
            LEFT JOIN user_quests uq ON q.id = uq.quest_id
            WHERE q.id = ?
            GROUP BY q.id
        `;
        db.query(query, [userId, questId], callback);
    }

    // Get active quest by ID
    static findActiveById(questId, callback) {
        const query = 'SELECT * FROM quests WHERE id = ? AND is_active = true';
        db.query(query, [questId], callback);
    }

    // Get recent clears for a quest
    static getRecentClears(questId, limit = 10, callback) {
        const query = `
            SELECT 
                u.username,
                u.level,
                uq.completed_at,
                uq.damage_dealt
            FROM user_quests uq
            JOIN users u ON uq.user_id = u.id
            WHERE uq.quest_id = ?
            ORDER BY uq.completed_at DESC
            LIMIT ?
        `;
        db.query(query, [questId, limit], callback);
    }

    // Check if user completed quest
    static checkUserCompletion(userId, questId, callback) {
        const query = 'SELECT * FROM user_quests WHERE user_id = ? AND quest_id = ?';
        db.query(query, [userId, questId], callback);
    }

    // Record quest completion
    static recordCompletion(userId, questId, damageDealt, callback) {
        const query = 'INSERT INTO user_quests (user_id, quest_id, damage_dealt) VALUES (?, ?, ?)';
        db.query(query, [userId, questId, damageDealt], callback);
    }

    // Get user quest count
    static getUserQuestCount(userId, callback) {
        const query = 'SELECT COUNT(*) as total FROM user_quests WHERE user_id = ?';
        db.query(query, [userId], callback);
    }

    // Get user quest history
    static getUserHistory(userId, limit = 50, callback) {
        const query = `
            SELECT 
                q.*,
                uq.completed_at,
                uq.damage_dealt
            FROM user_quests uq
            JOIN quests q ON uq.quest_id = q.id
            WHERE uq.user_id = ?
            ORDER BY uq.completed_at DESC
            LIMIT ?
        `;
        db.query(query, [userId, limit], callback);
    }
}

module.exports = QuestModel;