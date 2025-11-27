import type {
  Currency,
  Permission,
  Role,
  User,
  UserStatus,
} from 'src/generated';
import { ADMIN_USER_ID, SYS_USER_ID } from 'src/share';

export class SeedFixtures {
  static createCurrency(overrides: Partial<Currency> = {}): Currency {
    return {
      id: 'currency_1',
      code: 'USDT',
      name: 'Tether USD',
      symbol: '$',
      created: new Date(),
      modified: new Date(),
      isActive: true,
      ...overrides,
    };
  }

  static createUser(overrides: Partial<User> = {}): User {
    return {
      id: 'user_1',
      email: 'test@example.com',
      status: 'inactive' as UserStatus,
      password: 'hashed_password',
      name: 'Name',
      // username: 'username', // Removed - not in User model
      baseCurrencyId: 'baseCurrencyId',
      settings: {},
      passwordExpired: new Date(),
      passwordCreated: new Date(),
      passwordAttempt: 0,
      created: new Date(),
      modified: new Date(),
      lastPasswordChangeAt: null,
      activeRef: 0,
      pendingRef: 0,
      mfaTotpEnabled: false,
      totpSecret: null,
      backupCodes: null,
      lastLoginAt: null,
      refCode: null,
      emailVerified: false,
      emailVerificationToken: null,
      lockoutUntil: null,
      lockoutReason: null,
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
      lastFailedLoginAt: null,
      suspiciousActivityCount: 0,
      ...overrides,
    };
  }

  static createSystemUser(overrides: Partial<User> = {}): User {
    return this.createUser({
      id: SYS_USER_ID,
      ...overrides,
    });
  }

  static createAdminUser(overrides: Partial<User> = {}): User {
    return this.createUser({
      id: ADMIN_USER_ID,

      ...overrides,
    });
  }

  static createRole(overrides: Partial<Role> = {}): Role {
    return {
      id: 'role_1',
      title: 'Test Role',
      description: 'Test role description',
      enabled: true,
      created: new Date(),
      modified: new Date(),
      parentRoleId: null,
      ...overrides,
    };
  }

  static createPermission(overrides: Partial<Permission> = {}): Permission {
    return {
      id: 'permission_1',
      title: 'test.permission',
      description: 'Test permission',
      ...overrides,
    };
  }

  static createCurrencies(count = 3): Currency[] {
    return Array.from({ length: count }, (_, i) =>
      this.createCurrency({
        id: `currency_${i + 1}`,
        code: ['USDT', 'USDC', 'BTC'][i] || 'USDT',
      }),
    );
  }
}
