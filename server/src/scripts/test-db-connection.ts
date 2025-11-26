import { db } from 'src/config/db';
import { logger } from 'src/config/logger';

/**
 * Test script to check database connection and prevent MaxListenersExceededWarning
 */
async function testDatabaseConnection() {
  try {
    logger.info('Testing database connection...');

    // Test basic connection
    await db.$connect();
    logger.info('✅ Database connected successfully');

    // Test a simple query
    const result = await db.$queryRaw`SELECT 1 as test`;
    logger.info(`✅ Database query test passed: ${JSON.stringify(result)}`);

    // Test connection pool
    const promises = Array.from({ length: 5 }, (_, i) => {
      return db.$queryRaw`SELECT ${i} as test_number`;
    });

    const results = await Promise.all(promises);
    logger.info(
      `✅ Connection pool test passed: ${results.length} queries executed`,
    );

    // Disconnect properly
    await db.$disconnect();
    logger.info('✅ Database disconnected successfully');
  } catch (error) {
    logger.error(`❌ Database connection test failed: ${error}`);
    process.exit(1);
  }
}

// Run the test
await testDatabaseConnection();
