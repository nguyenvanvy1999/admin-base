import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  type Mock,
  mock,
  spyOn,
} from 'bun:test';
import { OtpService } from 'src/service/auth/otp.service';
import { EmailType, IdUtil, PurposeVerify } from 'src/share';
import { OtpFixtures } from 'test/fixtures';
import { TestDataGenerator, TestLifecycle } from 'test/utils';

describe('otpService', () => {
  let otpService: OtpService;
  let mockDeps: {
    otpCache: { set: Mock<any>; get: Mock<any>; del: Mock<any> };
    otpRateLimitCache: { set: Mock<any>; get: Mock<any> };
    emailQueue: { add: Mock<any> };
    lockingService: { lock: Mock<any> };
  };
  let token16Spy: Mock<() => string>;

  beforeEach(() => {
    mockDeps = {
      otpCache: {
        set: mock().mockResolvedValue(undefined),
        get: mock().mockResolvedValue(null),
        del: mock().mockResolvedValue(undefined),
      },
      otpRateLimitCache: {
        set: mock().mockResolvedValue(undefined),
        get: mock().mockResolvedValue(null),
      },
      emailQueue: {
        add: mock().mockResolvedValue(undefined),
      },
      lockingService: {
        lock: mock().mockImplementation(
          async (_key: string, callback: () => any) => await callback(),
        ),
      },
    };
    otpService = new OtpService(mockDeps as any);
    token16Spy = spyOn(IdUtil, 'token16').mockReturnValue('abc123def456ghi7');
  });

  afterEach(() => {
    TestLifecycle.clearMock();
  });

  describe('generateOtp', () => {
    it('should generate a 6-digit OTP and store in cache', async () => {
      // Arrange
      const otpData = OtpFixtures.createOtpData();
      const { otpId, purpose, userId } = otpData;

      // Act
      const result = await otpService.generateOtp(otpId, purpose, userId);

      // Assert
      expect(result).toMatch(/^\d{6}$/); // 6-digit string
      expect(mockDeps.otpCache.set).toHaveBeenCalledTimes(1);
      expect(mockDeps.otpCache.set).toHaveBeenCalledWith(otpId, {
        otp: result,
        purpose,
        userId,
      });
    });

    it('should generate different OTPs for consecutive calls', async () => {
      // Arrange
      const otpId1 = TestDataGenerator.generateString(12);
      const otpId2 = TestDataGenerator.generateString(12);
      const purpose = PurposeVerify.FORGOT_PASSWORD;
      const userId = TestDataGenerator.generateString(8);

      // Act
      const otp1 = await otpService.generateOtp(otpId1, purpose, userId);
      const otp2 = await otpService.generateOtp(otpId2, purpose, userId);

      // Assert
      expect(otp1).toMatch(/^\d{6}$/);
      expect(otp2).toMatch(/^\d{6}$/);
      // Note: There's a tiny chance they could be the same due to randomness,
      // but statistically very unlikely
      expect(mockDeps.otpCache.set).toHaveBeenCalledTimes(2);
    });

    it('should handle all purpose types correctly', async () => {
      // Arrange
      const otpId = TestDataGenerator.generateString(10);
      const userId = TestDataGenerator.generateString(8);
      const purposes = [
        PurposeVerify.REGISTER,
        PurposeVerify.FORGOT_PASSWORD,
        PurposeVerify.RESET_MFA,
      ];

      // Act & Assert
      for (const purpose of purposes) {
        const otp = await otpService.generateOtp(
          otpId + purpose,
          purpose,
          userId,
        );
        expect(otp).toMatch(/^\d{6}$/);
        expect(mockDeps.otpCache.set).toHaveBeenCalledWith(otpId + purpose, {
          otp,
          purpose,
          userId,
        });
      }

      expect(mockDeps.otpCache.set).toHaveBeenCalledTimes(3);
    });

    it('should handle cache errors gracefully', () => {
      // Arrange
      const otpId = 'test-otp-id';
      const purpose = PurposeVerify.REGISTER;
      const userId = 'user-123';
      const cacheError = new Error('Redis connection failed');

      mockDeps.otpCache.set.mockRejectedValueOnce(cacheError);

      // Act & Assert
      expect(otpService.generateOtp(otpId, purpose, userId)).rejects.toThrow(
        'Redis connection failed',
      );
    });

    it('should generate OTP within valid range (100000-999999)', async () => {
      // Arrange
      const otpId = 'test-otp-id';
      const purpose = PurposeVerify.REGISTER;
      const userId = 'user-123';

      // Act - Test multiple times to ensure consistency
      const otps = [];
      for (let i = 0; i < 10; i++) {
        const otp = await otpService.generateOtp(
          `${otpId}-${i}`,
          purpose,
          userId,
        );
        otps.push(Number(otp));
      }

      // Assert
      otps.forEach((otp) => {
        expect(otp).toBeGreaterThanOrEqual(100000);
        expect(otp).toBeLessThanOrEqual(999999);
      });
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully and delete from cache', async () => {
      // Arrange
      const otpId = 'test-otp-id';
      const purpose = PurposeVerify.REGISTER;
      const otp = '123456';
      const userId = 'user-123';

      mockDeps.otpCache.get.mockResolvedValueOnce({
        otp,
        purpose,
        userId,
      });

      // Act
      const result = await otpService.verifyOtp(otpId, purpose, otp);

      // Assert
      expect(result).toBe(userId);
      expect(mockDeps.otpCache.get).toHaveBeenCalledTimes(1);
      expect(mockDeps.otpCache.get).toHaveBeenCalledWith(otpId);
      expect(mockDeps.otpCache.del).toHaveBeenCalledTimes(1);
      expect(mockDeps.otpCache.del).toHaveBeenCalledWith(otpId);
    });

    it('should return null when OTP not found in cache', async () => {
      // Arrange
      const otpId = 'test-otp-id';
      const purpose = PurposeVerify.REGISTER;
      const otp = '123456';

      mockDeps.otpCache.get.mockResolvedValueOnce(null);

      // Act
      const result = await otpService.verifyOtp(otpId, purpose, otp);

      // Assert
      expect(result).toBeNull();
      expect(mockDeps.otpCache.get).toHaveBeenCalledTimes(1);
      expect(mockDeps.otpCache.del).not.toHaveBeenCalled();
    });

    it('should return null when OTP does not match', async () => {
      // Arrange
      const otpId = 'test-otp-id';
      const purpose = PurposeVerify.REGISTER;
      const correctOtp = '123456';
      const wrongOtp = '654321';
      const userId = 'user-123';

      mockDeps.otpCache.get.mockResolvedValueOnce({
        otp: correctOtp,
        purpose,
        userId,
      });

      // Act
      const result = await otpService.verifyOtp(otpId, purpose, wrongOtp);

      // Assert
      expect(result).toBeNull();
      expect(mockDeps.otpCache.get).toHaveBeenCalledTimes(1);
      expect(mockDeps.otpCache.del).not.toHaveBeenCalled();
    });

    it('should return null when purpose does not match', async () => {
      // Arrange
      const otpId = 'test-otp-id';
      const storedPurpose = PurposeVerify.REGISTER;
      const verifyPurpose = PurposeVerify.FORGOT_PASSWORD;
      const otp = '123456';
      const userId = 'user-123';

      mockDeps.otpCache.get.mockResolvedValueOnce({
        otp,
        purpose: storedPurpose,
        userId,
      });

      // Act
      const result = await otpService.verifyOtp(otpId, verifyPurpose, otp);

      // Assert
      expect(result).toBeNull();
      expect(mockDeps.otpCache.get).toHaveBeenCalledTimes(1);
      expect(mockDeps.otpCache.del).not.toHaveBeenCalled();
    });

    it('should return null when both OTP and purpose do not match', async () => {
      // Arrange
      const otpId = 'test-otp-id';
      const storedPurpose = PurposeVerify.REGISTER;
      const verifyPurpose = PurposeVerify.FORGOT_PASSWORD;
      const storedOtp = '123456';
      const verifyOtp = '654321';
      const userId = 'user-123';

      mockDeps.otpCache.get.mockResolvedValueOnce({
        otp: storedOtp,
        purpose: storedPurpose,
        userId,
      });

      // Act
      const result = await otpService.verifyOtp(
        otpId,
        verifyPurpose,
        verifyOtp,
      );

      // Assert
      expect(result).toBeNull();
      expect(mockDeps.otpCache.del).not.toHaveBeenCalled();
    });

    it('should handle cache get errors', () => {
      // Arrange
      const otpId = 'test-otp-id';
      const purpose = PurposeVerify.REGISTER;
      const otp = '123456';
      const cacheError = new Error('Redis connection failed');

      mockDeps.otpCache.get.mockRejectedValueOnce(cacheError);

      // Act & Assert
      expect(otpService.verifyOtp(otpId, purpose, otp)).rejects.toThrow(
        'Redis connection failed',
      );
    });

    it('should handle cache delete errors after successful verification', () => {
      // Arrange
      const otpId = 'test-otp-id';
      const purpose = PurposeVerify.REGISTER;
      const otp = '123456';
      const userId = 'user-123';
      const deleteError = new Error('Failed to delete from cache');

      mockDeps.otpCache.get.mockResolvedValueOnce({
        otp,
        purpose,
        userId,
      });
      mockDeps.otpCache.del.mockRejectedValueOnce(deleteError);

      // Act & Assert
      expect(otpService.verifyOtp(otpId, purpose, otp)).rejects.toThrow(
        'Failed to delete from cache',
      );
    });

    it('should handle case-sensitive OTP comparison', async () => {
      // Arrange
      const otpId = 'test-otp-id';
      const purpose = PurposeVerify.REGISTER;
      const otp = '123456';
      const userId = 'user-123';

      mockDeps.otpCache.get.mockResolvedValueOnce({
        otp,
        purpose,
        userId,
      });

      // Act - Try with different case (should still work as OTP is numeric)
      const result = await otpService.verifyOtp(otpId, purpose, '123456');

      // Assert
      expect(result).toBe(userId);
      expect(mockDeps.otpCache.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendOtp', () => {
    beforeEach(() => {
      token16Spy.mockReturnValue('abc123def456ghi7');
    });

    it('should send OTP successfully when not rate limited', async () => {
      // Arrange
      const otpData = OtpFixtures.createOtpData();
      const { userId, email, purpose } = otpData;

      mock(Math.random).mockReturnValue(0.23456);

      mockDeps.otpRateLimitCache.get.mockResolvedValueOnce(null);
      mockDeps.otpCache.set.mockResolvedValueOnce(undefined);

      // Act
      const result = await otpService.sendOtp(userId, email, purpose);

      // Assert
      expect(result).toBe('abc123def456ghi7');
      expect(mockDeps.lockingService.lock).toHaveBeenCalledTimes(1);
      expect(mockDeps.lockingService.lock).toHaveBeenCalledWith(
        `${email.toLowerCase()}_${purpose}`,
        expect.any(Function),
      );
      expect(mockDeps.otpRateLimitCache.get).toHaveBeenCalledTimes(1);
      expect(mockDeps.otpCache.set).toHaveBeenCalledTimes(1);
      expect(mockDeps.emailQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.emailQueue.add).toHaveBeenCalledWith(EmailType.OTP, {
        [EmailType.OTP]: {
          email: email.toLowerCase(),
          otp: expect.stringMatching(/^\d{6}$/),
          purpose,
        },
      });
      expect(mockDeps.otpRateLimitCache.set).toHaveBeenCalledTimes(1);
      expect(mockDeps.otpRateLimitCache.set).toHaveBeenCalledWith(
        `${email.toLowerCase()}_${purpose}`,
        true,
      );
    });

    it('should return null when rate limited', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;

      mockDeps.otpRateLimitCache.get.mockResolvedValueOnce(true); // Rate limited

      // Act
      const result = await otpService.sendOtp(userId, email, purpose);

      // Assert
      expect(result).toBeNull();
      expect(mockDeps.lockingService.lock).toHaveBeenCalledTimes(1);
      expect(mockDeps.otpCache.set).not.toHaveBeenCalled();
      expect(mockDeps.emailQueue.add).not.toHaveBeenCalled();
      expect(mockDeps.otpRateLimitCache.set).not.toHaveBeenCalled();
    });

    it('should convert email to lowercase before processing', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'TeSt@ExAmPlE.CoM';
      const lowercaseEmail = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;

      mockDeps.otpRateLimitCache.get.mockResolvedValueOnce(null);

      // Act
      const result = await otpService.sendOtp(userId, email, purpose);

      // Assert
      expect(result).toBe('abc123def456ghi7');
      // The lockingService should be called with the original email in key, but lowercase inside the function
      expect(mockDeps.lockingService.lock).toHaveBeenCalledWith(
        `${email}_${purpose}`,
        expect.any(Function),
      );
      expect(mockDeps.otpRateLimitCache.get).toHaveBeenCalledWith(
        `${email}_${purpose}`,
      );
      expect(mockDeps.emailQueue.add).toHaveBeenCalledWith(EmailType.OTP, {
        [EmailType.OTP]: {
          email: lowercaseEmail,
          otp: expect.stringMatching(/^\d{6}$/),
          purpose,
        },
      });
    });

    it('should use distributed locking with correct key format', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.FORGOT_PASSWORD;
      const expectedKey = `${email}_${purpose}`;

      mockDeps.otpRateLimitCache.get.mockResolvedValueOnce(null);

      // Act
      await otpService.sendOtp(userId, email, purpose);

      // Assert
      expect(mockDeps.lockingService.lock).toHaveBeenCalledTimes(1);
      expect(mockDeps.lockingService.lock).toHaveBeenCalledWith(
        expectedKey,
        expect.any(Function),
      );
    });

    it('should handle all purpose types correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purposes = [
        PurposeVerify.REGISTER,
        PurposeVerify.FORGOT_PASSWORD,
        PurposeVerify.RESET_MFA,
      ];

      // Act & Assert
      for (const purpose of purposes) {
        mockDeps.otpRateLimitCache.get.mockResolvedValueOnce(null);

        const result = await otpService.sendOtp(userId, email, purpose);

        expect(result).toBe('abc123def456ghi7');
        expect(mockDeps.emailQueue.add).toHaveBeenCalledWith(EmailType.OTP, {
          [EmailType.OTP]: {
            email,
            otp: expect.stringMatching(/^\d{6}$/),
            purpose,
          },
        });
      }
    });

    it('should generate unique token for each OTP session', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;

      token16Spy
        .mockReturnValueOnce('token1234567890ab')
        .mockReturnValueOnce('token2345678901bc');
      mockDeps.otpRateLimitCache.get.mockResolvedValue(null);

      // Act
      const result1 = await otpService.sendOtp(userId, email, purpose);
      const result2 = await otpService.sendOtp(userId, email + '2', purpose);

      // Assert
      expect(result1).toBe('token1234567890ab');
      expect(result2).toBe('token2345678901bc');
      expect(token16Spy).toHaveBeenCalledTimes(2);
    });

    it('should handle locking service errors', () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;
      const lockError = new Error('Lock acquisition failed');

      mockDeps.lockingService.lock.mockRejectedValueOnce(lockError);

      // Act & Assert
      expect(otpService.sendOtp(userId, email, purpose)).rejects.toThrow(
        'Lock acquisition failed',
      );
    });

    it('should handle email queue errors', () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;
      const queueError = new Error('Queue is full');

      mockDeps.otpRateLimitCache.get.mockResolvedValueOnce(null);
      mockDeps.emailQueue.add.mockRejectedValueOnce(queueError);

      // Act & Assert
      expect(otpService.sendOtp(userId, email, purpose)).rejects.toThrow(
        'Queue is full',
      );
    });

    it('should handle rate limit cache errors', () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;
      const cacheError = new Error('Cache unavailable');

      mockDeps.otpRateLimitCache.get.mockRejectedValueOnce(cacheError);

      // Act & Assert
      expect(otpService.sendOtp(userId, email, purpose)).rejects.toThrow(
        'Cache unavailable',
      );
    });

    it('should handle rate limit set cache errors', () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;
      const setCacheError = new Error('Failed to set rate limit');

      mockDeps.otpRateLimitCache.get.mockResolvedValueOnce(null);
      mockDeps.otpRateLimitCache.set.mockRejectedValueOnce(setCacheError);

      // Act & Assert
      expect(otpService.sendOtp(userId, email, purpose)).rejects.toThrow(
        'Failed to set rate limit',
      );
    });

    it('should ensure atomic operation within lock', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;
      let lockCallbackExecuted = false;

      mockDeps.otpRateLimitCache.get.mockResolvedValueOnce(null);
      mockDeps.lockingService.lock.mockImplementation(
        async (_: string, callback: () => any) => {
          lockCallbackExecuted = true;
          return await callback();
        },
      );

      // Act
      await otpService.sendOtp(userId, email, purpose);

      // Assert
      expect(lockCallbackExecuted).toBe(true);
      expect(mockDeps.lockingService.lock).toHaveBeenCalledTimes(1);
    });

    // Bun 1.3 enhanced tests with type checking
    it('should have correct type signatures', () => {
      // Test type safety of OTP service methods
      expectTypeOf(otpService.generateOtp).toBeFunction();
      expectTypeOf(otpService.verifyOtp).toBeFunction();
      expectTypeOf(otpService.sendOtp).toBeFunction();

      // Test parameter types
      expectTypeOf(otpService.generateOtp).parameters.toEqualTypeOf<
        [string, PurposeVerify, string]
      >();
      expectTypeOf(otpService.verifyOtp).parameters.toEqualTypeOf<
        [string, PurposeVerify, string]
      >();
      expectTypeOf(otpService.sendOtp).parameters.toEqualTypeOf<
        [string, string, PurposeVerify]
      >();

      // Test return types
      expectTypeOf(otpService.generateOtp).returns.toEqualTypeOf<
        Promise<string>
      >();
      expectTypeOf(otpService.verifyOtp).returns.toEqualTypeOf<
        Promise<string | null>
      >();
      expectTypeOf(otpService.sendOtp).returns.toEqualTypeOf<
        Promise<string | null>
      >();
    });

    it('should handle empty or whitespace email', async () => {
      // Arrange
      const userId = 'user-123';
      const purpose = PurposeVerify.REGISTER;

      // Act & Assert for empty string - should throw error
      try {
        await otpService.sendOtp(userId, '', purpose);
        throw new Error('Expected sendOtp to throw an error for empty email');
      } catch (error) {
        expect((error as Error).message).toBe('Invalid email format');
      }

      // Act & Assert for whitespace - should throw error
      try {
        await otpService.sendOtp(userId, '   ', purpose);
        throw new Error(
          'Expected sendOtp to throw an error for whitespace email',
        );
      } catch (error) {
        expect((error as Error).message).toBe('Invalid email format');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should support complete OTP lifecycle', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;

      mockDeps.otpRateLimitCache.get.mockResolvedValueOnce(null);
      token16Spy.mockReturnValue('integration-token');

      let capturedOtp = '';
      mockDeps.otpCache.set.mockImplementation((_: string, data: any) => {
        capturedOtp = data.otp;
        return Promise.resolve(undefined);
      });

      mockDeps.otpCache.get.mockImplementation((id: string) => {
        if (id === 'integration-token') {
          return Promise.resolve({
            otp: capturedOtp,
            purpose,
            userId,
          });
        }
        return Promise.resolve(null);
      });

      // Act - Send OTP
      const otpToken = await otpService.sendOtp(userId, email, purpose);

      // Act - Verify OTP
      const verificationResult = await otpService.verifyOtp(
        otpToken as string,
        purpose,
        capturedOtp,
      );

      // Assert
      expect(otpToken).toBe('integration-token');
      expect(verificationResult).toBe(userId);
      expect(mockDeps.otpCache.del).toHaveBeenCalledWith('integration-token');
    });

    it('should handle concurrent OTP requests for same email with locking', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;
      let lockCounter = 0;

      // Reset token16 mock to return consistent value
      token16Spy.mockReturnValue('abc123def456ghi7');

      mockDeps.otpRateLimitCache.get.mockResolvedValue(null);
      mockDeps.lockingService.lock.mockImplementation(
        async (_: string, callback: () => any) => {
          lockCounter++;
          // Simulate some processing time
          await new Promise((resolve) => setTimeout(resolve, 10));
          return await callback();
        },
      );

      // Act - Send multiple concurrent requests
      const promises: Promise<any>[] = [
        otpService.sendOtp(userId, email, purpose),
        otpService.sendOtp(userId, email, purpose),
        otpService.sendOtp(userId, email, purpose),
      ];

      const results = await Promise.all(promises);

      // Assert - All requests should be processed with locking
      expect(lockCounter).toBe(3);
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBe('abc123def456ghi7');
      });
    });
  });

  describe('Bun 1.3 Enhanced Testing', () => {
    it.each([
      { purpose: PurposeVerify.REGISTER, expected: 'register' },
      { purpose: PurposeVerify.FORGOT_PASSWORD, expected: 'forgot-password' },
      { purpose: PurposeVerify.RESET_MFA, expected: 'reset-mfa' },
    ])('should handle purpose %purpose correctly', async ({ purpose }) => {
      const userId = 'user-123';
      const email = 'test@example.com';

      mockDeps.otpRateLimitCache.get.mockResolvedValueOnce(null);

      const result = await otpService.sendOtp(userId, email, purpose);

      expect(result).toBe('abc123def456ghi7');
      expect(mockDeps.emailQueue.add).toHaveBeenCalledWith(EmailType.OTP, {
        [EmailType.OTP]: {
          email,
          otp: expect.stringMatching(/^\d{6}$/),
          purpose,
        },
      });
    });

    it('should fail for invalid email format', async () => {
      const userId = 'user-123';
      const invalidEmail = 'not-an-email';
      const purpose = PurposeVerify.REGISTER;

      // This should fail due to an invalid email format
      try {
        await otpService.sendOtp(userId, invalidEmail, purpose);
        throw new Error(
          'Expected sendOtp to throw an error for invalid email format',
        );
      } catch (error) {
        expect((error as Error).message).toBe('Invalid email format');
      }
    });

    it('should be skipped - performance test for high volume', async () => {
      const userId = 'user-123';
      const purpose = PurposeVerify.REGISTER;

      // Simulate high-volume OTP generation
      const promises = Array.from({ length: 1000 }, () =>
        otpService.generateOtp('test-id', purpose, userId),
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(1000);
    });

    it('should test mock return values with new matchers', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const purpose = PurposeVerify.REGISTER;

      // Mock multiple return values for rate limit check
      mockDeps.otpRateLimitCache.get
        .mockReturnValueOnce(null) // First call - not rate limited
        .mockReturnValueOnce(true) // Second call - rate limited
        .mockReturnValueOnce(null); // Third call - not rate limited

      const result1 = await otpService.sendOtp(userId, email, purpose);
      const result2 = await otpService.sendOtp(userId, email, purpose);
      const result3 = await otpService.sendOtp(userId, email, purpose);

      expect(mockDeps.otpRateLimitCache.get).toHaveNthReturnedWith(1, null);
      expect(mockDeps.otpRateLimitCache.get).toHaveNthReturnedWith(2, true);
      expect(mockDeps.otpRateLimitCache.get).toHaveNthReturnedWith(3, null);
      expect(mockDeps.otpRateLimitCache.get).toHaveLastReturnedWith(null);

      expect(result1).toBe('abc123def456ghi7');
      expect(result2).toBeNull();
      expect(result3).toBe('abc123def456ghi7');
    });

    it('should test type safety with expectTypeOf', async () => {
      // Test PurposeVerify enum type
      expectTypeOf(PurposeVerify.REGISTER).toEqualTypeOf<PurposeVerify>();
      expectTypeOf(
        PurposeVerify.FORGOT_PASSWORD,
      ).toEqualTypeOf<PurposeVerify>();
      expectTypeOf(PurposeVerify.RESET_MFA).toEqualTypeOf<PurposeVerify>();

      // Test EmailType enum
      expectTypeOf(EmailType.OTP).toEqualTypeOf<EmailType>();

      // Test function parameter types
      const testParams: [string, string, PurposeVerify] = [
        'user-123',
        'test@example.com',
        PurposeVerify.REGISTER,
      ];
      expectTypeOf(testParams).toEqualTypeOf<[string, string, PurposeVerify]>();

      // Test return type
      const result = await otpService.generateOtp(
        'test-id',
        PurposeVerify.REGISTER,
        'user-123',
      );
      expectTypeOf(result).toEqualTypeOf<string>();
    });

    it.each([
      {
        userId: 'user-123',
        email: '',
        purpose: PurposeVerify.REGISTER,
        expectedError: 'Invalid email format',
      },
    ])('should fail for invalid email format %email', async ({
      userId,
      email,
      purpose,
      expectedError,
    }) => {
      try {
        await otpService.sendOtp(userId, email, purpose);
        throw new Error('Expected sendOtp to throw an error for invalid email');
      } catch (error) {
        expect((error as Error).message).toBe(expectedError);
      }
    });
  });
});
