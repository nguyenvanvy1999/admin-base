import { type IDb, prisma } from '@server/configs/db';
import { appEnv, type IEnv } from '@server/configs/env';
import { type ILogger, logger } from '@server/configs/logger';
import {
  type PasswordService,
  passwordService,
} from '@server/services/auth/password.service';
import {
  CURRENCY_IDS,
  DB_PREFIX,
  type DbIdGen,
  defaultRoles,
  defaultSettings,
  IdUtil,
  OAUTH,
  PERMISSIONS,
  SETTING,
  SUPER_ADMIN_ID,
} from '@server/share';

export class SeedService {
  constructor(
    private readonly deps: {
      db: IDb;
      passwordService: PasswordService;
      logger: ILogger;
      env: IEnv;
      dbId: DbIdGen;
    } = {
      db: prisma,
      passwordService,
      logger,
      env: appEnv,
      dbId: new IdUtil().dbId,
    },
  ) {}

  async seedRoles(): Promise<void> {
    try {
      const roles = Object.values(defaultRoles);

      await this.deps.db.$transaction(async (tx) => {
        // Get existing roles to avoid duplicates
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

        // Create new roles in a batch
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

      this.deps.logger.warning('Seed roles successfully.');
    } catch (e) {
      this.deps.logger.error(`Seed roles failed ${e}`);
    }
  }

  async seedAuthProviders(): Promise<void> {
    try {
      await this.deps.db.authProvider.upsert({
        where: { code: OAUTH.GOOGLE },
        create: {
          id: this.deps.dbId(DB_PREFIX.AUTH_PROVIDER),
          code: OAUTH.GOOGLE,
          name: 'Google',
          enabled: true,
          config: {
            clientId:
              '19913563293-55a3511md6bs80cmusmjbtca9mvq6mch.apps.googleusercontent.com',
          },
        },
        update: {
          code: OAUTH.GOOGLE,
        },
        select: { id: true },
      });
      this.deps.logger.warning('Seed provider model successfully.');
    } catch (e) {
      this.deps.logger.error(`Seed provider model failed ${e}`);
    }
  }

  async seedSettings(): Promise<void> {
    try {
      await this.deps.db.setting.deleteMany({
        where: { key: { notIn: Object.values(SETTING) } },
      });
      await this.deps.db.setting.createMany({
        data: Object.values(SETTING).map((key) => ({
          id: this.deps.dbId(DB_PREFIX.SETTING),
          key,
          ...defaultSettings[key],
        })),
        skipDuplicates: true,
      });
      this.deps.logger.warning('Seed settings successfully.');
    } catch (e) {
      this.deps.logger.error(`Seed settings failed ${e}`);
    }
  }

  async seedPermissions(): Promise<void> {
    try {
      const perms: Record<
        string,
        Record<string, { roles: string[]; description?: string }>
      > = PERMISSIONS;

      // Prepare all permission data for batch operations
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
              id: this.deps.dbId(DB_PREFIX.PERMISSION),
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

        // Create new permissions in a batch
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

        // Prepare role-permission relationships for batch creation
        const rolePermissionData: Array<{
          id: string;
          roleId: string;
          permissionId: string;
        }> = [];

        // For existing permissions, get their IDs
        const allPermissions = await tx.permission.findMany({
          where: {
            title: { in: permissionData.map((p) => p.title) },
          },
          select: { id: true, title: true },
        });

        const permissionMap = new Map(
          allPermissions.map((p) => [p.title, p.id]),
        );

        // Generate role-permission relationships
        permissionData.forEach((permission) => {
          const permissionId = permissionMap.get(permission.title);
          if (permissionId) {
            permission.roles.forEach((roleId) => {
              rolePermissionData.push({
                id: this.deps.dbId(),
                roleId,
                permissionId,
              });
            });
          }
        });

        // Create role-permission relationships in batch
        if (rolePermissionData.length > 0) {
          await tx.rolePermission.createMany({
            data: rolePermissionData,
            skipDuplicates: true,
          });
        }
      });

      this.deps.logger.warning('Seed permissions successfully.');
    } catch (e) {
      this.deps.logger.error(`Seed permissions failed ${e}`);
    }
  }

  async seedSuperAdmin(): Promise<void> {
    try {
      const existingSuperAdmin = await this.deps.db.user.findUnique({
        where: { id: SUPER_ADMIN_ID },
      });

      if (existingSuperAdmin) {
        this.deps.logger.info('Super admin already exists, skipping seed');
        return;
      }

      const passwordRes = await this.deps.passwordService.createPassword(
        this.deps.env.SUPER_ADMIN_PASSWORD,
      );

      await this.deps.db.user.upsert({
        where: { id: SUPER_ADMIN_ID },
        create: {
          id: SUPER_ADMIN_ID,
          username: this.deps.env.SUPER_ADMIN_USERNAME,
          baseCurrencyId: CURRENCY_IDS.VND,
          ...passwordRes,
        },
        update: {
          id: SUPER_ADMIN_ID,
          ...passwordRes,
        },
        select: { id: true },
      });

      await this.deps.db.$transaction(async (tx) => {
        const superAdmin = await tx.user.upsert({
          where: { id: SUPER_ADMIN_ID },
          create: {
            id: SUPER_ADMIN_ID,
            username: this.deps.env.SUPER_ADMIN_USERNAME,
            baseCurrencyId: CURRENCY_IDS.VND,
            ...passwordRes,
          },
          update: {
            id: SUPER_ADMIN_ID,
            ...passwordRes,
          },
          select: { id: true },
        });

        await tx.rolePlayer.createMany({
          data: {
            id: this.deps.dbId(),
            playerId: superAdmin.id,
            roleId: defaultRoles.admin.id,
          },
          skipDuplicates: true,
        });

        this.deps.logger.info(
          `Super admin created successfully with username: ${this.deps.env.SUPER_ADMIN_USERNAME}`,
        );
      });
    } catch (error) {
      this.deps.logger.error('Error seeding super admin', { error });
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

  async seedAll(): Promise<void> {
    await this.seedSettings();
    await this.seedAuthProviders();
    await this.seedRoles();
    await this.seedPermissions();
    await this.seedCurrencies();
    await this.seedSuperAdmin();
  }
}

export const seedService = new SeedService();
