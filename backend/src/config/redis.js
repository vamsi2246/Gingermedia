const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Returns a new isolated ioredis connection.
 * BullMQ requires each component (Queue, Worker, QueueEvents) to have
 * its own independent connection — sharing one instance causes ECONNRESET.
 */
function createRedisConnection() {
    let conn;

    if (process.env.REDIS_URL) {
        conn = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        });
    } else {
        // Local dev: separate host/port
        conn = new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });
    }

    conn.on('error', (err) => {
        console.error('Redis connection error:', err.message);
    });

    conn.on('connect', () => {
        console.log('✅ Redis connected successfully');
    });

    return conn;
}

// Dedicated connection for health checks / direct pings
const healthConnection = createRedisConnection();

module.exports = { createRedisConnection, healthConnection };
