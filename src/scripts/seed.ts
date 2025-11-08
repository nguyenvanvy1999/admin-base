import { prisma } from '@server/db';
import { SeedService } from '@server/services/seed.service';

async function main() {
  try {
    const seedService = new SeedService();
    console.log('Starting currency seed...');
    await seedService.seedCurrencies();
    console.log('Currency seed completed successfully!');
  } catch (error) {
    console.error('Error seeding currencies:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
