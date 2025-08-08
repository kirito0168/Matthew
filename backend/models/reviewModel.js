const db = require('../services/db');

class ReviewModel {
    // Create new review
    static create(reviewData, callback) {
        const { userId, vulnerabilityId, rating, comment } = reviewData;
        const query = 'INSERT INTO reviews (user_id, vulnerability_id, rating, comment) VALUES (?, ?, ?, ?)';
        db.query(query, [userId, vulnerabilityId, rating, comment], callback);
    }

    // Check if user already reviewed vulnerability
    static checkExistingReview(userId, vulnerabilityId, callback) {
        const query = 'SELECT * FROM reviews WHERE user_id = ? AND vulnerability_id = ?';
        db.query(query, [userId, vulnerabilityId], callback);
    }

    // Get all reviews with pagination
    static getAll(limit, offset, callback) {
        const query = `
            SELECT 
                r.*,
                u.username,
                u.avatar_url,
                v.title as vulnerability_title
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `;
        db.query(query, [limit, offset], callback);
    }

    // Get review by ID
    static findById(reviewId, callback) {
        const query = `
            SELECT 
                r.*,
                u.username,
                u.avatar_url,
                v.title as vulnerability_title
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
            WHERE r.id = ?
        `;
        db.query(query, [reviewId], callback);
    }

    // Update review
    static update(reviewId, userId, updateData, callback) {
        const { rating, comment } = updateData;
        const query = 'UPDATE reviews SET rating = ?, comment = ? WHERE id = ? AND user_id = ?';
        db.query(query, [rating, comment, reviewId, userId], callback);
    }

    // Delete review
    static delete(reviewId, userId, callback) {
        const query = 'DELETE FROM reviews WHERE id = ? AND user_id = ?';
        db.query(query, [reviewId, userId], callback);
    }

    // Get user's reviews
    static getUserReviews(userId, callback) {
        const query = `
            SELECT 
                r.*,
                v.title as vulnerability_title
            FROM reviews r
            LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `;
        db.query(query, [userId], callback);
    }

    // Get user review count
    static getUserReviewCount(userId, callback) {
        const query = 'SELECT COUNT(*) as total FROM reviews WHERE user_id = ?';
        db.query(query, [userId], callback);
    }

    // Get reviews for vulnerability
    static getVulnerabilityReviews(vulnerabilityId, callback) {
        const query = `
            SELECT 
                r.*,
                u.username,
                u.avatar_url
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.vulnerability_id = ?
            ORDER BY r.created_at DESC
        `;
        db.query(query, [vulnerabilityId], callback);
    }
}

module.exports = ReviewModel;