import { CURRENCY_IDS } from '@server/constants/currency';
import { UserRole } from '@server/generated/prisma/enums';
import { prisma } from '@server/libs/db';
import { appEnv } from '@server/libs/env';
import { logger } from '@server/libs/logger';
import { DB_PREFIX, defaultRoles, IdUtil, SUPER_ADMIN_ID } from '@server/share';

async function main() {
  try {
    const existingSuperAdmin = await prisma.user.findUnique({
      where: { id: SUPER_ADMIN_ID },
    });

    if (existingSuperAdmin) {
      logger.info('Super admin already exists, skipping seed');
      return;
    }

    const superAdminUsername = appEnv.SUPER_ADMIN_USERNAME || 'superadmin';
    const superAdminPassword = appEnv.SUPER_ADMIN_PASSWORD;

    if (!superAdminPassword) {
      logger.error('SUPER_ADMIN_PASSWORD environment variable is required');
      process.exit(1);
    }

    const hashedPassword = await Bun.password.hash(
      superAdminPassword,
      'bcrypt',
    );

    await prisma.$transaction(async (tx) => {
      const superAdmin = await tx.user.create({
        data: {
          id: SUPER_ADMIN_ID,
          username: superAdminUsername,
          password: hashedPassword,
          role: UserRole.admin,
          baseCurrencyId: CURRENCY_IDS.VND,
        },
      });

      await tx.rolePlayer.create({
        data: {
          id: IdUtil.dbId(DB_PREFIX.ROLE),
          playerId: superAdmin.id,
          roleId: defaultRoles.admin.id,
        },
      });

      logger.info(
        `Super admin created successfully with username: ${superAdminUsername}`,
      );
    });
  } catch (error) {
    logger.error(`Error seeding super admin ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
