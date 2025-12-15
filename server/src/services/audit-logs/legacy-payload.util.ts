import { isCudPayload } from './audit-log.helpers';
import type { NormalizedAuditPayload } from './types';

type LegacyMeta = {
  description?: string | null;
  userId?: string | null;
  subjectUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

const applyCudLikeFields = (
  raw: Record<string, unknown>,
  normalized: NormalizedAuditPayload,
) => {
  if (isCudPayload(raw)) {
    normalized.before = raw.before;
    normalized.after = raw.after;
    normalized.changes = raw.changes;
    return;
  }

  if ('before' in raw) normalized.before = raw.before as unknown;
  if ('after' in raw) normalized.after = raw.after as unknown;
  if ('changes' in raw) normalized.changes = raw.changes as any;
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

  applyCudLikeFields(raw, normalized);

  if ('metadata' in raw) {
    normalized.meta = raw.metadata as Record<string, unknown>;
  }

  if ('location' in raw) {
    normalized.location = raw.location as Record<string, unknown>;
  }

  return normalized;
}
