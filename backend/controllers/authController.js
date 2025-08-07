const bcrypt = require('bcrypt');
const { generateToken } = require('../config/jwt');
const UserModel = require('../models/userModel');
const ActivityLogModel = require('../models/activityLogModel');
const { validateEmail, validateUsername, validatePassword, sanitizeInput } = require('../utils/validation');

// Register new user
const register = (req, res) => {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'All fields are required' 
        });
    }

    // Validate email format
    if (!validateEmail(email)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid email format' 
        });
    }

    // Validate username format
    if (!validateUsername(username)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
        });
    }

    // Validate password strength
    if (!validatePassword(password)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password must be at least 6 characters long' 
        });
    }

    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedEmail = sanitizeInput(email);

    // Check if user already exists
    UserModel.checkExists(sanitizedUsername, sanitizedEmail, (error, existingUsers) => {
        if (error) {
            console.error('Registration check error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error during registration' 
            });
        }

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Username or email already exists' 
            });
        }

        // Hash password
        bcrypt.hash(password, 10, (hashError, hashedPassword) => {
            if (hashError) {
                console.error('Password hash error:', hashError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error during registration' 
                });
            }

            // Create new user
            UserModel.create({
                username: sanitizedUsername,
                email: sanitizedEmail,
                hashedPassword
            }, (insertError, result) => {
                if (insertError) {
                    console.error('User insert error:', insertError);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Server error during registration' 
                    });
                }

                const userId = result.insertId;

                // Log activity
                ActivityLogModel.create({
                    userId,
                    actionType: 'level_up',
                    details: { level: 1, message: 'Welcome to SAO!' }
                }, (logError) => {
                    if (logError) {
                        console.error('Activity log error:', logError);
                    }
                });

                // Generate token
                const token = generateToken(userId);

                res.status(201).json({
                    success: true,
                    message: 'Registration successful',
                    token,
                    user: {
                        id: userId,
                        username: sanitizedUsername,
                        email: sanitizedEmail,
                        level: 1,
                        exp: 0,
                        current_title: 'Novice Player'
                    }
                });
            });
        });
    });
};

// Login user
const login = (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }

    // Sanitize username
    const sanitizedUsername = sanitizeInput(username);

    // Find user
    UserModel.findByUsernameOrEmail(sanitizedUsername, (error, users) => {
        if (error) {
            console.error('Login query error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error during login' 
            });
        }

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        const user = users[0];

        // Verify password
        bcrypt.compare(password, user.password, (compareError, validPassword) => {
            if (compareError) {
                console.error('Password compare error:', compareError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server error during login' 
                });
            }

            if (!validPassword) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid credentials' 
                });
            }

            // Generate token
            const token = generateToken(user.id);

            // Remove password from response
            delete user.password;

            res.json({
                success: true,
                message: 'Login successful',
                token,
                user
            });
        });
    });
};

// Verify token (for frontend auth check)
const verifyAuth = (req, res) => {
    UserModel.getUserForAuth(req.userId, (error, users) => {
        if (error) {
            console.error('Verify auth error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error' 
            });
        }

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            user: users[0]
        });
    });
};

module.exports = {
    register,
    login,
    verifyAuth
};