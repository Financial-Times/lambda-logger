import logger from '../index';

test('it logs at info level without exception', () => {
    logger.info({ someObject: { withNesting: true } }, 'someMessage');
});
