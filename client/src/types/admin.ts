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
  role: {
    id: string;
    title: string;
  };
  expiresAt: string | null;
}

export interface SessionStats {
  total: number;
  active: number;
  revoked: number;
  expired: number;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  status: AdminUserStatus;
  name: string | null;
  created: string;
  emailVerified: boolean;
  roles: AdminUserRoleRef[];
  protected?: boolean;
  sessionStats: SessionStats;
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
  statuses?: AdminUserStatus[];
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
  lockoutUntil?: string | null;
  lockoutReason?: AdminLockoutReason | null;
  emailVerified?: boolean;
  passwordAttempt?: number;
  passwordExpired?: string | null;
  reason?: string;
}

export interface AdminUserRoleAssignment {
  roleId: string;
  expiresAt: string | null;
}

export interface AdminUserUpdateRolesPayload {
  roles: AdminUserRoleAssignment[];
  reason: string;
}

export interface AdminUserMfaPayload {
  reason?: string;
}

export interface AdminUserActionResponse {
  userId: string;
  auditLogId: string;
}

export interface RolePlayer {
  playerId: string;
  expiresAt: string | null;
}

export interface RolePlayerDetail {
  id: string;
  email: string;
  expiresAt: string | null;
}

export interface AdminRole {
  id: string;
  title: string;
  description?: string | null;
  enabled: boolean;
  permissionIds: string[];
  totalPlayers?: number;
  activePlayers?: number;
  expiredPlayers?: number;
  protected?: boolean;
}

export interface AdminRoleDetail {
  id: string;
  title: string;
  description?: string | null;
  enabled: boolean;
  permissionIds: string[];
  protected?: boolean;
  players: RolePlayerDetail[];
}

export interface UpsertRoleDto {
  id?: string;
  title: string;
  description?: string | null;
  enabled: boolean;
  permissionIds: string[];
  players: RolePlayer[];
}

export interface AdminPermission {
  id: string;
  title: string;
  description?: string | null;
}

export interface AdminRoleListResponse {
  docs: AdminRole[];
  count: number;
}

export enum SettingDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  JSON = 'json',
}

export interface AdminSetting {
  id: string;
  key: string;
  description: string | null;
  type: SettingDataType;
  value: string;
  isSecret?: boolean;
}

export interface UpdateSettingDto {
  value: string;
  isSecret: boolean;
  description?: string | null;
}
