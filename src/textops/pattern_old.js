const StringSet = require('../collections/StringSet')
const wildcard = require('./wildcard_old')

/**
 * @param {string|string[]} pattern The pattern(s) to match.
 * @param {string[]} values
 * @returns {string[]} The matched string values.
 * @return {boolean} One of the values matches the pattern.
 */
function match_pattern(pattern, ...values) {
  const unique_vals = new StringSet(values)

  if (Array.isArray(pattern))
    return pattern.some(p => match_pattern(p, ...values))

  if (typeof pattern != 'string') return false

  let match = value => wildcard(pattern, value)
  if (pattern.startsWith('re::')) {
    match = value =>
      new RegExp(pattern.substr('re::'.length)).exec(value) != null
  }

  return unique_vals.Values.some(v => match(v))
}

module.exports = match_pattern
