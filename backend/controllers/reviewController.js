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

    // Check if user already reviewed this vulnerability (if vulnerabilityId is provided)
    if (vulnerabilityId) {
        db.query(
            'SELECT id FROM reviews WHERE user_id = ? AND vulnerability_id = ?',
            [req.userId, vulnerabilityId],
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
                        message: 'You have already reviewed this vulnerability' 
                    });
                }

                insertReview();
            }
        );
    } else {
        insertReview();
    }

    function insertReview() {
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
};

// Get all reviews - SIMPLIFIED VERSION FOR DEBUGGING
const getReviews = (req, res) => {
    console.log('getReviews called with query:', req.query);
    
    const { vulnerabilityId, page = 1, limit = 10 } = req.query;
    
    // Validate pagination
    const validPage = parseInt(page) || 1;
    const validLimit = Math.min(parseInt(limit) || 10, 100);
    const offset = (validPage - 1) * validLimit;

    console.log('Pagination:', { validPage, validLimit, offset });

    // First, let's try a simple query to see if the database connection works
    db.query('SELECT COUNT(*) as count FROM reviews', (testError, testResult) => {
        if (testError) {
            console.error('Database connection test failed:', testError);
            return res.status(500).json({ 
                success: false, 
                message: 'Database connection error',
                error: testError.message 
            });
        }
        
        console.log('Database connection OK. Total reviews in database:', testResult[0].count);

        // Now try the main query
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

        console.log('Executing query:', query);
        console.log('With params:', params);

        db.query(query, params, (error, reviews) => {
            if (error) {
                console.error('Get reviews query error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error fetching reviews',
                    error: error.message 
                });
            }

            console.log('Reviews fetched:', reviews.length);

            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE 1=1';
            const countParams = [];

            if (vulnerabilityId) {
                countQuery += ' AND vulnerability_id = ?';
                countParams.push(vulnerabilityId);
            }

            db.query(countQuery, countParams, (countError, countResult) => {
                if (countError) {
                    console.error('Count query error:', countError);
                    // Don't fail the request, just set total to 0
                    countResult = [{ total: 0 }];
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
                        console.error('Average query error:', avgError);
                        avgResult = [{ average: 0 }];
                    }

                    const response = {
                        success: true,
                        reviews: reviews || [],
                        averageRating: avgResult[0].average || 0,
                        pagination: {
                            total: countResult[0].total || 0,
                            page: validPage,
                            totalPages: Math.ceil((countResult[0].total || 0) / validLimit),
                            limit: validLimit
                        }
                    };

                    console.log('Sending response:', JSON.stringify(response, null, 2));
                    res.json(response);
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
    if (rating !== undefined && !validateRating(rating)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Rating must be between 1 and 5' 
        });
    }

    // Sanitize comment if provided
    const sanitizedComment = comment !== undefined ? (comment ? sanitizeInput(comment) : null) : undefined;

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

            const updateFields = [];
            const updateValues = [];

            if (rating !== undefined) {
                updateFields.push('rating = ?');
                updateValues.push(rating);
            }

            if (sanitizedComment !== undefined) {
                updateFields.push('comment = ?');
                updateValues.push(sanitizedComment);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No fields to update' 
                });
            }

            updateValues.push(id);

            db.query(
                `UPDATE reviews SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues,
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