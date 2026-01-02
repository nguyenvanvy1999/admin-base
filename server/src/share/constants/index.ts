import dayjs from 'dayjs';
import type { UserSelect } from 'src/generated';
import { SettingDataType } from 'src/generated';

export enum LANG {
  VI = 'vi',
  EN = 'en',
}

export const DEFAULT_LANGUAGE = LANG.EN;

export enum APP_ENV {
  TEST = 'test',
  DEV = 'dev',
  PROD = 'prod',
}

export enum LOG_LEVEL {
  FATAL = 'fatal',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

export const REGEX_TIME =
  /^\d+\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?)$/i;

const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
];
export const REGEX_HTTP_METHOD = `^(${HTTP_METHODS.join('|')})(,(${HTTP_METHODS.join('|')}))*$`;

export enum HTTP_STATUS {
  HTTP_400_BAD_REQUEST = 400,
  HTTP_401_UNAUTHORIZED = 401,
  HTTP_404_NOT_FOUND = 404,
  HTTP_500_INTERNAL_SERVER_ERROR = 500,
}

export const defaultRoles: Record<
  'system' | 'administrator' | 'user',
  { id: string; title: string; description: string }
> = {
  system: {
    id: 'role_system_001',
    title: 'System',
    description: 'System role',
  },
  administrator: {
    id: 'role_admin_001',
    title: 'Administrator',
    description: 'Administrator role',
  },
  user: { id: 'role_user_001', title: 'User', description: 'User role' },
};

export const PERMISSIONS = {
  ACTIVITY: {
    VIEW: { roles: [defaultRoles.administrator.id] },
  },
  FILE: {
    UPLOAD: { roles: [defaultRoles.administrator.id] },
  },
  SESSION: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
  },
  SETTING: {
    VIEW: { roles: [defaultRoles.administrator.id, defaultRoles.user.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
  },
  I18N: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
  },
  IPWHITELIST: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    CREATE: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
  },
  USER: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    RESET_MFA: { roles: [defaultRoles.administrator.id] },
  },
  ROLE: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
  },
  API_KEY: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
  },
  AUDIT_LOG: {
    VIEW: { roles: [defaultRoles.administrator.id] },
  },
  SECURITY_EVENT: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
  },
  NOTIFICATION: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
  },
  NOTIFICATION_TEMPLATE: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
  },
  RATE_LIMIT: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
  },
};

export enum QueueName {
  Email = 'Email',
  AuditLog = 'AuditLog',
  BatchAuditLog = 'BatchAuditLog',
  GeoIP = 'GeoIP',
  ApiKeyUsage = 'ApiKeyUsage',
}

export enum SETTING {
  MAINTENANCE_END_DATE = 'MAINTENANCE_END_DATE',
  ENB_PASSWORD_ATTEMPT = 'ENB_PASSWORD_ATTEMPT',
  PASSWORD_MAX_ATTEMPT = 'PASSWORD_MAX_ATTEMPT',
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED',
  ENB_PASSWORD_EXPIRED = 'ENB_PASSWORD_EXPIRED',
  ENB_MFA_REQUIRED = 'ENB_MFA_REQUIRED',
  ENB_IP_WHITELIST = 'ENB_IP_WHITELIST',
  ENB_ONLY_ONE_SESSION = 'ENB_ONLY_ONE_SESSION',
  REGISTER_OTP_LIMIT = 'REGISTER_OTP_LIMIT',
  ENB_SECURITY_DEVICE_RECOGNITION = 'ENB_SECURITY_DEVICE_RECOGNITION',
  ENB_SECURITY_BLOCK_UNKNOWN_DEVICE = 'ENB_SECURITY_BLOCK_UNKNOWN_DEVICE',
  ENB_SECURITY_AUDIT_WARNING = 'ENB_SECURITY_AUDIT_WARNING',
  ENB_CAPTCHA_REQUIRED = 'ENB_CAPTCHA_REQUIRED',
  ENB_MFA_RISK_BASED = 'ENB_MFA_RISK_BASED',
  ENB_DEVICE_VERIFICATION = 'ENB_DEVICE_VERIFICATION',
  REVOKE_SESSIONS_ON_PASSWORD_CHANGE = 'REVOKE_SESSIONS_ON_PASSWORD_CHANGE',
  AUTH_METHODS_CONFIG = 'AUTH_METHODS_CONFIG',
}

