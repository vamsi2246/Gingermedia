const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

// Supports both local Redis and Upstash (TLS + password)
const isUpstash = process.env.REDIS_HOST && process.env.REDIS_HOST.includes('upstash.io');

const connection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: isUpstash ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

connection.on('error', (err) => {
    console.error('Redis connection error:', err.message);
});

connection.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

module.exports = connection;
