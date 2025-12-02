export const ERROR_CODE_TRANSLATIONS = {
  'internal-error': 'errors.internalError',
  'not-found': 'errors.notFound',
  'bad-request': 'errors.badRequest',
  'validation-error': 'errors.validationError',
  'item-not-found': 'errors.itemNotFound',
  'item-exists': 'errors.itemExists',
  'mfa-broken': 'errors.mfaBroken',
  'invalid-otp': 'errors.invalidOtp',
  'password-not-match': 'errors.passwordNotMatch',
  'password-expired': 'errors.passwordExpired',
  'password-max-attempt': 'errors.passwordMaxAttempt',
  'user-not-found': 'errors.userNotFound',
  'user-existed': 'errors.userExisted',
  'user-not-active': 'errors.userNotActive',
  'invalid-token': 'errors.invalidToken',
  'expired-token': 'errors.expiredToken',
  'permission-denied': 'errors.permissionDenied',
  'session-expired': 'errors.sessionExpired',
  'invalid-file': 'errors.invalidFile',
  'import-data-invalid': 'errors.importDataInvalid',
  'oauth-provider-not-found': 'errors.oauthProviderNotFound',
  'google-account-not-found': 'errors.googleAccountNotFound',
  'invalid-google-account': 'errors.invalidGoogleAccount',
  'invalid-telegram-account': 'errors.invalidTelegramAccount',
  'telegram-account-was-linked': 'errors.telegramAccountWasLinked',
  'mfa-has-been-setup': 'errors.mfaHasBeenSetup',
  'mfa-not-enabled': 'errors.mfaNotEnabled',
  'invalid-backup-code': 'errors.invalidBackupCode',
  'backup-code-already-used': 'errors.backupCodeAlreadyUsed',
  'no-backup-codes-available': 'errors.noBackupCodesAvailable',
  'invalid-amount': 'errors.invalidAmount',
  'action-not-allowed': 'errors.actionNotAllowed',
  'suspicious-login-blocked': 'errors.suspiciousLoginBlocked',
  'too-many-attempts': 'errors.tooManyAttempts',
} as const;

export type ErrorCode = keyof typeof ERROR_CODE_TRANSLATIONS;

export const GENERIC_ERROR_KEY = 'errors.generic';
export const NETWORK_ERROR_KEY = 'errors.network';
export const UNKNOWN_ERROR_KEY = 'errors.unknown';

export function resolveErrorTranslationKey(code?: string): string | undefined {
  if (!code) {
    return undefined;
  }
  return ERROR_CODE_TRANSLATIONS[code as ErrorCode];
}
