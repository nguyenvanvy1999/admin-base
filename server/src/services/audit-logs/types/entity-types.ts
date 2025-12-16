export type PrismaModelName =
  | 'User'
  | 'Role'
  | 'Session'
  | 'UserIpWhitelist'
  | 'Setting'
  | 'ApiKey'
  | 'Permission'
  | 'RolePermission'
  | 'RolePlayer'
  | 'Notification'
  | 'NotificationTemplate'
  | 'RateLimitConfig'
  | 'I18n'
  | 'AuditLog'
  | 'Referral'
  | 'AuthProvider'
  | 'UserAuthProvider';

export const ENTITY_TYPE_MAP: Record<PrismaModelName, string> = {
  User: 'user',
  Role: 'role',
  Session: 'session',
  UserIpWhitelist: 'ip_whitelist',
  Setting: 'setting',
  ApiKey: 'api_key',
  Permission: 'permission',
  RolePermission: 'role_permission',
  RolePlayer: 'role_player',
  Notification: 'notification',
  NotificationTemplate: 'notification_template',
  RateLimitConfig: 'rate_limit_config',
  I18n: 'i18n',
  AuditLog: 'audit_log',
  Referral: 'referral',
  AuthProvider: 'auth_provider',
  UserAuthProvider: 'user_auth_provider',
} as const;

export type EntityType = (typeof ENTITY_TYPE_MAP)[PrismaModelName];
