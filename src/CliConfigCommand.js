const assert = require('assert')
const CliCommandOptions = require('./CliCommandOptions')
const Cli = require('./Cli')
const CliArgument = require('./CliArgument')
const { Pattern } = require('./textops/text_matching')
const ColumnPrinter = require('./textops/column_printer')
const jsyaml = require('js-yaml')
const { print_cli_argument_aliases } = require('./cli_help_formatter')

class CliConfigCommand extends CliCommandOptions {
  static get ConfigArgumentTypes() {
    return CliArgument.ArgumentTypes.filter(
      (t) => t != 'positional' && t != 'transfer' && t != 'overflow'
    )
  }
  /**
   * Applies a configuration options manager to a cli.
   * (Dynamic object)
   * @param {Cli} cli The cli to apply the config to.
   * @param {()=>object} read_config Called to read the config.
   * @param {(config)=>{}} write_config Called to write the config.
   * @param {string} command_name The name of the command
   * that appears in the menu.
   */
  constructor(cli, read_config, write_config, command_name = 'config') {
    assert(
      cli != null && cli instanceof Cli,
      'cli argument must not be null and an instance of Cli class'
    )

    assert(
      typeof read_config == 'function',
      'the config read method must be a function'
    )

    assert(
      typeof write_config == 'function',
      'the config write method must be a function'
    )

    super()

    this.description =
      'Set or get the current command configurations (including envs)'

    /**
     * @private
     * The config read method.
     */
    this.__read_config = read_config

    /**
     * @private
     * The config write method.
     */
    this.__write_config = write_config

    // configures the base command.
    cli.set(command_name, null, this)

    /**
     * @type {Cli} the cli the config is connected to.
     */
    this._command_cli = cli.get(command_name)

    // load all self arguments.
    this.loadFromObject(this)

    const valid_arg_types = CliConfigCommand.ConfigArgumentTypes

    // bind the parsing.
    this.command_cli.Context.on('pre_parse', () => {
      this.loadDefaultsFromConfig()
    })

    let list_arguments = {
      type: {
        description:
          'Filter by argument type, one of ' +
          valid_arg_types.map((type) => type.yellow).join(', '),
        parse: (val) => {
          if (val != null && val.length > 0)
            assert(
              valid_arg_types.some((t) => val == t),
              'Argument type value must be one of ' +
                valid_arg_types.map((type) => type.yellow).join(', ')
            )
          return val
        },
      },
      section_filter: {
        type: 'positional',
        require: false,
        default: '*',
        description:
          'A list filtering pattern, can have wildcards */? or re::[pattern]',
      },
      argument_filter: {
        type: 'positional',
        require: false,
        default: '*',
        description:
          'A list filtering pattern, can have wildcards */? or re::[pattern]',
      },
    }

    // adding the internal commands
    this.command_cli.set('list', list_arguments, {
      action: (options) => this.list(options),
      description: 'Lists the configuration options',
    })

    this.command_cli.set(
      'print',
      {
        ...list_arguments,
        format: {
          type: 'named',
          aliases: ['f'],
          default: 'yaml',
          parse: (val) => {
            assert(
              val == 'yaml' || val == 'json',
              "The format type must be 'yaml' or 'json'"
            )
            return val
          },
          description: 'The output format type [yaml/json](default: yaml)',
        },
      },
      {
        action: (options) => this.print(options),
        description: 'Prints the current configuration options',
      }
    )

    this.command_cli.set(
      'set',
      {
        section: {
          type: 'positional',
          description: 'The section, cannot have wildcards',
        },
        argument: {
          type: 'positional',
          description: 'the argument, cannot have wildcards',
        },
        value: {
          type: 'positional',
          description: 'the value to set',
        },
      },
      {
        action: (options) => this.set(options),
        description: 'Gets aF configuration value from storage',
      }
    )
    this.command_cli.set(
      'get',
      {
        section: {
          type: 'positional',
          description: 'The section, cannot have wildcards',
        },
        argument: {
          type: 'positional',
          description: 'the argument, cannot have wildcards',
        },
      },
      {
        action: (options) => this.get(options),
        description: 'Sets a configuration value in storage',
      }
    )
  }

  /**
   * @type {Cli} The cli for this command.
   */
  get command_cli() {
    return this._command_cli
  }

