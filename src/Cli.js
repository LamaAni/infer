const extend = require('extend')
const CliCommandOptions = require('./CliCommandOptions')
const CliContext = require('./CliContext')
const {
  cli_help_formatter,
  print_cli_argument_aliases,
} = require('./cli_help_formatter')
const ColumnPrinter = require('./textops/column_printer')
const CliArgument = require('./CliArgument')
const Logger = require('./logger/Logger')

const DEFUALT_PARSE_OPTIONS = {
  /** If true then invoke the command */
  invoke: true,
  /** If true then show help on -h or --help */
  show_help: true,
  /** If true then show parse errors. */
  show_errors: true,
  /** If true then show the help errors */
  show_errors_on_help: false,
  /**
   * If true then show help when the command is not found.
   */
  show_help_on_error: false,
  /**
   * If true then show help when the command is a menu (Do not invoke action)
   */
  show_help_on_menu: true,
  /**
   * In case when the command is not understood, or is a menu,
   * attempts to show a "did you mean"
   */
  show_did_you_mean: true,
  /**
   * Throw exception when command is not found.
   */
  throw_command_not_found_error: false,
  /**
   * Throw errors when all required arguments are not met and/or
   * there is overflow on the command arguments.
   */
  strict: true,
  /**
   * The exit code to use on error. If -1 ignore.
   */
  exit_code_on_error: 2,
}

/**
 * Implements an Object Oriented approach to cli.
 */
class Cli {
  /**
   * @param {object} param
   * @param {string} param.name The name of the cli.
   * @param {string} param.command_prefix the command prefix to add to any command. Defaults to ""
   * @param {string} param.command_postfix the command prefix to add to any command. Defaults to ""
   * @param {Logger} param.logger The cli logger to use.
   * @param {Object<string,CliArgument>} param.args The object that contains the args. See CliArgument documentation.
   * @param {(args:object)=>{}} default_action The action to be called when this cli triggers. Will override options.action.
   * @param {CliContext} param.context The cli context to use (configuration and common data). Will
   * override {name, logger}
   * will be created if null.
   */
  constructor({
    name = null,
    command_prefix = null,
    command_postfix = null,
    context = null,
    logger = null,
    args = null,
    default_action = null,
  } = {}) {
    /**
     * @type {string} The command prefix to add to any command that has been set.
     */
    this.commandPrefix = command_prefix
    /**
     * @type {string} The command postfix to add to any command that has been set.
     */
    this.commandPostfix = command_postfix

    /**
     * @type {CliContext} The collection of all commands
     * and configuration of the cli.
     */
    this.Context = context || new CliContext({name: name, logger: logger})

    if (args != null || default_action != null)
      this.default(default_action, args)
  }

  /**
   * @type {CliCommandOptions} The current command options.
   */
  get Options() {
    return this.Context.getOptions(this.Command)
  }
  set Options(val) {
    return this.set(this.Command, null, val)
  }

  /**
   * @type {Logger} The underlining logger.
   * You can change the logger in Options.
   */
  get logger() {
    return this.Context.logger || console
  }

  /**
   * @type {string} The current command text.
   * If at the root element, would return ''
   */
  get Command() {
    return this.__composeFullCommand('')
  }

  __composeFullCommand(command) {
    return `${this.commandPrefix || ''} ${
      command == null ? '' : command + ' '
    }${this.commandPostfix || ''}`.trim()
  }

  /**
   * Gets and/or sets the command arguments for the current cli command.
   * @param {Object<string,CliArgument>|[Object<string,CliArgument>]} args The object that contains the args.
   * For classes, (not raw object {}) an arg is any field that would be marked with __$.
   * Otherwise any field is considered an argument. Once parsed, the value
   * will be set on the object reference.
   * sent. (Examples below)
   * @param command The command to get the arguments for. If null
   * then use current command.
   * @returns {CliArgument[]} A new array containing the command arguments.
   */
  arguments(args = null, command = null) {
    command = this.__composeFullCommand(command || '')
    CliContext.assertCommandText(command)
    const command_options = this.Context.getOptions(command)
    Array.isArray(args)
      ? args
      : [args].forEach((args_obj) => {
          command_options.loadFromObject(args_obj)
        })
    return Array.from(command_options.arguments)
  }

