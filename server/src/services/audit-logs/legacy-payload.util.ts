import { isCudPayload } from './audit-log.helpers';
import type { NormalizedAuditPayload } from './types';

type LegacyMeta = {
  description?: string | null;
  userId?: string | null;
  subjectUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

export function normalizeLegacyPayload(
  payload: unknown,
  meta: LegacyMeta,
): NormalizedAuditPayload {
  if (
    payload &&
    typeof payload === 'object' &&
    'raw' in (payload as Record<string, unknown>)
  ) {
    return payload as NormalizedAuditPayload;
  }

  const raw =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : { value: payload };

  const inferredEntityType =
    (raw.entityType as string | undefined) ?? meta.entityType ?? null;
  const inferredEntityId =
    (raw.entityId as string | undefined) ?? meta.entityId ?? null;

  const normalized: NormalizedAuditPayload = {
    description:
      meta.description ??
      (raw.description as string | undefined | null) ??
      null,
    actor: { userId: meta.userId ?? null },
    subject: {
      userId:
        meta.subjectUserId ??
        (raw.subjectUserId as string | undefined) ??
        (raw.targetUserId as string | undefined) ??
        meta.userId ??
        null,
    },
    entity: { type: inferredEntityType, id: inferredEntityId },
    raw,
  };

  if (isCudPayload(raw)) {
    normalized.changes = raw.changes as any;
  }

  if ('metadata' in raw) {
    normalized.meta = raw.metadata as Record<string, unknown>;
  }

  if ('location' in raw) {
    normalized.location = raw.location as Record<string, unknown>;
  }

  return normalized;
}
