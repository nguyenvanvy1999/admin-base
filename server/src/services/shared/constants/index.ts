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

export enum HTTP_METHOD {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export const REGEX_HTTP_METHOD = `^(${Object.values(HTTP_METHOD).join('|')})(,(${Object.values(HTTP_METHOD).join('|')}))*$`;

export enum HTTP_STATUS {
  HTTP_400_BAD_REQUEST = 400,
  HTTP_401_UNAUTHORIZED = 401,
  HTTP_404_NOT_FOUND = 404,
  HTTP_500_INTERNAL_SERVER_ERROR = 500,
}

export enum ACTIVITY_TYPE {
  LOGIN = 'login',
  REGISTER = 'register',
  LOGOUT = 'logout',
  CHANGE_PASSWORD = 'change-password',
  SETUP_MFA = 'setup-mfa',
  LINK_OAUTH = 'link-oauth',
  SECURITY_EVENT = 'security-event',

  CREATE_USER = 'create-user',
  UPDATE_USER = 'update-user',

  CREATE_ROLE = 'create-role',
  UPDATE_ROLE = 'update-role',
  DEL_ROLE = 'del-role',

  REVOKE_SESSION = 'revoke-session',
  RESET_MFA = 'reset-mfa',

  CREATE_IP_WHITELIST = 'create-ipwhitelist',
  UPDATE_IP_WHITELIST = 'update-ipwhitelist',
  DEL_IP_WHITELIST = 'del-ipwhitelist',

  UPDATE_SETTING = 'update-setting',

  INTERNAL_ERROR = 'internal-error',
}

export const defaultRoles: Record<
  'system' | 'administrator' | 'user',
  { id: string; title: string; description: string }
> = {
  system: {
    id: 'role_m8jgrcy4y0yf',
    title: 'System',
    description: 'System role',
  },
  administrator: {
    id: 'role_x4tu1hzoh13g',
    title: 'Administrator',
    description: 'Administrator role',
  },
  user: { id: 'role_sabb8hc2pqmd', title: 'User', description: 'User role' },
};

export const PERMISSIONS = {
  ACTIVITY: {
    VIEW: { roles: [defaultRoles.administrator.id] },
  },
  CHAT_THREAD: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    MANAGE: { roles: [defaultRoles.administrator.id] },
  },
  FILE: {
    UPLOAD: { roles: [defaultRoles.administrator.id] },
  },
  SESSION: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    REVOKE: { roles: [defaultRoles.administrator.id] },
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
  TELE_BOT: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
  },
  TELE_CHAT: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
  },
  TELE_TEMPLATE: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
    SEND: { roles: [defaultRoles.administrator.id] },
  },
  API_KEY: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    CREATE: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
  },
  AUDIT_LOG: {
    VIEW: { roles: [defaultRoles.administrator.id] },
  },
  SECURITY_EVENT: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    RESOLVE: { roles: [defaultRoles.administrator.id] },
  },
  NOTIFICATION: {
    CREATE: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
    VIEW: { roles: [defaultRoles.administrator.id] },
  },
  NOTIFICATION_TEMPLATE: {
    UPDATE: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id] },
    VIEW: { roles: [defaultRoles.administrator.id] },
  },
  RATE_LIMIT: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    MANAGE: { roles: [defaultRoles.administrator.id] },
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
  ENB_PASSWORD_EXPIRED = 'ENB_PASSWORD_EXPIRED',
  ENB_MFA_REQUIRED = 'ENB_MFA_REQUIRED',
  ENB_IP_WHITELIST = 'ENB_IP_WHITELIST',
  ENB_ONLY_ONE_SESSION = 'ENB_ONLY_ONE_SESSION',
  REGISTER_OTP_LIMIT = 'REGISTER_OTP_LIMIT',
  ENB_SECURITY_DEVICE_RECOGNITION = 'ENB_SECURITY_DEVICE_RECOGNITION',
  ENB_SECURITY_BLOCK_UNKNOWN_DEVICE = 'ENB_SECURITY_BLOCK_UNKNOWN_DEVICE',
  ENB_SECURITY_AUDIT_WARNING = 'ENB_SECURITY_AUDIT_WARNING',
}

