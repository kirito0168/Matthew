//////////////////////////////////////////////////////
// INCLUDES
//////////////////////////////////////////////////////
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const vulnerabilityRoutes = require('../routes/vulnerabilityRoutes');
const reviewRoutes = require('../routes/reviewRoutes');
const questRoutes = require('../routes/questRoutes');
const rankingRoutes = require('../routes/rankingRoutes');
const achievementRoutes = require('../routes/achievementRoutes');
const reportRoutes = require('../routes/reportRoutes');

//////////////////////////////////////////////////////
// CREATE APP
//////////////////////////////////////////////////////
const app = express();

//////////////////////////////////////////////////////
// MIDDLEWARE
//////////////////////////////////////////////////////
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
// This needs to point to the correct path relative to where the server runs
app.use(express.static(path.join(__dirname, '../../public')));

// Log static file requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

//////////////////////////////////////////////////////
// API ROUTES
//////////////////////////////////////////////////////
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vulnerabilities', vulnerabilityRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/reports', reportRoutes);

// Contact endpoint (no auth required)
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    
    // In a real application, you would send this to an email service
    console.log('Contact form submission:', { name, email, message });
    
    res.json({
        success: true,
        message: 'Thank you for contacting us! We will get back to you soon.'
    });
});

//////////////////////////////////////////////////////
// ERROR HANDLING MIDDLEWARE
//////////////////////////////////////////////////////
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Catch all route - serve index.html for client-side routing
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../../public/index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
});

//////////////////////////////////////////////////////
// EXPORT APP
//////////////////////////////////////////////////////
module.exports = app;