import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { IEnv } from 'src/config/env';
import type { ILogger } from 'src/config/logger';
import type { PasswordService } from 'src/service/auth/password.service';
import { SeedService } from 'src/service/misc/seed.service';
import {
  ADMIN_USER_ID,
  defaultRoles,
  defaultSettings,
  OAUTH,
  PERMISSIONS,
  SETTING,
  SYS_USER_ID,
} from 'src/share';
import { SeedFixtures } from 'test/fixtures';
import { TestLifecycle } from 'test/utils';
import {
  createPrismaMock,
  type PrismaMockClient,
} from 'test/utils/mocks/prisma';

describe('SeedService', () => {
  let mockDb: PrismaMockClient;
  let mockEnv: IEnv;
  let mockLogger: ILogger;
  let mockPasswordService: PasswordService;

  function buildSeedService(
    overrides?: Partial<{
      db: PrismaMockClient;
      env: IEnv;
      logger: ILogger;
      passwordService: PasswordService;
    }>,
  ): {
    service: SeedService;
    deps: {
      db: PrismaMockClient;
      env: IEnv;
      logger: ILogger;
      passwordService: PasswordService;
    };
  } {
    const db = overrides?.db ?? mockDb;
    const env = overrides?.env ?? mockEnv;
    const logger = overrides?.logger ?? mockLogger;
    const passwordService = overrides?.passwordService ?? mockPasswordService;

    const service = new SeedService({
      db,
      env,
      logger,
      passwordService,
    } as any);

    return { service, deps: { db, env, logger, passwordService } };
  }

  function setupTransactionMock(
    callback?: (tx: PrismaMockClient) => Promise<unknown> | unknown,
  ) {
    mockDb.$transaction.mockImplementation(async (cb) => {
      if (typeof cb === 'function') {
        return await cb(mockDb);
      }
      if (callback) {
        return await callback(mockDb);
      }
      return mockDb;
    });
  }

  beforeEach(() => {
    mockDb = createPrismaMock();
    mockEnv = {
      SYSTEM_PASSWORD: 'system_password_123',
      ADMIN_PASSWORD: 'admin_password_123',
      TELEGRAM_BOT_TOKEN: 'telegram_bot_token_123',
    } as IEnv;
    mockLogger = {
      warning: mock(() => undefined),
      error: mock(() => undefined),
      info: mock(() => undefined),
      debug: mock(() => undefined),
    } as unknown as ILogger;
    mockPasswordService = {
      createPassword: mock(async (password: string) => ({
        password: `hashed_${password}`,
        passwordCreated: new Date(),
        passwordExpired: new Date(),
      })),
    } as unknown as PasswordService;

    setupTransactionMock();
  });

  afterEach(() => {
    TestLifecycle.clearMock();
  });

  describe('seedRoles', () => {
    it('should create all roles when none exist', async () => {
      const { service } = buildSeedService();

      mockDb['role'].findMany.mockResolvedValueOnce([]);
      mockDb['role'].createMany.mockResolvedValueOnce({ count: 3 });

      await service.seedRoles();

      expect(mockDb.$transaction).toHaveBeenCalled();
      expect(mockDb['role'].findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: expect.objectContaining({
              in: expect.arrayContaining([
                defaultRoles.system.title,
                defaultRoles.administrator.title,
                defaultRoles.user.title,
              ]),
            }),
          }),
        }),
      );
      expect(mockDb['role'].createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ title: defaultRoles.system.title }),
            expect.objectContaining({
              title: defaultRoles.administrator.title,
            }),
            expect.objectContaining({ title: defaultRoles.user.title }),
          ]),
          skipDuplicates: true,
        }),
      );
      expect(mockLogger.warning).toHaveBeenCalledWith(
        'Seed roles successfully.',
      );
    });

    it('should skip when all roles already exist', async () => {
      const { service } = buildSeedService();
      const existingRoles = [
        SeedFixtures.createRole({ title: defaultRoles.system.title }),
        SeedFixtures.createRole({
          title: defaultRoles.administrator.title,
        }),
        SeedFixtures.createRole({ title: defaultRoles.user.title }),
      ];

      mockDb['role'].findMany.mockResolvedValueOnce(existingRoles);

      await service.seedRoles();

      expect(mockDb['role'].createMany).not.toHaveBeenCalled();
      expect(mockLogger.warning).toHaveBeenCalled();
    });

    it('should create partial roles when some exist', async () => {
      const { service } = buildSeedService();
      const existingRoles = [
        SeedFixtures.createRole({ title: defaultRoles.system.title }),
      ];

      mockDb['role'].findMany.mockResolvedValueOnce(existingRoles);
      mockDb['role'].createMany.mockResolvedValueOnce({ count: 2 });

      await service.seedRoles();

      expect(mockDb['role'].createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              title: defaultRoles.administrator.title,
            }),
            expect.objectContaining({ title: defaultRoles.user.title }),
          ]),
        }),
      );
    });

    it('should handle transaction failure', async () => {
      const { service } = buildSeedService();

      mockDb.$transaction.mockRejectedValueOnce(
        new Error('Transaction failed'),
      );

      await service.seedRoles();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Seed roles failed'),
      );
    });
  });

  describe('seedAuthProviders', () => {
    it('should upsert Google provider successfully', async () => {
      const { service } = buildSeedService();

      mockDb['authProvider'].upsert
        .mockResolvedValueOnce({ id: 'provider_1' })
        .mockResolvedValueOnce({ id: 'provider_2' });

      await service.seedAuthProviders();

      expect(mockDb['authProvider'].upsert).toHaveBeenCalledTimes(2);
      expect(mockDb['authProvider'].upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { code: OAUTH.GOOGLE },
          create: expect.objectContaining({
            code: OAUTH.GOOGLE,
            name: 'Google',
            enabled: true,
          }),
          update: expect.objectContaining({ code: OAUTH.GOOGLE }),
        }),
      );
      expect(mockLogger.warning).toHaveBeenCalledWith(
        'Seed provider model successfully.',
      );
    });

    it('should upsert Telegram provider with bot token from env', async () => {
      const { service } = buildSeedService();

      mockDb['authProvider'].upsert
        .mockResolvedValueOnce({ id: 'provider_1' })
        .mockResolvedValueOnce({ id: 'provider_2' });

      await service.seedAuthProviders();

      expect(mockDb['authProvider'].upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { code: OAUTH.TELEGRAM },
          create: expect.objectContaining({
            code: OAUTH.TELEGRAM,
            name: 'Telegram',
            enabled: true,
            config: { botToken: mockEnv.TELEGRAM_BOT_TOKEN },
          }),
        }),
      );
    });

    it('should handle missing TELEGRAM_BOT_TOKEN in env', async () => {
      const customEnv = { ...mockEnv, TELEGRAM_BOT_TOKEN: undefined };
      const { service } = buildSeedService({ env: customEnv as IEnv });

      mockDb['authProvider'].upsert
        .mockResolvedValueOnce({ id: 'provider_1' })
        .mockResolvedValueOnce({ id: 'provider_2' });

      await service.seedAuthProviders();

      expect(mockDb['authProvider'].upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle upsert failure for Google provider', async () => {
      const { service } = buildSeedService();

      mockDb['authProvider'].upsert.mockRejectedValueOnce(
        new Error('Upsert failed'),
      );

      await service.seedAuthProviders();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Seed provider model failed'),
      );
    });

    it('should handle upsert failure for Telegram provider', async () => {
      const { service } = buildSeedService();

      mockDb['authProvider'].upsert
        .mockResolvedValueOnce({ id: 'provider_1' })
        .mockRejectedValueOnce(new Error('Telegram upsert failed'));

      await service.seedAuthProviders();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Seed provider model failed'),
      );
    });
  });

  describe('seedSettings', () => {
    it('should deleteMany settings not in SETTING enum and createMany all settings', async () => {
      const { service } = buildSeedService();

      mockDb['setting'].deleteMany.mockResolvedValueOnce({ count: 2 });
      mockDb['setting'].createMany.mockResolvedValueOnce({
        count: Object.keys(defaultSettings).length,
      });

      await service.seedSettings();

      expect(mockDb['setting'].deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            key: expect.objectContaining({
              notIn: expect.arrayContaining(Object.values(SETTING)),
            }),
          }),
        }),
      );
      expect(mockDb['setting'].createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ key: SETTING.ENB_IP_WHITELIST }),
            expect.objectContaining({
              key: SETTING.ENB_PASSWORD_ATTEMPT,
            }),
          ]),
          skipDuplicates: true,
        }),
      );
      expect(mockLogger.warning).toHaveBeenCalledWith(
        'Seed settings successfully.',
      );
    });

    it('should skip duplicates when all settings already exist', async () => {
      const { service } = buildSeedService();

      mockDb['setting'].deleteMany.mockResolvedValueOnce({ count: 0 });
      mockDb['setting'].createMany.mockResolvedValueOnce({ count: 0 });

      await service.seedSettings();

      expect(mockDb['setting'].deleteMany).toHaveBeenCalled();
      expect(mockDb['setting'].createMany).toHaveBeenCalled();
      expect(mockLogger.warning).toHaveBeenCalled();
    });

    it('should handle transaction failure', async () => {
      const { service } = buildSeedService();

      mockDb['setting'].deleteMany.mockRejectedValueOnce(
        new Error('Delete failed'),
      );

      await service.seedSettings();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Seed settings failed'),
      );
    });
  });

  describe('seedPermissions', () => {
    it('should create all permissions and role-permission relationships', async () => {
      const { service } = buildSeedService();

      const permissions = Object.keys(PERMISSIONS).flatMap((category) =>
        Object.keys((PERMISSIONS as any)[category] ?? {}).map((action) => ({
          id: `perm_${category}_${action}`,
          title: `${category}.${action}`,
        })),
      );

      mockDb['permission'].findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(permissions);
      mockDb['permission'].createMany.mockResolvedValueOnce({
        count: permissions.length,
      });
      mockDb['rolePermission'].createMany.mockResolvedValueOnce({
        count: 10,
      });

      await service.seedPermissions();

      expect(mockDb.$transaction).toHaveBeenCalled();
      expect(mockDb['permission'].createMany).toHaveBeenCalled();
      expect(mockDb['rolePermission'].createMany).toHaveBeenCalled();
      expect(mockLogger.warning).toHaveBeenCalledWith(
        'Seed permissions successfully.',
      );
    });

    it('should skip duplicates when permissions already exist', async () => {
      const { service } = buildSeedService();

      const allPermissionTitles = Object.keys(PERMISSIONS).flatMap((category) =>
        Object.keys((PERMISSIONS as any)[category] ?? {}).map(
          (action) => `${category}.${action}`,
        ),
      );
      const existingPermissions = allPermissionTitles.map((title) =>
        SeedFixtures.createPermission({ title }),
      );

      mockDb['permission'].findMany
        .mockResolvedValueOnce(existingPermissions)
        .mockResolvedValueOnce(existingPermissions);
      mockDb['rolePermission'].createMany.mockResolvedValueOnce({ count: 0 });

      await service.seedPermissions();

      expect(mockDb['permission'].createMany).not.toHaveBeenCalled();
      expect(mockDb['rolePermission'].createMany).toHaveBeenCalled();
    });

    it('should handle permissions with empty roles array', async () => {
      const { service } = buildSeedService();

      const permissionTitles = Object.keys(PERMISSIONS).flatMap((category) =>
        Object.keys((PERMISSIONS as any)[category] ?? {}).map(
          (action) => `${category}.${action}`,
        ),
      );

      const existingPermissions = permissionTitles.map((title) =>
        SeedFixtures.createPermission({ title }),
      );

      mockDb['permission'].findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(existingPermissions);
      mockDb['permission'].createMany.mockResolvedValueOnce({
        count: permissionTitles.length,
      });
      mockDb['rolePermission'].createMany.mockResolvedValueOnce({ count: 0 });

      await service.seedPermissions();

      expect(mockDb['permission'].createMany).toHaveBeenCalled();
      expect(mockDb['rolePermission'].createMany).toHaveBeenCalled();
    });

    it('should handle transaction failure', async () => {
      const { service } = buildSeedService();

      mockDb.$transaction.mockRejectedValueOnce(
        new Error('Transaction failed'),
      );

      await service.seedPermissions();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Seed permissions failed'),
      );
    });
  });

  describe('seedUsers', () => {
    it('should create system and admin users when they do not exist', async () => {
      const { service } = buildSeedService();
      const currency = SeedFixtures.createCurrency({ id: 'currency_usd' });

      mockDb['currency'].findFirst.mockResolvedValueOnce(currency);
      mockDb['user'].findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await service.seedUsers();

      expect(mockDb['currency'].findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
      expect(mockPasswordService.createPassword).toHaveBeenNthCalledWith(
        1,
        mockEnv.SYSTEM_PASSWORD,
      );
      expect(mockPasswordService.createPassword).toHaveBeenNthCalledWith(
        2,
        mockEnv.ADMIN_PASSWORD,
      );
      expect(mockDb['user'].upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: SYS_USER_ID },
          create: expect.objectContaining({
            email: 'system@investment.local',
            roles: expect.objectContaining({
              create: expect.objectContaining({
                roleId: defaultRoles.system.id,
              }),
            }),
          }),
        }),
      );
      expect(mockDb['user'].upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: ADMIN_USER_ID },
          create: expect.objectContaining({
            email: 'admin@investment.local',
            roles: expect.objectContaining({
              create: expect.objectContaining({
                roleId: defaultRoles.administrator.id,
              }),
            }),
          }),
        }),
      );
      expect(mockLogger.warning).toHaveBeenCalledWith(
        'Seed critical users successfully.',
      );
    });

    it('should skip password creation when user already exists', async () => {
      const { service } = buildSeedService();
      const currency = SeedFixtures.createCurrency({ id: 'currency_usd' });
      const existingUser = SeedFixtures.createUser();

      mockDb['currency'].findFirst.mockResolvedValueOnce(currency);
      mockDb['user'].findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(existingUser);

      await service.seedUsers();

      expect(mockPasswordService.createPassword).not.toHaveBeenCalled();
      expect(mockDb['user'].upsert).toHaveBeenCalledTimes(2);
    });

    it('should log error when default currency is missing', async () => {
      const { service } = buildSeedService();

      mockDb['currency'].findFirst.mockResolvedValueOnce(null);

      await service.seedUsers();

      expect(mockDb['user'].upsert).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Seed critical users failed'),
      );
    });
  });

  describe('seedAll', () => {
    const seedAllMock = () => {
      mockDb['setting'].createMany.mockResolvedValue({ count: 0 });
      mockDb['authProvider'].upsert.mockResolvedValue({ id: 'provider_1' });
      mockDb['role'].findMany.mockResolvedValue([]);
      mockDb['role'].createMany.mockResolvedValue({ count: 0 });
      mockDb['permission'].findMany.mockResolvedValue([]);
      mockDb['permission'].createMany.mockResolvedValue({ count: 0 });
      mockDb['rolePermission'].createMany.mockResolvedValue({ count: 0 });
      (mockPasswordService.createPassword as any).mockResolvedValue({
        password: 'hashed',
        passwordCreated: new Date(),
        passwordExpired: new Date(),
      });
      mockDb['currency'].findFirst.mockResolvedValue({ id: 'currency_usd' });
      mockDb['user'].findUnique.mockResolvedValue(null);
      mockDb['user'].upsert.mockResolvedValue({ id: 'user_1' });
      mockDb['network'].findMany.mockResolvedValue([]);
      mockDb['network'].createMany.mockResolvedValue({ count: 0 });
      mockDb['currency'].findMany.mockResolvedValue([]);
      mockDb['currency'].createMany.mockResolvedValue({ count: 0 });
      mockDb['account'].findMany.mockResolvedValue([]);
      mockDb['accountSnapshot'].findMany.mockResolvedValue([]);
      mockDb['account'].createMany.mockResolvedValue({ count: 0 });
      mockDb['accountSnapshot'].createMany.mockResolvedValue({ count: 0 });
    };

    it('should call all seed methods in correct order', async () => {
      const { service } = buildSeedService();

      mockDb['setting'].deleteMany.mockResolvedValue({ count: 0 });
      seedAllMock();
      await service.seedAll();

      expect(mockDb['setting'].deleteMany).toHaveBeenCalled();
      expect(mockDb['setting'].createMany).toHaveBeenCalled();
      expect(mockDb['authProvider'].upsert).toHaveBeenCalled();
      expect(mockDb['role'].findMany).toHaveBeenCalled();
      expect(mockDb['permission'].findMany).toHaveBeenCalled();
    });

    it('should continue executing even when some methods fail', async () => {
      const { service } = buildSeedService();

      mockDb['setting'].deleteMany.mockRejectedValueOnce(
        new Error('Settings failed'),
      );
      seedAllMock();
      await service.seedAll();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Seed settings failed'),
      );
      expect(mockDb['authProvider'].upsert).toHaveBeenCalled();
      expect(mockDb['role'].findMany).toHaveBeenCalled();
    });
  });
});
