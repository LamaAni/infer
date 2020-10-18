new (require('./index').Cli)({ name: 'my_cli' })
  .default(
    async ({ arg = null, flag = false }) => {
      console.info('Recived argument: ' + arg)
      console.info('Flag is: ' + flag)
    },
    {
      arg: {
        type: 'named',
        aliases: ['a'],
      },
      flag: {
        type: 'flag',
      },
    }
  )
  .showHelp()
  .parse(['-a', 'The argument'])
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
