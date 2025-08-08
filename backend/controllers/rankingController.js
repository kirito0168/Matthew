const RankingModel = require('../models/rankingModel');
const { validatePagination } = require('../utils/validation');

// Get overall rankings
const getOverallRankings = (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const validation = validatePagination(page, limit);
    
    if (!validation.isValid) {
        return res.status(400).json({ 
            success: false, 
            message: validation.message 
        });
    }

    const offset = (validation.page - 1) * validation.limit;

    // Get rankings
    RankingModel.getOverallRankings(validation.limit, offset, (error, rankings) => {
        if (error) {
            console.error('Get overall rankings error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        // Get total count for pagination
        RankingModel.getTotalUsersCount((countError, countResult) => {
            if (countError) {
                console.error('Get total users count error:', countError);
            }

            const totalCount = countResult && countResult.length > 0 ? countResult[0].total : 0;

            // Add rank numbers to rankings
            const rankedData = rankings.map((user, index) => ({
                ...user,
                rank: offset + index + 1
            }));

            res.json({
                success: true,
                rankings: rankedData,
                pagination: {
                    page: validation.page,
                    limit: validation.limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / validation.limit)
                }
            });
        });
    });
};

// Get category rankings
const getCategoryRankings = (req, res) => {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Validate category
    const validCategories = ['vulnerabilities', 'quests', 'achievements'];
    if (!validCategories.includes(category)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid category. Must be: vulnerabilities, quests, or achievements' 
        });
    }

    const validation = validatePagination(page, limit);
    
    if (!validation.isValid) {
        return res.status(400).json({ 
            success: false, 
            message: validation.message 
        });
    }

    const offset = (validation.page - 1) * validation.limit;

    RankingModel.getCategoryRankings(category, validation.limit, offset, (error, rankings) => {
        if (error) {
            console.error(`Get ${category} rankings error:`, error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        // Get total count for pagination
        RankingModel.getCategoryCount(category, (countError, countResult) => {
            if (countError) {
                console.error('Get category count error:', countError);
            }

            const totalCount = countResult && countResult.length > 0 ? countResult[0].total : 0;

            // Add rank numbers to rankings
            const rankedData = rankings.map((user, index) => ({
                ...user,
                rank: offset + index + 1
            }));

            res.json({
                success: true,
                category,
                rankings: rankedData,
                pagination: {
                    page: validation.page,
                    limit: validation.limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / validation.limit)
                }
            });
        });
    });
};

// Get user's rank
const getUserRank = (req, res) => {
    const userId = req.userId;

    RankingModel.getUserRank(userId, (error, rankData) => {
        if (error) {
            console.error('Get user rank error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        if (rankData.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User rank not found' 
            });
        }

        res.json({
            success: true,
            rank: rankData[0].user_rank,
            totalUsers: rankData[0].total_users
        });
    });
};

module.exports = {
    getOverallRankings,
    getCategoryRankings,
    getUserRank
};