  /**
   * @private
   * @param {string} command The command
   */
  __commandTextToSection(command) {
    return command.trim().replace(/ +/g, '.')
  }

  /**
   * @private
   * @param {string} config_path The command
   */
  __sectionToCommandText(config_path) {
    return config_path.trim().replace(/[.]+/, ' ')
  }

  /**
   * Returns true if argument matches the filters.
   * @param {CliArgument} ca The argument
   * @param {string} argument_filter Argument filter pattern
   * if null ignore.
   * @param {string} type The argument allowed types, if
   * null then ignore
   */
  __match_argument(ca, argument_filter = null, type = null) {
    if (
      ca.type == 'positional' ||
      ca.type == 'overflow' ||
      ca.type == 'transfer'
    )
      return false

    if (!ca.canBeStored) return false

    if (
      argument_filter != null &&
      !ca.names.some((n) => Pattern.test(argument_filter, n))
    )
      return false

    if ((type |= null && type.length > 0)) return ca.type == type

    return true
  }

  __get_commands(section_filter = null, argument_filter = null, type = null) {
    /** @type {Object<string,CliCommandOptions>} */
    const filtered_commands = {}
    Object.keys(this.command_cli.Context.commands)
      .filter((command_text) =>
        Pattern.test(
          section_filter || '*',
          this.__commandTextToSection(
            command_text.length == 0
              ? this.command_cli.Context.name
              : command_text
          )
        )
      )
      .sort()
      .forEach((command_text) => {
        const command = this.command_cli.Context.commands[command_text]
        if (command_text.startsWith(this.command_cli.__composeFullCommand()))
          return
        if (
          command.arguments.some((ca) =>
            this.__match_argument(ca, argument_filter || '*', type)
          )
        )
          filtered_commands[command_text] = command
      })

    return filtered_commands
  }

  /**
   * Prints a list of all possible arguments
   * by type
   */
  list(options) {
    const filtered_commands = this.__get_commands(
      options.section_filter,
      options.argument_filter,
      options.type
    )

    const pr = new ColumnPrinter([1, 30, 30, 30, 50])
    pr.append(
      ...['', 'Section', 'Argument', 'Env. Variable', 'Description'].map(
        (title) => title.gray.underline
      )
    )

    Object.keys(filtered_commands).forEach((command_text) => {
      const command = filtered_commands[command_text]
      command.arguments
        .filter((ca) =>
          this.__match_argument(ca, options.argument_filter, options.type)
        )
        .forEach((ca) => {
          pr.append(
            '',
            this.__commandTextToSection(
              command_text.length == 0
                ? this.command_cli.Context.name
                : command_text
            ).cyan,
            print_cli_argument_aliases(this.command_cli, ca, false, false)
              .yellow,
            ca.environmentVariable == null ? '' : ca.environmentVariable.magenta,
            ca.description
          )
        })
    })

    this.command_cli.logger.print()
    this.command_cli.logger.print(
      `To set/get a configuration value: ${
        this.command_cli.Context.name.magenta
      } ${this.command_cli.__composeFullCommand().cyan} ` + 'get/set'.yellow
    )
    this.command_cli.logger.print()
    this.command_cli.logger.print(pr.print())
  }

  print(options) {
    const config = this.getConfig(
      options.section_filter,
      options.argument_filter,
      options.type
    )
    switch (options.format) {
      case 'yaml':
        process.stdout.write(
          jsyaml.dump(config, {
            indent: 2,
            skipInvalid: true,
          })
        )
        break
      case 'json':
        process.stdout.write(JSON.stringify(config, null, 2))
        break
      default:
        throw new Error('Unknown config print format: ' + options.format)
    }
  }

  /**
   * @private
   * @param {string} section The section to search for.
   * @param {boolean} print_did_you_mean If true
   * will print a "did you mean?" text.
   */
  __find_section_command(section, print_did_you_mean = true) {
    const command_text = this.__sectionToCommandText(section)
    const command =
      command_text == this.command_cli.Context.name
        ? this.command_cli.Context.commands['']
        : this.command_cli.Context.commands[command_text]

    if (command == null && print_did_you_mean) {
      this.command_cli.logger.error('Could not find section: ' + section.cyan)
      const suggestions = this.command_cli.Context.findSuggestions(
        this.__sectionToCommandText(section)
      )
        .map((c) => this.__commandTextToSection(c))
        .filter((s) => s.trim() != '')

      if (suggestions.length > 0)
        this.command_cli.logger.error(
          'Did you mean?\n\t'.green + suggestions[0].cyan
        )
    }
    return command
  }

