import type { JWTPayload } from 'jose';
import type {
  LogType,
  PrismaClient,
  SecurityEventSeverity,
  SecurityEventType,
  User,
} from 'src/generated';
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

export enum AuditEventCategory {
  SECURITY = 'security',
  CUD = 'cud',
  INTERNAL = 'internal',
}

export type CudAction = 'create' | 'update' | 'delete';
export type AuditChangeSet = Record<
  string,
  { previous: unknown; next: unknown }
>;

export type BaseCudSnapshot = Record<string, unknown>;
export type AnyCudPayload =
  | CudCreatePayload<string>
  | CudUpdatePayload<string>
  | CudDeletePayload<string>;

export type CudPayloadBase<
  EntityType extends string = string,
  Action extends CudAction | undefined = CudAction | undefined,
  Before = BaseCudSnapshot | undefined,
  After = BaseCudSnapshot | undefined,
> = {
  category: AuditEventCategory.CUD;
  entityType: EntityType;
  entityId: string;
  action?: Action;
  before?: Before;
  after?: After;
  changes?: AuditChangeSet;
};

export type CudCreatePayload<
  EntityType extends string,
  After = Record<string, unknown>,
> = CudPayloadBase<EntityType, 'create' | undefined, undefined, After> & {
  after?: After;
};

export type CudUpdatePayload<
  EntityType extends string,
  Snapshot = Record<string, unknown>,
> = CudPayloadBase<EntityType, 'update', Snapshot, Snapshot> & {
  before: Snapshot;
  after: Snapshot;
};

export type CudDeletePayload<
  EntityType extends string,
  Before = Record<string, unknown>,
> = CudPayloadBase<EntityType, 'delete' | undefined, Before, undefined> & {
  before?: Before;
};

export type SecurityEventPayload = {
  category: AuditEventCategory.SECURITY;
  metadata?: Record<string, unknown>;
  location?: Record<string, unknown>;
};

export type InternalEventPayload = {
  category: AuditEventCategory.INTERNAL;
  error?: string;
  detail?: Record<string, unknown>;
};

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
    category?: AuditEventCategory.SECURITY;
    method: LoginMethod;
    action?: ActionType;
  } & BaseErrorPayload;

  [ACTIVITY_TYPE.REGISTER]: {
    category?: AuditEventCategory.SECURITY;
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

  [ACTIVITY_TYPE.DEL_ROLE]: CudDeletePayload<'role', { roleIds: string[] }>;

  [ACTIVITY_TYPE.CREATE_ROLE]: CudCreatePayload<
    'role',
    {
      id: string;
      description: string | null;
      title: string;
      permissionIds: string[];
      playerIds: string[];
    }
  >;

  [ACTIVITY_TYPE.UPDATE_ROLE]: CudUpdatePayload<
    'role',
    {
      id: string;
      description: string | null;
      title: string;
      permissionIds: string[];
      playerIds: string[];
    }
  >;

  [ACTIVITY_TYPE.REVOKE_SESSION]: CudDeletePayload<
    'session',
    { sessionId: string }
  >;

  [ACTIVITY_TYPE.RESET_MFA]: {
    method?: MfaMethod;
    previouslyEnabled?: boolean;
  } & BaseErrorPayload &
    BaseActorActionPayload;

  [ACTIVITY_TYPE.CREATE_IP_WHITELIST]: CudCreatePayload<
    'ip_whitelist',
    {
      ip: string;
      note?: string;
    }
  >;

  [ACTIVITY_TYPE.DEL_IP_WHITELIST]: CudDeletePayload<
    'ip_whitelist',
    { ips: string[] }
  >;

  [ACTIVITY_TYPE.UPDATE_SETTING]: CudUpdatePayload<
    'setting',
    { key: string; value: string }
  >;

  [ACTIVITY_TYPE.CREATE_USER]: CudCreatePayload<
    'user',
    {
      id: string;
      enabled: boolean;
      roleIds: string[];
      username: string;
    }
  >;

  [ACTIVITY_TYPE.UPDATE_USER]: CudUpdatePayload<
    'user',
    {
      id: string;
      action?: ActionType;
      changes?: AuditChangeSet;
    } & BaseActorActionPayload
  >;

  [ACTIVITY_TYPE.INTERNAL_ERROR]: InternalEventPayload;

  [ACTIVITY_TYPE.SECURITY_EVENT]: SecurityEventPayload;
}

export type AuditLogEntry<T extends ACTIVITY_TYPE = ACTIVITY_TYPE> = {
  userId?: string | null;
  sessionId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  logType?: LogType;
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  resolved?: boolean;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  type: T;
  payload: ActivityTypeMap[T];
  level?: LOG_LEVEL;
  timestamp?: Date;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  category?: AuditEventCategory;
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
