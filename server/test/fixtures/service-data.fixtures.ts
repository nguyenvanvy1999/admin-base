import type { Setting, SettingDataType } from 'src/generated';
import { ACTIVITY_TYPE, AuditEventCategory, LOG_LEVEL } from 'src/share';

const buildDefaultPayload = (type: ACTIVITY_TYPE) => {
  switch (type) {
    case ACTIVITY_TYPE.LOGIN:
      return { method: 'email' };
    case ACTIVITY_TYPE.REGISTER:
      return { method: 'email' };
    case ACTIVITY_TYPE.LOGOUT:
      return {};
    case ACTIVITY_TYPE.CHANGE_PASSWORD:
      return {};
    case ACTIVITY_TYPE.SETUP_MFA:
      return { method: 'email', stage: 'request' };
    case ACTIVITY_TYPE.LINK_OAUTH:
      return { provider: 'google', providerId: 'pid' };
    case ACTIVITY_TYPE.CREATE_USER:
      return {
        category: AuditEventCategory.CUD,
        entityType: 'user',
        entityId: 'user-123',
        action: 'create',
        after: {
          id: 'user-123',
          enabled: true,
          roleIds: [],
          username: 'user@example.com',
        },
      };
    case ACTIVITY_TYPE.UPDATE_USER:
      return {
        category: AuditEventCategory.CUD,
        entityType: 'user',
        entityId: 'user-123',
        action: 'update',
        before: {
          id: 'user-123',
          action: 'user-update',
          changes: {},
        },
        after: {
          id: 'user-123',
          action: 'user-update',
          changes: {},
        },
        changes: {},
      };
    case ACTIVITY_TYPE.CREATE_ROLE:
      return {
        category: AuditEventCategory.CUD,
        entityType: 'role',
        entityId: 'role-1',
        action: 'create',
        after: {
          id: 'role-1',
          description: null,
          title: 'role',
          permissionIds: [],
          playerIds: [],
        },
      };
    case ACTIVITY_TYPE.UPDATE_ROLE:
      return {
        category: AuditEventCategory.CUD,
        entityType: 'role',
        entityId: 'role-1',
        action: 'update',
        before: {
          id: 'role-1',
          description: null,
          title: 'role',
          permissionIds: [],
          playerIds: [],
        },
        after: {
          id: 'role-1',
          description: null,
          title: 'role',
          permissionIds: [],
          playerIds: [],
        },
        changes: {},
      };
    case ACTIVITY_TYPE.DEL_ROLE:
      return {
        category: AuditEventCategory.CUD,
        entityType: 'role',
        entityId: 'role-1',
        action: 'delete',
        before: { roleIds: ['role-1'] },
      };
    case ACTIVITY_TYPE.REVOKE_SESSION:
      return {
        category: AuditEventCategory.CUD,
        entityType: 'session',
        entityId: 'session-1',
        action: 'delete',
        before: { sessionId: 'session-1' },
      };
    case ACTIVITY_TYPE.RESET_MFA:
      return { method: 'email', previouslyEnabled: false };
    case ACTIVITY_TYPE.CREATE_IP_WHITELIST:
      return {
        category: AuditEventCategory.CUD,
        entityType: 'ip_whitelist',
        entityId: 'ip-1',
        action: 'create',
        after: { ip: '1.1.1.1', note: 'test' },
      };
    case ACTIVITY_TYPE.DEL_IP_WHITELIST:
      return {
        category: AuditEventCategory.CUD,
        entityType: 'ip_whitelist',
        entityId: 'ip-1',
        action: 'delete',
        before: { ips: ['1.1.1.1'] },
      };
    case ACTIVITY_TYPE.UPDATE_SETTING:
      return {
        category: AuditEventCategory.CUD,
        entityType: 'setting',
        entityId: 'setting-key',
        action: 'update',
        before: { key: 'setting-key', value: 'v1' },
        after: { key: 'setting-key', value: 'v2' },
        changes: { value: { previous: 'v1', next: 'v2' } },
      };
    case ACTIVITY_TYPE.INTERNAL_ERROR:
      return { category: AuditEventCategory.INTERNAL };
    case ACTIVITY_TYPE.SECURITY_EVENT:
      return { category: AuditEventCategory.SECURITY };
    default:
      return {};
  }
};

export class AuditLogFixtures {
  static createEntry(overrides: Record<string, any> = {}) {
    const type = overrides.type ?? ACTIVITY_TYPE.LOGIN;
    const payload = overrides.payload ?? buildDefaultPayload(type);

    return {
      type,
      payload,
      ...overrides,
    };
  }

  static createFullEntry(overrides: Record<string, any> = {}) {
    const type = overrides.type ?? ACTIVITY_TYPE.LOGIN;
    const payload = overrides.payload ?? buildDefaultPayload(type);

    return {
      userId: 'user-123',
      sessionId: 'session-456',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      type,
      payload,
      level: LOG_LEVEL.INFO,
      timestamp: new Date('2023-01-01T00:00:00Z'),
      requestId: 'req-789',
      traceId: 'trace-101',
      correlationId: 'corr-202',
      ...overrides,
    };
  }
}

export class SettingFixtures {
  static createSetting(
    key: string,
    value: string,
    type: SettingDataType,
    isSecret = false,
  ): Setting {
    return {
      id: `setting_${key}`,
      key,
      value,
      type,
      isSecret,
      description: `Test setting for ${key}`,
    };
  }
}

export class LockFixtures {
  static createLockData(overrides: Record<string, any> = {}) {
    return {
      key: 'test-resource',
      ttl: 10,
      lockValue: '1234567890-0.123456789',
      ...overrides,
    };
  }
}

export class IdempotencyFixtures {
  static createIdempotencyData(overrides: Record<string, any> = {}) {
    return {
      key: 'test-key',
      ttl: 3600,
      ...overrides,
    };
  }
}
