import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import {
  type PasswordService,
  passwordService,
} from 'src/service/auth/password.service';
import {
  DB_PREFIX,
  defaultRoles,
  defaultSettings,
  IdUtil,
  OAUTH,
  PERMISSIONS,
  SETTING,
} from 'src/share';

export class SeedService {
  constructor(
    private readonly deps: {
      db: IDb;
      env: IEnv;
      logger: ILogger;
      passwordService: PasswordService;
    } = {
      db,
      env,
      logger,
      passwordService,
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
          id: IdUtil.dbId(DB_PREFIX.AUTH_PROVIDER),
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
      await this.deps.db.authProvider.upsert({
        where: { code: OAUTH.TELEGRAM },
        create: {
          id: IdUtil.dbId(DB_PREFIX.AUTH_PROVIDER),
          code: OAUTH.TELEGRAM,
          name: 'Telegram',
          enabled: true,
          config: { botToken: this.deps.env.TELEGRAM_BOT_TOKEN },
        },
        update: {
          code: OAUTH.TELEGRAM,
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
          id: IdUtil.dbId(DB_PREFIX.SETTING),
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
                id: IdUtil.dbId(),
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

  async seedAll(): Promise<void> {
    await this.seedSettings();
    await this.seedAuthProviders();
    await this.seedRoles();
    await this.seedPermissions();
  }
}

export const seedService = new SeedService();
