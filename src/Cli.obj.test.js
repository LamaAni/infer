const path = require('path')
const log = new (require('./logger/Logger'))('omap')
const {Cli, CliArgument} = require('./index')

class CLIObjectMap {
  constructor() {
    this.lama = 'asd'
    /** @type {CliArgument} */
    this.__$lama = {
      type: 'named',
      default: this.lama,
      environmentVariable: 'ZCLI_INPUT_lama',
      description: 'The arg',
    }

    this.kka = 'asd'
    /** @type {CliArgument} */
    this.__$kka = {
      type: 'named',
      default: this.kka,
      environmentVariable: 'ZCLI_INPUT_kka',
      description: 'The arg',
    }

    this._name_ = '_value_'
    /**
     * __description__
     * @type {CliArgument}
     */
    this.__$_name_ = {
      name: 'name',
      type: 'named',
      environmentVariable: 'ZCLI_ARG__name_',
      default: this._name_,
      description: '__description__',
    }

    /** The description to use */
    this.the_value = 'a value'
    /** @type {CliArgument} */
    this.__$the_value = {
      type: 'named',
      environmentVariable: 'ZCLI_ARG_THE_VALUE',
      default: this.the_value,
      description: 'The description to use',
    }

    /** Yet another value */
    this.the_value_2 = 'another value'
    /** @type {CliArgument} */
    this.__$the_value_2 = {
      type: 'named',
      enviromentVariable: 'ZCLI_ARG_THE_VALUE_2',
      default: this.the_value_2,
      description: 'Yet another value',
    }
  }

  async do_something({lama}) {
    log.info(lama || 'unknown value!!')
    log.info(this.kka || 'unknown value!!')
    throw new Error('Valid error')
  }
}

const omap = new CLIObjectMap()
new Cli({args: omap})
  .default(omap.do_something)
  .showHelp()
  .parse(['--lama', '1234', '--kka', '22'])
  .catch((err) => {
    if (err.message != 'Valid error') {
      console.error(err)
      process.exit(1)
    }
  })
