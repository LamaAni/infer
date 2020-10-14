const path = require('path')

const DEFAULT_SYMBOL_MAP = [
  { match: /[.]/gim, replace_With: '_' },
  { match: /[\\/]/gim, replace_With: '.' }
]

/**
 * Converts a path to a valid reference name.
 * @param {string} src the source path.
 * @param {string} relativeTo The path will be converted to a relative path.
 * @return {string} the name.
 */
function convertPathToName(
  src,
  relativeTo = null,
  symbol_map = DEFAULT_SYMBOL_MAP
) {
  if (src == null) src = ''
  if (relativeTo != null) src = path.relative(relativeTo, src)

  symbol_map.forEach(m => {
    src = src.replace(m.match, m.replace_With)
  })

  src = src.replace(/[.]/gim, '_')
  src = src.replace(/[\\/]/gim, '.')
  return src
}

module.exports = convertPathToName
