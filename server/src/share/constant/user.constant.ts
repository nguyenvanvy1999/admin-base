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
  type: true,
} satisfies UserSelect;
