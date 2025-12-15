import type { TSchema } from 'elysia';
import type {
  AuditLogCategory,
  AuditLogVisibility,
  LogType,
  SecurityEventSeverity,
} from 'src/generated';
import type { ACTIVITY_TYPE } from 'src/services/shared/constants';
import type {
  ActivityTypeMap,
  AuditChangeSet,
  AuditLogEntry,
  EnrichedAuditLogEntry,
} from 'src/share';

export type AuditLogFactoryPayload<T extends ACTIVITY_TYPE> =
  ActivityTypeMap[T];

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
  payloadSchema: TSchema;
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
