import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { TokenService } from 'src/service/auth/auth-util.service';
import { EncryptService } from 'src/service/auth/encrypt.service';
import { IdUtil } from 'src/share/utils/id.util';

// Mocks
const mockEnv = {
  JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION: '0 second',
  JWT_ACCESS_TOKEN_EXPIRED: '15 minutes',
  JWT_AUDIENCE: 'https://mockapp.com',
  JWT_ISSUER: 'issuer-mock',
  JWT_SUBJECT: 'subject-mock',
  JWT_ACCESS_TOKEN_SECRET_KEY: 'mock-secret-key',
  JWT_REFRESH_TOKEN_EXPIRED: '7 days',
};

const fakeId = 'randomid123';

const encryptedPayload = 'ENCRYPTED_DATA';
const decryptedPayload = {
  userId: 'u1',
  timestamp: Date.now(),
  sessionId: fakeId,
  clientIp: 'ipx',
  userAgent: 'ua',
};

describe('TokenService', () => {
  let service: TokenService;
  let encryptSpy: ReturnType<typeof spyOn>;
  let decryptSpy: ReturnType<typeof spyOn>;
  let token32Spy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    service = new TokenService(mockEnv as any);
    // Reset spies before each test
    if (encryptSpy) encryptSpy.mockRestore();
    if (decryptSpy) decryptSpy.mockRestore();
    if (token32Spy) token32Spy.mockRestore();
  });

  describe('createRefreshToken', () => {
    it('generates a refreshToken and expirationTime', () => {
      token32Spy = spyOn(IdUtil, 'token32').mockReturnValue(
        'mock-refresh-token',
      );
      const res = service.createRefreshToken();
      expect(res.refreshToken).toBe('mock-refresh-token');
      expect(res.expirationTime).toBeInstanceOf(Date);
      token32Spy.mockRestore();
    });
  });

  describe('createAccessToken', () => {
    it('encrypts payload and signs correct token', async () => {
      encryptSpy = spyOn(EncryptService, 'aes256Encrypt').mockReturnValue(
        encryptedPayload,
      );
      const signSpy = spyOn(service, 'signJwt').mockResolvedValue(
        'signed-token',
      );
      const payload = decryptedPayload;
      const res = await service.createAccessToken(payload);
      expect(encryptSpy).toHaveBeenCalledWith(payload);
      expect(res.accessToken).toBe('signed-token');
      expect(res.expirationTime).toBeInstanceOf(Date);
      signSpy.mockRestore();
      encryptSpy.mockRestore();
    });
  });

  describe('signJwt', () => {
    it('produces a valid JWT string', async () => {
      const output = await service.signJwt({ my: 'data' });
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(15);
    });
  });

  describe('verifyJwt', () => {
    it('returns null if invalid JWT', async () => {
      const bad = await service.verifyJwt('invalid-token');
      expect(bad).toBeNull();
    });
    it('returns payload on success', async () => {
      const p = { data: 'somedata', iat: 123123 };
      const token = await service.signJwt(p);
      const verified = await service.verifyJwt(token);
      expect(verified).toHaveProperty('data');
      expect(verified).toHaveProperty('iat');
    });
  });

  describe('verifyAccessToken', () => {
    it('throws BadReqErr if bad JWT', () => {
      expect(service.verifyAccessToken('badtoken')).rejects.toThrow();
    });
    it('decrypts data and returns combined payload', async () => {
      decryptSpy = spyOn(EncryptService, 'aes256Decrypt').mockReturnValue(
        decryptedPayload,
      );
      const payload = { data: encryptedPayload, iat: 100 };
      spyOn(service, 'verifyJwt').mockResolvedValue(payload);
      const res = await service.verifyAccessToken('validtoken');
      expect(decryptSpy).toHaveBeenCalledWith(encryptedPayload);
      expect(res).toEqual({ ...payload, data: decryptedPayload });
      decryptSpy.mockRestore();
    });
  });
});
