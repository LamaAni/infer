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
  const regexpString = gstr
    .split('|')
    .map(s => globStringToRegexString(s, fullMatch))
    .join('|')

  return new RegExp(regexpString, flags)
}

/**
 * Matches the string with wildcards
 * @param {string|string[]} wcard the string or strings tho match
 * that hold wildcards. Example ['a*.ks','b*.kk']
 * @param {string} str to match.
 *@return {true|false}
 */
function matchCard(wcard, str) {
  // as array.
  if (Array.isArray(str)) {
    for (let i = 0; i < str.length; i++) {
      const match = matchCard(wcard, str[i])
      if (typeof match == 'string') return match
      else if (match) return str[i]
    }
    return null
  }

  if (Array.isArray(wcard)) {
    // cards is an array.
    for (let i = 0; i < wcard.length; i++) {
      // first match.
      if (matchCard(wcard[i], str)) return str
    }
    return null
  }

  // as value.
  const regex_wcard = globStringToRegex(wcard, '', true)

  // wcard = '^' + wcard + '$';
  return str.match(regex_wcard) != null
}

matchCard.createRegex = wildcard => {}

module.exports = matchCard
