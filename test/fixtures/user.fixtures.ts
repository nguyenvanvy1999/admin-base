import { UserRole } from '@server/generated';

export const UserFixtures = {
  createUser(
    overrides?: Partial<{
      id: string;
      username: string;
      password: string;
      name: string | null;
      role: UserRole;
      baseCurrencyId: string;
    }>,
  ) {
    return {
      id: overrides?.id || 'user_test_123',
      username: overrides?.username || 'testuser',
      password: overrides?.password || 'hashed_password',
      name: overrides?.name ?? 'Test User',
      role: overrides?.role || UserRole.user,
      baseCurrencyId: overrides?.baseCurrencyId || 'currency_vnd',
      settings: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
};
