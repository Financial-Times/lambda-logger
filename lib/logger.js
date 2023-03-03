import pino from 'pino';

const prodTerms = ['production', 'prod', 'p'];
const env = process.env.NODE_ENV; 
const isProduction = () => prodTerms.includes(env && env.toLowerCase());
const isLambda = () =>
	!!(
		(process.env.LAMBDA_TASK_ROOT && process.env.AWS_EXECUTION_ENV) ||
		false
	);

const writeLog = chunk => {
	process.stdout.write(chunk);
};

const getProductionStream = () => ({
	write: writeLog,
});

// enable ISO time stamps rather than epoch time
// note: this results in much slower logging
// https://github.com/pinojs/pino/blob/238fe2857501dca963783d93915506012c8b43bf/docs/legacy.md#v5-4
const getIsoTime = () => `,"time":"${new Date().toISOString()}"`;

const getBaseLogger = () => {
	const level = process.env.CONSOLE_LOG_LEVEL || 'info';
	const options = {
		level,
		useLevelLabels: true,
		messageKey: 'message',
		timestamp: getIsoTime,
		serializers: {
			...pino.stdSerializers,
			error: pino.stdSerializers.err,
			request: pino.stdSerializers.req,
			response: pino.stdSerializers.res,
		},
	};
	if (!isProduction()) {
		return pino({ ...options, prettyPrint: true });
	}
	return pino(options, getProductionStream());
};

const getMetaData = () => ({
	sourceType: isProduction() ? '_json' : undefined,
	systemCode: process.env.SYSTEM_CODE,
	environment: process.env.ENVIRONMENT || process.env.STAGE,
	lambda: isLambda()
		? {
				region: process.env.AWS_REGION,
				executionEnv: process.env.AWS_EXECUTION_ENV,
				functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
				functionMemorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
				functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
				logStreamName: process.env.AWS_LAMBDA_LOG_STREAM_NAME,
		  }
		: undefined,
});

const getLoggerWithMetadata = () => {
	/* eslint-disable no-underscore-dangle */
	if (
		isLambda() &&
		process.stdout._handle &&
		typeof process.stdout._handle.setBlocking === 'function'
	) {
		process.stdout._handle.setBlocking(true);
	}
	/* eslint-enable no-underscore-dangle */
	const logger = getBaseLogger();
	const metadata = getMetaData();

	const definedMetadata = Object.keys(metadata)
		.filter(key => typeof metadata[key] !== 'undefined')
		.reduce((result, key) => ({ ...result, [key]: metadata[key] }), {});
	return logger.child(definedMetadata);
};

export default getLoggerWithMetadata;
