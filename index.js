import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const level = process.env.CONSOLE_LOG_LEVEL || 'trace';
const metadata = {
    sourceType: isProduction ? '_json' : undefined,
    systemCode: process.env.SYSTEM_CODE,
    environment: process.env.ENVIRONMENT || process.env.STAGE,
};

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

const getLoggerWithMetadata = () => {
    const definedMetadata = Object.keys(metadata)
        .filter(key => typeof metadata[key] !== 'undefined')
        .reduce(
            (result, key) =>
                Object.assign({}, result, { [key]: metadata[key] }),
            {}
        );
    return logger.child(definedMetadata);
};

export default getLoggerWithMetadata();
