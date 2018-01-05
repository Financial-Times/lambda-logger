'use strict'

const pino = require('pino')

const isProduction = process.env.NODE_ENV === 'production'
const level = process.env.CONSOLE_LOG_LEVEL

let prettyPrint

if (!isProduction) {
    prettyPrint = pino.pretty({ forceColor: true })

    prettyPrint.pipe(process.stdout)
}

const logger = pino({
    prettyPrint,
    level,
})

const augmentedLogger = isProduction
    ? logger.child({
          sourcetype: '_json',
      })
    : logger

module.exports = augmentedLogger
