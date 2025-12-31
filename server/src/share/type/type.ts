import type { JWTPayload } from 'jose';
import type {
  AuditLogCategory,
  AuditLogVisibility,
  LogType,
  PrismaClient,
  SecurityEventSeverity,
  SecurityEventType,
  User,
} from 'src/generated';
import {
  EmailType,
  type LOG_LEVEL,
  type PERMISSIONS,
  type PurposeVerify,
} from 'src/share/constants';
import type { Paths } from 'type-fest';

export type MfaChangeMethod = 'admin-reset' | 'admin-disable';

export type AuditLogEntry = {
  userId?: string | null;
  sessionId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  entityDisplay?: Record<string, unknown> | null;
  subjectUserId?: string | null;
  description?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  logType?: LogType;
  visibility?: AuditLogVisibility;
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  resolved?: boolean;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  type: string;
  payload: Record<string, unknown>;
  level?: LOG_LEVEL;
  timestamp?: Date;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  category?: AuditLogCategory;
};

export type EnrichedAuditLogEntry = AuditLogEntry & {
  logId: string;
  timestamp: Date;
};

export type PermissionKey = Paths<typeof PERMISSIONS, { maxRecursionDepth: 1 }>;
export type ValidPermissionKey<T> = T extends `${string}.${string}` ? T : never;
export type UPermission = ValidPermissionKey<PermissionKey>;

export interface IStorageBackend {
  upload(file: File): Promise<string>;

  download(filename: string): Promise<IDownloadRes>;
}

export interface IDownloadRes {
  content: Blob;
  contentType: {
    mime: string;
    ext: string;
  };
}

export interface SendMailMap extends Record<EmailType, object> {
  [EmailType.OTP]: { email: string; otp: string; purpose: PurposeVerify };
}

export interface IReqMeta extends Record<string, unknown> {
  id: string;
  timezone: string;
  timestamp: number;
  userAgent: string;
  language: string;
  clientIp: string;
}

export type IPHeaders =
  | 'x-real-ip'
  | 'x-client-ip'
  | 'cf-connecting-ip'
  | 'fastly-client-ip'
  | 'x-cluster-client-ip'
  | 'x-forwarded'
  | 'forwarded-for'
  | 'forwarded'
  | 'appengine-user-ip'
  | 'true-client-ip'
  | 'cf-pseudo-ipv4'
  | (string & {});

export type IJwtVerified = JWTPayload & { data: string };

export interface ITokenPayload {
  userId: string;
  timestamp: number;
  sessionId: string;
  clientIp: string;
  userAgent: string;
}

export type AppAuthMeta = {
  derive: { currentUser: ICurrentUser };
  decorator: Record<string, unknown>;
  store: Record<string, unknown>;
  resolve: Record<string, unknown>;
};

export interface ICurrentUser
  extends Omit<
    User,
    | 'passwordExpired'
    | 'totpSecret'
    | 'backupCodes'
    | 'backupCodesUsed'
    | 'password'
    | 'passwordCreated'
    | 'passwordAttempt'
    | 'lastPasswordChangeAt'
    | 'lastLoginAt'
    | 'pendingRef'
    | 'activeRef'
    | 'refCode'
    | 'mfaEnrollRequired'
  > {
  permissions: UPermission[];
  sessionId: string;
  roleIds: string[];
}

export type PrismaTx = Omit<
  PrismaClient<never, never>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

export type SecurityDeviceInsight = {
  deviceFingerprint?: string | null;
  isNewDevice: boolean;
};
