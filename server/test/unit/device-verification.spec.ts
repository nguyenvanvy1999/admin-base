import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';

// Mock config modules BEFORE imports
mock.module('src/config/env', () => ({
  env: {
    PASSWORD_MAX_ATTEMPT: 5,
  },
}));

mock.module('src/config/db', () => ({
  db: {
    user: { findUnique: jest.fn() },
    setting: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));

import { AuthFlowService } from 'src/services/auth/core/auth-flow.service';
import {
  AuthChallengeType,
  AuthStatus,
  AuthTxState,
} from 'src/services/auth/types/constants';
import { ctxStore, PurposeVerify } from 'src/share';

describe('AuthFlowService - Device Verification', () => {
  let service: AuthFlowService;
  let mockDeps: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    status: 'active',
    mfaTotpEnabled: false,
    totpSecret: null,
    backupCodes: null,
  };

  beforeEach(() => {
    mockDeps = {
      db: {
        user: {
          findUnique: jest.fn(),
        },
      },
      env: { PASSWORD_MAX_ATTEMPT: 5 },
      passwordService: {
        verifyAndTrack: jest.fn().mockResolvedValue(true),
        validateAttempt: jest.fn(),
        validateExpiration: jest.fn(),
      },
      userUtilService: {
        findUserForLogin: jest.fn().mockResolvedValue(mockUser),
        completeLogin: jest.fn().mockResolvedValue({ sessionId: 'session-1' }),
      },
      authTxService: {
        create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
        update: jest.fn(),
        getOrThrow: jest.fn(),
        assertBinding: jest.fn(),
        assertChallengeAttemptsAllowed: jest.fn(),
        delete: jest.fn(),
        incrementChallengeAttempts: jest.fn(),
        setState: jest.fn(),
      },
      securityMonitorService: {
        evaluateLogin: jest.fn(),
      },
      settingService: {
        enbCaptchaRequired: jest.fn().mockResolvedValue(false),
        password: jest
          .fn()
          .mockResolvedValue({ enbAttempt: false, enbExpired: false }),
        enbMfaRequired: jest.fn().mockResolvedValue(false),
        enbMfaRiskBased: jest.fn().mockResolvedValue(false),
        enbDeviceVerification: jest.fn().mockResolvedValue(true),
      },
      auditLogService: {
        pushSecurity: jest.fn(),
      },
      authenticator: {
        verify: jest.fn(),
      },
      captchaService: {
        validateCaptcha: jest.fn(),
      },
      sessionService: {},
      otpService: {
        sendOtpWithAudit: jest.fn(),
        verifyOtp: jest.fn(),
      },
    };

    service = new AuthFlowService(mockDeps);
  });

  const mockContext = {
    clientIp: '127.0.0.1',
    userAgent: 'test-agent',
    id: 'req-1',
    timezone: 'UTC',
    timestamp: Date.now(),
    language: 'en',
  };

  it('should trigger DEVICE_VERIFY challenge for new device when enabled', async () => {
    mockDeps.securityMonitorService.evaluateLogin.mockResolvedValue({
      action: 'allow',
      risk: 'LOW',
      isNewDevice: true,
    });
    mockDeps.otpService.sendOtpWithAudit.mockResolvedValue({
      otpToken: 'otp-token-1',
    });

    await ctxStore.run(mockContext, async () => {
      const result = await service.startLogin({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        status: AuthStatus.CHALLENGE,
        authTxId: 'tx-1',
        challenge: {
          type: AuthChallengeType.DEVICE_VERIFY,
          availableMethods: expect.any(Array),
          metadata: expect.objectContaining({
            email: expect.objectContaining({
              destination: 'te**@example.com',
            }),
          }),
        },
      });
    });

    expect(mockDeps.otpService.sendOtpWithAudit).toHaveBeenCalledWith(
      'test@example.com',
      PurposeVerify.DEVICE_VERIFY,
    );
    expect(mockDeps.authTxService.update).toHaveBeenCalledWith('tx-1', {
      deviceVerifyToken: 'otp-token-1',
      state: AuthTxState.CHALLENGE_DEVICE_VERIFY,
    });
  });

  it('should verify DEVICE_VERIFY challenge and complete login', async () => {
    mockDeps.authTxService.getOrThrow.mockResolvedValue({
      id: 'tx-1',
      userId: 'user-1',
      state: AuthTxState.CHALLENGE_DEVICE_VERIFY,
      deviceVerifyToken: 'otp-token-1',
      securityResult: { isNewDevice: true },
    });
    mockDeps.db.user.findUnique.mockResolvedValue(mockUser);
    mockDeps.otpService.verifyOtp.mockResolvedValue('user-1');

    await ctxStore.run(mockContext, async () => {
      const result = await service.completeChallenge({
        authTxId: 'tx-1',
        method: AuthChallengeType.DEVICE_VERIFY,
        code: '123456',
      });

      expect(result.status).toEqual(AuthStatus.COMPLETED);
    });

    expect(mockDeps.otpService.verifyOtp).toHaveBeenCalledWith(
      'otp-token-1',
      PurposeVerify.DEVICE_VERIFY,
      '123456',
    );
    expect(mockDeps.authTxService.delete).toHaveBeenCalledWith('tx-1');
    expect(mockDeps.userUtilService.completeLogin).toHaveBeenCalled();
  });

  it('should fail DEVICE_VERIFY if state is invalid', () => {
    mockDeps.authTxService.getOrThrow.mockResolvedValue({
      id: 'tx-1',
      state: AuthTxState.CHALLENGE_MFA_REQUIRED, // Wrong state
    });

    ctxStore.run(mockContext, () => {
      expect(
        service.completeChallenge({
          authTxId: 'tx-1',
          method: AuthChallengeType.DEVICE_VERIFY,
          code: '123456',
        }),
      ).rejects.toThrow();
    });
  });
});
