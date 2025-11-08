import { prisma } from '@server/libs/db';
import { logger } from '@server/libs/logger';
import { SeedService } from '@server/services/seed.service';

async function main() {
  try {
    const seedService = new SeedService();
    logger.info('Starting currency seed...');
    await seedService.seedCurrencies();
    logger.info('Currency seed completed successfully!');
  } catch (error) {
    logger.error('Error seeding currencies', { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
