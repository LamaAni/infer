const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Creates a randomly generated id.
 * @param {number} length integer, the length of the id.
 * @param {string} charset A collection of characters to choose from
 * @returns {string} The id.
 */
function makeRandomId(length, charset = ID_CHARS) {
  const result = []
  for (var i = 0; i < length; i++) {
    result.push(charset.charAt(Math.floor(Math.random() * charset.length)))
  }
  return result.join('')
}

module.exports = makeRandomId