  /**
   * Adds/replaces a command
   * @param {string} command The command to set
   * @param {Object<string,CliArgument>} args The object that contains the args. See CliArgument documentation.
   * @param {CliCommandOptions} options
   * @param {boolean} reset_options
   * @returns {Cli} [this]
   */
  set(command, args = null, options = null, reset_options = true) {
    // compose the new command
    command = this.__composeFullCommand(command)

    let command_options = options

    if (
      options == null ||
      !(options instanceof CliCommandOptions) ||
      reset_options
    ) {
      command_options = new CliCommandOptions()

      // extend the options object if needed.
      if (options != null) {
        extend(command_options, options)
      }
    }

    if (args != null) {
      ;(Array.isArray(args) ? args : [args]).forEach((args_obj) => {
        command_options.loadFromObject(args_obj)
        if (command_options.action_context == null)
          command_options.action_context = args_obj
      })
    }

    CliContext.assertCommandText(command)

    this.Context.setOptions(command, command_options)
    this.Context.emit('command_added', command, command_options)

    return this
  }

  /**
   * Returns the CLI object for this command.
   * @param {string} command The command
   */
  get(command) {
    command = this.__composeFullCommand(command)
    CliContext.assertCommandText(command)
    return new Cli({
      name: this.Context.name,
      command_prefix: command,
      command_postfix: null,
      context: this.Context,
    })
  }

  /**
   * Start a new command (new cli object), equivalent to set(command, ...).get()
   * @param {string} command The command to set
   * @param {Object<string,CliArgument>} args The object that contains the args. See CliArgument documentation.
   * @param {CliCommandOptions} options
   * @returns {Cli} The new (internal) cli.
   * @example
   * const cli = Cli()
   * // all commands prefixed by "config [command]"
   * const cli_config = cli.new('config')
   * cli_config.set('list')
   * // command interpreted as => [my file] config list
   */
  new(command, args = null, options = null) {
    this.set(this.__composeFullCommand(command), args, options)
    return this.get(command)
  }

  /**
   * Sets the default action for this cli, equivalent to set(null, args, {action:action})
   * @param {(args:object)=>{}} action The action to be called when this cli triggers. Will override options.action.
   * @param {Object<string,CliArgument>} args The object that contains the args. See CliArgument documentation.
   * @param {CliCommandOptions} options
   * @returns {Cli} [this]
   */
  default(action, args = null, options = null) {
    options = options || this.get('').Options || {}
    options.action = action
    return this.set(null, args, options, args != null)
  }

  /**
   * Sets the default action for this cli, equivalent to set(command, args, {action:action}))
   * @param {string} command The command to set.
   * @param {(args:object)=>{}} action The action to be called when this cli triggers. Will override options.action.
   * @param {Object<string,CliArgument>} args The object that contains the args. See CliArgument documentation.
   * @param {CliCommandOptions} options The command options (like description)
   * @returns {Cli} [this]
   */
  on(command, action, args, options) {
    options = options || {}
    options.action = action
    this.set(command, args, options)
  }

