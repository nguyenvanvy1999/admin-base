import { prisma } from '@server/configs/db';
import { logger } from '@server/configs/logger';
import { SeedService } from '@server/services/seed.service';

async function main() {
  try {
    const seedService = new SeedService();
    await seedService.seedAll();
  } catch (error) {
    logger.error('Error seeding', { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main().then();
