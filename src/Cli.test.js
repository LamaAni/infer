const path = require('path')

const cli = new (require('./Cli'))({name: 'tester'}).default(
  null,
  {
    all_things_as_path: {
      aliases: ['a'],
      description: 'This is some arg',
    },
    and_yet_another: {
      description: 'This is another arg',
      require: true,
    },
    is_this_it: {
      description: 'Its it?',
    },
    path: {
      description: 'The system path',
      environmentVariable: 'PATH',
    },
    post: {
      aliases: ['p'],
      description: 'a positional arg',
      type: 'positional',
    },
  },
  {
    example: 'Do this and that.',
    description: 'The description of the current...',
  }
)

cli
  .new(
    'init',
    {
      path: {
        type: 'named',
        environmentVariable: 'PATH',
        description: 'The system path',
      },
      some_args: {
        type: 'named',
        default: 22,
        description: 'some',
      },
    },
    {description: 'Initialize something.. '}
  )
  .set('lama')
  .set('kka')

const doArgs = {
  what: {
    type: 'positional',
    require: true,
  },
  to_do: {
    aliases: ['t'],
    require: true,
  },
}

const do_something = cli.new('do something', null)

do_something.on(
  'special',
  (args) => {
    console.log('special ' + args.what + ' ' + args.to_do)
  },
  doArgs,
  {description: 'Dose something very special'}
)

do_something.on(
  'regular',
  (args) => {
    console.log('regular ' + args.what + ' ' + args.to_do)
  },
  doArgs,
  {description: 'Dose something very regular'}
)

cli.on(
  'do mundane',
  (args) => {
    console.log('mundane ' + args.what + ' ' + args.to_do)
  },
  doArgs,
  {
    description: 'Do mundane a mundane task',
  }
)

async function main() {
  await cli.parse()

  const commands = [
    'init --help',
    'special --help',
    'do --help',
    'do something --help',
    'do something regular --help',
    'do something special --help',
    'do mundane dance -t forme',
    'do something regular write -t script',
    'do something special make -t movie',
  ]
  for (let cmd of commands) {
    cli.logger.info(
      `Running: ./${path.basename(__filename)} ` + cmd.green,
      '=>'.cyan
    )
    await cli.parse(cmd)
    console.log()
  }
}

main().catch((err) => console.error(err))
