'use strict'

const pino = require('pino')

const isProduction = process.env.NODE_ENV === 'production'

let pretty

if (!isProduction) {
    pretty = pino.pretty({
        forceColor: true,
    })

    pretty.pipe(process.stdout)
}

const logger = pino({
    name: 'app',
    safe: true,
    prettyPrint: pretty,
})

module.exports = logger
