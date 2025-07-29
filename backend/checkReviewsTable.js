// Check if reviews table exists and has data
const pool = require("./services/db");

console.log('Checking reviews table...\n');

// Check if table exists
pool.query("SHOW TABLES LIKE 'reviews'", (error, results) => {
    if (error) {
        console.error('Error checking table:', error);
        process.exit(1);
    }
    
    if (results.length === 0) {
        console.log('Reviews table does not exist!');
        console.log('Please run: node backend/initTables.js');
        process.exit(1);
    }
    
    console.log('✓ Reviews table exists');
    
    // Check table structure
    pool.query("DESCRIBE reviews", (error, results) => {
        if (error) {
            console.error('Error describing table:', error);
        } else {
            console.log('\nTable structure:');
            results.forEach(field => {
                console.log(`  ${field.Field} - ${field.Type} ${field.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
            });
        }
        
        // Check data
        pool.query("SELECT COUNT(*) as count FROM reviews", (error, results) => {
            if (error) {
                console.error('\nError counting reviews:', error);
            } else {
                console.log(`\nTotal reviews in database: ${results[0].count}`);
            }
            
            // Get sample reviews
            pool.query(`
                SELECT 
                    r.*, 
                    u.username 
                FROM reviews r 
                JOIN users u ON r.user_id = u.id 
                LIMIT 5
            `, (error, results) => {
                if (error) {
                    console.error('\nError fetching sample reviews:', error);
                } else {
                    console.log('\nSample reviews:');
                    results.forEach(review => {
                        console.log(`  - ${review.username}: ${review.rating} stars${review.comment ? ' - ' + review.comment.substring(0, 50) + '...' : ''}`);
                    });
                }
                
                process.exit(0);
            });
        });
    });
});