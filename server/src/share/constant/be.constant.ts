import dayjs from 'dayjs';
import { SettingDataType } from 'src/generated';
import { SETTING } from 'src/share/constant/app.constant';

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
  [SETTING.REGISTER_RATE_LIMIT_MAX]: {
    type: SettingDataType.number,
    value: '5',
  },
  [SETTING.REGISTER_RATE_LIMIT_WINDOW_SECONDS]: {
    type: SettingDataType.number,
    value: '900',
  },
  [SETTING.LOGIN_RATE_LIMIT_MAX]: {
    type: SettingDataType.number,
    value: '10',
  },
  [SETTING.LOGIN_RATE_LIMIT_WINDOW_SECONDS]: {
    type: SettingDataType.number,
    value: '900',
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
