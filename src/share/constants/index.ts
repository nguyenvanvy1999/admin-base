export * from './category';
export * from './error';
export const REGEX_TIME =
  /^\d+\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?)$/i;
export const SUPER_ADMIN_ID = '019a7cc4-5742-7f7d-9f56-cd15f3ea6860';

export const defaultRoles: Record<
  'user' | 'admin',
  { id: string; title: string; description: string }
> = {
  user: {
    id: 'role_user_default',
    title: 'User',
    description: 'Default user role',
  },
  admin: {
    id: 'role_admin_default',
    title: 'Administrator',
    description: 'Administrator role',
  },
};

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
    CREATE: { roles: [defaultRoles.admin.id] },
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
export const CURRENCY_IDS = {
  VND: '019a6433-f9ac-7e22-af70-0f13cdf372bd',
  USD: '019a6433-f9b0-703c-a19b-6f420b96e6c4',
} as const;
export enum CACHE_NS {
  CURRENT_USER = 'current-user',
}
export const LOG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
} as const;