  /**
   * @private
   * @param {CliCommandOptions} command The command options
   * @param {string} argument The argument match
   */
  __find_matching_arguments(command, argument) {
    return command.arguments
      .filter((ca) =>
        CliConfigCommand.ConfigArgumentTypes.some((type) => type == ca.type)
      )
      .filter((ca) => ca.canBeStored && ca.matches(argument))
  }

  /**
   * Loads and returns a configuration value.
   */
  async get(options) {
    const config = this.__read_config() || {}
    const command = this.__find_section_command(options.section)
    if (command == null) return null

    let args = this.__find_matching_arguments(command, options.argument)
    if (args.length == 0) {
      this.command_cli.logger.error(
        'No arguments match ' + options.argument.yellow
      )
      return null
    }

    // reset to the default values.
    await Promise.all(args.map((ca) => ca.reset()))

    /** @type {Object<string,any>} */
    const config_section = config[options.section]

    /**
     * @param {CliArgument} ca
     */
    const get_argument_value = (ca) => {
      if (config_section == null) return ca.value
      return config_section[ca.name] || ca.value
    }

    args = args.map((ca) => {
      return { argument: ca, value: get_argument_value(ca) }
    })

    if (args.length > 1) {
      this.command_cli.logger.print('multiple arguments match:')
      args.forEach((a) => {
        this.command_cli.logger.print(`${a.ca.name}: ${a.value | ''}`)
      })
    } else this.command_cli.logger.print(args[0].value || '')
    return args
  }

  set(options) {
    const config = this.__read_config() || {}
    const command = this.__find_section_command(options.section)
    if (command == null) return null

    let args = this.__find_matching_arguments(command, options.argument)
    if (args.length == 0) {
      this.command_cli.logger.error(
        'No arguments match ' + options.argument.yellow
      )
      return null
    }

    // checking values
    if (!args.length > 1) {
      this.command_cli.logger.error(
        'Error:'.red +
          'Multiple arguments matched to ' +
          options.argument.yellow
      )
      return null
    }

    const arg = args[0]
    if (arg.type == 'flag') {
      options.value = options.value.trim().toLowerCase()
      if (options.value != 'false' && options.value != 'true') {
        this.command_cli.logger.error(
          'Flag values must be either true or false'
        )
        return null
      }
      options.value = options.value == 'true'
    }

    if (
      options.value != null &&
      typeof options.value == 'string' &&
      options.value.trim().length == 0
    )
      options.value = null

    /** @type {Object<string,any>} */
    const config_section = config[options.section] || {}
    if (options.value == null) delete config_section[arg.name]
    else config_section[arg.name] = options.value
    config[options.section] = config_section

    this.__write_config(config)
  }

  /**
   * Loads all argument defaults from the config (using the matched value)
   */
  loadDefaultsFromConfig() {
    const config = this.__read_config()
    if (config == null) return // nothing to do.

    Object.keys(config).forEach((section) => {
      const command = this.__find_section_command(section)
      if (command == null) return
      const values = config[section]
      if (values == null) return
      Object.keys(values).forEach((argument) => {
        command.arguments
          .filter((ca) => ca.matches(argument))
          .forEach((ca) => {
            ca.default = values[argument]
          })
      })
    })
  }

  getConfig(section_filter = '*', argument_filter = '*', type = '*') {
    const config = {}

    const filtered_commands = this.__get_commands(
      section_filter,
      argument_filter,
      type
    )

    Object.keys(filtered_commands).forEach((command_text) => {
      const command = filtered_commands[command_text]
      command.arguments
        .filter((ca) => this.__match_argument(ca, argument_filter, type))
        .forEach((ca) => {
          ca.reset()
          const section = this.__commandTextToSection(
            command_text.length == 0
              ? this.command_cli.Context.name
              : command_text
          )
          // if (ca.value == null) return
          config[section] = config[section] || {}
          config[section][ca.name] = ca.value || null
        })
    })

    return config
  }
}

module.exports = CliConfigCommand
