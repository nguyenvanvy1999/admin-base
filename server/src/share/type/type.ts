import type { JWTPayload } from 'jose';
import type { PrismaClient, User } from 'src/generated';
import {
  ACTIVITY_TYPE,
  EmailType,
  type LOG_LEVEL,
  type LoginMethod,
  type OAUTH,
  type PERMISSIONS,
  type PurposeVerify,
} from 'src/services/shared/constants';
import type { Paths } from 'type-fest';

export type MfaMethod =
  | 'totp'
  | 'email'
  | 'backup-code'
  | 'backup-codes'
  | 'admin-reset'
  | 'admin-disable'
  | 'disable'
  | 'reset';
export type MfaStage = 'confirm' | 'request' | 'generate';
export type PathType = 'worker' | 'cron';
export type ActionType =
  | 'mfa_setup_required'
  | 'refresh_token'
  | 'user-update'
  | 'user-update-roles'
  | `otp_${string}`
  | `otp_sent_${string}`;

export interface BaseErrorPayload {
  error?: string;
}

export interface BaseActorActionPayload {
  actorId?: string;
  targetUserId?: string;
  reason?: string;
}

export interface ActivityTypeMap extends Record<ACTIVITY_TYPE, object> {
  [ACTIVITY_TYPE.LOGIN]: {
    method: LoginMethod;
    action?: ActionType;
  } & BaseErrorPayload;

  [ACTIVITY_TYPE.REGISTER]: {
    method: LoginMethod;
  } & BaseErrorPayload;

  [ACTIVITY_TYPE.LOGOUT]: Record<string, never>;

  [ACTIVITY_TYPE.CHANGE_PASSWORD]: BaseErrorPayload;

  [ACTIVITY_TYPE.SETUP_MFA]: {
    method: MfaMethod;
    stage: MfaStage;
  } & BaseErrorPayload;

  [ACTIVITY_TYPE.LINK_OAUTH]: {
    provider: OAUTH;
    providerId: string;
  } & BaseErrorPayload;

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
    method?: MfaMethod;
    previouslyEnabled?: boolean;
  } & BaseErrorPayload &
    BaseActorActionPayload;

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
    action?: ActionType;
    changes?: Record<string, { previous: unknown; next: unknown }>;
  } & BaseActorActionPayload;

  [ACTIVITY_TYPE.INTERNAL_ERROR]: Record<string, any>;

  [ACTIVITY_TYPE.P2P_ORDER_EXPIRED]: {
    orderId: string;
    sellerId: string;
    buyerId: string;
    expiresAt: string;
    refundTransactionId: string;
    path: PathType;
  };

  [ACTIVITY_TYPE.P2P_ORDER_EXPIRE_FAILED]: {
    orderId: string;
    path: PathType;
    error: string;
  };
}

export type AuditLogEntry<T extends ACTIVITY_TYPE = ACTIVITY_TYPE> = {
  userId?: string | null;
  sessionId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  type: T;
  payload: ActivityTypeMap[T];
  level?: LOG_LEVEL;
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

export type IUserMFA = Pick<
  User,
  'id' | 'mfaTotpEnabled' | 'totpSecret' | 'backupCodes' | 'backupCodesUsed'
>;

export type SecurityDeviceInsight = {
  deviceFingerprint?: string | null;
  isNewDevice: boolean;
};
