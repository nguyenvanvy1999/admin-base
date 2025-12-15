import { ACTIVITY_TYPE } from 'src/services/shared/constants';
import type { ActivityTypeMap } from 'src/share/type';

export function generateAuditLogDescription<T extends ACTIVITY_TYPE>(
  type: T,
  payload: ActivityTypeMap[T],
): string {
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
      return `User created: ${p.username} (${p.id})`;
    }

    case ACTIVITY_TYPE.UPDATE_USER: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.UPDATE_USER];
      const action = p.action ? ` (${p.action})` : '';
      return `User updated: ${p.id}${action}`;
    }

    case ACTIVITY_TYPE.CREATE_ROLE: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.CREATE_ROLE];
      return `Role created: ${p.title} (${p.id})`;
    }

    case ACTIVITY_TYPE.UPDATE_ROLE: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.UPDATE_ROLE];
      return `Role updated: ${p.title} (${p.id})`;
    }

    case ACTIVITY_TYPE.DEL_ROLE: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.DEL_ROLE];
      return `Roles deleted: ${p.roleIds.length} role(s)`;
    }

    case ACTIVITY_TYPE.REVOKE_SESSION: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.REVOKE_SESSION];
      return `Session revoked: ${p.sessionId}`;
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
      return `IP whitelist created: ${p.ip}${p.note ? ` (${p.note})` : ''}`;
    }

    case ACTIVITY_TYPE.DEL_IP_WHITELIST: {
      const p =
        payload as ActivityTypeMap[typeof ACTIVITY_TYPE.DEL_IP_WHITELIST];
      return `IP whitelist deleted: ${p.ips.length} IP(s)`;
    }

    case ACTIVITY_TYPE.UPDATE_SETTING: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.UPDATE_SETTING];
      return `Setting updated: ${p.key}`;
    }

    case ACTIVITY_TYPE.INTERNAL_ERROR: {
      return 'Internal error occurred';
    }

    case ACTIVITY_TYPE.P2P_ORDER_EXPIRED: {
      const p =
        payload as ActivityTypeMap[typeof ACTIVITY_TYPE.P2P_ORDER_EXPIRED];
      return `P2P order expired: ${p.orderId}`;
    }

    case ACTIVITY_TYPE.P2P_ORDER_EXPIRE_FAILED: {
      const p =
        payload as ActivityTypeMap[typeof ACTIVITY_TYPE.P2P_ORDER_EXPIRE_FAILED];
      return `P2P order expire failed: ${p.orderId} - ${p.error}`;
    }

    default:
      return `Activity: ${type}`;
  }
}

export function inferEntityTypeFromActivityType(
  type: ACTIVITY_TYPE,
): string | null {
  switch (type) {
    case ACTIVITY_TYPE.CREATE_USER:
    case ACTIVITY_TYPE.UPDATE_USER:
      return 'user';

    case ACTIVITY_TYPE.CREATE_ROLE:
    case ACTIVITY_TYPE.UPDATE_ROLE:
    case ACTIVITY_TYPE.DEL_ROLE:
      return 'role';

    case ACTIVITY_TYPE.CREATE_IP_WHITELIST:
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
  switch (type) {
    case ACTIVITY_TYPE.CREATE_USER:
    case ACTIVITY_TYPE.UPDATE_USER: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.CREATE_USER];
      return p.id ?? null;
    }

    case ACTIVITY_TYPE.CREATE_ROLE:
    case ACTIVITY_TYPE.UPDATE_ROLE: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.CREATE_ROLE];
      return p.id ?? null;
    }

    case ACTIVITY_TYPE.REVOKE_SESSION: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.REVOKE_SESSION];
      return p.sessionId ?? null;
    }

    case ACTIVITY_TYPE.UPDATE_SETTING: {
      const p = payload as ActivityTypeMap[typeof ACTIVITY_TYPE.UPDATE_SETTING];
      return p.key ?? null;
    }

    default:
      return null;
  }
}
