import type { Prisma } from 'src/generated';
export type PrismaModelName = Prisma.ModelName;

export const ENTITY_TYPE_MAP = {
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
  Proxy: 'proxy',
} as const satisfies Record<PrismaModelName, string>;

export type EntityType = (typeof ENTITY_TYPE_MAP)[PrismaModelName];
