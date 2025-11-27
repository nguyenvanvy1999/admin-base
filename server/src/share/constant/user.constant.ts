import type { UserSelect } from 'src/generated';

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
  baseCurrencyId: true,
  settings: true,
  emailVerified: true,
  emailVerificationToken: true,
  lockoutUntil: true,
  lockoutReason: true,
  passwordResetToken: true,
  passwordResetTokenExpiresAt: true,
  lastFailedLoginAt: true,
  suspiciousActivityCount: true,
} satisfies UserSelect;
