// helper method for colors package.
require('colors')

/**
 * Paints a text with color.
 * @param {string} str the text
 * @param {string} color The color, by name or the actual color.
 */
function paint_with_color(str, color) {
  if (/^[\w]/g.exec(color) != null) return str[color] || str
  return `${color}${str}'\u001b[39m'`
}

module.exports = paint_with_color