  /**
   * @param {string[]|string} argv The args array to parse.
   * @param {boolean} add_parent_options if true then adds parent
   * options if allowed by the options.
   */
  __parseCommandArgs(raw_argv, add_parent_options = true) {
    this.Context.emit('pre_parse')
    let {command, options, parents, unmatched} = this.Context.find(raw_argv)

    if (options != null) {
      options = options.clone()

      if (add_parent_options && options.inheritParentNamedOptions) {
        for (const p of Object.values(parents)) {
          if (!p.inheritParentNamedOptions) break
          p.arguments
            .filter((ca) => ca.type == 'named')
            .forEach((ca) => options.arguments.push(ca))
        }
      }

      if (this.Context.catchHelpMarkers) {
        const ca = new CliArgument({}, 'help', 'named')
        ca.type = 'flag'
        ca.aliases = ['h']
        ca.description = 'Show this help menu'
        options.arguments.push(ca)
      }

      if (this.Context.catchNoColorMarker) {
        const ca = new CliArgument({}, 'no-color', 'named')
        ca.type = 'flag'
        ca.description = 'Disable colors in the app'
        options.arguments.push(ca)
      }

      if (this.Context.hideParentCommandOptionsOnHelp) {
        const ca = new CliArgument({}, 'help_all', 'named')
        ca.type = 'flag'
        ca.description = 'Show all options help menu'
        options.arguments.push(ca)
      }
    }

    return {
      command,
      options,
      unmatched,
    }
  }

  /**
   * Resets and assigns the command arguments.
   * @param {CliCommandOptions} options The options collection.
   * @param {string[]} argv The arguments to assign.
   */
  __parseAssignArguments(options, argv) {
    // all assignment collections.
    const positional = options.arguments.filter((ca) => ca.type == 'positional')
    const named = options.arguments.filter((ca) => ca.type == 'named')
    const flags = options.arguments.filter((ca) => ca.type == 'flag')
    const overflow = []
    const unknown_names = []
    const transfer = []

    /**
     * @type {[{cli_arg:CliArgument, value: any}]}
     */
    const assignments = []

    const assign = (ca, value) => {
      assignments.push({
        cli_arg: ca,
        value: value,
      })
    }

    // expanding argv for compounded flags
    const expanded_argv = []
    argv.forEach((arg) => {
      if (arg.match(/^-[^-]/) == null || arg.match(/[^a-zA-Z0-9]/) == null) {
        expanded_argv.push(arg)
      } else {
        arg = arg.substr(1)
        arg.split('').forEach((a) => expanded_argv.push('-' + a))
      }
    })

    /** @type {[{cli_arg:CliArgument, value:any}]} */
    let matched_named_args = null
    let is_in_transfer = false

    for (const arg of expanded_argv) {
      if (arg == '--') {
        is_in_transfer = true
        continue
      }
      if (is_in_transfer) {
        transfer.push(arg)
        continue
      }
      // matching arguments.
      if (arg.match(/^(--|-)/)) {
        if (matched_named_args != null) {
          // values matched but no value.
          matched_named_args.forEach((ca) => assign(ca, null))
          matched_named_args = null
        }

        const name = arg.startsWith('--') ? arg.substr(2) : arg.substr(1)
        matched_named_args = named.filter((ca) => ca.matches(name))
        const mathced_flags = flags.filter((ca) => ca.matches(name))

        mathced_flags.forEach((ca) => assign(ca, true))
        if (mathced_flags.length == 0 && matched_named_args.length == 0)
          unknown_names.push(arg)
        continue
      }

      // regular value.
      if (matched_named_args != null) {
        matched_named_args.forEach((ca) => assign(ca, arg))
        matched_named_args = null
      } else if (positional.length > 0) {
        const ca = positional.shift()
        assign(ca, arg)
      } else {
        overflow.push(arg)
      }
    }

    if (overflow.length > 0)
      options.arguments
        .filter((ca) => ca.type == 'overflow')
        .forEach((ca) => overflow.forEach((val) => assign(ca, val)))

    if (transfer.length > 0)
      options.arguments
        .filter((ca) => ca.type == 'transfer')
        .forEach((ca) => transfer.forEach((val) => assign(ca, val)))

    return {assignments, overflow, transfer, unknown_names}
  }

  /**
   * Parse the command line arguments.
   * @param {string| string[]} argv The command line arguments to parse.
   * @param {DEFUALT_PARSE_OPTIONS} parse_options
   * @returns {{command: ,options: CliCommandOptions, args: object<string,any>}} The arguments.
   */
  async parse(
    argv = process.argv.slice(2),
    parse_options = DEFUALT_PARSE_OPTIONS
  ) {
    await this._parse(argv, parse_options)
  }

