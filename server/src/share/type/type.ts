import type { JWTPayload } from 'jose';
import type { PrismaClient, User } from 'src/generated';
import type { Paths } from 'type-fest';
import {
  ACTIVITY_TYPE,
  EmailType,
  type LOG_LEVEL,
  type LoginMethod,
  type OAUTH,
  type PERMISSIONS,
  type PurposeVerify,
} from '../constant';

export interface ActivityTypeMap extends Record<ACTIVITY_TYPE, object> {
  [ACTIVITY_TYPE.LOGIN]: {
    method: LoginMethod;
    error?: string;
    action?: string;
  };
  [ACTIVITY_TYPE.REGISTER]: {
    method: LoginMethod;
    error?: string;
  };
  [ACTIVITY_TYPE.LOGOUT]: Record<string, never>;
  [ACTIVITY_TYPE.CHANGE_PASSWORD]: Record<string, never>;
  [ACTIVITY_TYPE.SETUP_MFA]: {
    method: string;
    stage: 'confirm' | 'request' | 'generate';
    error?: string;
  };
  [ACTIVITY_TYPE.LINK_OAUTH]: {
    provider: OAUTH;
    providerId: string;
    error?: string;
  };

  [ACTIVITY_TYPE.DEL_ROLE]: {
    roleIds: string[];
  };
  [ACTIVITY_TYPE.CREATE_ROLE]: {
    id: string;
    description: string | null;
    title: string;
    permissionIds: string[];
    playerIds: string[];
  };
  [ACTIVITY_TYPE.UPDATE_ROLE]: {
    id: string;
    description: string | null;
    title: string;
    permissionIds: string[];
    playerIds: string[];
  };

  [ACTIVITY_TYPE.REVOKE_SESSION]: {
    sessionId: string;
  };
  [ACTIVITY_TYPE.RESET_MFA]: {
    method?: string;
    reason?: string;
    actorId?: string;
    targetUserId?: string;
    previouslyEnabled?: boolean;
    error?: string;
  };
  [ACTIVITY_TYPE.CREATE_IP_WHITELIST]: {
    ip: string;
    note?: string;
  };
  [ACTIVITY_TYPE.DEL_IP_WHITELIST]: {
    ips: string[];
  };
  [ACTIVITY_TYPE.UPDATE_SETTING]: {
    key: string;
    value: string;
  };

  [ACTIVITY_TYPE.CREATE_USER]: {
    id: string;
    enabled: boolean;
    roleIds: string[];
    username: string;
  };
  [ACTIVITY_TYPE.UPDATE_USER]: {
    id: string;
    reason?: string;
    actorId?: string;
    action?: string;
    changes?: Record<string, { previous: unknown; next: unknown }>;
  };
  [ACTIVITY_TYPE.INTERNAL_ERROR]: Record<string, any>;
  [ACTIVITY_TYPE.P2P_ORDER_EXPIRED]: {
    orderId: string;
    sellerId: string;
    buyerId: string;
    expiresAt: string;
    refundTransactionId: string;
    path: 'worker' | 'cron';
  };
  [ACTIVITY_TYPE.P2P_ORDER_EXPIRE_FAILED]: {
    orderId: string;
    error: string;
    path: 'worker' | 'cron';
  };
}

export type AuditLogEntry<T extends ACTIVITY_TYPE = ACTIVITY_TYPE> = {
  /** User ID who performed the action */
  userId?: string | null;
  /** Session ID of the request */
  sessionId?: string | null;
  /** IP address of the request */
  ip?: string | null;
  /** User agent string */
  userAgent?: string | null;
  /** Activity type */
  type: T;
  /** Activity-specific payload data */
  payload: ActivityTypeMap[T];
  /** Log level */
  level?: LOG_LEVEL;
  /** Timestamp (defaults to now) */
  timestamp?: Date;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
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
  > {
  permissions: UPermission[];
  sessionId: string;
  roleIds: string[];
}

export type PrismaTx = Omit<
  PrismaClient<never, never>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

export type IUserMFA = Pick<User, 'id' | 'mfaTotpEnabled' | 'totpSecret'>;

export type SecurityDeviceInsight = {
  deviceFingerprint?: string | null;
  isNewDevice: boolean;
};
