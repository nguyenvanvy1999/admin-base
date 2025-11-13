import { defaultRoles } from './role.constant';

export const PERMISSIONS = {
  USER: {
    VIEW: { roles: [defaultRoles.admin.id, defaultRoles.user.id] },
    UPDATE: { roles: [defaultRoles.admin.id, defaultRoles.user.id] },
    VIEW_ALL: { roles: [defaultRoles.admin.id] },
    DELETE: { roles: [defaultRoles.admin.id] },
    CREATE: { roles: [defaultRoles.admin.id] },
  },
  ROLE: {
    VIEW: { roles: [defaultRoles.admin.id] },
    UPDATE: { roles: [defaultRoles.admin.id] },
    DELETE: { roles: [defaultRoles.admin.id] },
  },
  SESSION: {
    VIEW: { roles: [defaultRoles.admin.id, defaultRoles.user.id] },
    VIEW_ALL: { roles: [defaultRoles.admin.id] },
    REVOKE: { roles: [defaultRoles.admin.id, defaultRoles.user.id] },
    REVOKE_ALL: { roles: [defaultRoles.admin.id] },
  },
  ADMIN: {
    ACCESS: { roles: [defaultRoles.admin.id] },
  },
} as const;
