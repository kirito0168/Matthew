const db = require('../config/database');
const { checkAchievements } = require('./userController');
const { validateRating, sanitizeInput, validatePagination } = require('../utils/validation');

// Create review
const createReview = (req, res) => {
    const { vulnerabilityId, rating, comment } = req.body;

    // Validate rating
    if (!validateRating(rating)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Rating must be between 1 and 5' 
        });
    }

    // Sanitize comment if provided
    const sanitizedComment = comment ? sanitizeInput(comment) : null;

    // Check if user already reviewed this vulnerability
    db.query(
        'SELECT id FROM reviews WHERE user_id = ? AND vulnerability_id = ?',
        [req.userId, vulnerabilityId || null],
        (error, existing) => {
            if (error) {
                console.error('Check review error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            if (existing.length > 0) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'You have already reviewed this' 
                });
            }

            db.query(
                'INSERT INTO reviews (user_id, vulnerability_id, rating, comment) VALUES (?, ?, ?, ?)',
                [req.userId, vulnerabilityId || null, rating, sanitizedComment],
                (insertError, result) => {
                    if (insertError) {
                        console.error('Create review error:', insertError);
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Server error' 
                        });
                    }

                    // Check for review achievements
                    db.query(
                        'SELECT COUNT(*) as total FROM reviews WHERE user_id = ?',
                        [req.userId],
                        (countError, countResult) => {
                            if (!countError && countResult.length > 0) {
                                checkAchievements(req.userId, 'reviews_given', countResult[0].total);
                            }
                        }
                    );

                    // Log activity
                    db.query(
                        'INSERT INTO activity_logs (user_id, action_type, details) VALUES (?, ?, ?)',
                        [req.userId, 'review_posted', JSON.stringify({ 
                            reviewId: result.insertId,
                            rating,
                            vulnerabilityId
                        })],
                        (logError) => {
                            if (logError) {
                                console.error('Activity log error:', logError);
                            }
                        }
                    );

                    res.status(201).json({
                        success: true,
                        message: 'Review posted successfully',
                        reviewId: result.insertId
                    });
                }
            );
        }
    );
};

// Get all reviews
const getReviews = (req, res) => {
    const { vulnerabilityId, page = 1, limit = 10 } = req.query;
    
    // Validate pagination
    const { page: validPage, limit: validLimit } = validatePagination(page, limit);
    const offset = (validPage - 1) * validLimit;

    let query = `
        SELECT 
            r.*,
            u.username,
            u.avatar_url,
            u.level,
            v.title as vulnerability_title
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
        WHERE 1=1
    `;
    const params = [];

    if (vulnerabilityId) {
        query += ' AND r.vulnerability_id = ?';
        params.push(vulnerabilityId);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(validLimit, offset);

    db.query(query, params, (error, reviews) => {
        if (error) {
            console.error('Get reviews error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE 1=1';
        const countParams = [];

        if (vulnerabilityId) {
            countQuery += ' AND vulnerability_id = ?';
            countParams.push(vulnerabilityId);
        }

        db.query(countQuery, countParams, (countError, countResult) => {
            if (countError) {
                console.error('Count error:', countError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            // Calculate average rating
            let avgQuery = 'SELECT AVG(rating) as average FROM reviews WHERE 1=1';
            const avgParams = [];

            if (vulnerabilityId) {
                avgQuery += ' AND vulnerability_id = ?';
                avgParams.push(vulnerabilityId);
            }

            db.query(avgQuery, avgParams, (avgError, avgResult) => {
                if (avgError) {
                    console.error('Average error:', avgError);
                    avgResult = [{ average: 0 }];
                }

                res.json({
                    success: true,
                    reviews,
                    averageRating: avgResult[0].average || 0,
                    pagination: {
                        total: countResult[0].total,
                        page: validPage,
                        totalPages: Math.ceil(countResult[0].total / validLimit)
                    }
                });
            });
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
            message: 'Rating must be between 1 and 5' 
        });
    }

    // Sanitize comment if provided
    const sanitizedComment = comment ? sanitizeInput(comment) : comment;

    // Verify ownership
    db.query(
        'SELECT * FROM reviews WHERE id = ? AND user_id = ?',
        [id, req.userId],
        (error, reviews) => {
            if (error) {
                console.error('Check review error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            if (reviews.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Review not found or unauthorized' 
                });
            }

            db.query(
                'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
                [rating || reviews[0].rating, sanitizedComment !== undefined ? sanitizedComment : reviews[0].comment, id],
                (updateError) => {
                    if (updateError) {
                        console.error('Update review error:', updateError);
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Server error' 
                        });
                    }

                    res.json({
                        success: true,
                        message: 'Review updated successfully'
                    });
                }
            );
        }
    );
};

// Delete review
const deleteReview = (req, res) => {
    const { id } = req.params;

    // Verify ownership
    db.query(
        'SELECT * FROM reviews WHERE id = ? AND user_id = ?',
        [id, req.userId],
        (error, reviews) => {
            if (error) {
                console.error('Check review error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }

            if (reviews.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Review not found or unauthorized' 
                });
            }

            db.query('DELETE FROM reviews WHERE id = ?', [id], (deleteError) => {
                if (deleteError) {
                    console.error('Delete review error:', deleteError);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Server error' 
                    });
                }

                res.json({
                    success: true,
                    message: 'Review deleted successfully'
                });
            });
        }
    );
};

// Get user's reviews
const getUserReviews = (req, res) => {
    const userId = req.params.userId || req.userId;

    db.query(`
        SELECT 
            r.*,
            v.title as vulnerability_title
        FROM reviews r
        LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
    `, [userId], (error, reviews) => {
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