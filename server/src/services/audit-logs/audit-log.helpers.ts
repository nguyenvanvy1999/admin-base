import type {
  CudCreatePayload,
  CudDeletePayload,
  CudUpdatePayload,
} from './types/cud-types';

export type AnyCudPayload =
  | CudCreatePayload<string>
  | CudUpdatePayload<string>
  | CudDeletePayload<string>;

export function isCudPayload(payload: unknown): payload is AnyCudPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const p = payload as Record<string, unknown>;

  return (
    p.category === 'cud' &&
    typeof p.entityType === 'string' &&
    typeof p.entityId === 'string' &&
    (p.action === 'create' || p.action === 'update' || p.action === 'delete')
  );
}
