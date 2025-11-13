import { CURRENCY_IDS } from '@server/constants/currency';
import { UserRole } from '@server/generated/prisma/enums';
import { prisma } from '@server/libs/db';
import { logger } from '@server/libs/logger';
import { DB_PREFIX, defaultRoles, IdUtil, SUPER_ADMIN_ID } from '@server/share';

export async function seedSuperAdmin(): Promise<void> {
  try {
    const existingSuperAdmin = await prisma.user.findUnique({
      where: { id: SUPER_ADMIN_ID },
    });

    if (existingSuperAdmin) {
      logger.info('Super admin already exists, skipping seed');
      return;
    }

    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!superAdminPassword) {
      logger.warn(
        'SUPER_ADMIN_PASSWORD environment variable is not set, skipping super admin seed',
      );
      return;
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
    logger.error('Error seeding super admin', { error });
    throw error;
  }
}
