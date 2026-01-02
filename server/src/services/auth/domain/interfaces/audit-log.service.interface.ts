import type { AuditLogVisibility, SecurityEventType } from 'src/generated';
import type {
  CudCreatePayload,
  CudDeletePayload,
  CudUpdatePayload,
  EntityType,
  SecurityEventPayloadBase,
} from 'src/services/audit-logs/audit-logs.types';

export interface IAuditLogService {
  pushSecurity<TEventType extends SecurityEventType>(
    payload: SecurityEventPayloadBase<TEventType>,
    options?: {
      visibility?: AuditLogVisibility;
      subjectUserId?: string;
      userId?: string;
      sessionId?: string | null;
      resolved?: boolean;
    },
  ): Promise<void>;
  pushCud<
    TEntityType extends EntityType,
    TAction extends 'create' | 'update' | 'delete',
  >(
    payload: TAction extends 'create'
      ? CudCreatePayload<TEntityType>
      : TAction extends 'update'
        ? CudUpdatePayload<TEntityType>
        : CudDeletePayload<TEntityType>,
    options?: {
      visibility?: AuditLogVisibility;
      subjectUserId?: string;
      entityDisplay?: Record<string, unknown>;
    },
  ): Promise<void>;
}
