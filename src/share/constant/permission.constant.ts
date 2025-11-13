export const PERMISSIONS = {
  ROLE: {
    VIEW: 'ROLE.VIEW',
    UPDATE: 'ROLE.UPDATE',
    DELETE: 'ROLE.DELETE',
  },
  SESSION: {
    VIEW: 'SESSION.VIEW',
    REVOKE: 'SESSION.REVOKE',
  },
} as const;

export type UPermission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]];
