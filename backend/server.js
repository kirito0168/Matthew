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

// Stats endpoint for home page
app.get('/api/stats', async (req, res) => {
    try {
        const db = require('./config/db');
        
        // Get total players
        db.query('SELECT COUNT(*) as count FROM users', (err1, players) => {
            if (err1) {
                console.error('Error getting player count:', err1);
                players = [{ count: 0 }];
            }
            
            // Get total bugs
            db.query('SELECT COUNT(*) as count FROM vulnerabilities', (err2, bugs) => {
                if (err2) {
                    console.error('Error getting bug count:', err2);
                    bugs = [{ count: 0 }];
                }
                
                // Get total quests
                db.query('SELECT COUNT(*) as count FROM quests WHERE is_active = true', (err3, quests) => {
                    if (err3) {
                        console.error('Error getting quest count:', err3);
                        quests = [{ count: 0 }];
                    }
                    
                    res.json({
                        success: true,
                        stats: {
                            totalPlayers: players[0].count,
                            totalBugs: bugs[0].count,
                            totalQuests: quests[0].count
                        }
                    });
                });
            });
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.json({
            success: true,
            stats: {
                totalPlayers: 0,
                totalBugs: 0,
                totalQuests: 0
            }
        });
    }
});

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

// Specific routes for HTML files
app.get('/quests', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/quests.html'));
});

app.get('/reviews', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/reviews.html'));
});

// Catch all route - serve index.html for client-side routing
app.get('*', (req, res) => {
    // Check if the request is for a specific HTML file
    const requestPath = req.path;
    const htmlFile = requestPath.endsWith('.html') ? requestPath : `${requestPath}.html`;
    const filePath = path.join(__dirname, '../public', htmlFile);
    
    // Check if the file exists
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`SAO Bug Bounty System running on port ${PORT}`);
    console.log(`Access the application at http://localhost:${PORT}`);
});