// Test server endpoints
const http = require('http');

// Test if server is running
console.log('Testing server endpoints...\n');

// Test basic connection
const testEndpoints = [
    { path: '/test', method: 'GET' },
    { path: '/api/auth/register', method: 'POST', body: { username: 'test', email: 'test@test.com', password: 'test123' } }
];

testEndpoints.forEach(endpoint => {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: endpoint.path,
        method: endpoint.method,
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
            console.log(`${endpoint.method} ${endpoint.path}:`);
            console.log(`Status: ${res.statusCode}`);
            console.log(`Response: ${data}\n`);
        });
    });

    req.on('error', (error) => {
        console.error(`Error testing ${endpoint.path}:`, error.message);
    });

    if (endpoint.body) {
        req.write(JSON.stringify(endpoint.body));
    }
    
    req.end();
});