  /**
   * Parse the command line arguments.
   * @param {string| string[]} argv The command line arguments to parse.
   * @param {DEFUALT_PARSE_OPTIONS} parse_options
   * @returns {{command: ,options: CliCommandOptions, args: object<string,any>}} The arguments.
   */
  async _parse(
    argv = process.argv.slice(2),
    parse_options = DEFUALT_PARSE_OPTIONS
  ) {
    // collecting basic options.
    parse_options = extend({}, DEFUALT_PARSE_OPTIONS, parse_options)
    const {command, options, unmatched} = this.__parseCommandArgs(argv)

    const call_command_not_found = () => {
      // command not found.
      if (parse_options.show_help_on_error)
        this.logger.error(this.__getHelpText(''))

      const command_words = argv
        .filter(
          (a) => a.match(/^(--|-)/) == null && a.match(/[^a-zA-Z0-9_-]/) == null
        )
        .join(' ')

      if (parse_options.show_errors)
        this.logger.error(`Command '${command_words.green}' not found.`)

      if (parse_options.show_did_you_mean) {
        const suggestions = this.Context.findSuggestions(command_words)

        if (suggestions.length > 0) {
          this.logger.print('Did you mean? '.green)
          this.logger.print(
            '  ' + this.Context.name + ' ' + suggestions[0].cyan
          )
        }
      }

      if (parse_options.throw_command_not_found_error)
        throw new Error('Command not found, args:\n' + JSON.stringify(argv))

      if (parse_options.exit_code_on_error > -1)
        process.exit(parse_options.exit_code_on_error)

      return 2
    }

    if (options == null) return call_command_not_found()

    const all_env_args = this.Context.getAllArguments()
      .filter((ca) => typeof ca.enviromentVariable == 'string')
      .filter((ca) => options.arguments.every((oca) => !Object.is(ca, oca)))

    // first reset all the arguments to assign.
    for (const ca of options.arguments) await ca.reset()

    // resetting all the required environment variables
    for (const ca of all_env_args) await ca.reset()

    // reset all optional arguments if options are found.
    const {assignments, overflow, unknown_names} = this.__parseAssignArguments(
      options,
      unmatched
    )

    // check if there is any remainder.
    const positional_args = options.arguments.filter(
      (ca) => ca.type == 'positional'
    )
    const overflow_args = options.arguments.filter(
      (ca) => ca.type == 'overflow'
    )

    if (positional_args.length < overflow.length && overflow_args.length == 0)
      return call_command_not_found()

    // assigning to the arguments.
    for (const assignment of assignments) {
      await assignment.cli_arg.assign(assignment.value)
    }

    // loading all the args.
    const args = {}
    options.arguments.forEach((ca) => (args[ca.field_name] = ca.value))

    const errored_args = options.arguments
      .concat(all_env_args)
      .filter(
        (ca) =>
          ca.__assignmentState != true &&
          (ca.require || ca.state instanceof Error)
      )

    const show_help = () => {
      this.showHelp(command.join(' '))
    }

    const print_errored_args_table = (title) => {
      title = title || 'Unknown error, no error title provided'.red
      const pr = new ColumnPrinter([-1, -1, 80])
      errored_args.forEach((ca) => {
        pr.append([
          '',
          print_cli_argument_aliases(this, ca, true),
          ca.state instanceof Error ? ca.state.message : 'required'.yellow,
        ])
      })
      this.logger.error(title)
      this.logger.error(pr.print())
    }

    const show_unknown_args_table = (title) => {
      title = title || 'Unrecognized command sequence'
      const pr = new ColumnPrinter([-1, -1, 80])

      overflow.forEach((v) => {
        pr.append('', v.yellow, 'Unexpected positional value')
      })

      unknown_names.forEach((n) => {
        pr.append('', n.yellow, 'Unknown flag or argument')
      })

      this.logger.error(title)
      this.logger.error(pr.print())
    }

    // check for errors.
    const has_overflow_error =
      parse_options.strict &&
      ((overflow_args.length == 0 && overflow.length > 0) ||
        unknown_names.length > 0)

    const has_errors = errored_args.length > 0 || has_overflow_error
    const help_argument_present = args.help || args.help_all
    const show_the_help =
      parse_options.show_help &&
      (help_argument_present ||
        (options.action == null &&
          parse_options.show_help_on_menu &&
          !has_errors))

    const show_errors_while_help =
      parse_options.show_help &&
      parse_options.show_errors_on_help &&
      help_argument_present

    if (show_the_help || has_errors) {
      const print_actions = []
      if (show_the_help || parse_options.show_help_on_error) {
        print_actions.push(() => show_help())
      }
      if (
        parse_options.show_errors &&
        (!help_argument_present || show_errors_while_help)
      ) {
        if (errored_args.length > 0)
          print_actions.push(() => print_errored_args_table())
        if (has_overflow_error)
          print_actions.push(() => show_unknown_args_table())
      }

      for (let i = 0; i < print_actions.length; i++) {
        if (i > 0) this.logger.print()
        print_actions[i]()
      }
      return 2
    }

    this.Context.emit('parsed', args)

    // loading default values to args.
    if (parse_options.invoke && options.action != null) {
      this.Context.emit('invoke', options.action, args)
      await options.action.call(options.action_context || this, args)
    }

    return {command: command.join(' '), options, args}
  }

