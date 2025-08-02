require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vulnerabilityRoutes = require('./routes/vulnerabilityRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const questRoutes = require('./routes/questRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Catch all route - serve index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`SAO Bug Bounty System running on port ${PORT}`);
    console.log(`Access the application at http://localhost:${PORT}`);
});