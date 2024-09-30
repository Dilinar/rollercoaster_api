const redisClient = require('../utils/redis-client');
const logger = require('../utils/logger');

const previousState = {};

async function logStatistics() {
    try {
        const keys = await redisClient.keys('coaster:*');
        let totalCoasters = 0;

        for (const key of keys) {
            const data = await redisClient.get(key);
            const coaster = JSON.parse(data);
            const numberOfWagons = coaster.wagons ? coaster.wagons.length : 0;
            const numberOfPersonnel = coaster.personel ? coaster.personel.length : 0;

            let status = '';

            if (numberOfPersonnel < coaster.required_personnel) {
                status += `Shortage of ${coaster.required_personnel - numberOfPersonnel} employees`;
            } else if (numberOfPersonnel > coaster.required_personnel) {
                status += `Excess of ${numberOfPersonnel - coaster.required_personnel} employees`;
            }

            if (numberOfWagons < coaster.wagons_cap) {
                if (status) status += ', ';
                status += `lack of ${coaster.wagons_cap - numberOfWagons} wagons`;
            } else if (numberOfWagons > coaster.wagons_cap) {
                if (status) status += ', ';
                status += `excess of ${numberOfWagons - coaster.wagons_cap} wagons`;
            }

            if (!status) {
                status = 'ok';
            }

            const currentState = {
                numberOfPersonnel,
                numberOfWagons,
                status,
                customers: coaster.customers,
                hours_from: coaster.hours_from,
                hours_to: coaster.hours_to
            };

            totalCoasters++;

            if (JSON.stringify(previousState[key]) !== JSON.stringify(currentState)) {
                logger.info(`-----------------------------`);
                logger.info(`Coaster ID: ${key}`);
                logger.info(`Operating Hours: ${coaster.hours_from} - ${coaster.hours_to}`);
                logger.info(`Number of Personnel: ${numberOfPersonnel} / ${coaster.required_personnel}`);
                logger.info(`Number of Wagons: ${numberOfWagons} / ${coaster.wagons_cap}`);
                logger.info(`Number of Customers: ${coaster.customers}`);
                status === 'ok' ? logger.info(`Status: ${status}`) : logger.warn(`Status: ${status}`);
                logger.info(`-----------------------------\n`);
                logger.info(`Total Number of Coasters: ${totalCoasters}`);

                previousState[key] = currentState;
            }

        }

    } catch (error) {
        logger.error(`Error fetching statistics: ${error.message}`);
    }
}

function startLoggingStatistics(interval = 5000) {
    return setInterval(logStatistics, interval);
}

module.exports = {
    startLoggingStatistics
};
