export enum AuthStatus {
  COMPLETED = 'COMPLETED',
  CHALLENGE = 'CHALLENGE',
}

export enum ChallengeType {
  MFA_REQUIRED = 'MFA_REQUIRED',
  DEVICE_VERIFY = 'DEVICE_VERIFY',
  MFA_ENROLL = 'MFA_ENROLL',
}

export enum AuthMethodType {
  TOTP = 'MFA_TOTP',
  EMAIL_OTP = 'MFA_EMAIL_OTP',
  BACKUP_CODE = 'MFA_BACKUP_CODE',
  DEVICE_VERIFY = 'DEVICE_VERIFY',
}

export enum AuthTxState {
  PASSWORD_VERIFIED = 'PASSWORD_VERIFIED',
  CHALLENGE = 'CHALLENGE',
  COMPLETED = 'COMPLETED',
}

export enum AuthMethod {
  EMAIL = 'email',
  TOTP = 'totp',
  BACKUP_CODE = 'backup-code',
}
