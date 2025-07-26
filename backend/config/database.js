const pool = require('../services/db');

// Promisify for async/await - but use the regular pool for consistency
const promisePool = pool.promise();

module.exports = pool;