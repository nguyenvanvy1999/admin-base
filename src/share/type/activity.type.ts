import { ACTIVITY_TYPE, type LOG_LEVEL, type OAUTH } from '@server/share';

export interface ActivityTypeMap extends Record<ACTIVITY_TYPE, object> {
  [ACTIVITY_TYPE.LOGIN]: { method: OAUTH.GOOGLE | 'email' };
  [ACTIVITY_TYPE.REGISTER]: { method: OAUTH.GOOGLE | 'email' };
  [ACTIVITY_TYPE.LOGOUT]: Record<string, never>;
  [ACTIVITY_TYPE.CHANGE_PASSWORD]: Record<string, never>;
  [ACTIVITY_TYPE.SETUP_MFA]: {
    method: string;
    stage: 'confirm' | 'request';
  };
  [ACTIVITY_TYPE.LINK_OAUTH]: {
    provider: OAUTH;
    providerId: string;
  };

  [ACTIVITY_TYPE.DEL_ROLE]: {
    roleIds: string[];
  };
  [ACTIVITY_TYPE.CREATE_ROLE]: {
    id: string;
    description: string | null;
    title: string;
    permissionIds: string[];
    playerIds: string[];
  };
  [ACTIVITY_TYPE.UPDATE_ROLE]: {
    id: string;
    description: string | null;
    title: string;
    permissionIds: string[];
    playerIds: string[];
  };

  [ACTIVITY_TYPE.REVOKE_SESSION]: {
    sessionId: string;
  };
  [ACTIVITY_TYPE.RESET_MFA]: Record<string, never>;
  [ACTIVITY_TYPE.CREATE_IP_WHITELIST]: {
    ip: string;
    note?: string;
  };
  [ACTIVITY_TYPE.DEL_IP_WHITELIST]: {
    ips: string[];
  };
  [ACTIVITY_TYPE.UPDATE_SETTING]: {
    key: string;
    value: string;
  };

  [ACTIVITY_TYPE.CREATE_USER]: {
    id: string;
    enabled: boolean;
    roleIds: string[];
    username: string;
  };
  [ACTIVITY_TYPE.UPDATE_USER]: {
    id: string;
    enabled?: boolean;
    roleIds?: string[];
    username?: string;
  };
  [ACTIVITY_TYPE.INTERNAL_ERROR]: Record<string, any>;
}

export type AuditLogEntry<T extends ACTIVITY_TYPE = ACTIVITY_TYPE> = {
  userId?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  type: T;
  payload: ActivityTypeMap[T];
  level?: keyof typeof LOG_LEVEL;
  timestamp?: Date;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
};
