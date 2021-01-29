const path = require('path')
const log = new (require('./logger/Logger'))('debug')
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
    log.info(this.lama)
  }
}

const omap = new CLIObjectMap()
new Cli({args: omap})
  .default(() => {
    throw new Error('error')
    console.log('lama')
  })
  .showHelp()
  .parse([])
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
