require('colors')
const assert = require('assert')

function split_colored_joined_text(text, max_width) {
  const stripped = text.strip
  let stripped_index = 0
  let cur_count = 0
  const wrap_positions = []
  for (let i = 0; i < text.length; i++) {
    if (text[i] == stripped[stripped_index]) {
      cur_count++
      stripped_index++
      if (cur_count == max_width) {
        wrap_positions.push(i)
        cur_count = 0
      }
      continue
    }
  }

  let last_position = 0
  const text_parts = wrap_positions.map((p) => {
    const part = text.substring(last_position, p)
    last_position = p
    return part
  })
  text_parts.push(text.substring(last_position, text.length))

  return text_parts
}

/**
 * @param {string} text
 * @param {number} max_width The max width
 */
function wrap(text, max_width = 80) {
  if (max_width == null || max_width < 0) return text

  const outer_lines = (text || '').split('\n')
  if (outer_lines.length > 1) {
    return outer_lines.map((l) => wrap(l, max_width)).join('\n')
  }

  assert(max_width > 0, 'Max width must be larger then zero')

  const line = outer_lines[0]
  const make_word = (text) => {
    return {
      length: text.strip.length,
      text: text,
    }
  }
  let words = []
  let raw_words = line.split(' ')
  raw_words
    .map((w, i) => (i < raw_words.length - 1 ? w + ' ' : w))
    .forEach((w) =>
      w.strip.length > max_width
        ? split_colored_joined_text(w, max_width).forEach((wp) =>
            words.push(make_word(wp))
          )
        : words.push(make_word(w))
    )

  // composing the new lines.
  /**
   * @type {string[]}
   */
  let lines = []
  let cur_width = 0
  let cur_line = []
  for (let i = 0; i < words.length; i++) {
    if (cur_width + words[i].length > max_width) {
      lines.push(cur_line.join(''))
      cur_line = []
      cur_width = 0
    }
    cur_line.push(words[i].text)
    cur_width += words[i].length
  }

  lines.push(cur_line.join(''))

  // recoloring lines.
  const find_last_color = (txt) => {
    const re = /\033\[[^m]+m/g
    let last_match = null
    do {
      const match = re.exec(txt)
      if (match == null) break
      last_match = match
      // eslint-disable-next-line no-constant-condition
    } while (true)

    return last_match == null ? null : last_match[0]
  }

  const color_cleanup = '\x1b[0m'
  let last_color = null
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i]
    if (last_color != null) l = last_color + l
    last_color = find_last_color(l)
    if (last_color != null) l += color_cleanup
    lines[i] = l
  }

  return lines.join('\n').trimRight()
}

/**
 * Limit the text and add a limiter symbol if was cut. Will take into
 * account colors.
 * @param {string} text The text to limit
 * @param {number} max_length The max length
 * @param {string} symbol The symbol to mark the limiting...
 */
function limit(text, max_length, symbol = ' ...') {
  if (text.strip.length <= max_length) return text

  let lines = split_colored_joined_text(text, max_length)
  return `${lines[0]}${symbol}`
}

module.exports = {
  wrap,
  limit,
}
