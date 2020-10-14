# A CLI tool with file configuration

This engine allows for the efficient, object centric auto generated
command line interface, which allows one to save and load
the configuration from a file.

Once more stable, this cli engine will be separated from the
zmake project, so it can be used in others.

Cli tool name will be zlib-cli (WIP)

### NOTE

Currently replace `zlib-cli` with `.`, since this is
an in project constructor.

## TL;DR

In the short version, to define a cli:

```javascript
const Cli = require('zlib-cli')

const cli = new Cli('myapp')
const myrunner = new MyRunner()

// optional sub menu:
cli.set('run', {}, { description: 'stuff to run' })

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

cli
  .parse()
  .then(rslt => {
    if (typeof rslt == 'number' && rslt > 0) process.exit(rslt)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
```

Where MyRunner is,

```javascript
/** @typedef {import('zlib-cli/CliArgument')} CliArgument */

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
```

To list options,

```shell
my_app --help
```

## Commands

In `zlib-cli`, all commands are a sentence
with added parse arguments, an example for a simple command would be,

```
myapp run special case positional_1 --flag --arg val positional_2
```

This command, when parsed, is translated to:

```javascript
command_name='myapp run special case'
command_options={
  positional: ['positional_1','positional_2']
  named: {
    flag: true,
    arg: 'val'
  }
}
```

Named arguments or flags are not position dependent, therefore, the
following is equivalent,

```
myapp --flag run special --arg val case positional_1 positional_2
```

There are no combined flags, i.e. no `-wWyDt`. Single letter arguments or
aliases are automatically parsed as `-a` and multi letter is automatically parsed
as `--arg`.

### Arguments

#### Argument types:

1. `named` - a regular named argument. Any value. `--arg, -a`
2. `flag` - A named argument, but no value (true if exists, in config you must set the value). `--flag, -f`
3. `positional` - An argument that follows the command. Will be added to an array.
4. `env` - An argument that would not appear in the CLI, but rather is only loaded from the
   environment variable. (Can be assigned in config)
5. `overflow` - Catch all for any argument after the positional arguments. Allows
   unknown number of input arguments.
6. `transfer` - Catch any argument after the symbol `--`. This allows separation of command arguments
   from arguments that need transferring to another command.

| Name                | description                                                                                                                                | possible values                                                  | default                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| type                | The argument type                                                                                                                          | `['named', 'flag', 'positional', 'env', 'overflow', 'transfer']` | named                                                               |
| field_name          | The name of the field to update on the parent object                                                                                       | [any]                                                            | The field name in the object                                        |
| match               | The name of the argument to match if `named` or `flag`                                                                                     | [any]                                                            | the field name, where any non letter or number is replaced with `-` |
| default             | the default value.                                                                                                                         | [any]                                                            | [null]                                                              |
| enviromentVariable  | The matching environment variable. If exits, will be taken instead of default. The env in nodejs will be updated to match the field value. | [string]                                                         | If `env` then the field_name, otherwise null                        |
| aliases             | Array, the possible command aliases                                                                                                        | string[]                                                         | []                                                                  |
| description         | The argument description.                                                                                                                  | [string]                                                         | null                                                                |
| parse               | Method: `(val)=>[any]`. Called before any assignment.                                                                                      | [function]                                                       | null                                                                |
| doNotAssignToParent | If true, dose not assign the argument to its parent.                                                                                       | `true`/`false`                                                   | `false`                                                             |
| doNotAssignToEnv    | If true, dose not assign the argument to the environment variable.                                                                         | `true`/`false`                                                   | `false`                                                             |
| canBeStored         | If true, allows this argument to be stored to disk (will appear in the configuration file)                                                 | `true`/`false`                                                   | `true`                                                              |

## File configuration manager

To add a file configuration manager,

```javascript
const cli = require('zlib-cli')
const fs = require('fs')
const CliConfigCommand = require('zlib-cli/CliConfigCommand')
new CliConfigCommand(
  cli,
  // command to load the configuration as a javascript object.
  () => require('./my_config.json'),
  // command to save the configuration to file.
  config => {
    fs.writeFileSync('./my_config.json', JSON.stringify(config))
  }
)
```

Then,

```shell
# to list
myapp config list
# myapp config get [command with dots] [named/flag]
myapp config get run.special.case arg
$> 48
# myapp config set [command with dots] [named/flag] [val/empty to remove]
myapp config set run.special.case arg 42
```