  /**
   * @private
   * Shows help for the specified command.
   * @param {string|string[]} command [The current context command (retrieved by get)]
   * @example 'the big brown "bad rabbit"' -> ['the', 'big', 'brown', '"bad', 'rabbit"']
   * @param {(command:string,options:CliCommandOptions,cli:Cli)=>string} formatter
   * The help formatter to use (if null use this.Context.helpFormatter)
   * @param {boolean} show_parent_options Shows the commands with arguments from the parent.
   */
  __getHelpText(
    command_text = null,
    formatter = null,
    show_parent_options = true
  ) {
    const {command, options} = this.__parseCommandArgs(
      command_text,
      show_parent_options
    )
    return (formatter || this.Context.helpFormatter)(
      command.join(' '),
      options,
      this
    )
  }

  /**
   * Shows help for the specified command.
   * @param {string} command [The current context command (retrieved by get)]
   * @example 'the big brown "bad rabbit"' -> ['the', 'big', 'brown', '"bad', 'rabbit"']
   * @param {(command:string,options:CliCommandOptions,cli:Cli)=>string} formatter
   * The help formatter to use (if null use this.Context.helpFormatter)
   * @param {boolean} show_parent_options Shows the commands with arguments from the parent.
   */
  getHelpText(command = null, formatter = null, show_parent_options = true) {
    const full_command = this.__composeFullCommand(
      command == null ? '' : command
    )

    CliContext.assertCommandText(command)

    return this.__getHelpText(full_command, formatter, show_parent_options)
  }

  /**
   * Shows help for the specified command.
   * @param {string} command The command full string.
   * @param {stream} The output stream
   * @param {(command:string,options:CliCommandOptions,cli:Cli)=>string} formatter
   * The help formatter to use (if null use this.Context.helpFormatter)
   * @param {boolean} show_parent_options Shows the commands with arguments from the parent.
   */
  showHelp(
    command = null,
    stream = process.stdout,
    formatter = cli_help_formatter,
    show_parent_options = null
  ) {
    // checking if to show advanced options.
    if (
      show_parent_options == null &&
      this.Context.hideParentCommandOptionsOnHelp
    ) {
      show_parent_options = process.argv.some((c) => c == '--help-all')
    } else show_parent_options = true

    let help = this.getHelpText(command, formatter, show_parent_options)
    if (!help.trimRight().endsWith('\n')) help += '\n'

    this.Context.emit('help', help)
    stream.write(help)

    return this
  }
}

module.exports = Cli
