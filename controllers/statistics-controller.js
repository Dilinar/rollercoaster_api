const redisClient = require('../utils/redis-client');
const logger = require('../utils/logger');

const previousState = {};

function calculateOperatingTime(hours_from, hours_to) {
    const [fromHours, fromMinutes] = hours_from.split(':').map(Number);
    const [toHours, toMinutes] = hours_to.split(':').map(Number);

    const fromDate = new Date();
    fromDate.setHours(fromHours, fromMinutes, 0, 0);

    const toDate = new Date();
    toDate.setHours(toHours, toMinutes, 0, 0);

    const differenceInMilliseconds = toDate - fromDate;
    const operatingTime = differenceInMilliseconds / (1000); // seconds

    return operatingTime;
}

async function logStatistics() {
    try {
        const keys = await redisClient.keys('coaster:*');
        let totalCoasters = 0;

        for (const key of keys) {
            const data = await redisClient.get(key);
            const coaster = JSON.parse(data);
            const numberOfWagons = coaster.wagons ? coaster.wagons.length : 0;
            const numberOfPersonnel = coaster.personel ? coaster.personel.length : 0;
            const operatingTime = calculateOperatingTime(coaster.hours_from, coaster.hours_to);

            let persAndEquipStatus = '';

            if (numberOfPersonnel < coaster.required_personnel) {
                const missingPersoneel = coaster.required_personnel - numberOfPersonnel;
                persAndEquipStatus += `Shortage of ${missingPersoneel} employees`;
            } else if (numberOfPersonnel > coaster.required_personnel) {
                const excessPersoneel = numberOfPersonnel - coaster.required_personnel;
                persAndEquipStatus += `Excess of ${excessPersoneel} employees`;
            }

            if (numberOfWagons < coaster.wagons_cap) {
                if (persAndEquipStatus) persAndEquipStatus += ', ';
                const missingWagons = coaster.wagons_cap - numberOfWagons;
                persAndEquipStatus += `Lack of ${missingWagons} wagons`;
            } else if (numberOfWagons > coaster.wagons_cap) {
                if (persAndEquipStatus) persAndEquipStatus += ', ';
                const excessWagons = numberOfWagons - coaster.wagons_cap;
                persAndEquipStatus += `Excess of ${excessWagons} wagons`;
            }

            if (!persAndEquipStatus) {
                persAndEquipStatus = 'ok';
            }

            // Wyliczenia wykonane wychodząc z założenia że że trasa kolejki jest podana w metrach a prędkość wagonu w m/s a ilość miejsc i prędkość każdego wagonu jest taka sama.
            // Nie mając dostępu do infirmacji czy i jakie inne rodzaje wagonów są dostępne, nie jestem w stanie zaimplementować bardziej skomplikowanego algorytmu.

            let performanceStatus = '';
            let totalCustomers = 0;

            if (coaster.wagons.length !== 0) {
                coaster.wagons.forEach(wagon => {
                    const courseTime = coaster.route_length/wagon.speed + 5*60; //seconds
                    const numberOfCourses = Math.trunc(operatingTime / courseTime);
                    const numberOfCustomers = numberOfCourses * wagon.seats;
                    totalCustomers += numberOfCustomers;
                });

                if (totalCustomers < coaster.customers) {
                    const excessCustomers = coaster.customers - totalCustomers;
                    const missingWagons = Math.ceil(excessCustomers / coaster.wagons[0].seats);
                    const missingPersoneel = missingWagons * 2;
                    if (performanceStatus) performanceStatus += ', ';
                    performanceStatus += `Lack of ${missingWagons} wagons and ${missingPersoneel} employees for ${excessCustomers} customers`;
                };

                if (totalCustomers >= coaster.customers*2) {
                    const excessCustomers = totalCustomers - coaster.customers;
                    const excessWagons = Math.ceil(excessCustomers / coaster.wagons[0].seats);
                    const excessPersoneel = excessWagons * 2;
                    if (performanceStatus) performanceStatus += ', ';
                    performanceStatus += `Excess of ${excessWagons} wagons and ${excessPersoneel} employees`;
                };
            };
            
            if (!performanceStatus) {
                performanceStatus = 'ok';
            }

            const currentState = {
                numberOfPersonnel,
                numberOfWagons,
                persAndEquipStatus,
                performanceStatus,
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
                logger.info(`Number of daily Customers: ${coaster.customers}`);
                logger.info(`Customers: ${totalCustomers}`);
                persAndEquipStatus === 'ok' ? logger.info(`Status: ${persAndEquipStatus}`) : logger.warn(`Status: ${persAndEquipStatus}`);
                coaster.wagons.length === 0 ? null : performanceStatus === 'ok' ? logger.info(`Performance Status: ${performanceStatus}`) : logger.warn(`Status: ${performanceStatus}`);
                logger.info(`-----------------------------\n`);
                logger.info(`Total Number of Coasters: ${totalCoasters}`);

                previousState[key] = currentState;
            }

        }

    } catch (error) {
        logger.error(`Error fetching statistics: ${error.message}`);
    }
}

function startLoggingStatistics(interval = 1000) {
    return setInterval(logStatistics, interval);
}

module.exports = {
    startLoggingStatistics
};
