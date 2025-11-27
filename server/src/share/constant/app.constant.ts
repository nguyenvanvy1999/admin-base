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

  CREATE_USER = 'create-user',
  UPDATE_USER = 'update-user',

  CREATE_ROLE = 'create-role',
  UPDATE_ROLE = 'update-role',
  DEL_ROLE = 'del-role',

  REVOKE_SESSION = 'revoke-session',
  RESET_MFA = 'reset-mfa',

  CREATE_IP_WHITELIST = 'create-ipwhitelist',
  DEL_IP_WHITELIST = 'del-ipwhitelist',

  UPDATE_SETTING = 'update-setting',

  INTERNAL_ERROR = 'internal-error',
  P2P_ORDER_EXPIRED = 'p2p-order-expired',
  P2P_ORDER_EXPIRE_FAILED = 'p2p-order-expire-failed',
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
    VIEW: { roles: [defaultRoles.administrator.id, defaultRoles.user.id] },
    VIEW_ALL: { roles: [defaultRoles.administrator.id] },
  },
  CHAT_THREAD: {
    VIEW: { roles: [defaultRoles.administrator.id] },
    MANAGE: { roles: [defaultRoles.administrator.id] },
  },
  FILE: {
    UPLOAD: { roles: [defaultRoles.administrator.id] },
  },
  SESSION: {
    VIEW: { roles: [defaultRoles.administrator.id, defaultRoles.user.id] },
    VIEW_ALL: { roles: [defaultRoles.administrator.id] },
    REVOKE: { roles: [defaultRoles.administrator.id, defaultRoles.user.id] },
    REVOKE_ALL: { roles: [defaultRoles.administrator.id] },
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
    VIEW: { roles: [defaultRoles.administrator.id, defaultRoles.user.id] },
    VIEW_ALL: { roles: [defaultRoles.administrator.id] },
    UPDATE: { roles: [defaultRoles.administrator.id, defaultRoles.user.id] },
    UPDATE_ALL: { roles: [defaultRoles.administrator.id] },
    DELETE: { roles: [defaultRoles.administrator.id, defaultRoles.user.id] },
    DELETE_ALL: { roles: [defaultRoles.administrator.id] },
  },
};

export enum QueueName {
  Telegram = 'Telegram',
  Email = 'Email',
  P2P = 'P2P',
  AuditLog = 'AuditLog',
  BatchAuditLog = 'BatchAuditLog',
}

export enum P2PJobName {
  ExpireOrder = 'ExpireOrder',
}

export enum SETTING {
  MAINTENANCE_END_DATE = 'MAINTENANCE_END_DATE',
  ENB_PASSWORD_ATTEMPT = 'ENB_PASSWORD_ATTEMPT',
  ENB_PASSWORD_EXPIRED = 'ENB_PASSWORD_EXPIRED',
  ENB_MFA_REQUIRED = 'ENB_MFA_REQUIRED',
  ENB_IP_WHITELIST = 'ENB_IP_WHITELIST',
  ENB_ONLY_ONE_SESSION = 'ENB_ONLY_ONE_SESSION',
}

export enum CACHE_NS {
  SETTING = 'setting',
  MFA_SETUP = 'mfa-setup',
  MFA = 'mfa',
  CURRENT_USER = 'currency-user',
  OTP = 'otp',
  OTP_RATE_LIMIT = 'otp-rate-limit',
  REGISTER_OTP_LIMIT = 'register-otp-limit',
  REGISTER_RATE_LIMIT = 'register-rate-limit',
  LOGIN_RATE_LIMIT = 'login-rate-limit',
  CURRENCY = 'currency',
  NETWORK = 'network',
}

export enum DB_PREFIX {
  SESSION = 'session',
  USER = 'user',
  USER_PROFILE = 'profile',
  SETTING = 'setting',
  PERMISSION = 'perm',
  USER_AUTH_PROVIDER = 'user_oauth',
  AUTH_PROVIDER = 'auth_prov',
  TRANSACTION = 'txn',
  LEDGER_ENTRY = 'lgr_ent',
  ACCOUNT = 'acc',
  ACCOUNT_SNAPSHOT = 'acc_snp',
  CURRENCY = 'cur',
  NETWORK = 'net',
  P2P_USER_PROFILE = 'p2p_prof',
  P2P_AD = 'p2p_ad',
  P2P_USER_PAYMENT_ACCOUNT = 'p2p_pay_acc',
  P2P_ORDER = 'p2p_order',
  P2P_DISPUTE = 'p2p_dispute',
  P2P_REVIEW = 'p2p_review',
  REFERRAL = 'ref',
}

export enum EmailType {
  OTP = 'OTP',
}

export const MAX_JOB_KEEP_COUNT = 100;
export const MAX_JOB_KEEP_SECONDS = 604800; // 7 days

export enum PurposeVerify {
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot-password',
  RESET_MFA = 'reset-mfa',
}

export const SYS_USER_ID = 'user_xs6ua3wp0rtm';
export const SYS_EMAIL = 'system@notbitco.in';
export const ADMIN_USER_ID = 'user_a8bpd742rslg';
export const ADMIN_EMAIL = 'admin@notbitco.in';

export enum OAUTH {
  GOOGLE = 'google',
  TELEGRAM = 'telegram',
}

export const IDEMPOTENCY_TTL = 300;

export enum PaymentProviderType {
  BANK_TRANSFER = 'BANK_TRANSFER',
  E_WALLET = 'E_WALLET',
  CRYPTO = 'CRYPTO',
}
