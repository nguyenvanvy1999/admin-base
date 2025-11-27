import { beforeEach, describe, expect, it, type Mock, mock } from 'bun:test';
import { PasswordService } from 'src/service/auth/password.service';

describe('PasswordService', () => {
  let envMock: any;
  let dbMock: { user: { update: Mock<() => Promise<{ id: string }>> } };
  let passwordHasherMock: {
    hash: Mock<(val: string) => Promise<string>>;
    verify: Mock<(val: string, hash: string) => Promise<boolean>>;
  };
  let passwordService: PasswordService;

  beforeEach(() => {
    envMock = {
      PASSWORD_PEPPER: '_SECRETPEPPER_',
      PASSWORD_EXPIRED: '10 minutes', // 10 minutes
    };
    dbMock = {
      user: {
        update: mock().mockResolvedValue({ id: 'user123' }),
      },
    };
    passwordHasherMock = {
      hash: mock(async (val: string) => `hashed_${val}`),
      verify: mock(
        async (val: string, hash: string) => hash === `hashed_${val}`,
      ),
    };
    passwordService = new PasswordService({
      env: envMock,
      db: dbMock as any,
      passwordHasher: passwordHasherMock,
    });
  });

  describe('createPassword', () => {
    it('should hash password with pepper and return proper object', async () => {
      const result = await passwordService.createPassword('plain');
      expect(result.password).toBe('hashed_plain_SECRETPEPPER_');
      expect(result.passwordAttempt).toBe(0);
      expect(result.passwordExpired instanceof Date).toBe(true);
      expect(result.passwordCreated instanceof Date).toBe(true);
    });
  });

  describe('increasePasswordAttempt', () => {
    it('should update user password attempt via db', async () => {
      await passwordService.increasePasswordAttempt('user123');
      expect(dbMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { passwordAttempt: { increment: 1 } },
        select: { id: true },
      });
    });
  });

  describe('comparePassword', () => {
    it('should return true if hash matches', async () => {
      const ok = await passwordService.comparePassword(
        'abc',
        'hashed_abc_SECRETPEPPER_',
      );
      expect(ok).toBe(true);
    });
    it('should return false if hash does not match', async () => {
      const bad = await passwordService.comparePassword(
        'abc',
        'incorrect_hash',
      );
      expect(bad).toBe(false);
    });
    it('should append pepper before hashing/verifying', async () => {
      await passwordService.comparePassword('myp', 'hashed_myp_SECRETPEPPER_');
      expect(passwordHasherMock.verify).toHaveBeenCalledWith(
        'myp_SECRETPEPPER_',
        'hashed_myp_SECRETPEPPER_',
      );
    });
  });

  // Edge: test error propagation from hasher or DB
  it('should propagate error from passwordHasher.hash', () => {
    passwordHasherMock.hash.mockRejectedValueOnce(new Error('fail hash'));
    expect(passwordService.createPassword('x')).rejects.toThrow('fail hash');
  });

  it('should propagate error from db.user.update', () => {
    dbMock.user.update.mockRejectedValue('fail db');
    expect(passwordService.increasePasswordAttempt('id')).rejects.toThrow(
      'fail db',
    );
  });
});
