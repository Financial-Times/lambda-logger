# lambda-logger

Logger useful for AWS lambda applications, particularly those which are aggregated in Splunk. Logs in JSON format using [pino](https://github.com/pinojs/pino).

This was created to provide a simple logger, compatible with lambda, which outputs in a JSON format ([n-logger](https://github.com/Financial-Times/n-logger)) was previously used but didn't handle nested JSON fields or provide a JSON option).

This does make `process.stdout.write` a blocking function (`process.stdout._handle.setBlocking(true);`), as AWS Lambda previously streamed to an output which was synchronous, but has since changed to asynchronous behaviour, leading to lost logs.

[![CircleCI](https://circleci.com/gh/Financial-Times/lambda-logger.svg?style=svg&circle-token=95d28799bf7519d6c9628cb0cdb053f08ff9ff30)](https://circleci.com/gh/Financial-Times/lambda-logger) [![Coverage Status](https://coveralls.io/repos/github/Financial-Times/lambda-logger/badge.svg?branch=master)](https://coveralls.io/github/Financial-Times/lambda-logger?branch=master)

## Usage

```js
const logger = require('@financial-times/lambda-logger');

logger.info({ importantField: 'some-field' }, 'Logging a thing');
```

### Build exports

This module exports both

-   a commonjs build (the `main` field in `package.json`)
-   an ESM (ecmascript module) build (the `module` field in `package.json`)

If you're using commonjs and webpack, say with [serverless-webpack](https://github.com/serverless-heaven/serverless-webpack) it will try to load the ESM build out of the box. This exports a `default` export, and as such won't work if using commonjs.

The solutions to this problem are:

1. Use `import/export` syntax locally and ensure your local tooling uses the ESM build, e.g. by using the [esm](https://www.npmjs.com/package/esm) module.
2. Setup a webpack alias to the commonjs build:

```js
// webpack.config.js

module.exports = {
    ...
	resolve: {
		alias: {
			// use commonjs export of lambda-logger to avoid having to use import/export syntax locally
			'@financial-times/lambda-logger':
				'@financial-times/lambda-logger/dist/lambda-logger.js',
		},
	},
};
```

## API

The logger's API is identical to that of pino with the following exceptions:

-   The property `sourcetype: _json` is added to logs in production for Splunk compatibility.
-   Lambda related environment variables are added by default:
-   -   `AWS_REGION`
    -   `AWS_EXECUTION_ENV`,
    -   `AWS_LAMBDA_FUNCTION_NAME`,
    -   `AWS_LAMBDA_FUNCTION_MEMORY_SIZE`,
    -   `AWS_LAMBDA_FUNCTION_VERSION`
-   Defaults to ISO timestamp logging for splunk compatiblity. At the time of writing this incurs a 25% pino performance penalty.

### Pino properties

Pino adds the following properties to logs by default:

-   `level` - the log level in string form. This is translated from the `pino` default of logging an integer representation.
-   `v` - the pino logger API version.
-   `hostname` - the hostname the process is running on.
-   `pid` - the process PID.

## Configuration

-   `NODE_ENV` - pretty printing is enabled when `NODE_ENV !== 'production'`.
-   `CONSOLE_LOG_LEVEL` - determines the level to log at (pinto `level` option). Defaults to `info`.
-   `SYSTEM_CODE` - adds the `systemCode` property to every log.
-   `ENVIRONMENT|STAGE` - adds the `environment` property to every log. `STAGE` is used as a fallback due to it's default definition in the [serverless](https://serverless.com) framework.
