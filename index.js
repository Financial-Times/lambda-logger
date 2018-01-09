'use strict';

const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';
const level = process.env.CONSOLE_LOG_LEVEL || 'trace';
const systemCode = process.env.SYSTEM_CODE;

let prettyPrint;

if (!isProduction) {
    prettyPrint = pino.pretty({ forceColor: true });

    prettyPrint.pipe(process.stdout);
}

const logger = pino({
    prettyPrint,
    level,
    messageKey: 'message',
    // enable ISO time stamps rather than epoch time
    slowtime: true,
});

const augmentedLogger = isProduction
    ? logger.child({
          systemCode,
          sourcetype: '_json',
      })
    : logger;

module.exports = augmentedLogger;
