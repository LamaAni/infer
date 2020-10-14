const Cli = require('./Cli')

/** @typedef {import('./CliArgument')} CliArgument */

class MyRunner {
  constructor() {
    // arguments that start with __$
    // are cli arguments, and will
    // be set to this object when parsed.

    /** @type {CliArgument} */
    this.__$arg = {
      type: 'named',
      description: 'Some cli argument',
      aliases: ['a'],
      parse: val => val,
      default: 'will be set to arg'
    }
    /** Will be set to this value */
    this.arg = null
  }

  run(options) {}
}

const cli = new Cli('myapp')
const myrunner = new MyRunner()

// the command: myapp run class
cli.set('run class', myrunner, {
  description: 'Get options from a class',
  action: options => myrunner.run(options)
})

cli.set(
  'run special',
  {
    arg: {
      type: 'named',
      aliases: ['a']
    },
    flag: {
      type: 'flag'
    }
  },
  {
    description: 'run an anonymous action.',
    action: options => console.log(JSON.stringify(options, null, 2))
  }
)

// -------------------------------------------
// allow configuration
const fs = require('fs')
const CliConfigCommand = require('./CliConfigCommand')
new CliConfigCommand(
  cli,
  () => require('./my_config.json'),
  config => {
    fs.writeFileSync('./my_config.json', JSON.stringify(config))
  }
)
