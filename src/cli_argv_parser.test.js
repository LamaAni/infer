const { get_possible_commands } = require('./cli_argv_parser')

console.log(
  JSON.stringify(
    get_possible_commands('a -0 -1 b c d -2 e --3 --4 f -5'),
    null,
    2
  )
)
