import { AuditLogCategory, AuditLogVisibility, LogType } from 'src/generated';
import { ACTIVITY_TYPE } from 'src/services/shared/constants';
import {
  generateAuditLogDescription,
  getSecurityEventDescription,
} from 'src/services/shared/utils';
import type { SecurityEventPayload } from 'src/share';
import {
  extractEntityIdFromPayload,
  inferEntityTypeFromActivityType,
  isCudPayload,
} from './audit-log.helpers';
import type { AuditEventDefinition, AuditEventRegistry } from './types';

const defaultDescribe =
  <T extends ACTIVITY_TYPE>(type: T) =>
  ({ payload }: { payload: any }) =>
    generateAuditLogDescription(type, payload);

const defaultResolveEntity =
  <T extends ACTIVITY_TYPE>(type: T) =>
  (payload: any) => ({
    type: inferEntityTypeFromActivityType(type, payload),
    id: extractEntityIdFromPayload(type, payload),
  });

function createDefinition<T extends ACTIVITY_TYPE>(
  type: T,
  config: Omit<AuditEventDefinition<T>, 'type'>,
): AuditEventDefinition<T> {
  return {
    type,
    category: config.category,
    visibility: config.visibility,
    logType: config.logType ?? LogType.audit,
    defaultSeverity: config.defaultSeverity,
    describe: config.describe ?? defaultDescribe(type),
    resolveEntity: config.resolveEntity ?? defaultResolveEntity(type),
    getSubjectUserId: config.getSubjectUserId,
    mask: config.mask,
    serialize: config.serialize,
  };
}

const cudSubject = (payload: unknown) => {
  if (!isCudPayload(payload)) return null;
  return payload.entityId;
};

export const AUDIT_EVENT_DEFINITIONS: AuditEventRegistry = {
  [ACTIVITY_TYPE.LOGIN]: createDefinition(ACTIVITY_TYPE.LOGIN, {
    category: AuditLogCategory.security,
    logType: LogType.security,
    visibility: AuditLogVisibility.actor_only,
  }),
  [ACTIVITY_TYPE.REGISTER]: createDefinition(ACTIVITY_TYPE.REGISTER, {
    category: AuditLogCategory.security,
    logType: LogType.security,
    visibility: AuditLogVisibility.actor_only,
  }),
  [ACTIVITY_TYPE.LOGOUT]: createDefinition(ACTIVITY_TYPE.LOGOUT, {
    category: AuditLogCategory.security,
    logType: LogType.security,
    visibility: AuditLogVisibility.actor_only,
  }),
  [ACTIVITY_TYPE.CHANGE_PASSWORD]: createDefinition(
    ACTIVITY_TYPE.CHANGE_PASSWORD,
    {
      category: AuditLogCategory.security,
      logType: LogType.security,
      visibility: AuditLogVisibility.actor_only,
    },
  ),
  [ACTIVITY_TYPE.SETUP_MFA]: createDefinition(ACTIVITY_TYPE.SETUP_MFA, {
    category: AuditLogCategory.security,
    logType: LogType.security,
    visibility: AuditLogVisibility.actor_only,
  }),
  [ACTIVITY_TYPE.LINK_OAUTH]: createDefinition(ACTIVITY_TYPE.LINK_OAUTH, {
    category: AuditLogCategory.security,
    logType: LogType.security,
    visibility: AuditLogVisibility.actor_only,
  }),
  [ACTIVITY_TYPE.SECURITY_EVENT]: createDefinition(
    ACTIVITY_TYPE.SECURITY_EVENT,
    {
      category: AuditLogCategory.security,
      logType: LogType.security,
      visibility: AuditLogVisibility.actor_only,
      describe: ({ entry, payload }) => {
        const securityPayload = payload as SecurityEventPayload;
        if (entry.eventType) {
          return getSecurityEventDescription(
            entry.eventType,
            securityPayload.metadata,
          );
        }
        return defaultDescribe(ACTIVITY_TYPE.SECURITY_EVENT)({
          payload,
        });
      },
    },
  ),
  [ACTIVITY_TYPE.CREATE_USER]: createDefinition(ACTIVITY_TYPE.CREATE_USER, {
    category: AuditLogCategory.cud,
    visibility: AuditLogVisibility.actor_and_subject,
    getSubjectUserId: cudSubject,
  }),
  [ACTIVITY_TYPE.UPDATE_USER]: createDefinition(ACTIVITY_TYPE.UPDATE_USER, {
    category: AuditLogCategory.cud,
    visibility: AuditLogVisibility.actor_and_subject,
    getSubjectUserId: cudSubject,
  }),
  [ACTIVITY_TYPE.CREATE_ROLE]: createDefinition(ACTIVITY_TYPE.CREATE_ROLE, {
    category: AuditLogCategory.cud,
    visibility: AuditLogVisibility.admin_only,
    getSubjectUserId: cudSubject,
  }),
  [ACTIVITY_TYPE.UPDATE_ROLE]: createDefinition(ACTIVITY_TYPE.UPDATE_ROLE, {
    category: AuditLogCategory.cud,
    visibility: AuditLogVisibility.admin_only,
    getSubjectUserId: cudSubject,
  }),
  [ACTIVITY_TYPE.DEL_ROLE]: createDefinition(ACTIVITY_TYPE.DEL_ROLE, {
    category: AuditLogCategory.cud,
    visibility: AuditLogVisibility.admin_only,
    getSubjectUserId: cudSubject,
  }),
  [ACTIVITY_TYPE.REVOKE_SESSION]: createDefinition(
    ACTIVITY_TYPE.REVOKE_SESSION,
    {
      category: AuditLogCategory.security,
      visibility: AuditLogVisibility.actor_and_subject,
      getSubjectUserId: cudSubject,
    },
  ),
  [ACTIVITY_TYPE.RESET_MFA]: createDefinition(ACTIVITY_TYPE.RESET_MFA, {
    category: AuditLogCategory.security,
    visibility: AuditLogVisibility.actor_and_subject,
  }),
  [ACTIVITY_TYPE.CREATE_IP_WHITELIST]: createDefinition(
    ACTIVITY_TYPE.CREATE_IP_WHITELIST,
    {
      category: AuditLogCategory.cud,
      visibility: AuditLogVisibility.admin_only,
      getSubjectUserId: cudSubject,
    },
  ),
  [ACTIVITY_TYPE.UPDATE_IP_WHITELIST]: createDefinition(
    ACTIVITY_TYPE.UPDATE_IP_WHITELIST,
    {
      category: AuditLogCategory.cud,
      visibility: AuditLogVisibility.admin_only,
      getSubjectUserId: cudSubject,
    },
  ),
  [ACTIVITY_TYPE.DEL_IP_WHITELIST]: createDefinition(
    ACTIVITY_TYPE.DEL_IP_WHITELIST,
    {
      category: AuditLogCategory.cud,
      visibility: AuditLogVisibility.admin_only,
      getSubjectUserId: cudSubject,
    },
  ),
  [ACTIVITY_TYPE.UPDATE_SETTING]: createDefinition(
    ACTIVITY_TYPE.UPDATE_SETTING,
    {
      category: AuditLogCategory.system,
      visibility: AuditLogVisibility.admin_only,
    },
  ),
  [ACTIVITY_TYPE.INTERNAL_ERROR]: createDefinition(
    ACTIVITY_TYPE.INTERNAL_ERROR,
    {
      category: AuditLogCategory.internal,
      logType: LogType.system,
      visibility: AuditLogVisibility.admin_only,
    },
  ),
};
