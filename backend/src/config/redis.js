const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const connection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

connection.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = connection;
