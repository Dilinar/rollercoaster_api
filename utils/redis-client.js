const { createClient } = require('redis');

const redisHost = process.env.REDIS_HOST || '172.17.0.1';
const redisPort = process.env.REDIS_PORT || 6380;
const redisClient = createClient({
    url: `redis://${redisHost}:${redisPort}`,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        connectTimeout: 10000, // 10 seconds
        keepAlive: 5000, // 5 seconds
    },
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

redisClient.on('ready', () => {
    console.log('Redis client ready');
});

redisClient.on('end', () => {
    console.log('Redis connection closed');
});

(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('Failed to connect to Redis', err);
    }
})();

module.exports = redisClient;
