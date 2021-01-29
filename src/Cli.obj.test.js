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

  async do_something() {
    log.info(this.lama || 'unknown value!!')
  }
}

const omap = new CLIObjectMap()
new Cli({args: omap})
  .default(omap.do_something)
  .showHelp()
  .parse(['--lama', '1234'])
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
