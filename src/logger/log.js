const Logger = require('./Logger')

/**
 * Creates a new logger with a topic.
 * @param {string} topic
 */
function log(topic = null) {
  return new Logger(topic || '')
}

module.exports = log