export enum CACHE_NS {
  SETTING = 'setting',
  MFA_SETUP = 'mfa-setup',
  MFA_SETUP_TOKEN = 'mfa-setup-token',
  MFA = 'mfa',
  CURRENT_USER = 'currency-user',
  OTP = 'otp',
  OTP_RATE_LIMIT = 'otp-rate-limit',
  REGISTER_OTP_LIMIT = 'register-otp-limit',
  RATE_LIMIT = 'rate-limit',
  RATE_LIMIT_CONFIG = 'rate-limit-config',
  MFA_ATTEMPT = 'mfa-attempt',
  CURRENCY = 'currency',
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
  REFERRAL = 'ref',
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
}

export const SYS_USER_ID = 'user_xs6ua3wp0rtm';
export const ADMIN_USER_ID = 'user_a8bpd742rslg';

export enum OAUTH {
  GOOGLE = 'google',
  TELEGRAM = 'telegram',
}

export const IDEMPOTENCY_TTL = 300;

type LoginErrorPayload = { method: string; error?: string };

export const MFA_ERROR_PAYLOADS = {
  SESSION_EXPIRED: { method: 'email', error: 'mfa_session_expired' },
  INVALID_OTP: { method: 'email', error: 'mfa_invalid_otp' },
  USER_NOT_FOUND: { method: 'email', error: 'mfa_user_not_found' },
  USER_NOT_ACTIVE: { method: 'email', error: 'user_not_active' },
  INVALID_BACKUP_CODE: { method: 'backup-code', error: 'invalid_backup_code' },
  SECURITY_BLOCKED: { method: 'email', error: 'security_blocked' },
  TOO_MANY_ATTEMPTS: { method: 'email', error: 'too_many_attempts' },
} as const satisfies Record<string, LoginErrorPayload>;

export enum DOC_TAG {
  AUTH = 'Base Auth',
  OAUTH = 'OAuth',
  MFA = 'MFA',
  USER_AUTH = 'User Auth',
  MISC = 'Misc',
  FILE = 'File',
  USER = 'User',
  P2P = 'P2P',
  P2P_AD = 'P2P Ad',
  P2P_RELATION = 'P2P Relation',
  P2P_PAYMENT_ACCOUNT = 'P2P Payment Account',
  USER_ACCOUNT = 'User Account',
  USER_BALANCE = 'User Balance',
  CURRENCY = 'Currency',
  NETWORK = 'Network',
  ORDER_REVIEW = 'Order Review',
  CHAT = 'Chat',
  ADMIN_I18N = 'Admin I18N',
  ADMIN_ROLE = 'Admin Role',
  ADMIN_PERMISSION = 'Admin Permission',
  ADMIN_SETTING = 'Admin Setting',
  ADMIN_USER = 'Admin User',
  ADMIN_SESSION = 'Admin Session',
  ADMIN_TELEGRAM = 'Admin Telegram',
  ADMIN_USER_IP_WHITELIST = 'Admin User IP Whitelist',
  ADMIN_AUDIT_LOG = 'Admin Audit Log',
  ADMIN_NOTIFICATION = 'Admin Notification',
  ADMIN_NOTIFICATION_TEMPLATE = 'Admin Notification Template',
  ADMIN_RATE_LIMIT = 'Admin Rate Limit',
  ADMIN_API_KEY = 'Admin API Key',
  USER_API_KEY = 'User API Key',
}

