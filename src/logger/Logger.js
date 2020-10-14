const colors = require('colors')
const extend = require('extend')
const moment = require('moment')
const { type } = require('os')

/**
 * @typedef {import('./LogData')} LogData
 */

/**
 * Default log levels
 */
const LOG_LEVELS = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
  /**
   * @type {Object.<number,string>} the values collection.
   */
  _by_value: {},
  /**s
   * @param {string} level
   * @returns {number}
   */
  get_value(level) {
    if (typeof level == 'number') return level
    let level_value = this[level.trim().toUpperCase()]
    return level_value !== null ? level_value : this.INFO
  },
  /**
   * @param {number} level
   * @return {string}
   */
  get_name(level) {
    if (typeof level == 'string') return level.toUpperCase()
    return (this._by_value[level] || 'INFO').toUpperCase()
  },
}

for (let k of Object.keys(LOG_LEVELS)) {
  LOG_LEVELS._by_value[LOG_LEVELS[k]] = k
}

const get_env_log_level = () =>
  process.env['LOG_LEVEL'] == null ? 'info' : process.env['LOG_LEVEL']

const get_env_log_formatter = () =>
  process.env['LOGGING_FORMATTER'] == null
    ? 'cli'
    : process.env['LOGGING_FORMATTER']

const LOGGER_DEFAULT_OPTIONS = {
  log_level_colors: {
    TRACE: 'gray',
    DEBUG: 'gray',
    WARN: 'yellow',
    ERROR: 'red',
    FATAL: 'red',
  },
  log_level_message_colors: {
    TRACE: 'gray',
    DEBUG: 'gray',
    FATAL: 'red',
  },
  /**
   * @type {object} A symbol list to show, when applying differnt types of errors.
   */
  symbol: {},
  /**
   * @type {object} The log formatting options.
   */
  format: {
    symbol_min_length: 3,
  },
  /**
   * @type {string|function} The logging printer method to use. If
   * a string will look in the default logging printers. Otherwise expect a method.
   */
  log_message: 'cli',
  /**
   * @type {string|number} The logging level.
   */
  level: 'info',
}

function colorize_by_level(val, level, dict) {
  level = LOG_LEVELS.get_name(level)
  return dict[level] != null ? val[dict[level]] : val
}

let LAST_CLI_TOPIC = null

/**
 * A collection of built in logging formatters.
 */
const LOGGING_PRINTERS = {
  cli:
    /**
     * @param {Logger} logger The logger
     * @param {LogData} data The data
     * A common cli logging formatter (method)
     */
    (logger, data) => {
      log_level = LOG_LEVELS.get_value(data.level)
      if (LOG_LEVELS.get_value(logger.level) > log_level) return

      data.message = data.message || ''
      data.message =
        typeof data.message == 'object'
          ? JSON.stringify(data.message, null, 2)
          : data.message.toString()

      // check for topic change.
      if (
        data.message.trim().length > 0 &&
        LAST_CLI_TOPIC != data.topic &&
        LAST_CLI_TOPIC != null
      ) {
        console.log(' # '.cyan + (data.topic + ': ').magenta)
        LAST_CLI_TOPIC = data.topic
      }

      msg = `${data.symbol}${data.message}`
      msg = colorize_by_level(
        msg,
        log_level,
        logger.options.log_level_message_colors
      )

      if (logger.options.show_level !== false) {
        msg = `[${colorize_by_level(
          LOG_LEVELS.get_name(log_level).padStart(5, ' '),
          log_level,
          logger.options.log_level_colors
        )}]${msg}`
      }

      if (logger.options.show_timestamp !== false)
        msg = `[${moment().format('YYYYMMDD hh:mm:ss')}]${msg}`

      if (log_level <= LOG_LEVELS.TRACE) console.trace(msg)
      else if (log_level <= LOG_LEVELS.DEBUG) console.debug(msg)
      else if (log_level <= LOG_LEVELS.INFO) console.info(msg)
      else if (log_level <= LOG_LEVELS.WARN) console.warn(msg)
      else if (log_level <= LOG_LEVELS.ERROR) console.error(msg)
      else console.error(msg)
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
  constructor(topic = '', options = LOGGER_DEFAULT_OPTIONS) {
    this.topic = topic
    this._options = extend({}, LOGGER_DEFAULT_OPTIONS, options)
  }

  /** @type {LOGGER_DEFAULT_OPTIONS} */
  get options() {
    return this._options
  }

  /**
   * @type {string}
   */
  get level() {
    return this.options.level != null ? this.options.level : get_env_log_level()
  }

  /**
   * @type {string|number}
   */
  set level(val) {
    this.options.level = val
  }

  /**
   * @type {string|number}
   */
  get formatter() {
    return this.options.log_message || 'cli'
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
      data.symbol || this.options.symbol[LOG_LEVELS.get_name(data.level)] || ''

    data.message = data.message == null ? '' : data.message
    data.symbol = this.__cleanupSymbol(data.symbol)

    let logFunc = LOGGING_PRINTERS[this.formatter] || LOGGING_PRINTERS.cli

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

  debug(msg, symbol = null, topic = null) {
    this.__log({
      level: 'debug',
      message: msg || '',
      topic: topic,
      symbol: symbol,
    })
  }

  trace(msg, symbol = null, topic = null) {
    this.__log({
      level: 'trace',
      message: msg || '',
      topic: topic,
      symbol: symbol,
    })
  }

  warn(msg, symbol = null, topic = null) {
    this.__log({
      level: 'warn',
      message: msg || '',
      topic: topic,
      symbol: symbol,
    })
  }

  error(msg, symbol = null, topic = null) {
    this.__log({
      level: 'error',
      message: msg || '',
      topic: topic,
      symbol: symbol,
    })
  }

  fatal(msg, symbol = null, topic = null) {
    this.__log({
      level: 'fatal',
      message: msg || '',
      topic: topic,
      symbol: symbol,
    })
  }
}

module.exports = Logger
