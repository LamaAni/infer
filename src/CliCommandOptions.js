const CliArgument = require('./CliArgument')
const assert = require('assert')
const extend = require('extend')

class CliCommandOptions {
  constructor() {
    /**
     * @type {CliArgument[]} The collection of fields associated with this command.
     */
    this.arguments = []

    /**
     * @type {(args)=>{}} The action to take when this command is called.
     */
    this.action = null

    /**
     * @type {string} The help text, how to use.
     */
    this.example = null

    /**
     * @type {string} The command description.
     */
    this.description = ''

    /**
     * @type {string} The help suffix. Text may be added
     * by cli printer.
     */
    this.helpSuffix = null

    /**
     * @type {string} The help prefix. Text may be added
     * by cli printer.
     */
    this.helpPrefix = null

    /**
     * @type {boolean} If true then inherit all parent named options.
     */
    this.inheritParentNamedOptions = true

    /**
     * @type {Object}
     */
    this.action_context = null
  }

  /**
   * Preforms a shallow clone (including new array objects)
   * @returns {CliCommandOptions} The cloned object.
   */
  clone() {
    const o = new CliCommandOptions()
    extend(o, this)
    o.arguments = Array.from(o.arguments)
    return o
  }

  /**
   * loads the positional arguments from an object.
   * @param {object} obj The object to load from.
   */
  loadFromObject(obj) {
    this.arguments = this.arguments.concat(
      CliCommandOptions.argumentsFromObject(obj)
    )
  }

  /**
   * @type {string} the marker for the object help.
   */
  static get CLI_CONFIG_OPTION_MARKER() {
    return '__$'
  }

  /**
   * Reads the object properties and looks for property fields.
   * @param {Object<string,CliArgument>} obj
   */
  static argumentsFromObject(obj) {
    if (obj == null) return []
    assert(
      typeof obj == 'object',
      'Cannot retrieve arguments from a non object type'
    )

    const args_by_name = {}
    // all fields which are not methods.
    let all_keys = Object.keys(obj).filter((k) => typeof obj[k] != 'function')

    // filter out non markers. (only in case the object is a raw value obj)
    let argument_marker = CliCommandOptions.CLI_CONFIG_OPTION_MARKER
    if (
      // this is an object.
      obj.__proto__.constructor.name != 'Object' ||
      // don't mix __$ and regulars.
      all_keys.some((k) => k.startsWith(argument_marker))
    ) {
      all_keys = all_keys.filter((k) => k.startsWith(argument_marker))
    }
    // no need for an argument marker.
    else argument_marker = null

    all_keys.forEach((k) => {
      let field_name = k
      if (argument_marker != null) field_name = k.substr(argument_marker.length)

      assert(
        field_name != null && field_name.length > 0,
        'Cli config marked properties must have a name. i.e. __$my_prop'
      )

      let cli_arg = new CliArgument(obj, field_name, obj[k]['type'] || 'named')
      extend(cli_arg, obj[k])
      if (argument_marker != null && obj[field_name] != undefined)
        cli_arg.default = obj[field_name]

      args_by_name[k] = cli_arg
    })

    return Object.values(args_by_name)
  }
}

module.exports = CliCommandOptions
