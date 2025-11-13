import { defaultRoles } from '@server/share/constants';

export const RoleFixtures = {
  createRole(
    overrides?: Partial<{
      id: string;
      title: string;
      description: string | null;
      enabled: boolean;
    }>,
  ) {
    return {
      id: overrides?.id || 'role_test_123',
      title: overrides?.title || 'Test Role',
      description: overrides?.description ?? 'Test role description',
      enabled: overrides?.enabled ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  createDefaultUserRole() {
    return {
      id: defaultRoles.user.id,
      title: defaultRoles.user.title,
      description: defaultRoles.user.description,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  createDefaultAdminRole() {
    return {
      id: defaultRoles.admin.id,
      title: defaultRoles.admin.title,
      description: defaultRoles.admin.description,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
};