export enum CACHE_NS {
  SETTING = 'setting',
  MFA_SETUP = 'mfa-setup',
  MFA = 'mfa',
  AUTH_TX = 'auth-tx',
  CURRENT_USER = 'currency-user',
  OTP = 'otp',
  OTP_RATE_LIMIT = 'otp-rate-limit',
  REGISTER_OTP_LIMIT = 'register-otp-limit',
  RATE_LIMIT = 'rate-limit',
  RATE_LIMIT_CONFIG = 'rate-limit-config',
  IP_WHITELIST = 'ip-whitelist',
  API_KEY = 'api-key',
}

export enum DB_PREFIX {
  SESSION = 'session',
  USER = 'user',
  SETTING = 'setting',
  PERMISSION = 'perm',
  USER_AUTH_PROVIDER = 'user_oauth',
  AUTH_PROVIDER = 'auth_prov',
  I18N = 'i18n',
  ROLE = 'role',
  IP_WHITELIST = 'ip_wh',
  NOTIFICATION = 'notif',
  NOTIFICATION_TEMPLATE = 'notif_tpl',
  RATE_LIMIT = 'rate_limit',
  API_KEY = 'api_key',
}

export enum EmailType {
  OTP = 'OTP',
}

export const MAX_JOB_KEEP_COUNT = 100;
export const MAX_JOB_KEEP_SECONDS = 604800;

export enum PurposeVerify {
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot-password',
  RESET_MFA = 'reset-mfa',
  MFA_LOGIN = 'mfa-login',
  DEVICE_VERIFY = 'device-verify',
}

export const SYS_USER_ID = 'user_system_001';
export const ADMIN_USER_ID = 'user_admin_001';

export enum OAUTH {
  GOOGLE = 'google',
  TELEGRAM = 'telegram',
}

export const IDEMPOTENCY_TTL = 300;

export enum DOC_TAG {
  AUTH = 'Authentication',
  OAUTH = 'OAuth',
  OTP = 'OTP',
  CAPTCHA = 'Captcha',
  SESSION = 'Session',
  FILE = 'File',
  SYSTEM = 'System',
  NOTIFICATION = 'Notification',
  API_KEY = 'API Key',
  API_KEY_USAGE = 'API Key Usage',
  ADMIN_USER = 'Admin - User Management',
  ADMIN_ROLE = 'Admin - Role Management',
  ADMIN_PERMISSION = 'Admin - Permission Management',
  ADMIN_SETTING = 'Admin - System Settings',
  ADMIN_I18N = 'Admin - Internationalization',
  ADMIN_IP_WHITELIST = 'Admin - IP Whitelist',
  ADMIN_RATE_LIMIT = 'Admin - Rate Limit',
  ADMIN_AUDIT_LOG = 'Admin - Audit Log',
  ADMIN_NOTIFICATION_TEMPLATE = 'Admin - Notification Template',
}

export const ACCESS_AUTH = [{ accessToken: [] }];
export const DOC_OPTIONS = {
  info: {
    title: 'Admin Portal API Documentation',
    description: 'Complete API documentation for Admin Portal',
  },
  tags: {
    auth: {
      name: DOC_TAG.AUTH,
      description:
        'Authentication endpoints including login, logout, password management, and MFA operations',
    },
    oauth: {
      name: DOC_TAG.OAUTH,
      description:
        'OAuth authentication endpoints for third-party providers (Google, Telegram)',
    },
    otp: {
      name: DOC_TAG.OTP,
      description:
        'One-time password (OTP) generation and verification endpoints',
    },
    captcha: {
      name: DOC_TAG.CAPTCHA,
      description: 'Captcha generation and verification endpoints for security',
    },
    session: {
      name: DOC_TAG.SESSION,
      description:
        'Session management endpoints for viewing and revoking sessions (available for both users and administrators)',
    },
    file: {
      name: DOC_TAG.FILE,
      description: 'File upload and management endpoints',
    },
    system: {
      name: DOC_TAG.SYSTEM,
      description:
        'System information endpoints including health check, version, and system status',
    },
    notification: {
      name: DOC_TAG.NOTIFICATION,
      description:
        'Notification management endpoints for viewing, creating, and managing notifications (available for both users and administrators)',
    },
    apiKey: {
      name: DOC_TAG.API_KEY,
      description:
        'API key management endpoints for creating, viewing, and revoking API keys (available for both users and administrators)',
    },
    apiKeyUsage: {
      name: DOC_TAG.API_KEY_USAGE,
      description:
        'API key usage tracking endpoints for viewing usage statistics and analytics (available for both users and administrators)',
    },
    adminUser: {
      name: DOC_TAG.ADMIN_USER,
      description:
        'Administrator endpoints for managing users, including user creation, updates, role assignment, and MFA reset',
    },
    adminRole: {
      name: DOC_TAG.ADMIN_ROLE,
      description:
        'Administrator endpoints for managing roles and role assignments',
    },
    adminPermission: {
      name: DOC_TAG.ADMIN_PERMISSION,
      description:
        'Administrator endpoints for managing permissions and access control',
    },
    adminSetting: {
      name: DOC_TAG.ADMIN_SETTING,
      description:
        'Administrator endpoints for managing system settings and configuration',
    },
    adminI18n: {
      name: DOC_TAG.ADMIN_I18N,
      description:
        'Administrator endpoints for managing internationalization (i18n) translations',
    },
    adminIpWhitelist: {
      name: DOC_TAG.ADMIN_IP_WHITELIST,
      description:
        'Administrator endpoints for managing IP whitelist rules and restrictions',
    },
    adminRateLimit: {
      name: DOC_TAG.ADMIN_RATE_LIMIT,
      description:
        'Administrator endpoints for configuring rate limiting rules and policies',
    },
    adminAuditLog: {
      name: DOC_TAG.ADMIN_AUDIT_LOG,
      description:
        'Administrator endpoints for viewing and managing audit logs and security events',
    },
    adminNotificationTemplate: {
      name: DOC_TAG.ADMIN_NOTIFICATION_TEMPLATE,
      description:
        'Administrator endpoints for managing notification templates',
    },
  },
};

