import { db } from 'src/config/db';
import { logger } from 'src/config/logger';

async function testDatabaseConnection() {
  try {
    logger.info('Testing database connection...');

    await db.$connect();
    logger.info('✅ Database connected successfully');

    const result = await db.$queryRaw`SELECT 1 as test`;
    logger.info(`✅ Database query test passed: ${JSON.stringify(result)}`);

    const promises = Array.from({ length: 5 }, (_, i) => {
      return db.$queryRaw`SELECT ${i} as test_number`;
    });

    const results = await Promise.all(promises);
    logger.info(
      `✅ Connection pool test passed: ${results.length} queries executed`,
    );

    await db.$disconnect();
    logger.info('✅ Database disconnected successfully');
  } catch (error) {
    logger.error(`❌ Database connection test failed: ${error}`);
    process.exit(1);
  }
}

await testDatabaseConnection();
