require('colors')
const extend = require('extend')

/**
 * @typedef {import('./LogData')} LogData
 */

const LOG_DEFAULT_OPTIONS = {
  /**
   * @type {object} A symbol list to show, when applying differnt types of errors.
   */
  symbol: {
    warn: ' !'.yellow,
    info: ' .'.gray,
    error: ' !'.red,
    fatal: ' !'.red,
    debug: ' *'.cyan,
  },
  /**
   * @type {object} The log formatting options.
   */
  format: {
    symbol_min_length: 3,
  },
}

/**
 * Converts a string level to numeric level.
 * @param {string} level
 * @return {int} the numeric level.
 */
function __levelToNumeric(level) {
  if (typeof level == 'number') return level

  switch (level.toLowerCase()) {
    case 'trace':
      return 0
    case 'debug':
      return 1
    case 'info':
      return 2
    case 'warn':
      return 3
    case 'error':
      return 4
    case 'fatal':
      return 5
    default:
      // default to info
      return 2
  }
}

global.zlog_log_level = () =>
  process.env['LOG_LEVEL'] == null ? 'info' : process.env['LOG_LEVEL']

global.zlog_log_mode = () =>
  process.env['LOG_MODE'] == null ? 'cli' : process.env['LOG_MODE']

let LAST_CLI_TOPIC = null

const LOGGER_MODES = {
  cli: (log, data) => {
    if (
      __levelToNumeric(global.zlog_log_level()) > __levelToNumeric(data.level)
    )
      return

    data.message = data.message || ''
    data.message =
      typeof data.message == 'object'
        ? JSON.stringify(data.message, null, 2)
        : data.message.toString()

    // check for topic change.
    if (data.message.trim().length > 0 && LAST_CLI_TOPIC != data.topic) {
      console.log(' # '.cyan + (data.topic + ': ').magenta)
      LAST_CLI_TOPIC = data.topic
    }

    console.log(data.symbol + data.message)
  },
}

/**
 * A general logger class with extra formatting.
 */
class Logger {
  /**
   * Creates a logger.
   * @param {string} topic the current log topic.
   * @param {LOGGER_DEFAULT_OPTIONS} options
   */
  constructor(topic = '', options = LOG_DEFAULT_OPTIONS) {
    this.topic = topic
    this.options = extend({}, LOG_DEFAULT_OPTIONS, options)
  }

  /**
   * Creates a new log object.
   * @param {string} topic the current log topic.
   * @param {LOGGER_DEFAULT_OPTIONS} options
   * @return {Logger} the log object.
   */
  static on(topic, options = LOG_DEFAULT_OPTIONS) {
    return new Logger(topic, options)
  }

  /**
   * cleans up the symbol to match format.
   * @param {string} symbol
   * @return {string} The cleaned symbol.
   * @private
   */
  __cleanupSymbol(symbol) {
    if (symbol == null)
      return Array(this.options.format.symbol_min_length).join(' ')

    const symbolLength = symbol.strip.length

    if (symbolLength >= this.options.format.symbol_min_length) return symbol

    const leftPad = Math.floor(
      (this.options.format.symbol_min_length - symbolLength) / 2
    )
    const rightPad = Math.ceil(
      (this.options.format.symbol_min_length - symbolLength) / 2
    )

    symbol =
      Array(leftPad + 1).join(' ') + symbol + Array(rightPad + 1).join(' ')
    return symbol
  }

  /**
   * print out the logger with topics.
   * @param {LogData} data
   */
  __log(data) {
    data.topic = data.topic == null ? this.topic : data.topic

    data.symbol =
      data.symbol == null
        ? data.message == null
          ? null
          : this.options.symbol[data.level]
        : data.symbol

    data.message = data.message == null ? '' : data.message
    data.symbol = this.__cleanupSymbol(data.symbol)

    let logFunc = LOGGER_MODES[global.zlog_log_mode()]
    if (logFunc == null) logFunc = LOGGER_MODES.cli

    logFunc(this, data)
  }

  info(msg, symbol = null, topic = null) {
    this.__log({
      level: 'info',
      message: msg || '',
      topic: topic,
      symbol: symbol,
    })
  }

  /**
   * Is the current logger level is lower then the specified value.
   * @param {string} level The level to compare to.
   */
  isLowerThen(level) {
    return __levelToNumeric(global.zlog_log_level()) < __levelToNumeric(level)
  }

  debug(msg, symbol = null, topic = null) {
    this.__log({
      level: 'debug',
      message: (msg || '').gray,
      topic: topic,
      symbol: symbol,
    })
  }

  trace(msg, symbol = null, topic = null) {
    this.__log({
      level: 'trace',
      message: (msg || '').gray,
      topic: topic,
      symbol: symbol,
    })
  }

  warn(msg, symbol = null, topic = null) {
    this.__log({
      level: 'warn',
      message: (msg || '').yellow,
      topic: topic,
      symbol: symbol,
    })
  }

  error(msg, symbol = null, topic = null) {
    this.__log({
      level: 'error',
      message: (msg || '').red,
      topic: topic,
      symbol: symbol,
    })
  }

  fatal(msg, symbol = null, topic = null) {
    this.__log({
      level: 'fatal',
      message: (msg || '').red,
      topic: topic,
      symbol: symbol,
    })
  }
}

module.exports = Logger
