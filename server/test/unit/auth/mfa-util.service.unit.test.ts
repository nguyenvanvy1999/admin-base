import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  mock,
} from 'bun:test';
import type { IMFACache } from 'src/config/cache';
import { MfaUtilService } from 'src/service/auth/mfa-util.service';
import { CoreErr, ErrCode, type IUserMFA } from 'src/share';
import { TestLifecycle } from 'test/utils';

describe('MfaUtilService', () => {
  let service: MfaUtilService;
  let mockCache: IMFACache;
  let mockGenerateToken: Mock<() => string>;
  let cacheSetMock: Mock<
    (key: string, value: { userId: string }) => Promise<void>
  >;

  const defaultUserId = 'user-123';
  const defaultLoginToken = 'login-token-456';
  const defaultMfaToken = 'mfa-token-789';
  const defaultTotpSecret = 'totp-secret-abc';

  const createUser = (overrides: Partial<IUserMFA> = {}): IUserMFA => {
    const baseUser: IUserMFA = {
      id: overrides.id ?? defaultUserId,
      mfaTotpEnabled:
        typeof overrides.mfaTotpEnabled === 'boolean'
          ? overrides.mfaTotpEnabled
          : true,
      totpSecret: defaultTotpSecret,
    };

    if ('totpSecret' in overrides) {
      (
        baseUser as unknown as { totpSecret: string | null | undefined }
      ).totpSecret = (
        overrides as { totpSecret?: string | null | undefined }
      ).totpSecret;
    }

    return baseUser;
  };

  const expectMfaBroken = async (user: IUserMFA): Promise<void> => {
    const promise = service.createSession({
      loginToken: defaultLoginToken,
      user,
    });

    expect(promise).rejects.toBeInstanceOf(CoreErr);
    await promise.catch((err) => {
      if (err instanceof CoreErr) {
        expect(err.code).toBe(ErrCode.MfaBroken);
        return;
      }

      throw err;
    });
    expect(mockGenerateToken).toHaveBeenCalledTimes(1);
    expect(cacheSetMock).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    cacheSetMock = mock().mockResolvedValue(undefined);
    mockCache = {
      set: cacheSetMock,
    } as unknown as IMFACache;

    mockGenerateToken = mock(() => defaultMfaToken);
    service = new MfaUtilService(mockCache, mockGenerateToken);
  });

  afterEach(() => {
    TestLifecycle.clearMock();
  });

  describe('getKey', () => {
    it('should combine mfaToken and loginToken with underscore', () => {
      const mfaToken = 'mfa-123';
      const loginToken = 'login-456';
      const expectedKey = 'mfa-123_login-456';

      const result = service.getKey(mfaToken, loginToken);

      expect(result).toBe(expectedKey);
    });

    it('should handle empty strings', () => {
      const result = service.getKey('', '');
      expect(result).toBe('_');
    });

    it('should handle tokens with special characters', () => {
      const mfaToken = 'mfa_token-123';
      const loginToken = 'login_token-456';
      const expectedKey = 'mfa_token-123_login_token-456';

      const result = service.getKey(mfaToken, loginToken);

      expect(result).toBe(expectedKey);
    });
  });

  describe('createSession', () => {
    it('should create session successfully when user has MFA enabled and totpSecret', async () => {
      const result = await service.createSession({
        loginToken: defaultLoginToken,
        user: createUser(),
      });

      expect(result).toBe(defaultMfaToken);
      expect(mockGenerateToken).toHaveBeenCalledTimes(1);
      expect(cacheSetMock).toHaveBeenCalledTimes(1);
      expect(cacheSetMock).toHaveBeenCalledWith(
        `${defaultMfaToken}_${defaultLoginToken}`,
        {
          userId: defaultUserId,
        },
      );
    });

    it('should throw CoreErr with MfaBroken when mfaTotpEnabled is false', async () => {
      const invalidUser = createUser({ mfaTotpEnabled: false });

      await expectMfaBroken(invalidUser);
    });

    it('should throw CoreErr with MfaBroken when totpSecret is null', async () => {
      const invalidUser = createUser({ totpSecret: null });

      await expectMfaBroken(invalidUser);
    });

    it('should throw CoreErr with MfaBroken when totpSecret is undefined', async () => {
      const invalidUser = {
        ...createUser(),
        totpSecret: undefined,
      } as unknown as IUserMFA;

      await expectMfaBroken(invalidUser);
    });

    it('should throw CoreErr with MfaBroken when both mfaTotpEnabled is false and totpSecret is null', async () => {
      const invalidUser = createUser({
        mfaTotpEnabled: false,
        totpSecret: null,
      });

      await expectMfaBroken(invalidUser);
    });

    it('should use generated mfaToken in cache key', async () => {
      const customMfaToken = 'custom-mfa-token-xyz';
      mockGenerateToken.mockReturnValueOnce(customMfaToken);

      await service.createSession({
        loginToken: defaultLoginToken,
        user: createUser(),
      });

      expect(cacheSetMock).toHaveBeenCalledWith(
        `${customMfaToken}_${defaultLoginToken}`,
        {
          userId: defaultUserId,
        },
      );
    });

    it('should handle different login tokens correctly', async () => {
      const loginToken1 = 'login-token-1';
      const loginToken2 = 'login-token-2';

      await service.createSession({
        loginToken: loginToken1,
        user: createUser(),
      });

      await service.createSession({
        loginToken: loginToken2,
        user: createUser(),
      });

      expect(cacheSetMock).toHaveBeenCalledTimes(2);
      expect(cacheSetMock).toHaveBeenNthCalledWith(
        1,
        `${defaultMfaToken}_${loginToken1}`,
        {
          userId: defaultUserId,
        },
      );
      expect(cacheSetMock).toHaveBeenNthCalledWith(
        2,
        `${defaultMfaToken}_${loginToken2}`,
        {
          userId: defaultUserId,
        },
      );
    });

    it('should handle different user IDs correctly', async () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';

      await service.createSession({
        loginToken: defaultLoginToken,
        user: createUser({ id: userId1 }),
      });

      await service.createSession({
        loginToken: defaultLoginToken,
        user: createUser({ id: userId2 }),
      });

      expect(cacheSetMock).toHaveBeenCalledTimes(2);
      expect(cacheSetMock).toHaveBeenNthCalledWith(
        1,
        `${defaultMfaToken}_${defaultLoginToken}`,
        {
          userId: userId1,
        },
      );
      expect(cacheSetMock).toHaveBeenNthCalledWith(
        2,
        `${defaultMfaToken}_${defaultLoginToken}`,
        {
          userId: userId2,
        },
      );
    });
  });
});
