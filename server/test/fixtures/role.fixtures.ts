import { defaultRoles } from '@server/share';

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
      created: new Date(),
      modified: new Date(),
    };
  },

  createDefaultUserRole() {
    return {
      id: defaultRoles.user.id,
      title: defaultRoles.user.title,
      description: defaultRoles.user.description,
      enabled: true,
      created: new Date(),
      modified: new Date(),
    };
  },

  createDefaultAdminRole() {
    return {
      id: defaultRoles.admin.id,
      title: defaultRoles.admin.title,
      description: defaultRoles.admin.description,
      enabled: true,
      created: new Date(),
      modified: new Date(),
    };
  },
};
