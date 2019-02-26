import pino from 'pino';
import createLogger from '../logger';

const setupEnv = ({ envKey, value, setter }) => {
	const backupEnv = process.env[envKey];

	if (typeof setter === 'function') {
		setter();
	} else {
		process.env[envKey] = value;
	}
	return function restore() {
		if (typeof backupEnv !== 'undefined') {
			process.env[envKey] = backupEnv;
		} else {
			delete process.env[envKey];
		}
	};
};

['production', 'development'].forEach(NODE_ENV => {
	describe(`When process.env.NODE_ENV is ${NODE_ENV}`, () => {
		test('it logs at info level without exception', () => {
			const restore = setupEnv({
				envKey: 'NODE_ENV',
				value: NODE_ENV,
			});
			const logger = createLogger();
			try {
				logger.info(
					{ someObject: { withNesting: true } },
					'someMessage',
				);
			} finally {
				restore();
			}
		});
	});
});

describe('log formatting', () => {
	const stdoutSpy = jest.spyOn(process.stdout, 'write');
	const backupNodeEnv = process.env.NODE_ENV;
	let logger;

	const getLogObject = (filterOutput = true) => {
		expect(stdoutSpy).toHaveBeenCalled();
		const callJson = JSON.parse(stdoutSpy.mock.calls[0]);
		if (filterOutput) {
			delete callJson.pid;
			delete callJson.time;
			delete callJson.hostname;
		}
		return callJson;
	};

	beforeEach(() => {
		process.env.NODE_ENV = 'production';
	});

	afterEach(() => {
		process.env.NODE_ENV = backupNodeEnv;
		jest.resetModules();
		jest.resetAllMocks();
	});

	test('it logs JSON to stdout in the correct format', () => {
		const expectedLog = {
			level: 'info',
			message: 'someMessage',
			someObject: { withNesting: true },
			sourceType: '_json',
			v: 1,
		};

		logger = createLogger();
		logger.info({ someObject: { withNesting: true } }, 'someMessage');

		const callJson = getLogObject();
		expect(callJson).toEqual(expectedLog);
	});

	Object.keys(pino.levels.values).forEach(level => {
		test(`it writes log level as the appropriate strings when the level is ${level}`, () => {
			const restore = setupEnv({
				envKey: 'CONSOLE_LOG_LEVEL',
				value: 'trace',
			});
			try {
				logger = createLogger();
				logger[level](
					{ someObject: { withNesting: true } },
					'someMessage',
				);

				const callJson = getLogObject();
				expect(callJson).toHaveProperty('level', level);
			} finally {
				restore();
			}
		});
	});

	test('logs at info level when CONSOLE_LOG_LEVEL is not set', () => {
		const restore = setupEnv({
			envKey: 'CONSOLE_LOG_LEVEL',
			value: '',
		});
		logger = createLogger();
		try {
			logger.debug({ someObject: { withNesting: true } }, 'someMessage');
			logger.info({ someObject: { withNesting: true } }, 'someMessage');
			expect(stdoutSpy).toHaveBeenCalledTimes(1);
		} finally {
			restore();
		}
	});

	test('logs at the given CONSOLE_LOG_LEVEL', () => {
		const restore = setupEnv({
			envKey: 'CONSOLE_LOG_LEVEL',
			value: 'debug',
		});
		logger = createLogger();
		try {
			logger.trace({ someObject: { withNesting: true } }, 'someMessage');
			logger.debug({ someObject: { withNesting: true } }, 'someMessage');
			expect(stdoutSpy).toHaveBeenCalledTimes(1);
		} finally {
			restore();
		}
	});

	test('it includes variable properties', () => {
		logger = createLogger();
		logger.info({ someObject: { withNesting: true } }, 'someMessage');

		const callJson = getLogObject(false);
		expect(callJson).toHaveProperty('hostname');
		expect(callJson).toHaveProperty('time');
		expect(callJson).toHaveProperty('pid');
	});

	describe('metadata from environment variables', () => {
		[
			{
				property: 'sourceType',
				envKey: 'NODE_ENV',
				setter() {
					process.env.NODE_ENV = 'production';
				},
				value: '_json',
			},
			{
				property: 'systemCode',
				envKey: 'SYSTEM_CODE',
				value: 'stubSystemCode',
			},
			{
				property: 'environment',
				envKey: 'ENVIRONMENT',
				value: 'env-test',
			},
			{
				property: 'environment',
				envKey: 'STAGE',
				value: 'stage-test',
			},
		].forEach(({ property, envKey, value, setter }) => {
			test(`it should log the property '${property}' when the environment variable '${envKey} is set'`, () => {
				const restore = setupEnv({ envKey, value, setter });
				logger = createLogger();
				logger.info('dummyMessage');

				const callJson = getLogObject();
				try {
					expect(callJson).toHaveProperty(property, value);
				} finally {
					restore();
				}
			});
		});
	});

	describe('Error serializer', () => {
		const givenError = new Error('Error object message');

		test('it serializes a first argument error as expected, overwriting the message with the given message', () => {
			const givenAdditional = 'bar';
			const givenMessage = 'Log message';

			logger = createLogger();
			logger.info(
				Object.assign(givenError, { additional: givenAdditional }),
				givenMessage,
			);

			const callJson = getLogObject();
			expect(callJson).toHaveProperty('stack');
			expect(callJson).toHaveProperty('message', givenMessage);
			expect(callJson).toHaveProperty('additional', givenAdditional);
		});

		test('it does not serialize a first argument error if it is shallow cloned using Object.assign (no error prototype)', () => {
			const givenAdditional = 'bar';
			const givenMessage = 'Log message';

			logger = createLogger();
			logger.info(
				Object.assign({}, givenError, { additional: givenAdditional }),
				givenMessage,
			);

			const callJson = getLogObject();
			expect(callJson).not.toHaveProperty('stack');
			expect(callJson).toHaveProperty('message', givenMessage);
			expect(callJson).toHaveProperty('additional', givenAdditional);
		});

		['err', 'error'].forEach(key => {
			test(`it serializes an error given as property '${key}' as expected`, () => {
				const givenAdditional = 'bar';
				const givenMessage = 'Log message';
				logger = createLogger();

				logger.info(
					{
						[key]: Object.assign(givenError, {
							additional: 'bar',
						}),
					},
					givenMessage,
				);

				const callJson = getLogObject();
				expect(callJson).toHaveProperty(key);
				expect(callJson[key]).toHaveProperty('stack');
				expect(callJson[key]).toHaveProperty(
					'additional',
					givenAdditional,
				);
				expect(callJson).toHaveProperty('message', givenMessage);
			});
		});
	});
});
