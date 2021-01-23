const logger = require('./log')()
const sub_logger = logger.create('sub')
const sub_sub_logger = logger.create('sub-sub')

logger.level = 0
logger.trace('lama')
logger.debug('lama')
logger.info('lama')
logger.warn('lama')
logger.error('lama')
logger.fatal('lama')

logger.trace('lama', '*')
logger.debug('lama', '=>')
logger.info('lama', '=>')
logger.warn('lama', '=>')
logger.error('lama', '=>')
logger.fatal('lama', '=>')

sub_sub_logger.info('lama-sub-sub')
sub_logger.info('lama-sub')
logger.info('lama-parent')
