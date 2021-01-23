const Logger = require('../index').Logger

const logger = new Logger()
const sub_logger = logger.create('sub')
const sub_sub_logger = logger.create('sub-sub')

logger.level = 0
console.log('Normal log')
console.log()
logger.debug('lama')
logger.info('lama')
logger.warn('lama')
logger.error('lama')
logger.fatal('lama')
logger.trace('lama')

console.log()
console.log('With log symbols')
console.log()

logger.debug('lama', '=>')
logger.info('lama', '=>')
logger.warn('lama', '=>')
logger.error('lama', '=>')
logger.fatal('lama', '=>')
logger.trace('lama', '*')

console.log()
console.log('Sub loggers')
console.log()

sub_sub_logger.info('lama-sub-sub')
sub_logger.info('lama-sub')
logger.info('lama-parent')
