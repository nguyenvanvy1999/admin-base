import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import { RateLimitStrategy, RateLimitType, UserStatus } from 'src/generated';
import {
  type PasswordService,
  passwordService,
} from 'src/service/auth/password.service';
import {
  ADMIN_USER_ID,
  DB_PREFIX,
  defaultRoles,
  defaultSettings,
  IdUtil,
  OAUTH,
  PERMISSIONS,
  SETTING,
  SYS_USER_ID,
} from 'src/share';

const SYSTEM_USER_EMAIL = 'system@admin-base.local';
const ADMIN_USER_EMAIL = 'admin@admin-base.local';
const SYSTEM_USER_NAME = 'System User';
const ADMIN_USER_NAME = 'Administrator';

type SeedUserParams = {
  id: string;
  email: string;
  name: string;
  password: string;
  roleId: string;
};

const rateLimitDefaults: Record<
  RateLimitType,
  { limit: number; windowSeconds: number; strategy: RateLimitStrategy }
> = {
  [RateLimitType.login]: {
    limit: 5,
    windowSeconds: 60,
    strategy: RateLimitStrategy.ip_ua,
  },
  [RateLimitType.password_reset]: {
    limit: 3,
    windowSeconds: 3600,
    strategy: RateLimitStrategy.ip_ua,
  },
  [RateLimitType.email_verification]: {
    limit: 3,
    windowSeconds: 3600,
    strategy: RateLimitStrategy.ip_ua,
  },
  [RateLimitType.api]: {
    limit: 100,
    windowSeconds: 60,
    strategy: RateLimitStrategy.ip,
  },
  [RateLimitType.file_upload]: {
    limit: 10,
    windowSeconds: 60,
    strategy: RateLimitStrategy.user,
  },
};

const buildAuthSeed = (
  type: RateLimitType,
  routePath: string,
  description: string,
) => ({
  type,
  routePath,
  description,
  ...rateLimitDefaults[type],
});

const authRateLimitSeeds: Array<{
  type: RateLimitType;
  routePath: string;
  limit: number;
  windowSeconds: number;
  strategy: RateLimitStrategy;
  description: string;
}> = [
  buildAuthSeed(RateLimitType.login, '/auth/login', 'Password login'),
  buildAuthSeed(RateLimitType.login, '/auth/login/mfa', 'MFA login challenge'),
  buildAuthSeed(
    RateLimitType.login,
    '/auth/login/mfa/confirm',
    'Confirm MFA login',
  ),
  buildAuthSeed(
    RateLimitType.email_verification,
    '/auth/user/register',
    'Register and send verification',
  ),
  buildAuthSeed(
    RateLimitType.email_verification,
    '/auth/user/verify-account',
    'Verify account email OTP',
  ),
  buildAuthSeed(
    RateLimitType.password_reset,
    '/auth/forgot-password',
    'Request password reset',
  ),
  buildAuthSeed(
    RateLimitType.password_reset,
    '/auth/change-password',
    'Change password after reset',
  ),
  buildAuthSeed(
    RateLimitType.api,
    '/auth/refresh-token',
    'Refresh access token',
  ),
];

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
              protected: true,
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
                id: IdUtil.dbId(),
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

      this.deps.logger.warning('Seed permissions successfully.');
    } catch (e) {
      this.deps.logger.error(`Seed permissions failed ${e}`);
    }
  }

  async seedRateLimitConfigs(): Promise<void> {
    try {
      await this.deps.db.$transaction(async (tx) => {
        const data = authRateLimitSeeds.map((config) => ({
          id: IdUtil.dbId(DB_PREFIX.RATE_LIMIT),
          type: config.type,
          routePath: config.routePath,
          limit: config.limit,
          windowSeconds: config.windowSeconds,
          strategy: config.strategy,
          description: config.description,
          enabled: true,
        }));

        await tx.rateLimitConfig.createMany({
          data,
          skipDuplicates: true,
        });
      });

      this.deps.logger.warning('Seed rate limit configs successfully.');
    } catch (e) {
      this.deps.logger.error(`Seed rate limit configs failed ${e}`);
    }
  }

  async seedUsers(): Promise<void> {
    try {
      await this.seedUser({
        id: SYS_USER_ID,
        email: SYSTEM_USER_EMAIL,
        name: SYSTEM_USER_NAME,
        password: this.deps.env.SYSTEM_PASSWORD,
        roleId: defaultRoles.system.id,
      });

      await this.seedUser({
        id: ADMIN_USER_ID,
        email: ADMIN_USER_EMAIL,
        name: ADMIN_USER_NAME,
        password: this.deps.env.ADMIN_PASSWORD,
        roleId: defaultRoles.administrator.id,
      });

      this.deps.logger.warning('Seed critical users successfully.');
    } catch (e) {
      this.deps.logger.error(`Seed critical users failed ${e}`);
    }
  }

  private async seedUser(params: SeedUserParams): Promise<void> {
    const passwordPayload = await this.deps.passwordService.createPassword(
      params.password,
    );

    await this.deps.db.user.upsert({
      where: { id: params.id },
      create: {
        id: params.id,
        email: params.email,
        name: params.name,
        status: UserStatus.active,
        emailVerified: true,
        ...passwordPayload,
        roles: {
          create: {
            id: IdUtil.dbId(),
            roleId: params.roleId,
          },
        },
        protected: true,
      },
      update: {
        status: UserStatus.active,
        emailVerified: true,
        protected: true,
        roles: {
          connectOrCreate: {
            where: {
              role_player_unique: {
                roleId: params.roleId,
                playerId: params.id,
              },
            },
            create: {
              id: IdUtil.dbId(),
              roleId: params.roleId,
            },
          },
        },
      },
      select: { id: true },
    });
  }

  async seedAll(): Promise<void> {
    await this.seedSettings();
    await this.seedAuthProviders();
    await this.seedRoles();
    await this.seedPermissions();
    await this.seedRateLimitConfigs();
    await this.seedUsers();
  }
}

export const seedService = new SeedService();
