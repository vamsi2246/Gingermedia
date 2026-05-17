const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

let connection;

// Upstash provides a full REDIS_URL — support both formats
if (process.env.REDIS_URL) {
    // Full URL format: redis://default:password@host:port
    connection = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });
} else {
    // Separate host/port/password format (local dev)
    const isUpstash = process.env.REDIS_HOST && process.env.REDIS_HOST.includes('upstash.io');
    connection = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: isUpstash ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });
}

connection.on('error', (err) => {
    console.error('Redis connection error:', err.message);
});

connection.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

module.exports = connection;
