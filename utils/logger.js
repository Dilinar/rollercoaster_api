const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const moment = require('moment-timezone');

const TIMEZONE = 'Poland';

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const customFormat = format.printf(({ level, message, timestamp }) => {
    const formattedTimestamp = moment(timestamp).tz(TIMEZONE).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    return `${formattedTimestamp} [${level}]: ${message}`;
});

const logger = createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        timestamp(),
        customFormat
    ),
    transports: [
        new transports.Console({
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            format: combine(
                timestamp(),
                colorize(),
                customFormat
            )
        }),
        new transports.File({ filename: 'info.log', level: 'info', format: customFormat }),
        new transports.File({ filename: 'warn.log', level: 'warn', format: customFormat }),
        new transports.File({ filename: 'error.log', level: 'error', format: customFormat })
    ]
});

// if (process.env.NODE_ENV !== 'production') {
//     logger.add(new transports.Console({
//         level: 'debug',
//         format: combine(
//             timestamp(),
//             colorize(),
//             customFormat
//         )
//     }));
// }

module.exports = logger;
