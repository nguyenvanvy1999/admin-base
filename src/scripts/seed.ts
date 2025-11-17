import { prisma } from '@server/configs/db';
import { logger } from '@server/configs/logger';
import { seedService } from '@server/services/misc';

async function main() {
  try {
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
