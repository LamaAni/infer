const {Pattern} = require('./textops/text_matching')

/**
 * @typedef {import('./Cli')} Cli
 */

/**
 * A collection of valid run events
 * @typedef {(
 *  "named" |
 *  "flag" |
 *  "positional" |
 *  "env" |
 *  "transfer" |
 *  "overflow"
 * )} CliArgumentType
 */

/**
 * A cli named parameter (non positional) config.
 * @example
 *  --lama [value] -l [value] --flag
 */
class CliArgument {
  /**
   * @type {[CliArgumentType]}
   */
  static get ArgumentTypes() {
    return ['named', 'flag', 'positional', 'env', 'transfer', 'overflow']
  }

  /**
   * @param {Object} parent the argument object.
   * @param {string} field_name the name of the field to assign the argument to.
   * @param {CliArgumentType} type the type of argument to parse.
   */
  constructor(parent, field_name, type = 'named') {
    /**
     * @type {CliArgumentType} If true, this is a positional argument.
     * match and aliases will be ignored.
     */
    this.type = type

    /**
     * The name of the field to update.
     */
    this.field_name = field_name

    /**
     * @type {string} The core name of the argument.
     * default: The name of the field, best if alphanumeric.
     */
    this.name = field_name.replace(/[^a-zA-Z0-9]/g, '-')

    /**
     * @type {any} The default value.
     */
    this.default = undefined

    /**
     * @type {any} The argument value
     */
    this.value = undefined

    /**
     * @type {string} Environment variable name.
     */
    this.environmentVariable = this.type == 'env' ? field_name : null

    /**
     * @type {object} The parent object that is associated
     * with this options config.
     */
    this.parent = parent

    /**
     * @type {string|RegExp|[]} alternative names
     * Can be either a string, a Regex or an array of
     * a combination of both.
     */
    this.aliases = null

    /**
     * @type {string} The description to show.
     */
    this.description = null

    /**
     * @type {(value)=>any} Otherwise will
     * use the function to return the appropriate type.
     */
    this.parse = null

    /**
     * @type {string} The property color to use.
     * If null will derive colors from the global set.
     */
    this.color = null

    /**
     * @type {boolean} If true, this field of parent will
     * not get updated when the value is read.
     */
    this.doNotAssignToParent = false

    /**
     * @type {boolean} If true, this environment variable will
     * not get updated when the value is read.
     */
    this.doNotAssignToEnv = false

    /**
     * True if the env has been updated since reset.
     */
    this.envHasBeenUpdated = false

    /**
     * If true, allow this argument to appear in a
     * file configuration
     */
    this.canBeStored = true

    /**
     * If true this argument is an array of multiple values.
     * Applies to types: named, overflow, transfer
     */
    this.collectMultiple = false

    /**
     * The maximal number of characters to display in the value column
     * of the help menu
     */
    this.max_help_value_chars = 100
  }

  /**
   * Old typeo
   * @deprecated
   */
  get enviromentVariable() {
    return this.environmentVariable
  }

  /**
   * Old typeo
   * @deprecated
   */
  set enviromentVariable(val) {
    this.environmentVariable = val
  }

  /**
   * @type {boolean} If true, found env in the process.
   * (If reset is called twice then this value is incorrect)
   */
  get readEnvFromProcess() {
    return this.__readEnvFromProcess == true
  }

  /** @type {string[]} All the possible string names for the argument */
  get names() {
    let names = this.name != null ? [this.name] : []
    if (this.aliases != null)
      names = names.concat(
        Array.isArray(this.aliases) ? this.aliases : [this.aliases]
      )
    return names.filter((n) => typeof n == 'string' && !/[^\w-]/g.test(n))
  }

  /**
   * @type {boolean} If true this property is required.
   * @default
   * type == 'positional' ? true : false
   */
  get require() {
    if (this.__require != null) return this.__require
    return this.type == 'positional' ? true : false
  }

  set require(val) {
    this.__require = val
  }

  /**
   * The env value currently assigned.
   */
  get env_value() {
    if (
      typeof this.environmentVariable == 'string' &&
      process.env[this.environmentVariable] != undefined
    )
      return process.env[this.environmentVariable]
    return null
  }

  /**
   * Updates the environment value to match the arg value.
   */
  set_value_to_env() {
    if (this.doNotAssignToEnv) return
    if (typeof this.environmentVariable == 'string') {
      const val = this.value || this.default
      if (val == null) delete process.env[this.environmentVariable]
      else process.env[this.environmentVariable] = val
      this.envHasBeenUpdated = true
    }
  }

  /**
   * Will reset the current assignment state of the
   * argument.
   */
  async reset() {
    this.envHasBeenUpdated = false
    this.__assignmentState = null
    this.__readEnvFromProcess = this.env_value != null
    this.default = this.env_value || this.default
    await this.assign(this.default)
  }

  /**
   * @type {boolean|Error}
   * If true then was assigned.
   * if false then was skipped.
   * if null then no assign attempt.
   * if error then there was an assignment error.
   */
  get state() {
    return this.__assignmentState
  }

  /**
   * Return true if the current value is a collection
   * of multiple input arguments.
   */
  get isCollectableValue() {
    switch (this.type) {
      case 'overflow':
      case 'transfer':
        return true
      case 'named':
        return this.collectMultiple
      default:
        return false
    }
  }

  /**
   * Assigns the value to the field.
   * @param {any} value The value to assign to the filed.
   */
  async assign(value) {
    let parse = typeof this.parse == 'function' ? this.parse : () => value
    const parse_value = async () => {
      try {
        return await parse(value)
      } catch (err) {
        this.__assignmentState = err
        // do not change the value.
        return this.value
      }
    }
    switch (this.type) {
      case 'flag':
        this.value = parse
          ? await parse_value()
          : value == true || value == 1 || value == '1' || value == 'true'
        break
      default:
        if (this.isCollectableValue) {
          if (typeof value == 'object' && Array.isArray(value)) {
            this.value = value
          }
          // not an array but a value.
          else if (value != null) {
            if (!Array.isArray(this.value)) this.value = []
            this.value.push(await parse_value())
          }
        }
        // regular value
        else this.value = await parse_value()
        break
    }

    if (this.doNotAssignToParent != true)
      this.parent[this.field_name] = this.value

    this.set_value_to_env()
    this.__assignmentState = true
  }

  /**
   * Returns true of the field matches the arg name.
   * @param {string} name The name to match.
   */
  matches(name) {
    return (
      this.name == name ||
      (this.aliases || []).some((a) =>
        a instanceof RegExp ? a.test(name) : Pattern.test(a, name)
      )
    )
  }
}

module.exports = CliArgument