export enum HEALTH_STATE {
  ERROR = 'error',
  OK = 'ok',
}

export const defaultSettings = {
  [SETTING.ENB_IP_WHITELIST]: {
    type: SettingDataType.boolean,
    value: 'true',
  },
  [SETTING.MAINTENANCE_END_DATE]: {
    type: SettingDataType.date,
    value: dayjs(0).toJSON(),
  },
  [SETTING.ENB_PASSWORD_ATTEMPT]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.PASSWORD_MAX_ATTEMPT]: {
    type: SettingDataType.number,
    value: '5',
  },
  [SETTING.PASSWORD_EXPIRED]: {
    type: SettingDataType.string,
    value: '180 days',
  },
  [SETTING.ENB_PASSWORD_EXPIRED]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.ENB_MFA_REQUIRED]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.ENB_ONLY_ONE_SESSION]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.REGISTER_OTP_LIMIT]: {
    type: SettingDataType.number,
    value: '5',
  },
  [SETTING.ENB_SECURITY_DEVICE_RECOGNITION]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.ENB_SECURITY_BLOCK_UNKNOWN_DEVICE]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.ENB_SECURITY_AUDIT_WARNING]: {
    type: SettingDataType.boolean,
    value: 'true',
  },
  [SETTING.ENB_CAPTCHA_REQUIRED]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.ENB_MFA_RISK_BASED]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.ENB_DEVICE_VERIFICATION]: {
    type: SettingDataType.boolean,
    value: 'false',
  },
  [SETTING.REVOKE_SESSIONS_ON_PASSWORD_CHANGE]: {
    type: SettingDataType.boolean,
    value: 'true',
  },
  [SETTING.AUTH_METHODS_CONFIG]: {
    type: SettingDataType.json,
    value: JSON.stringify({
      mfaRequired: {
        enabled: ['MFA_TOTP', 'MFA_BACKUP_CODE', 'MFA_EMAIL_OTP'],
        labels: {
          MFA_TOTP: {
            label: 'Authenticator App',
            description: 'Use your TOTP app',
          },
          MFA_BACKUP_CODE: {
            label: 'Backup Code',
            description: 'Use one of your backup codes',
          },
          MFA_EMAIL_OTP: {
            label: 'Email OTP',
            description: 'Receive code via email',
          },
        },
      },
      deviceVerify: {
        enabled: ['DEVICE_VERIFY'],
        labels: {
          DEVICE_VERIFY: {
            label: 'Email Verification',
            description: 'Receive code via email',
          },
        },
      },
      mfaEnroll: {
        enabled: ['MFA_ENROLL'],
        labels: {
          MFA_ENROLL: {
            label: 'Setup TOTP',
            description: 'Scan QR code with authenticator app',
          },
        },
      },
    }),
  },
} satisfies Record<SETTING, { value: string; type: SettingDataType }>;

export const userResSelect = {
  id: true,
  created: true,
  modified: true,
  roles: { select: { roleId: true } },
  mfaTotpEnabled: true,
  totpSecret: true,
  status: true,
  email: true,
  name: true,
  settings: true,
  emailVerified: true,
  emailVerificationToken: true,
  lockoutUntil: true,
  lockoutReason: true,
  passwordResetToken: true,
  passwordResetTokenExpiresAt: true,
  lastFailedLoginAt: true,
  suspiciousActivityCount: true,
  protected: true,
} satisfies UserSelect;

export type LoginMethod = OAUTH.GOOGLE | 'email' | 'backup-code';
