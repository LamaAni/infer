const ColumnPrinter = require('../../common/textops/column_printer')
const wrap = require('../../common/textops/wrap_colored_text')
const paint_with_color = require('../../common/textops/paint_with_color')

/**
 * @typedef {import('./CliArgument')} CliArgument
 * @typedef {import('./CliCommandOptions')} CliCommandOptions
 * @typedef {import('./Cli')} Cli
 */

/**
 * @param {Cli} cli the cli.
 * @param {CliArgument} ca
 * @param {string} name the name to print
 * @param {boolean} add_notation if true add markers:
 * - for single letter named arg.
 * --  for multi letter named arg.
 * [name] for positional arg.
 * <name> for required positional arg.
 * {} for overflow or transfer args.
 * @param {boolean} add_color
 * @return {string} The formatted print.
 */
function print_cli_argument_name(
  cli,
  ca,
  name,
  add_notation = false,
  add_color = true
) {
  if (add_notation) {
    switch (ca.type) {
      case 'positional':
        name = ca.require ? `<${name}>` : `[${name}]`
        break
      case 'flag':
      case 'named':
        name = (name.length > 1 ? '--' : '-') + name
        break
      case 'overflow':
      case 'transfer':
        name = `{...${name}}`
        break
    }
  }
  name = name.trim()
  if (!add_color) return name
  return paint_with_color(name, ca.color || cli.Context.colors[ca.type])
}

/**
 * @param {Cli} cli
 * @param {CliCommandOptions} options The command options
 * @param {string} name The name to print.
 */
function print_cli_command_name(cli, options, name) {
  const color =
    options.action == null
      ? cli.Context.colors.sub_menu
      : cli.Context.colors.action
  return paint_with_color(
    name
      .split(' ')
      .slice(-1)[0]
      .trim(),
    color
  )
}

/**
 * @param {Cli} cli the cli.
 * @param {CliArgument} ca
 * @param {boolean} add_notation if true add markers:
 * - for single letter named arg.
 * --  for multi letter named arg.
 * [name] for positional arg.
 * <name> for required positional arg.
 * {} for overflow or transfer args.
 * @param {boolean} add_color
 * @return {string} The formatted print.
 */
function print_cli_argument_aliases(
  cli,
  ca,
  add_notation = false,
  add_color = true
) {
  return ca.names
    .map(name =>
      print_cli_argument_name(cli, ca, name, add_notation, add_color)
    )
    .join(' | ')
}

/**
 *
 * @param {number} count Integer, how many chars to indent.
 * @param {string} text The text
 */
function indent_text(count, text) {
  const spaces = new Array(count).fill(' ').join('')
  return text
    .split('\n')
    .map(p => spaces + p)
    .join('\n')
}

/**
 * Renders the help command.
 * @param {string} command The command to render
 * @param {CliCommandOptions} options
 * @param {Cli} cli
 */
