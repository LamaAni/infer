const StringSet = require('./collections/StringSet')

function string_to_argv(cmd) {
  let in_context = null
  let cur_val = []
  const vals = []
  for (let i = 0; i < cmd.length; i++) {
    if (cmd[i] == "'" || cmd[i] == '"') {
      if (in_context == cmd[i]) {
        in_context = null
        continue
      }
      if (in_context == null) {
        in_context = cmd[i]
        continue
      }
    }
    if (in_context == null && cmd[i].match(/\s/) != null) {
      if (cur_val.length > 0) vals.push(cur_val.join(''))
      cur_val = []
      continue
    }
    cur_val.push(cmd[i])
  }

  if (cur_val.length > 0) vals.push(cur_val.join(''))
  return vals
}

/**
 * @param {string[]|string} argv The arguments
 * @returns {string[]}
 */
function get_possible_commands(argv) {
  argv = typeof argv == 'string' ? string_to_argv(argv) : argv

  // collecting all possible command notations.
  // assuming nothing about --/- and flags.
  let possible_notations = [['']]
  let last_was_arg = false
  for (const arg of argv) {
    if (arg.match(/^(--|-)/) != null) {
      last_was_arg = true
      continue
    }

    // only allowed chars in a command part.
    if (arg.match(/[^a-zA-Z0-9_-]/) != null) {
      last_was_arg = false
      continue
    }

    let duplicated = null

    if (last_was_arg) {
      duplicated = possible_notations.map(p => Array.from(p))
    }

    for (const p of possible_notations) {
      p.push(arg.trim())
    }

    if (duplicated != null)
      possible_notations = possible_notations.concat(duplicated)

    last_was_arg = false
  }

  // generating the full option set.
  const possibles = new StringSet()
  possible_notations.forEach(p => {
    for (let i = 0; i < p.length; i++) {
      possibles.add(p.slice(0, i + 1).join(' '))
    }
  })

  return possibles.Values.sort((a, b) => b.length - a.length).map(c => c.trim())
}

module.exports = {
  string_to_argv,
  get_possible_commands
}
