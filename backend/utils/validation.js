// Validation utility functions

// Validate email format
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate username (alphanumeric and underscore, 3-20 characters)
const validateUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};

// Validate password (minimum 6 characters)
const validatePassword = (password) => {
    return password && password.length >= 6;
};

// Validate vulnerability severity
const validateSeverity = (severity) => {
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    return validSeverities.includes(severity);
};

// Validate vulnerability status
const validateStatus = (status) => {
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    return validStatuses.includes(status);
};

// Validate rating (1-5)
const validateRating = (rating) => {
    return rating && rating >= 1 && rating <= 5;
};

// Validate quest difficulty
const validateDifficulty = (difficulty) => {
    const validDifficulties = ['easy', 'medium', 'hard', 'nightmare'];
    return validDifficulties.includes(difficulty);
};

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

// Validate required fields
const validateRequired = (fields) => {
    for (const [key, value] of Object.entries(fields)) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            return { isValid: false, field: key };
        }
    }
    return { isValid: true };
};

// Validate pagination parameters
const validatePagination = (page, limit) => {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    
    return {
        page: Math.max(1, pageNum),
        limit: Math.min(100, Math.max(1, limitNum))
    };
};

module.exports = {
    validateEmail,
    validateUsername,
    validatePassword,
    validateSeverity,
    validateStatus,
    validateRating,
    validateDifficulty,
    sanitizeInput,
    validateRequired,
    validatePagination
};