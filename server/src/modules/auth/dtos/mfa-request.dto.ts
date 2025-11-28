import { t } from 'elysia';

export const GenerateBackupCodesRequestDto = t.Object({
  otp: t.String({ minLength: 6, maxLength: 6 }),
});

export const SetupMfaRequestDto = t.Object({
  setupToken: t.Optional(t.String({ minLength: 1 })),
});

export const SetupMfaConfirmDto = t.Object({
  mfaToken: t.String({ minLength: 1 }),
  otp: t.String({ minLength: 6, maxLength: 6 }),
});

export const ResetMfaRequestDto = t.Object({
  otpToken: t.String({ minLength: 1 }),
  otp: t.String({ minLength: 6, maxLength: 6 }),
});

export const VerifyBackupCodeRequestDto = t.Object({
  backupCode: t.String({ minLength: 8, maxLength: 8 }),
  mfaToken: t.String({ minLength: 1 }),
});

export const DisableMfaRequestDto = t.Object({
  otp: t.Optional(t.String({ minLength: 6, maxLength: 6 })),
  backupCode: t.Optional(t.String({ minLength: 8, maxLength: 8 })),
});

export const MfaStatusResponseDto = t.Object({
  enabled: t.Boolean(),
  hasBackupCodes: t.Boolean(),
  backupCodesRemaining: t.Number(),
});

export const BackupCodesResponseDto = t.Object({
  codes: t.Array(t.String()),
  message: t.String(),
});

export const BackupCodesRemainingResponseDto = t.Object({
  remaining: t.Number(),
  total: t.Number(),
});
