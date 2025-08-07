const ReviewModel = require('../models/reviewModel');
const UserModel = require('../models/userModel');
const { checkAchievements } = require('./userController');
const { validatePagination, sanitizeInput } = require('../utils/validation');

// Helper functions for validation
const validateRating = (rating) => {
    return rating >= 1 && rating <= 5;
};

// Create a new review
const createReview = (req, res) => {
    const { rating, comment, vulnerabilityId } = req.body;

    // Validate rating
    if (!rating || !validateRating(rating)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Valid rating (1-5) is required' 
        });
    }

    // Sanitize comment
    const sanitizedComment = comment ? sanitizeInput(comment) : null;

    // Check if user already reviewed this vulnerability (if vulnerabilityId provided)
    if (vulnerabilityId) {
        ReviewModel.checkExistingReview(req.userId, vulnerabilityId, (checkError, existingReviews) => {
            if (checkError) {
                console.error('Check existing review error:', checkError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            if (existingReviews.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'You have already reviewed this vulnerability' 
                });
            }

            insertReview();
        });
    } else {
        insertReview();
    }

    function insertReview() {
        ReviewModel.create({
            userId: req.userId,
            vulnerabilityId: vulnerabilityId || null,
            rating,
            comment: sanitizedComment
        }, (error, result) => {
            if (error) {
                console.error('Create review error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            // Update user stats
            UserModel.incrementReviewCount(req.userId, (updateError) => {
                if (updateError) {
                    console.error('Update user review count error:', updateError);
                }
            });

            // Check for review achievements
            ReviewModel.getUserReviewCount(req.userId, (countError, countResult) => {
                if (!countError && countResult.length > 0) {
                    checkAchievements(req.userId, 'reviews_given', countResult[0].total);
                }
            });

            res.status(201).json({
                success: true,
                message: 'Review created successfully',
                review: {
                    id: result.insertId,
                    rating,
                    comment: sanitizedComment,
                    vulnerability_id: vulnerabilityId
                }
            });
        });
    }
};

// Get all reviews
const getReviews = (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const validation = validatePagination(page, limit);
    
    if (!validation.isValid) {
        return res.status(400).json({ 
            success: false, 
            message: validation.message 
        });
    }

    const offset = (validation.page - 1) * validation.limit;

    ReviewModel.getAll(validation.limit, offset, (error, reviews) => {
        if (error) {
            console.error('Get reviews error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            reviews,
            pagination: {
                page: validation.page,
                limit: validation.limit
            }
        });
    });
};

// Update review
const updateReview = (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Validate rating if provided
    if (rating && !validateRating(rating)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Valid rating (1-5) is required' 
        });
    }

    const sanitizedComment = comment ? sanitizeInput(comment) : null;

    ReviewModel.update(id, req.userId, {
        rating,
        comment: sanitizedComment
    }, (error, result) => {
        if (error) {
            console.error('Update review error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Review not found or unauthorized' 
            });
        }

        res.json({
            success: true,
            message: 'Review updated successfully'
        });
    });
};

// Delete review
const deleteReview = (req, res) => {
    const { id } = req.params;

    ReviewModel.delete(id, req.userId, (error, result) => {
        if (error) {
            console.error('Delete review error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Review not found or unauthorized' 
            });
        }

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    });
};

// Get user's reviews
const getUserReviews = (req, res) => {
    const userId = req.params.userId || req.userId;

    ReviewModel.getUserReviews(userId, (error, reviews) => {
        if (error) {
            console.error('Get user reviews error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        res.json({
            success: true,
            reviews
        });
    });
};

module.exports = {
    createReview,
    getReviews,
    updateReview,
    deleteReview,
    getUserReviews
};