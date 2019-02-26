import pino from 'pino';

const isProduction = () => process.env.NODE_ENV === 'production';
const isLambda = () =>
	!!(
		(process.env.LAMBDA_TASK_ROOT && process.env.AWS_EXECUTION_ENV) ||
		false
	);

const stringifyVersion = chunk =>
	chunk.replace(
		/("level":\s*)(\d+)/,
		(match, keyString, levelString) =>
			`${keyString}"${pino.levels.labels[parseInt(levelString, 10)]}"`,
	);

const writeLog = chunk => {
	process.stdout.write(stringifyVersion(chunk));
};

const getProductionStream = () => ({
	write: writeLog,
});

const getPrettyPrintedStream = () => {
	const stream = pino.pretty({ forceColor: true });

	stream.pipe(process.stdout);
	return stream;
};

const getBaseLogger = () => {
	const level = process.env.CONSOLE_LOG_LEVEL || 'info';
	const stream = isProduction()
		? getProductionStream()
		: getPrettyPrintedStream();

	return pino(
		{
			level,
			messageKey: 'message',
			// enable ISO time stamps rather than epoch time
			timestamp: pino.stdTimeFunctions.slowTime,
			serializers: Object.assign({}, pino.stdSerializers, {
				error: pino.stdSerializers.err,
				request: pino.stdSerializers.req,
				response: pino.stdSerializers.res,
			}),
		},
		stream,
	);
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
		.reduce(
			(result, key) =>
				Object.assign({}, result, { [key]: metadata[key] }),
			{},
		);
	return logger.child(definedMetadata);
};

export default getLoggerWithMetadata;
