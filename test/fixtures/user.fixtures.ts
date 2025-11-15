export const UserFixtures = {
  createUser(
    overrides?: Partial<{
      id: string;
      username: string;
      password: string;
      name: string | null;
      baseCurrencyId: string;
    }>,
  ) {
    return {
      id: overrides?.id || 'user_test_123',
      username: overrides?.username || 'testuser',
      password: overrides?.password || 'hashed_password',
      name: overrides?.name ?? 'Test User',
      baseCurrencyId: overrides?.baseCurrencyId || 'currency_vnd',
      settings: null,

      created: new Date(),
      modified: new Date(),
    };
  },
};