export const ACCESS_AUTH = [{ accessToken: [] }];
export const DOC_OPTIONS = {
  info: {
    title: 'NBitExchange Documentation',
    description: 'Development documentation',
    contact: {
      name: 'NBit',
      email: 'notbitcoin.community@gmail.com',
    },
    license: { name: 'MIT', url: 'https://opensource.org/license/mit' },
    termsOfService: 'termsOfService',
  },
  tags: {
    auth: { name: DOC_TAG.AUTH, description: 'Base authentication endpoints' },
    userAuth: {
      name: DOC_TAG.USER_AUTH,
      description: 'User authentication endpoints',
    },
    misc: {
      name: DOC_TAG.MISC,
      description: 'MISC endpoints',
    },
    file: {
      name: DOC_TAG.FILE,
      description: 'File endpoints',
    },
    oAuth: {
      name: DOC_TAG.OAUTH,
      description: 'OAuth endpoints',
    },
    mfa: {
      name: DOC_TAG.MFA,
      description: 'MFA endpoints',
    },
    user: {
      name: DOC_TAG.USER,
      description: 'User endpoints',
    },
    p2p: {
      name: DOC_TAG.P2P,
      description: 'P2P endpoints',
    },
    p2pPaymentAccount: {
      name: DOC_TAG.P2P_PAYMENT_ACCOUNT,
      description: 'P2P payment account endpoints',
    },
    p2pAd: {
      name: DOC_TAG.P2P_AD,
      description: 'P2P ad endpoints',
    },
    p2pRelation: {
      name: DOC_TAG.P2P_RELATION,
      description: 'P2P relation endpoints',
    },
    userAccount: {
      name: DOC_TAG.USER_ACCOUNT,
      description: 'User account endpoints',
    },
    userBalance: {
      name: DOC_TAG.USER_BALANCE,
      description: 'User balance endpoints',
    },
    currency: {
      name: DOC_TAG.CURRENCY,
      description: 'Currency endpoints',
    },
    network: {
      name: DOC_TAG.NETWORK,
      description: 'Network endpoints',
    },
    orderReview: {
      name: DOC_TAG.ORDER_REVIEW,
      description: 'Order review endpoints',
    },
    chat: {
      name: DOC_TAG.CHAT,
      description: 'Chat endpoints',
    },
    adminI18n: {
      name: DOC_TAG.ADMIN_I18N,
      description: 'Admin i18n endpoints',
    },
    adminRole: {
      name: DOC_TAG.ADMIN_ROLE,
      description: 'Admin role endpoints',
    },
    adminPermission: {
      name: DOC_TAG.ADMIN_PERMISSION,
      description: 'Admin permission endpoints',
    },
    adminSetting: {
      name: DOC_TAG.ADMIN_SETTING,
      description: 'Admin setting endpoints',
    },
    adminUser: {
      name: DOC_TAG.ADMIN_USER,
      description: 'Admin user management endpoints',
    },
    adminTelegram: {
      name: DOC_TAG.ADMIN_TELEGRAM,
      description: 'Admin telegram endpoints',
    },
    adminSession: {
      name: DOC_TAG.ADMIN_SESSION,
      description: 'Admin session endpoints',
    },
    adminAuditLog: {
      name: DOC_TAG.ADMIN_AUDIT_LOG,
      description: 'Admin audit log endpoints',
    },
    adminNotification: {
      name: DOC_TAG.ADMIN_NOTIFICATION,
      description: 'Admin notification endpoints',
    },
    adminNotificationTemplate: {
      name: DOC_TAG.ADMIN_NOTIFICATION_TEMPLATE,
      description: 'Admin notification template endpoints',
    },
    adminRateLimit: {
      name: DOC_TAG.ADMIN_RATE_LIMIT,
      description: 'Admin rate limit endpoints',
    },
    adminApiKey: {
      name: DOC_TAG.ADMIN_API_KEY,
      description: 'Admin API key management endpoints',
    },
    userApiKey: {
      name: DOC_TAG.USER_API_KEY,
      description: 'User API key management endpoints',
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
} satisfies Record<SETTING, { value: string; type: SettingDataType }>;

export enum LoginResType {
  COMPLETED = 'completed',
  MFA_SETUP = 'mfa-setup',
  MFA_CONFIRM = 'mfa-confirm',
}

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
