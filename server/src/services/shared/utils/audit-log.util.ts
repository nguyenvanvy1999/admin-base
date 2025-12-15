import { isCudPayload } from 'src/services/audit-logs/audit-log.helpers';
import { ACTIVITY_TYPE } from 'src/services/shared/constants';
import type {
  ActivityTypeMap,
  AuditChangeSet,
  InternalEventPayload,
} from 'src/share/type';

const getChangeNext = <T>(changes: AuditChangeSet | undefined, key: string) =>
  changes?.[key]?.next as T | undefined;

const getChangePrev = <T>(changes: AuditChangeSet | undefined, key: string) =>
  changes?.[key]?.previous as T | undefined;

export function generateAuditLogDescription<T extends ACTIVITY_TYPE>(
  type: T,
  payload: ActivityTypeMap[T],
): string {
  const cudDescription = describeCudPayload(payload);
  if (cudDescription) return cudDescription;

  switch (type) {
    case ACTIVITY_TYPE.LOGIN: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.LOGIN];
      if (p.error) {
        return `Login failed via ${p.method}: ${p.error}`;
      }
      return `User logged in via ${p.method}${p.action ? ` (${p.action})` : ''}`;
    }

    case ACTIVITY_TYPE.REGISTER: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.REGISTER];
      if (p.error) {
        return `Registration failed via ${p.method}: ${p.error}`;
      }
      return `User registered via ${p.method}`;
    }

    case ACTIVITY_TYPE.LOGOUT:
      return 'User logged out';

    case ACTIVITY_TYPE.CHANGE_PASSWORD: {
      const p =
        payload as ActivityTypeMap[typeof ACTIVITY_TYPE.CHANGE_PASSWORD];
      if (p.error) {
        return `Password change failed: ${p.error}`;
      }
      return 'User changed password';
    }

    case ACTIVITY_TYPE.SETUP_MFA: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.SETUP_MFA];
      if (p.error) {
        return `MFA setup failed (${p.method}): ${p.error}`;
      }
      return `MFA setup via ${p.method} (${p.stage})`;
    }

    case ACTIVITY_TYPE.LINK_OAUTH: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.LINK_OAUTH];
      if (p.error) {
        return `OAuth link failed (${p.provider}): ${p.error}`;
      }
      return `OAuth account linked: ${p.provider}`;
    }

    case ACTIVITY_TYPE.CREATE_USER: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.CREATE_USER];
      const userId = p.entityId;
      const username = getChangeNext<string>(p.changes, 'username');
      return `User created: ${username ?? userId} (${userId})`;
    }

    case ACTIVITY_TYPE.UPDATE_USER: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.UPDATE_USER];
      const action = p.action ? ` (${p.action})` : '';
      return `User updated: ${p.entityId}${action}`;
    }

    case ACTIVITY_TYPE.CREATE_ROLE: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.CREATE_ROLE];
      const title = getChangeNext<string>(p.changes, 'title');
      return `Role created: ${title ?? p.entityId} (${p.entityId})`;
    }

    case ACTIVITY_TYPE.UPDATE_ROLE: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.UPDATE_ROLE];
      const title = getChangeNext<string>(p.changes, 'title');
      return `Role updated: ${title ?? p.entityId} (${p.entityId})`;
    }

    case ACTIVITY_TYPE.DEL_ROLE: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.DEL_ROLE];
      const ids = getChangePrev<string[]>(p.changes, 'roleIds') ?? [];
      return `Roles deleted: ${ids.length} role(s)`;
    }

    case ACTIVITY_TYPE.REVOKE_SESSION: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.REVOKE_SESSION];
      return `Session revoked: ${p.entityId}`;
    }

    case ACTIVITY_TYPE.RESET_MFA: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.RESET_MFA];
      const method = p.method ? ` via ${p.method}` : '';
      if (p.error) {
        return `MFA reset failed${method}: ${p.error}`;
      }
      return `MFA reset${method}`;
    }

    case ACTIVITY_TYPE.CREATE_IP_WHITELIST: {
      const p =
        payload as ActivityTypeMap[typeof ACTIVITY_TYPE.CREATE_IP_WHITELIST];
      const ip = getChangeNext<string>(p.changes, 'ip') ?? p.entityId;
      const note = getChangeNext<string>(p.changes, 'note');
      return `IP whitelist created: ${ip}${note ? ` (${note})` : ''}`;
    }

    case ACTIVITY_TYPE.UPDATE_IP_WHITELIST: {
      const p =
        payload as ActivityTypeMap[typeof ACTIVITY_TYPE.UPDATE_IP_WHITELIST];
      const ip = getChangeNext<string>(p.changes, 'ip') ?? p.entityId;
      const note = getChangeNext<string>(p.changes, 'note');
      return `IP whitelist updated: ${ip}${note ? ` (${note})` : ''}`;
    }

    case ACTIVITY_TYPE.DEL_IP_WHITELIST: {
      const p =
        payload as ActivityTypeMap[typeof ACTIVITY_TYPE.DEL_IP_WHITELIST];
      const ips = getChangePrev<string[]>(p.changes, 'ips') ?? [];
      return `IP whitelist deleted: ${ips.length} IP(s)`;
    }

    case ACTIVITY_TYPE.UPDATE_SETTING: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.UPDATE_SETTING];
      return `Setting updated: ${p.entityId}`;
    }

    case ACTIVITY_TYPE.INTERNAL_ERROR: {
      const p = payload as InternalEventPayload;
      if (p.error) {
        return `Internal error: ${p.error}`;
      }
      return 'Internal error occurred';
    }

    default:
      return `Activity: ${type}`;
  }
}

function describeCudPayload(payload: unknown): string | null {
  if (!isCudPayload(payload)) return null;

  const { entityType, entityId, action, changes } = payload;
  const changeSummary = summarizeChanges(changes);
  const actionLabel = action ?? 'change';

  return `${entityType} ${actionLabel} (${entityId})${changeSummary}`;
}

function summarizeChanges(changes?: AuditChangeSet): string {
  if (!changes) return '';
  const keys = Object.keys(changes);
  if (keys.length === 0) return '';
  return ` [${keys.join(', ')}]`;
}
