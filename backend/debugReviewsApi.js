// Debug Reviews API
// Run this file to test if the reviews API is working

const http = require('http');

console.log('Testing Reviews API endpoints...\n');

// Test 1: Get all reviews
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/reviews',
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
        console.log('GET /api/reviews:');
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}\n`);
        
        try {
            const parsed = JSON.parse(data);
            console.log('Reviews count:', parsed.reviews ? parsed.reviews.length : 0);
            console.log('Success:', parsed.success);
        } catch (e) {
            console.log('Failed to parse response as JSON');
        }
    });
});

req.on('error', (error) => {
    console.error('Error testing /api/reviews:', error.message);
    console.log('\nMake sure the server is running on port 3000');
});

req.end();