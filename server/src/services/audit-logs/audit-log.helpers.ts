import { ACTIVITY_TYPE } from 'src/services/shared/constants';
import {
  type ActivityTypeMap,
  AuditEventCategory,
  type CudPayloadBase,
} from 'src/share';

export const isCudPayload = (
  payload: unknown,
): payload is CudPayloadBase<string> => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as { category?: unknown }).category === AuditEventCategory.CUD
  );
};

export function inferEntityTypeFromActivityType(
  type: ACTIVITY_TYPE,
  payload?: ActivityTypeMap[ACTIVITY_TYPE],
): string | null {
  if (isCudPayload(payload)) {
    return payload.entityType;
  }

  switch (type) {
    case ACTIVITY_TYPE.CREATE_USER:
    case ACTIVITY_TYPE.UPDATE_USER:
      return 'user';

    case ACTIVITY_TYPE.CREATE_ROLE:
    case ACTIVITY_TYPE.UPDATE_ROLE:
    case ACTIVITY_TYPE.DEL_ROLE:
      return 'role';

    case ACTIVITY_TYPE.CREATE_IP_WHITELIST:
    case ACTIVITY_TYPE.UPDATE_IP_WHITELIST:
    case ACTIVITY_TYPE.DEL_IP_WHITELIST:
      return 'ip_whitelist';

    case ACTIVITY_TYPE.UPDATE_SETTING:
      return 'setting';

    case ACTIVITY_TYPE.REVOKE_SESSION:
      return 'session';

    default:
      return null;
  }
}

export function extractEntityIdFromPayload<T extends ACTIVITY_TYPE>(
  type: T,
  payload: ActivityTypeMap[T],
): string | null {
  if (isCudPayload(payload)) {
    return payload.entityId;
  }

  switch (type) {
    case ACTIVITY_TYPE.REVOKE_SESSION: {
      const data = payload as { entityId?: string } | undefined;
      return data?.entityId ?? null;
    }

    case ACTIVITY_TYPE.CREATE_USER:
    case ACTIVITY_TYPE.UPDATE_USER:
    case ACTIVITY_TYPE.CREATE_ROLE:
    case ACTIVITY_TYPE.UPDATE_ROLE:
    case ACTIVITY_TYPE.UPDATE_SETTING:
      return null;

    default:
      return null;
  }
}
