const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const { startLoggingStatistics } = require('./controllers/statistics-controller');
const redisClient = require('./utils/redis-client');

const coasterRoutes = require('./routes/coaster-routes');

const app = express();

const PORT = process.env.NODE_ENV === 'production' ? 3051 : 3050;

app.use(bodyParser.json());

app.use('/api/coasters', coasterRoutes);

const statisticsInterval = startLoggingStatistics();

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

function handleExit(signal) {
    clearInterval(statisticsInterval);
    logger.info(`Received ${signal}. Clearing interval and shutting down.`);
    redisClient.quit();
    process.exit(0);
}

process.once('SIGUSR2', () => {
    clearInterval(statisticsInterval);
    logger.info('Received SIGUSR2. Clearing interval for nodemon restart.');
    redisClient.quit();
    process.kill(process.pid, 'SIGUSR2');
});

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
