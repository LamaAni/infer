const events = require('events')
const assert = require('assert')
const levenshtein = require('./textops/levenshtein')
const cli_help_formatter = require('./cli_help_formatter')
const { get_possible_commands, string_to_argv } = require('./cli_argv_parser')
const Logger = require('./logger/Logger')

/**
 * @typedef {import('./CliCommandOptions')} CliCommandOptions
 * @typedef {import('./CliArgument')} CliArgument
 */

/**
 * @private
 * Internal data object that holds the CLI state.
 * The data object can be passed between multiple cli
 * object.
 */
class CliContext extends events {
  /**
   * @param {object} param
   * @param {string} param.name The name of the context.
   * @param {Logger} param.logger The cli logger
   */
  constructor({ name = null, logger = null }) {
    super()

    name = name || ''

    /**
     * @type {Object<string,CliCommandOptions>}
     */
    this.commands = {}

    /**
     * @type {string, string>}
     */
    this.colors = {
      topic: 'gray',
      default: 'gray',

      named: 'yellow',
      positional: 'cyan',
      flag: 'green',
      transfer: 'white',
      overflow: 'magenta',
      env: 'magenta',

      action: 'cyan',
      sub_menu: 'blue',
    }

    assert(typeof name == 'string', 'The Cli name must be a string')
    /**
     * @type {string} The name of the cli.
     */
    this.name = name

    /**
     * @type {(command:string,cli:Cli)=>string} The help formatter
     */
    this.helpFormatter = cli_help_formatter

    /**
     * @type {boolean} If true allow the -h, --help
     * markers.
     */
    this.catchHelpMarkers = true

    /**
     * If true then catch the --no-color
     * marker.
     */
    this.catchNoColorMarker = true

    /**
     * @type {boolean} If true then hide parent help options
     * on help (adds reserved argument '--help-all')
     */
    this.hideParentCommandOptionsOnHelp = true

    /**
     * The cli context logger.
     */
    this.logger = logger || new Logger(this.name)
  }

  /**
   * A command must not match the regex /[^a-zA-Z0-9 _-]/g,
   * that is, only letters numbers underscores spaces and dashes.
   * @param {string} command
   * @returns {boolean} A valid command
   */
  static isValidCommandText(command) {
    return /[^a-zA-Z0-9 _-]/g.exec(command) == null
  }

  /**
   * A command must not match the regex /[^a-zA-Z0-9_-]/g,
   * that is, only letters numbers underscores spaces and dashes.
   * @param {string} command The command text
   * @throws {Error} When the command is invalid.
   */
  static assertCommandText(command) {
    assert(
      this.isValidCommandText(command),
      `There are invalid charecters in the command '${command}', a command can ` +
        `only be composed of letters numbers underscores spaces and dashes. ` +
        'i.e. not match the regex /[^a-zA-Z0-9 _-]/g'
    )
  }

  /**
   * @param {string} command
   * @returns {string} The command, in a valid format.
   */
  static cleanCommand(command) {
    return command.replace(/\s+/g, ' ').trim()
  }

  /**
   * @param {string} command The command string
   * @param {CliCommandOptions} options The command options
   */
  setOptions(command, options) {
    command = CliContext.cleanCommand(command)
    this.commands[command] = options
  }

  /**
   * @param {string} command The command
   * @returns {CliCommandOptions} the command options.
   */
  getOptions(command) {
    command = CliContext.cleanCommand(command)
    return this.commands[command]
  }

  /**
   * The command options
   * @param {string} command The command
   */
  deleteOptions(command) {
    command = CliContext.cleanCommand(command)
    delete this.commands[command]
  }

  /**
   * @param {string} command the base commands
   * @returns {string[]} the commands
   */
  getSubCommands(command) {
    command = CliContext.cleanCommand(command)
    const allChildCommands = Object.keys(this.commands).filter(
      (c) => c.startsWith(command) && c != command
    )

    const allDirectChildCommands = allChildCommands.filter((c) => {
      return !allChildCommands.some(
        (other) => c != other && c.startsWith(other)
      )
    })

    return allDirectChildCommands
  }

  /**
   * Finds the command given command arguments or string. Will
   * return the longest command matched.
   * @param {string|string[]} argv The command line input argv.
   */
  find(argv) {
    argv = typeof argv == 'string' ? string_to_argv(argv) : Array.from(argv)

    const possibles = get_possible_commands(argv)
      .map((c) => {
        let options = this.getOptions(c)
        return options != null
          ? {
              command: c,
              args: c.split(' '),
              options,
            }
          : null
      })
      .filter((p) => p != null)

    const longest = possibles.sort((a, b) => {
      return b.command.length - a.command.length
    })[0]

    /** @type {Object<string,CliCommandOptions>} */
    const parents = {}
    Object.keys(this.commands)
      .filter((c) => longest.command != c && longest.command.startsWith(c))
      .forEach((pc) => {
        const subOptions = this.getOptions(pc)
        if (subOptions != null) parents[pc] = subOptions
      })

    const unmatched = []
    const skip_by_order = Array.from(longest.args)
    for (const arg of argv) {
      if (skip_by_order[0] == arg.trim()) {
        skip_by_order.shift()
        continue
      }

      unmatched.push(arg)
    }

    return {
      command: longest.args,
      options: longest.options,
      parents,
      unmatched,
      argv: argv,
    }
  }

  /**
   * Returns correction suggestions for a command.
   * @param {string} command The command without arguments
   * @param {number} edit_distance The maximal edit distance (levenshtein)
   * @returns {string[]} the possible options
   */
  findSuggestions(command, edit_distance = 5) {
    const by_distance = {}
    const all_commands = Object.keys(this.commands)
    all_commands.forEach((c) => (by_distance[c] = levenshtein(command, c)))

    const suggestions = all_commands.some((c) => by_distance[c] == 0)
      ? []
      : all_commands.filter((c) => by_distance[c] < edit_distance)

    suggestions.sort((a, b) => {
      return by_distance[a] - by_distance[b]
    })

    return suggestions
  }

  /**
   * Returns the arguments from all commands.
   * @returns {CliArgument[]} All the possible arguments.
   */
  getAllArguments() {
    /**
     * @type {CliArgument[]}
     */
    let args = []
    Object.values(this.commands).forEach(
      (c) => (args = args.concat(c.arguments))
    )
    return args
  }

  /**
   * Catch an context event.
   * @param {"pre_parse"|"parsed"|"invoke"|"command_added"|"help"} event The event to emit.
   * @param  {...any} args The arguments
   */
  on(event, ...args) {
    super.on(event, ...args)
  }
}

module.exports = CliContext
