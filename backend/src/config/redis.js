const Redis = require('ioredis');
const { redis: redisConfig } = require('./env');

const connection = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  maxRetriesPerRequest: null,
});

module.exports = connection;
