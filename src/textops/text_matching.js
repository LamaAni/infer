const assert = require('assert')
/**
 * quotes the non regex chars.
 * @param {*} gstr the glob string.
 * @param {*} delimiter delimiter to enqoute.
 * @return {string} the qouted string.
 */
function preg_quote(gstr, delimiter) {
  // http://kevin.vanzonneveld.net
  // +   original by: booeyOH
  // +   improved by: Ates Goral (http://magnetiq.com)
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Onno Marsman
  // +   improved by: Brett Zamir (http://brett-zamir.me)
  // *     example 1: preg_quote("$40");
  // *     returns 1: '\$40'
  // *     example 2: preg_quote("*RRRING* Hello?");
  // *     returns 2: '\*RRRING\* Hello\?'
  // *     example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
  // *     returns 3: '\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:'
  return (gstr + '').replace(
    new RegExp(
      '[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]',
      'g'
    ),
    '\\$&'
  )
}

/**
 * Converts a glob string (file system match) to regex string.
 * @param {string} gstr the glob string
 * @param {string} flags the regex flags.
 * @param {boolean} fullMatch if true then this should be a full match. (starts with ^ and ends with $)
 * @return {string} The regular expression.
 */
function globStringToRegexString(gstr, fullMatch = true) {
  let regexpString = preg_quote(gstr)
    .replace(/\\\*/g, '.*')
    .replace(/\\\?/g, '.')

  if (fullMatch) regexpString = '^' + regexpString + '$'

  return regexpString
}

/**
 * Converts a glob string (file system match) to regex.
 * @param {string} gstr the glob string
 * @param {string} flags the regex flags.
 * @param {boolean} fullMatch if true then this should be a full match. (starts with ^ and ends with $)
 * @return {RegExp} The regular expression.
 */
function globStringToRegex(gstr, flags = '', fullMatch = true) {
  return new RegExp(globStringToRegexString(gstr, fullMatch), flags)
}

/**
 * Implements a class that allow pattern matching.
 */
class Pattern extends RegExp {
  /**
   * @returns {Object<string,RegExp>}
   */
  static get_cashe() {
    if (Pattern.__cache == null) Pattern.__cache = {}
    return Pattern.__cache
  }

  /**
   * @param {string|string[]} pattern The pattern
   * @param {string} flags The regexp flags
   */
  constructor(pattern, flags) {
    super(Pattern.parsePatternRegex(pattern), flags)
  }

  /**
   * @param {sring} str
   * @returns {boolean} true if the string is a pattern.
   */
  static isPattern(str) {
    return (
      str.indexOf('*') != -1 ||
      str.indexOf('?') != -1 ||
      str.indexOf('::') != -1
    )
  }

  /**
   * @param {string|string[]} pattern Parses a pattern to its regex equivalent.
   */
  static parsePatternRegex(pattern) {
    const cache = Pattern.get_cashe() || {}
    if (Array.isArray(pattern)) {
      const pattern_key = pattern.join('|')

      if (cache[pattern_key] == null) {
        const pattern_array = pattern.map(p => Pattern.parsePatternRegex(p))
        cache[pattern_key] = new RegExp(
          pattern_array.map(rgx => rgx.source).join('|')
        )
      }

      return cache[pattern_key]
    }

    if (pattern instanceof RegExp) return pattern

    assert(
      typeof pattern == 'string',
      'Pattern must be a RegExp object or string, received: ' + typeof pattern
    )

    if (typeof Pattern.get_cashe()[pattern] != 'function') {
      let rgx = null
      if (pattern.startsWith('re::')) {
        rgx = RegExp(pattern.substr('re::'.length))
      }
      // in case of wildcards.
      else rgx = globStringToRegex(pattern)
      Pattern.get_cashe()[pattern] = rgx
    }

    return Pattern.get_cashe()[pattern]
  }

  /**
   * @param {string|string[]} pattern The pattern
   * @param {string} val The string to search
   * @param {string} flags The regex search flags.
   */
  static match(pattern, val, flags = null) {
    return val.match(new Pattern(pattern, flags))
  }

  /**
   * @param {string|string[]} pattern The pattern
   * @param {string} val The string to search
   */
  static test(pattern, val) {
    return new Pattern(pattern).test(val)
  }
}

module.exports = { Pattern, globStringToRegex }
