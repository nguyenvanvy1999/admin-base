import { db, type IDb } from 'src/config/db';
import { env, type IEnv } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import { UserStatus } from 'src/generated';
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

const SYSTEM_USER_EMAIL = 'system@investment.local';
const ADMIN_USER_EMAIL = 'admin@investment.local';
const SYSTEM_USER_NAME = 'System User';
const ADMIN_USER_NAME = 'Administrator';

const DEFAULT_CURRENCIES: Array<{
  code: string;
  name: string;
  symbol?: string;
}> = [
  { code: 'USD', name: 'United States Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'GBP', name: 'Pound Sterling' },
  { code: 'SGD', name: 'Singapore Dollar' },
];

type SeedUserParams = {
  id: string;
  email: string;
  name: string;
  password: string;
  roleId: string;
  baseCurrencyId: string;
};

type PasswordPayload = Awaited<ReturnType<PasswordService['createPassword']>>;

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

  async seedCurrencies(): Promise<void> {
    try {
      const codes = DEFAULT_CURRENCIES.map((currency) => currency.code);
      await this.deps.db.$transaction(async (tx) => {
        const existing = await tx.currency.findMany({
          where: { code: { in: codes } },
          select: { code: true },
        });

        const existingCodes = new Set(existing.map((item) => item.code));
        const newCurrencies = DEFAULT_CURRENCIES.filter(
          (currency) => !existingCodes.has(currency.code),
        );

        if (newCurrencies.length > 0) {
          await tx.currency.createMany({
            data: newCurrencies.map((currency) => ({
              id: IdUtil.dbId(),
              code: currency.code,
              name: currency.name,
              symbol: currency.symbol,
              isActive: true,
            })),
            skipDuplicates: true,
          });
        }

        for (const currency of DEFAULT_CURRENCIES) {
          await tx.currency.updateMany({
            where: { code: currency.code },
            data: {
              name: currency.name,
              symbol: currency.symbol,
              isActive: true,
            },
          });
        }
      });

      this.deps.logger.warning('Seed currencies successfully.');
    } catch (e) {
      this.deps.logger.error(`Seed currencies failed ${e}`);
    }
  }

  async seedUsers(): Promise<void> {
    try {
      let defaultCurrency = await this.deps.db.currency.findFirst({
        where: { isActive: true },
        orderBy: { code: 'asc' },
        select: { id: true },
      });

      if (!defaultCurrency) {
        await this.seedCurrencies();
        defaultCurrency = await this.deps.db.currency.findFirst({
          where: { isActive: true },
          orderBy: { code: 'asc' },
          select: { id: true },
        });
      }

      if (!defaultCurrency) {
        throw new Error('Default currency not found');
      }

      await this.seedUser({
        id: SYS_USER_ID,
        email: SYSTEM_USER_EMAIL,
        name: SYSTEM_USER_NAME,
        password: this.deps.env.SYSTEM_PASSWORD,
        roleId: defaultRoles.system.id,
        baseCurrencyId: defaultCurrency.id,
      });

      await this.seedUser({
        id: ADMIN_USER_ID,
        email: ADMIN_USER_EMAIL,
        name: ADMIN_USER_NAME,
        password: this.deps.env.ADMIN_PASSWORD,
        roleId: defaultRoles.administrator.id,
        baseCurrencyId: defaultCurrency.id,
      });

      this.deps.logger.warning('Seed critical users successfully.');
    } catch (e) {
      this.deps.logger.error(`Seed critical users failed ${e}`);
    }
  }

  private async seedUser(params: SeedUserParams): Promise<void> {
    const existingUser = await this.deps.db.user.findUnique({
      where: { id: params.id },
      select: { id: true, baseCurrencyId: true },
    });

    let passwordPayload: PasswordPayload | undefined;
    if (!existingUser) {
      passwordPayload = await this.deps.passwordService.createPassword(
        params.password,
      );
    }

    await this.deps.db.user.upsert({
      where: { id: params.id },
      create: {
        id: params.id,
        email: params.email,
        name: params.name,
        status: UserStatus.active,
        emailVerified: true,
        baseCurrencyId: params.baseCurrencyId,
        ...(passwordPayload ?? ({} as PasswordPayload)),
        roles: {
          create: {
            id: IdUtil.dbId(),
            roleId: params.roleId,
          },
        },
      },
      update: {
        status: UserStatus.active,
        emailVerified: true,
        baseCurrencyId: existingUser?.baseCurrencyId ?? params.baseCurrencyId,
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
    await this.seedCurrencies();
    await this.seedUsers();
  }
}

export const seedService = new SeedService();
