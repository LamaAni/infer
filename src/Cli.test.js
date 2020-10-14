const cli = new (require('./Cli'))('tester')

// set the default command.
cli.set(
  '',
  {
    all_things_as_path: {
      aliases: ['a'],
      description: 'This is some arg'
    },
    and_yet_another: {
      description: 'This is another arg',
      require: true
    },
    is_this_it: {
      description: 'Its it?'
    },
    path: {
      description: 'The system path',
      enviromentVariable: 'PATH'
    },
    post: {
      aliases: ['p'],
      description: 'a positional arg',
      type: 'positional'
    }
  },
  {
    example: 'Do this and that.',
    description: 'The description of the current...'
  }
)

// cli.set(
//   'an internal command that needs to be set',
//   {},
//   {
//     description: 'The internal command.'
//   }
// )

cli
  .setCollection(
    'init',
    {
      path: {
        type: 'named',
        enviromentVariable: 'PATH'
      },
      some_arg: {
        type: 'named'
      }
    },
    { description: 'Initialize something.. ' }
  )
  .set('lama')
  .set('kka')

const somethingOptions = {
  what: {
    type: 'positional',
    require: true
  },
  to_do: {
    aliases: ['t'],
    require: true
  }
}

cli.set('special', somethingOptions, {
  action(args) {
    console.log('special ' + args.what + ' ' + args.to_do)
  }
})

cli.set('do something regular', somethingOptions, {
  action(args) {
    console.log('regular ' + args.what + ' ' + args.to_do)
  }
})

// ---------------------------------

// function parse_n_print(argv) {
//   if (typeof argv == 'string') argv = toArgv(argv)
//   cli.parse(argv)
// }

// parse_n_print('jinaj pos1 pos2 "a more complicated value" -- t1 t2 t3')
// parse_n_print('init lama --a --b thesomeval pos1 pos2')
// parse_n_print('init kka --a --b pos1 pos2')
// parse_n_print('init lama')
// parse_n_print('do something regular special --to-do service')
// parse_n_print('do something special distractively --to-do ignore')

// cli.showHelp()
cli.showHelp()
// cli.showHelp('init')
