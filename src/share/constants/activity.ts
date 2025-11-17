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
}
