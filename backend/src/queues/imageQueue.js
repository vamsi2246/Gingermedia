const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');

// Queue gets its own dedicated connection
const imageQueue = new Queue('image-processing', {
    connection: createRedisConnection()
});

module.exports = { imageQueue };
