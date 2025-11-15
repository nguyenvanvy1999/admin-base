import { type IDb, prisma } from '@server/configs/db';
import { appEnv } from '@server/configs/env';
import { logger } from '@server/configs/logger';
import { UserRole } from '@server/generated';
import {
  type PasswordService,
  passwordService,
} from '@server/services/auth/password.service';
import {
  CURRENCY_IDS,
  DB_PREFIX,
  defaultRoles,
  IdUtil,
  PERMISSIONS,
  SUPER_ADMIN_ID,
} from '@server/share';

export class SeedService {
  constructor(
    private readonly deps: { db: IDb; passwordService: PasswordService } = {
      db: prisma,
      passwordService,
    },
  ) {}

  async seedSuperAdmin(): Promise<void> {
    try {
      const existingSuperAdmin = await this.deps.db.user.findUnique({
        where: { id: SUPER_ADMIN_ID },
      });

      if (existingSuperAdmin) {
        logger.info('Super admin already exists, skipping seed');
        return;
      }

      const superAdminUsername = appEnv.SUPER_ADMIN_USERNAME || 'superadmin';
      const superAdminPassword = appEnv.SUPER_ADMIN_PASSWORD;

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

      await this.deps.db.$transaction(async (tx) => {
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

  async seedCurrencies(): Promise<void> {
    const currencies = [
      {
        id: CURRENCY_IDS.VND,
        code: 'VND',
        name: 'Vietnamese Dong',
        symbol: '₫',
        isActive: true,
      },
      {
        id: CURRENCY_IDS.USD,
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        isActive: true,
      },
    ];

    for (const currency of currencies) {
      await this.deps.db.currency.upsert({
        where: { code: currency.code },
        update: {
          name: currency.name,
          symbol: currency.symbol,
          isActive: currency.isActive,
        },
        create: currency,
      });
    }
  }

  async seedRoles(): Promise<void> {
    try {
      const roles = Object.values(defaultRoles);

      await this.deps.db.$transaction(async (tx) => {
        const existingRoles = await tx.role.findMany({
          where: {
            title: { in: roles.map((role) => role.title) },
          },
          select: { id: true, title: true },
        });

        const existingTitles = new Set(existingRoles.map((r) => r.title));
        const newRoles = roles.filter(
          (role) => !existingTitles.has(role.title),
        );

        if (newRoles.length > 0) {
          await tx.role.createMany({
            data: newRoles.map((role) => ({
              id: role.id,
              title: role.title,
              description: role.description,
            })),
            skipDuplicates: true,
          });
        }
      });

      logger.info('Seed roles successfully.');
    } catch (e) {
      logger.error(`Seed roles failed ${String(e)}`);
    }
  }

  async seedPermissions(): Promise<void> {
    try {
      const perms = PERMISSIONS as unknown as Record<
        string,
        Record<string, { roles: string[]; description?: string }>
      >;

      const permissionData: Array<{
        id: string;
        title: string;
        description?: string;
        roles: string[];
      }> = [];

      Object.keys(perms).forEach((category) => {
        Object.keys(perms[category] ?? {}).forEach((action) => {
          const per = perms[category]?.[action];
          if (per) {
            permissionData.push({
              id: IdUtil.dbId(DB_PREFIX.PERMISSION),
              title: `${category}.${action}`,
              description: per.description,
              roles: per.roles,
            });
          }
        });
      });

      await this.deps.db.$transaction(async (tx) => {
        const existingPermissions = await tx.permission.findMany({
          where: {
            title: { in: permissionData.map((p) => p.title) },
          },
          select: { id: true, title: true },
        });

        const existingTitles = new Set(existingPermissions.map((p) => p.title));
        const newPermissions = permissionData.filter(
          (p) => !existingTitles.has(p.title),
        );

        if (newPermissions.length > 0) {
          await tx.permission.createMany({
            data: newPermissions.map(({ id, title, description }) => ({
              id,
              title,
              description,
            })),
            skipDuplicates: true,
          });
        }

        const rolePermissionData: Array<{
          id: string;
          roleId: string;
          permissionId: string;
        }> = [];

        const allPermissions = await tx.permission.findMany({
          where: {
            title: { in: permissionData.map((p) => p.title) },
          },
          select: { id: true, title: true },
        });

        const permissionMap = new Map(
          allPermissions.map((p) => [p.title, p.id]),
        );

        permissionData.forEach((permission) => {
          const permissionId = permissionMap.get(permission.title);
          if (permissionId) {
            permission.roles.forEach((roleId) => {
              rolePermissionData.push({
                id: IdUtil.dbId(DB_PREFIX.ROLE),
                roleId,
                permissionId,
              });
            });
          }
        });

        if (rolePermissionData.length > 0) {
          await tx.rolePermission.createMany({
            data: rolePermissionData,
            skipDuplicates: true,
          });
        }
      });

      logger.info('Seed permissions successfully.');
    } catch (e) {
      logger.error(`Seed permissions failed ${String(e)}`);
    }
  }

  async seedAll(): Promise<void> {
    await this.seedRoles();
    await this.seedPermissions();
    await this.seedCurrencies();
  }
}

export default new SeedService();
