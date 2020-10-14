/**
 * Log data.
 */
class LogData {
  /**
   * @param {string} message
   * @param {string} topic
   * @param {string|number} level
   * @param {string} symbol
   * @param {string} level
   */
  constructor(message = null, topic = null, symbol = null, level = 'info') {
    this.message = message
    this.topic = topic
    this.symbol = symbol
    this.level = level
  }
}

module.exports = LogData
