import type {
  AuditLogCategory,
  AuditLogVisibility,
  LogType,
  SecurityEventSeverity,
} from 'src/generated';
import { ACTIVITY_TYPE } from 'src/services/shared/constants';
import type {
  ActivityTypeMap,
  AuditChangeSet,
  AuditLogEntry,
  EnrichedAuditLogEntry,
} from 'src/share';

export type NormalizedAuditPayload = {
  description?: string | null;
  meta?: Record<string, unknown>;
  location?: Record<string, unknown>;
  changes?: AuditChangeSet;
  entity?: {
    type?: string | null;
    id?: string | null;
  };
  actor?: {
    userId?: string | null;
  };
  subject?: {
    userId?: string | null;
  };
  extra?: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export type AuditEventSerializer<T extends ACTIVITY_TYPE> = (params: {
  payload: ActivityTypeMap[T];
  entry: AuditEventInput<T>;
  description?: string | null;
  entity?: { type?: string | null; id?: string | null };
  actorId?: string | null;
  subjectUserId?: string | null;
}) => NormalizedAuditPayload;

export type AuditEventDefinition<T extends ACTIVITY_TYPE> = {
  type: T;
  category: AuditLogCategory;
  logType?: LogType;
  defaultSeverity?: SecurityEventSeverity;
  visibility: AuditLogVisibility;
  describe?: (params: {
    payload: ActivityTypeMap[T];
    entry: AuditEventInput<T>;
  }) => string | null | undefined;
  resolveEntity?: (payload: ActivityTypeMap[T]) => {
    type?: string | null;
    id?: string | null;
  };
  getSubjectUserId?: (payload: ActivityTypeMap[T]) => string | null | undefined;
  mask?: (payload: ActivityTypeMap[T]) => ActivityTypeMap[T];
  serialize?: AuditEventSerializer<T>;
};

export type AuditEventRegistry = {
  [K in ACTIVITY_TYPE]: AuditEventDefinition<K>;
};

export type AuditLogFactoryResult<T extends ACTIVITY_TYPE = ACTIVITY_TYPE> = {
  logId: string;
  entry: EnrichedAuditLogEntry & {
    payload: NormalizedAuditPayload;
    visibility: AuditLogVisibility;
    subjectUserId?: string | null;
    entityDisplay?: Record<string, unknown> | null;
    category?: AuditLogCategory;
    description?: string | null;
    type: T;
  };
};

export type AuditEventInput<T extends ACTIVITY_TYPE = ACTIVITY_TYPE> = Omit<
  AuditLogEntry<T>,
  'payload'
> & {
  payload: ActivityTypeMap[T];
};

export const CUD_ACTIVITY_TYPES: ACTIVITY_TYPE[] = [
  ACTIVITY_TYPE.CREATE_USER,
  ACTIVITY_TYPE.UPDATE_USER,
  ACTIVITY_TYPE.CREATE_ROLE,
  ACTIVITY_TYPE.UPDATE_ROLE,
  ACTIVITY_TYPE.DEL_ROLE,
  ACTIVITY_TYPE.CREATE_IP_WHITELIST,
  ACTIVITY_TYPE.UPDATE_IP_WHITELIST,
  ACTIVITY_TYPE.DEL_IP_WHITELIST,
] as const;

export const SECURITY_ACTIVITY_TYPES: ACTIVITY_TYPE[] = [
  ACTIVITY_TYPE.LOGIN,
  ACTIVITY_TYPE.REGISTER,
  ACTIVITY_TYPE.LOGOUT,
  ACTIVITY_TYPE.CHANGE_PASSWORD,
  ACTIVITY_TYPE.SETUP_MFA,
  ACTIVITY_TYPE.LINK_OAUTH,
  ACTIVITY_TYPE.SECURITY_EVENT,
  ACTIVITY_TYPE.REVOKE_SESSION,
  ACTIVITY_TYPE.RESET_MFA,
] as const;

export type CudActivityType = (typeof CUD_ACTIVITY_TYPES)[number];
export type SecurityActivityType = (typeof SECURITY_ACTIVITY_TYPES)[number];

export type BaseAuditInput<T extends ACTIVITY_TYPE> = Omit<
  AuditEventInput<T>,
  'type'
> & { type: T };

export type CudAuditInput = BaseAuditInput<CudActivityType>;
export type SecurityAuditInput = BaseAuditInput<SecurityActivityType>;
export type OtherAuditInput = BaseAuditInput<
  Exclude<ACTIVITY_TYPE, CudActivityType | SecurityActivityType>
>;
