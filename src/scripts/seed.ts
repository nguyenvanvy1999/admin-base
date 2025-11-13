import { prisma } from '@server/libs/db';
import { logger } from '@server/libs/logger';
import { AuthSeedService } from '@server/services/auth-seed.service';
import { SeedService } from '@server/services/seed.service';

async function main() {
  try {
    const seedService = new SeedService();
    const authSeedService = new AuthSeedService();

    logger.info('Starting currency seed...');
    await seedService.seedCurrencies();
    logger.info('Currency seed completed successfully!');

    logger.info('Starting auth seed (roles and permissions)...');
    await authSeedService.seedRolesAndPermissions();
    logger.info('Auth seed completed successfully!');
  } catch (error) {
    logger.error('Error seeding', { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
