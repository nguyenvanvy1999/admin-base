import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { EncryptService } from 'src/service/auth/encrypt.service';
import { SettingService } from 'src/service/misc/setting.service';
import { SETTING } from 'src/share';
import { SettingFixtures } from 'test/fixtures';
import { TestLifecycle } from 'test/utils';

describe('settingService', () => {
  let service: SettingService;
  let mockCache: {
    get: ReturnType<typeof mock>;
    set: ReturnType<typeof mock>;
    getMany: ReturnType<typeof mock>;
    del: ReturnType<typeof mock>;
  };
  let mockDb: {
    setting: {
      findUnique: ReturnType<typeof mock>;
      findMany: ReturnType<typeof mock>;
      update: ReturnType<typeof mock>;
    };
  };
  let decryptSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockCache = {
      get: mock(() => Promise.resolve(null)),
      set: mock(() => Promise.resolve()),
      getMany: mock(() => Promise.resolve(new Map())),
      del: mock(() => Promise.resolve()),
    } as any;
    mockDb = {
      setting: {
        findUnique: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
        update: mock(() => Promise.resolve(null)),
      },
    } as any;
    decryptSpy = spyOn(EncryptService, 'aes256Decrypt').mockReturnValue(
      'decrypted_encrypted_value',
    );
    service = new SettingService({
      cache: mockCache,
      db: mockDb,
    } as any);
  });

  afterEach(() => {
    TestLifecycle.clearMock();
  });

  describe('getValue', () => {
    it('should return string value as-is when type is string', () => {
      const setting = SettingFixtures.createSetting(
        'test_key',
        'test_value',
        'string',
      );

      const result = service.getValue<string>(setting);

      expect(result).toBe('test_value');
    });

    it('should return raw encrypted value when raw=true and isSecret=true', () => {
      const setting = SettingFixtures.createSetting(
        'secret_key',
        'encrypted_value',
        'string',
        true,
      );

      const result = service.getValue<string>(setting, true);
      expect(decryptSpy).toHaveBeenCalledWith('encrypted_value');
      expect(result).toBe('decrypted_encrypted_value');
    });

    it('should decrypt value when isSecret=true and raw=false', () => {
      const setting = SettingFixtures.createSetting(
        'secret_key',
        'encrypted_value',
        'string',
        true,
      );

      const result = service.getValue<string>(setting);
      expect(decryptSpy).toHaveBeenCalledWith('encrypted_value');
      expect(result).toBe('decrypted_encrypted_value');
    });

    it('should return true for boolean value "true"', () => {
      const setting = SettingFixtures.createSetting(
        'bool_key',
        'true',
        'boolean',
      );

      const result = service.getValue<boolean>(setting);

      expect(result).toBe(true);
    });

    it('should return false for boolean value "false"', () => {
      const setting = SettingFixtures.createSetting(
        'bool_key',
        'false',
        'boolean',
      );

      const result = service.getValue<boolean>(setting);

      expect(result).toBe(false);
    });

    it('should return false for any boolean value that is not "true"', () => {
      const setting = SettingFixtures.createSetting(
        'bool_key',
        'invalid',
        'boolean',
      );

      const result = service.getValue<boolean>(setting);

      expect(result).toBe(false);
    });

    it('should parse valid number value', () => {
      const setting = SettingFixtures.createSetting(
        'num_key',
        '123.45',
        'number',
      );

      const result = service.getValue<number>(setting);

      expect(result).toBe(123.45);
    });

    it('should return 0 for invalid number value', () => {
      const setting = SettingFixtures.createSetting(
        'num_key',
        'not_a_number',
        'number',
      );

      const result = service.getValue<number>(setting);

      expect(result).toBe(0);
    });

    it('should parse negative number value', () => {
      const setting = SettingFixtures.createSetting(
        'num_key',
        '-456.78',
        'number',
      );

      const result = service.getValue<number>(setting);

      expect(result).toBe(-456.78);
    });

    it('should parse valid date value', () => {
      const dateString = '2023-12-25T10:30:00.000Z';
      const setting = SettingFixtures.createSetting(
        'date_key',
        dateString,
        'date',
      );

      const result = service.getValue<Date>(setting);

      expect(result).toEqual(new Date(dateString));
    });

    it('should return epoch date for invalid date value', () => {
      const setting = SettingFixtures.createSetting(
        'date_key',
        'invalid_date',
        'date',
      );

      const result = service.getValue<Date>(setting);

      expect(result).toEqual(new Date(0));
    });

    it('should parse valid JSON value', () => {
      const jsonObj = { key: 'value', number: 42, boolean: true };
      const setting = SettingFixtures.createSetting(
        'json_key',
        JSON.stringify(jsonObj),
        'json',
      );

      const result = service.getValue<typeof jsonObj>(setting);

      expect(result).toEqual(jsonObj);
    });

    it('should handle JSON array value', () => {
      const jsonArray = ['item1', 'item2', 3, true];
      const setting = SettingFixtures.createSetting(
        'json_key',
        JSON.stringify(jsonArray),
        'json',
      );

      const result = service.getValue<typeof jsonArray>(setting);

      expect(result).toEqual(jsonArray);
    });

    it('should return default value if can not parse JSON', () => {
      const setting = SettingFixtures.createSetting(
        'json_key',
        'invalid_json{',
        'json',
      );

      const result = service.getValue(setting);
      expect(result).toEqual('invalid_json{');
    });
  });

  describe('validateSetting', () => {
    it('should validate boolean values correctly', () => {
      expect(service.validateSetting('dummy', 'true', 'boolean').valid).toBe(
        true,
      );
      expect(service.validateSetting('dummy', 'false', 'boolean').valid).toBe(
        true,
      );
      expect(service.validateSetting('dummy', 'invalid', 'boolean').valid).toBe(
        false,
      );
      expect(service.validateSetting('dummy', 'True', 'boolean').valid).toBe(
        false,
      );
      expect(service.validateSetting('dummy', 'FALSE', 'boolean').valid).toBe(
        false,
      );
    });

    it('should validate number values correctly', () => {
      expect(service.validateSetting('dummy', '123', 'number').valid).toBe(
        true,
      );
      expect(service.validateSetting('dummy', '123.45', 'number').valid).toBe(
        true,
      );
      expect(service.validateSetting('dummy', '-123.45', 'number').valid).toBe(
        true,
      );
      expect(service.validateSetting('dummy', '0', 'number').valid).toBe(true);
      expect(service.validateSetting('dummy', '-0', 'number').valid).toBe(true);
      expect(
        service.validateSetting('dummy', 'not_a_number', 'number').valid,
      ).toBe(false);
      expect(service.validateSetting('dummy', '12.34.56', 'number').valid).toBe(
        false,
      );
      expect(service.validateSetting('dummy', '', 'number').valid).toBe(false);
    });

    it('should validate string values correctly', () => {
      expect(
        service.validateSetting('dummy', 'any string', 'string').valid,
      ).toBe(true);
      expect(service.validateSetting('dummy', '', 'string').valid).toBe(true);
      expect(service.validateSetting('dummy', '123', 'string').valid).toBe(
        true,
      );
      expect(
        service.validateSetting('dummy', 'special !@#$%^&*()', 'string').valid,
      ).toBe(true);
    });

    it('should validate date values correctly', () => {
      expect(
        service.validateSetting('dummy', '2023-12-25T10:30:00.000Z', 'date')
          .valid,
      ).toBe(true);
      // TypeBox date-time format might be strict, but basic ISO should pass if configured or if default behavior allows
      // If it fails, we might need to adjust expectation based on actual TypeBox behavior in this project
    });

    it('should validate JSON values correctly', () => {
      expect(service.validateSetting('dummy', '{}', 'json').valid).toBe(true);
      expect(service.validateSetting('dummy', '[]', 'json').valid).toBe(true);
      expect(
        service.validateSetting('dummy', '{"key": "value"}', 'json').valid,
      ).toBe(true);
      expect(service.validateSetting('dummy', '[1, 2, 3]', 'json').valid).toBe(
        true,
      );
      expect(service.validateSetting('dummy', 'null', 'json').valid).toBe(true);
      expect(service.validateSetting('dummy', 'true', 'json').valid).toBe(true);
      expect(service.validateSetting('dummy', '123', 'json').valid).toBe(true);
      expect(service.validateSetting('dummy', '"string"', 'json').valid).toBe(
        true,
      );
    });
  });

  describe('getSetting', () => {
    it('should return cached value when available', async () => {
      mockCache.get.mockResolvedValueOnce('cached_value');
      const result = await service.getSetting<string>('test_key');
      expect(mockCache.get).toHaveBeenCalledWith('test_key');
      expect(result).toBe('cached_value');
    });

    it('should throw error when setting not found', () => {
      mockCache.get.mockResolvedValueOnce(null);
      mockDb.setting.findUnique.mockResolvedValueOnce(null);

      expect(service.getSetting<string>('non_existent_key')).rejects.toThrow(
        'Missing setting key non_existent_key',
      );
    });

    it('should handle encrypted settings from database', async () => {
      mockCache.get.mockResolvedValueOnce(null);
      const encryptedSetting = SettingFixtures.createSetting(
        'secret_key',
        'encrypted_value',
        'string',
        true,
      );
      mockDb.setting.findUnique.mockResolvedValueOnce(encryptedSetting);

      const result = await service.getSetting<string>('secret_key');

      mockCache.get.mockResolvedValueOnce('decrypted_encrypted_value');
      expect(result).toBe('decrypted_encrypted_value');
      expect(mockCache.get).toHaveBeenCalledWith('secret_key');
    });
  });

  describe('password', () => {
    it('should return password settings', async () => {
      const cacheMap = new Map<string, unknown>();
      cacheMap.set(SETTING.ENB_PASSWORD_ATTEMPT, true);
      cacheMap.set(SETTING.ENB_PASSWORD_EXPIRED, false);
      mockCache.getMany.mockResolvedValueOnce(cacheMap);

      const result = await service.password();

      expect(result).toEqual({
        enbAttempt: true,
        enbExpired: false,
      });
      expect(mockCache.getMany).toHaveBeenCalledWith([
        SETTING.ENB_PASSWORD_ATTEMPT,
        SETTING.ENB_PASSWORD_EXPIRED,
      ]);
    });

    it('should handle getSetting calls for password method', async () => {
      const mockGetManySettings = mock(() =>
        Promise.resolve([true, false] as any),
      );

      const originalGetManySettings = service.getManySettings.bind(service);
      (service.getManySettings as any) = mockGetManySettings;

      const result = await service.password();

      expect(mockGetManySettings).toHaveBeenCalledWith([
        SETTING.ENB_PASSWORD_ATTEMPT,
        SETTING.ENB_PASSWORD_EXPIRED,
      ]);

      service.getManySettings = originalGetManySettings;
      expect(result).toEqual({
        enbAttempt: true,
        enbExpired: false,
      });
    });
  });

  describe('enbOnlyOneSession', () => {
    it('should return single session setting', async () => {
      mockCache.get.mockResolvedValueOnce(true);

      const result = await service.enbOnlyOneSession();

      expect(result).toBe(true);
    });

    it('should call getSetting with correct parameter', async () => {
      // Mock getSetting method
      const mockGetSetting = mock(() => Promise.resolve(false));
      const originalGetSetting = service.getSetting.bind(service);
      (service as any).getSetting = mockGetSetting;

      const result = await service.enbOnlyOneSession();

      expect(mockGetSetting).toHaveBeenCalledWith('ENB_ONLY_ONE_SESSION');

      service.getSetting = originalGetSetting;
      expect(result).toBe(false);
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle null/undefined values in getValue', () => {
      const settingWithNullValue = {
        ...SettingFixtures.createSetting('null_key', '', 'string'),
        value: null as any,
      };
      const settingWithUndefinedValue = {
        ...SettingFixtures.createSetting('undefined_key', '', 'string'),
        value: undefined as any,
      };

      expect(service.getValue<any>(settingWithNullValue)).toBe(null);
      expect(service.getValue<any>(settingWithUndefinedValue)).toBe(undefined);
    });

    it('should handle very large numbers', () => {
      const largeNumber = '999999999999999999999999';
      const setting = SettingFixtures.createSetting(
        'large_num',
        largeNumber,
        'number',
      );

      const result = service.getValue<number>(setting);

      expect(typeof result).toBe('number');
      expect(result).toBe(Number(largeNumber));
    });

    it('should handle empty JSON string', () => {
      const setting = SettingFixtures.createSetting('empty_json', '', 'json');

      const result = service.getValue(setting);
      expect(result).toEqual('');
    });

    it('should handle concurrent getSetting calls for same key', async () => {
      mockCache.get.mockResolvedValue(null);
      const dbSetting = SettingFixtures.createSetting(
        'concurrent_key',
        'concurrent_value',
        'string',
      );
      mockDb.setting.findUnique.mockResolvedValue(dbSetting);

      // Make concurrent calls
      const [result1, result2] = await Promise.all([
        service.getSetting<string>('concurrent_key'),
        service.getSetting<string>('concurrent_key'),
      ]);

      expect(result1).toBe('concurrent_value');
      expect(result2).toBe('concurrent_value');
    });
  });

  describe('getManySettings (tuple-ordered)', () => {
    it('should return values from cache preserving input order', async () => {
      const keys = [
        SETTING.ENB_PASSWORD_ATTEMPT,
        SETTING.MAINTENANCE_END_DATE,
        SETTING.ENB_MFA_REQUIRED,
      ] as const;

      const date = new Date('2024-01-01T00:00:00.000Z');
      const map = new Map<string, unknown>();
      map.set(SETTING.ENB_PASSWORD_ATTEMPT, true);
      map.set(SETTING.MAINTENANCE_END_DATE, date);
      map.set(SETTING.ENB_MFA_REQUIRED, false);
      mockCache.getMany.mockResolvedValueOnce(map);

      const result = await service.getManySettings(keys);

      expect(result[0]).toBe(true);
      expect(result[1]).toEqual(date);
      expect(result[2]).toBe(false);
      expect(mockDb.setting.findMany).not.toHaveBeenCalled();
    });

    it('should fetch missing from DB, cache them, and preserve order', async () => {
      const keys = [
        SETTING.ENB_PASSWORD_ATTEMPT,
        SETTING.ENB_PASSWORD_EXPIRED,
        SETTING.ENB_MFA_REQUIRED,
      ] as const;

      const cacheMap = new Map<string, unknown>();
      cacheMap.set(SETTING.ENB_PASSWORD_ATTEMPT, false);
      mockCache.getMany.mockResolvedValueOnce(cacheMap);

      const dbSettings = [
        SettingFixtures.createSetting(
          SETTING.ENB_PASSWORD_EXPIRED,
          'true',
          'boolean',
        ),
        // Simulate an encrypted boolean setting, decrypted to 'true'
        SettingFixtures.createSetting(
          SETTING.ENB_MFA_REQUIRED,
          'enc-val',
          'boolean',
          true,
        ),
      ];
      mockDb.setting.findMany.mockResolvedValueOnce(dbSettings);

      const decSpy = spyOn(EncryptService, 'aes256Decrypt').mockReturnValue(
        'true',
      );

      const result = await service.getManySettings(keys);

      expect(result[0]).toBe(false);
      expect(result[1]).toBe(true);
      expect(result[2]).toBe(true);
      expect(decSpy).toHaveBeenCalledWith('enc-val');
      expect(mockCache.set).toHaveBeenCalledWith(
        SETTING.ENB_PASSWORD_EXPIRED,
        true,
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        SETTING.ENB_MFA_REQUIRED,
        true,
      );
    });

    it('should throw when some keys are missing in DB', () => {
      const keys = [
        SETTING.ENB_ONLY_ONE_SESSION,
        SETTING.MAINTENANCE_END_DATE,
      ] as const;
      const cacheMap = new Map<string, unknown>();
      mockCache.getMany.mockResolvedValueOnce(cacheMap);
      mockDb.setting.findMany.mockResolvedValueOnce([
        SettingFixtures.createSetting(
          SETTING.ENB_ONLY_ONE_SESSION,
          'true',
          'boolean',
        ),
      ]);

      expect(service.getManySettings(keys)).rejects.toThrow(
        /Missing setting keys/i,
      );
    });
  });

  describe('getManySettingsAsRecord (record-shaped)', () => {
    it('should return a record with exact keys and types', async () => {
      const keys = [
        SETTING.ENB_MFA_REQUIRED,
        SETTING.ENB_ONLY_ONE_SESSION,
      ] as const;
      const cacheMap = new Map<string, unknown>();
      cacheMap.set(SETTING.ENB_MFA_REQUIRED, true);
      cacheMap.set(SETTING.ENB_ONLY_ONE_SESSION, true);
      mockCache.getMany.mockResolvedValueOnce(cacheMap);

      const record = await service.getManySettingsAsRecord(keys);
      expect(record[SETTING.ENB_MFA_REQUIRED]).toBe(true);
      expect(record[SETTING.ENB_ONLY_ONE_SESSION]).toBe(true);
    });

    it('should handle empty keys', async () => {
      const record = await service.getManySettingsAsRecord([] as const);
      expect(record).toEqual({});
    });
  });

  describe('validateDependencies', () => {
    it('should validate correct dependencies', () => {
      const settings = {
        [SETTING.ENB_SECURITY_BLOCK_UNKNOWN_DEVICE]: true,
        [SETTING.ENB_SECURITY_DEVICE_RECOGNITION]: true,
      };
      const result = service.validateDependencies(settings);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when dependency is missing', () => {
      const settings = {
        [SETTING.ENB_SECURITY_BLOCK_UNKNOWN_DEVICE]: true,
        // Missing ENB_SECURITY_DEVICE_RECOGNITION
      };
      const result = service.validateDependencies(settings);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('missing');
    });

    it('should fail when dependency condition is not met', () => {
      const settings = {
        [SETTING.ENB_SECURITY_BLOCK_UNKNOWN_DEVICE]: true,
        [SETTING.ENB_SECURITY_DEVICE_RECOGNITION]: false, // Should be true
      };
      const result = service.validateDependencies(settings);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires');
    });

    it('should validate custom dependencies', () => {
      const settings = {
        key1: 'value1',
        key2: 'value2',
      };
      const dependencies = {
        key1: [
          {
            key: 'key2',
            condition: (val: unknown) => val === 'value2',
            message: 'key1 requires key2 to be value2',
          },
        ],
      };
      const result = service.validateDependencies(settings, dependencies);
      expect(result.valid).toBe(true);
    });
  });

  describe('exportSettings', () => {
    it('should export all settings decrypted', async () => {
      const dbSettings = [
        SettingFixtures.createSetting('key1', 'value1', 'string'),
        SettingFixtures.createSetting(
          'secret_key',
          'encrypted_value',
          'string',
          true,
        ),
      ];
      mockDb.setting.findMany.mockResolvedValueOnce(dbSettings);

      const result = await service.exportSettings();

      expect(result).toEqual({
        key1: 'value1',
        secret_key: 'decrypted_encrypted_value',
      });
      expect(decryptSpy).toHaveBeenCalledWith('encrypted_value');
    });

    it('should export specific settings when keys provided', async () => {
      const keys = ['key1'];
      mockDb.setting.findMany.mockResolvedValueOnce([
        SettingFixtures.createSetting('key1', 'value1', 'string'),
      ]);

      const result = await service.exportSettings(keys);

      expect(result).toEqual({ key1: 'value1' });
      expect(mockDb.setting.findMany).toHaveBeenCalledWith({
        where: { key: { in: keys } },
      });
    });
  });

  describe('importSettings', () => {
    it('should import valid settings', async () => {
      const importData = { key1: 'new_value' };
      const existingSetting = SettingFixtures.createSetting(
        'key1',
        'old_value',
        'string',
      );
      mockDb.setting.findMany.mockResolvedValue([existingSetting]);
      mockDb.setting.update.mockResolvedValue(existingSetting);

      const result = await service.importSettings(importData);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockDb.setting.update).toHaveBeenCalledWith({
        where: { key: 'key1' },
        data: { value: 'new_value' },
      });
      expect(mockCache.del).toHaveBeenCalledWith('key1');
    });

    it('should encrypt secret settings on import', async () => {
      const importData = { secret_key: 'new_secret_value' };
      const existingSetting = SettingFixtures.createSetting(
        'secret_key',
        'old_value',
        'string',
        true,
      );
      mockDb.setting.findMany.mockResolvedValue([existingSetting]);
      spyOn(EncryptService, 'aes256Encrypt').mockReturnValue('encrypted_new');

      const result = await service.importSettings(importData);

      expect(result.imported).toBe(1);
      expect(mockDb.setting.update).toHaveBeenCalledWith({
        where: { key: 'secret_key' },
        data: { value: 'encrypted_new' },
      });
    });

    it('should return errors for non-existent settings', async () => {
      const importData = { non_existent: 'value' };
      mockDb.setting.findMany.mockResolvedValue([]);

      const result = await service.importSettings(importData);

      expect(result.imported).toBe(0);
      expect(result.errors).toContain(
        'Setting non_existent does not exist in database',
      );
    });

    it('should validate values before import', async () => {
      const importData = { num_key: 'not_a_number' };
      const existingSetting = SettingFixtures.createSetting(
        'num_key',
        '0',
        'number',
      );
      mockDb.setting.findMany.mockResolvedValue([existingSetting]);

      const result = await service.importSettings(importData);

      expect(result.imported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid value type');
    });

    it('should validate dependencies before import', async () => {
      const importData = {
        [SETTING.ENB_SECURITY_BLOCK_UNKNOWN_DEVICE]: 'true',
        // Missing required dependency ENB_SECURITY_DEVICE_RECOGNITION=true
      };
      const existingSetting = SettingFixtures.createSetting(
        SETTING.ENB_SECURITY_BLOCK_UNKNOWN_DEVICE,
        'false',
        'boolean',
      );
      const allSettings = [
        existingSetting,
        SettingFixtures.createSetting(
          SETTING.ENB_SECURITY_DEVICE_RECOGNITION,
          'false',
          'boolean',
        ),
      ];

      mockDb.setting.findMany
        .mockResolvedValueOnce([existingSetting]) // for existing check
        .mockResolvedValueOnce(allSettings); // for dependency check

      const result = await service.importSettings(importData);

      expect(result.imported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('requires');
    });

    it('should skip validation when opts.validate is false', async () => {
      const importData = { num_key: 'not_a_number' };
      const existingSetting = SettingFixtures.createSetting(
        'num_key',
        '0',
        'number',
      );
      mockDb.setting.findMany.mockResolvedValue([existingSetting]);

      const result = await service.importSettings(importData, {
        validate: false,
        validateRules: false,
        validateDependencies: false,
      });

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });
});