function cli_help_formatter(command, options, cli) {
  // gathering info
  const flags = options.arguments.filter(ca => ca.type == 'flag')
  const named = options.arguments.filter(ca => ca.type == 'named')
  const positional = options.arguments.filter(ca => ca.type == 'positional')
  const transfer = options.arguments.filter(ca => ca.type == 'transfer')[0]
  const overflow = options.arguments.filter(ca => ca.type == 'overflow')[0]
  const example = options.example
  const description = options.description

  /** @type {Object<string,CliArgument[]>} */
  const envs = {}
  options.arguments
    .filter(ca => ca.enviromentVariable != null)
    .forEach(ca => {
      envs[ca.enviromentVariable] = envs[ca.enviromentVariable] || []
      envs[ca.enviromentVariable].push(ca)
    })

  // finding child commands.
  const child_commands = cli.Context.getSubCommands(command).map(c => {
    return {
      command: c,
      options: cli.Context.getOptions(c)
    }
  })

  // composing command text
  const command_parts = [cli.Context.name.trim(), command.trim().cyan]

  positional
    .map(ca => print_cli_argument_name(cli, ca, ca.name, true))
    .forEach(p => command_parts.push(p))

  if (overflow != null)
    command_parts.push(
      print_cli_argument_name(cli, overflow, overflow.name, true)
    )

  if (transfer != null) {
    command_parts.push('--')
    command_parts.push(
      print_cli_argument_name(cli, transfer, transfer.name, true)
    )
  }

  const command_description = command_parts.join(' ')

  const print_parts = []

  const print_sep = () => {
    print_parts.push('')
  }

  /**
   * @param {string} text The text to print
   * not the first line.
   */
  function print(
    text,
    { indent = 0, max_width = -1, sep_if_need = false } = {}
  ) {
    if (text == null) return
    text = text.toString()
    if (text.trimRight().length == 0) return

    if (max_width > 0) text = wrap(text, max_width)

    if (indent > 0) text = indent_text(indent, text)

    if (print_parts.length > 0 && sep_if_need) print_sep()
    print_parts.push(text)
  }

  /**
   * @param {string} topic The topic
   * @param {string} txt The topic
   * not the first line.
   */
  const format_topic = topic => {
    if (topic == null || topic.length == 0) return '--'.gray
    topic = topic.toLowerCase()
    topic = topic[0].toUpperCase() + topic.substr(1)
    return paint_with_color(topic, cli.Context.colors['topic'])
  }

  print(format_topic('USAGE') + ' ' + command_description)
  print(description, { indent: 2, max_width: 100, sep_if_need: true })
  print_sep()

  if (child_commands.length > 0) {
    const pr = new ColumnPrinter([-1, 80])
    child_commands.forEach(c => {
      pr.append(
        print_cli_command_name(cli, c.options, c.command),
        c.options.description
      )
    })
    print(format_topic('Commands'))
    print(pr.print(), { indent: 2 })
  }

  /**
   * @param {string} topic the topic.
   * @param {CliArgument[]} col The arguments
   * @param {boolean} all_aliases If true print all
   * aliases array.
   */
  const print_arguments = (topic, col, all_aliases = false) => {
    const pr = new ColumnPrinter([-1, 10, 80, 30])
    col.forEach(ca => {
      const cur_val = ca.value || ca.default
      pr.append(
        all_aliases
          ? print_cli_argument_aliases(cli, ca, true)
          : print_cli_argument_name(cli, ca, ca.name, true),
        ca.require ? '*'.red : '',
        ca.description,
        paint_with_color(
          cur_val == null ? '' : `[${cur_val}]`,
          cli.Context.colors.default
        )
      )
    })
    print(format_topic(topic))
    print(pr.print(), { indent: 2 })
  }

  const positional_with_ot = [overflow, transfer]
    .filter(ca => ca != null)
    .concat(positional)

  if (positional_with_ot.length > 0)
    print_arguments('input', positional_with_ot, false)
  if (named.length > 0) print_arguments('args', named, true)
  if (flags.length > 0) print_arguments('flags', flags, true)

  const env_names = Object.keys(envs)
  if (env_names.length > 0) {
    const pr = new ColumnPrinter([40, 5, 50])
    env_names.sort().forEach(env => {
      // env arguments have their own descriptor
      const named_cas = envs[env].filter(ca => ca.type != 'env')
      const was_assigned = envs[env].some(ca => ca.readEnvFromProcess)
      if (named_cas.length == 0) {
        const description = envs[env]
          .map(ca => ca.description)
          .join('\nand\n'.gray)

        pr.append(
          paint_with_color(env, cli.Context.colors.env),
          paint_with_color(
            was_assigned ? ' + ' : ' - ',
            was_assigned ? 'green' : 'gray'
          ),
          description
        )
      } else {
        const arg_names = named_cas.map(ca =>
          print_cli_argument_name(cli, ca, ca.name, false)
        )

        pr.append(
          paint_with_color(env, cli.Context.colors.env),
          '<' +
            paint_with_color(
              was_assigned ? '+' : '-',
              was_assigned ? 'green' : 'gray'
            ) +
            '>',
          arg_names.join(' | ')
        )
      }
    })
    print(format_topic('envs'))
    print(pr.print(), { indent: 2 })
  }

  if (example != null && example.length > 0) {
    print(format_topic('Example'))
    print(example, { indent: 2, max_width: 80 })
  }

  return print_parts.join('\n')
}

module.exports = {
  cli_help_formatter,
  print_cli_argument_name,
  print_cli_argument_aliases
}
