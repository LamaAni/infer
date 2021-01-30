const path = require('path')
const log = new (require('./logger/Logger'))('omap')
const Cli = require('./Cli')
const CliArgument = require('./CliArgument')

class CLIObjectMap {
  constructor() {
    this.lama = 'asd'
    /** @type {CliArgument} */
    this.__$lama = {
      type: 'named',
      default: this.lama,
      enviromentVariable: 'ZCLI_INPUT_lama',
      description: 'The arg',
    }

    this.kka = 'asd'
    /** @type {CliArgument} */
    this.__$kka = {
      type: 'named',
      default: this.kka,
      enviromentVariable: 'ZCLI_INPUT_kka',
      description: 'The arg',
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
