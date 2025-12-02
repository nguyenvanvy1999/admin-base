export const ADMIN_USER_STATUSES = [
  'inactive',
  'active',
  'suspendded',
  'banned',
] as const;

export const ADMIN_LOCKOUT_REASONS = [
  'brute_force',
  'suspicious_activity',
  'admin_action',
  'policy_violation',
] as const;

export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];
export type AdminLockoutReason = (typeof ADMIN_LOCKOUT_REASONS)[number];

export interface AdminUserRoleRef {
  roleId: string;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  status: AdminUserStatus;
  name: string | null;
  created: string;
  emailVerified: boolean;
  roles: AdminUserRoleRef[];
}

export interface AdminUserDetail extends AdminUserSummary {
  modified: string;
  lockoutUntil: string | null;
  lockoutReason: AdminLockoutReason | null;
  passwordAttempt: number;
  passwordExpired: string | null;
}

export interface AdminUserListResponse {
  docs: AdminUserSummary[];
  count: number;
}

export interface AdminUserListQuery {
  skip?: number;
  take?: number;
  email?: string;
  search?: string;
  status?: AdminUserStatus;
  roleIds?: string[];
}

export interface AdminUserCreatePayload {
  email: string;
  password: string;
  name?: string | null;
  roleIds?: string[];
  status?: AdminUserStatus;
  emailVerified?: boolean;
}

export interface AdminUserUpdatePayload {
  status?: AdminUserStatus;
  name?: string | null;
  roleIds?: string[];
  lockoutUntil?: string | null;
  lockoutReason?: AdminLockoutReason | null;
  emailVerified?: boolean;
  passwordAttempt?: number;
  passwordExpired?: string | null;
  reason?: string;
}

export interface AdminUserMfaPayload {
  reason?: string;
}

export interface AdminUserActionResponse {
  userId: string;
  auditLogId: string;
}
