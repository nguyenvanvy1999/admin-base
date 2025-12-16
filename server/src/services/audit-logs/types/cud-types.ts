export type CudAction = 'create' | 'update' | 'delete';

export type AuditChangeSet<T = unknown> = Record<
  string,
  { previous: T; next: T }
>;

export type CudPayloadBase<
  TEntityType extends string = string,
  TAction extends CudAction = CudAction,
> = {
  category: 'cud';
  entityType: TEntityType;
  entityId: string;
  action: TAction;
  changes?: AuditChangeSet;
  entityDisplay?: Record<string, unknown>;
};

export type CudCreatePayload<TEntityType extends string> = CudPayloadBase<
  TEntityType,
  'create'
>;

export type CudUpdatePayload<TEntityType extends string> = CudPayloadBase<
  TEntityType,
  'update'
> & {
  changes: AuditChangeSet;
};

export type CudDeletePayload<TEntityType extends string> = CudPayloadBase<
  TEntityType,
  'delete'
>;
