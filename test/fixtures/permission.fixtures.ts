import { PERMISSIONS } from '@server/share/constants';

export const PermissionFixtures = {
  createPermission(
    overrides?: Partial<{
      id: string;
      title: string;
      description: string | null;
    }>,
  ) {
    return {
      id: overrides?.id || 'perm_test_123',
      title: overrides?.title || PERMISSIONS.ROLE.VIEW,
      description: overrides?.description ?? 'Test permission',
    };
  },

  createRolePermissions() {
    return [
      {
        id: 'perm_role_view',
        title: PERMISSIONS.ROLE.VIEW,
        description: 'View roles',
      },
      {
        id: 'perm_role_update',
        title: PERMISSIONS.ROLE.UPDATE,
        description: 'Update roles',
      },
      {
        id: 'perm_role_delete',
        title: PERMISSIONS.ROLE.DELETE,
        description: 'Delete roles',
      },
    ];
  },

  createSessionPermissions() {
    return [
      {
        id: 'perm_session_view',
        title: PERMISSIONS.SESSION.VIEW,
        description: 'View sessions',
      },
      {
        id: 'perm_session_revoke',
        title: PERMISSIONS.SESSION.REVOKE,
        description: 'Revoke sessions',
      },
    ];
  },
};
