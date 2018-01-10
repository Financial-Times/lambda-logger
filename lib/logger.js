import pino from 'pino';

const isProduction = () => process.env.NODE_ENV === 'production';
const isLambda = () =>
    !!(
        (process.env.LAMBDA_TASK_ROOT && process.env.AWS_EXECUTION_ENV) ||
        false
    );

const getBaseLogger = () => {
    const level = process.env.CONSOLE_LOG_LEVEL || 'trace';

    let prettyPrint;

    if (!isProduction()) {
        prettyPrint = pino.pretty({ forceColor: true });

        prettyPrint.pipe(process.stdout);
    }

    return pino({
        prettyPrint,
        level,
        messageKey: 'message',
        // enable ISO time stamps rather than epoch time
        timestamp: pino.stdTimeFunctions.slowTime,
    });
};

const getMetaData = () => ({
    sourceType: isProduction() ? '_json' : undefined,
    systemCode: process.env.SYSTEM_CODE,
    environment: process.env.ENVIRONMENT || process.env.STAGE,
    lambda: isLambda()
        ? {
              executionEnv: process.env.AWS_EXECUTION_ENV,
              functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
              functionMemorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
              functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
          }
        : undefined,
});

const getLoggerWithMetadata = () => {
    const logger = getBaseLogger();
    const metadata = getMetaData();

    const definedMetadata = Object.keys(metadata)
        .filter(key => typeof metadata[key] !== 'undefined')
        .reduce(
            (result, key) =>
                Object.assign({}, result, { [key]: metadata[key] }),
            {},
        );
    return logger.child(definedMetadata);
};

export default getLoggerWithMetadata;
