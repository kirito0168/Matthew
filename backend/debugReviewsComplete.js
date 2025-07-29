// Complete Debug Script for Reviews
// Save this as: backend/debugReviewsComplete.js

const pool = require("./services/db");
const http = require('http');

console.log('=== COMPLETE REVIEWS DEBUG ===\n');

// Step 1: Check database connection
console.log('1. Testing database connection...');
pool.query('SELECT 1', (error, results) => {
    if (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
    console.log('✓ Database connection successful\n');
    
    // Step 2: Check if reviews table exists
    console.log('2. Checking reviews table...');
    pool.query("SHOW TABLES LIKE 'reviews'", (error, results) => {
        if (error || results.length === 0) {
            console.error('❌ Reviews table does not exist!');
            console.log('Run: node backend/initTables.js');
            process.exit(1);
        }
        console.log('✓ Reviews table exists\n');
        
        // Step 3: Check table structure
        console.log('3. Checking table structure...');
        pool.query("DESCRIBE reviews", (error, results) => {
            if (error) {
                console.error('❌ Error describing table:', error);
                process.exit(1);
            }
            console.log('✓ Table structure:');
            results.forEach(field => {
                console.log(`  - ${field.Field}: ${field.Type}`);
            });
            console.log('');
            
            // Step 4: Check for data
            console.log('4. Checking for existing reviews...');
            pool.query("SELECT COUNT(*) as count FROM reviews", (error, results) => {
                if (error) {
                    console.error('❌ Error counting reviews:', error);
                    process.exit(1);
                }
                console.log(`✓ Total reviews in database: ${results[0].count}\n`);
                
                // Step 5: Try the exact query used in the controller
                console.log('5. Testing the controller query...');
                const query = `
                    SELECT 
                        r.*,
                        u.username,
                        u.avatar_url,
                        u.level,
                        v.title as vulnerability_title
                    FROM reviews r
                    JOIN users u ON r.user_id = u.id
                    LEFT JOIN vulnerabilities v ON r.vulnerability_id = v.id
                    ORDER BY r.created_at DESC 
                    LIMIT 10 OFFSET 0
                `;
                
                pool.query(query, (error, reviews) => {
                    if (error) {
                        console.error('❌ Controller query failed:', error);
                        console.error('SQL State:', error.sqlState);
                        console.error('SQL Message:', error.sqlMessage);
                        process.exit(1);
                    }
                    
                    console.log(`✓ Query successful, found ${reviews.length} reviews\n`);
                    
                    if (reviews.length > 0) {
                        console.log('Sample review:');
                        console.log(JSON.stringify(reviews[0], null, 2));
                    }
                    
                    // Step 6: Test the API endpoint
                    console.log('\n6. Testing API endpoint...');
                    testApiEndpoint();
                });
            });
        });
    });
});

function testApiEndpoint() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/reviews?page=1&limit=10',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`API Response Status: ${res.statusCode}`);
            
            try {
                const parsed = JSON.parse(data);
                console.log('✓ API Response:');
                console.log(`  - Success: ${parsed.success}`);
                console.log(`  - Reviews count: ${parsed.reviews ? parsed.reviews.length : 0}`);
                console.log(`  - Average rating: ${parsed.averageRating}`);
                
                if (parsed.error) {
                    console.error('❌ API Error:', parsed.error);
                }
                
                if (!parsed.success) {
                    console.error('❌ API returned success: false');
                    console.error('Message:', parsed.message);
                }
                
            } catch (e) {
                console.error('❌ Failed to parse API response as JSON');
                console.error('Raw response:', data);
            }
            
            console.log('\n=== DEBUG COMPLETE ===');
            process.exit(0);
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error calling API:', error.message);
        console.log('Make sure the server is running on port 3000');
        process.exit(1);
    });

    req.end();
}