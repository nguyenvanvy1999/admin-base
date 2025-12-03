import { logger } from 'src/config/logger';
import { seedService } from 'src/service/misc/seed.service';

async function main() {
  try {
    logger.info('Starting seed process...');

    await seedService.seedAll();

    logger.info('Seed process completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error(`Seed process failed: ${error}`);
    process.exit(1);
  }
}

main().then();
