import { Elysia } from 'elysia';
import {
  BackupCodesRemainingResponseDto,
  BackupCodesResponseDto,
  GenerateBackupCodesRequestDto,
  LoginResDto,
  VerifyBackupCodeRequestDto,
} from 'src/modules/auth';
import { authCheck } from 'src/service/auth/auth.middleware';
import { mfaBackupService } from 'src/service/auth/mfa-backup.service';
import {
  ACCESS_AUTH,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  ResWrapper,
} from 'src/share';

export const mfaBackupController = new Elysia({
  prefix: '/auth/mfa/backup-codes',
  tags: [DOC_TAG.MFA],
})
  .use(authCheck)
  .post(
    '/generate',
    async ({ body: { otp }, currentUser: { id } }) => {
      const result = await mfaBackupService.generateBackupCodes({
        otp,
      });

      return castToRes({
        codes: result.codes,
        message:
          'Backup codes generated successfully. Save these codes in a secure location.',
      });
    },
    {
      body: GenerateBackupCodesRequestDto,
      detail: {
        description: 'Generate new backup codes for MFA',
        summary: 'Generate backup codes',
        security: ACCESS_AUTH,
      },
      response: {
        200: ResWrapper(BackupCodesResponseDto),
        400: ErrorResDto,
        404: ErrorResDto,
      },
    },
  )
  .post(
    '/verify',
    async ({ body: { backupCode, mfaToken } }) => {
      const loginRes = await mfaBackupService.verifyBackupCode({
        mfaToken,
        backupCode,
      });

      return castToRes(loginRes);
    },
    {
      body: VerifyBackupCodeRequestDto,
      detail: {
        description: 'Verify backup code for MFA login',
        summary: 'Verify backup code',
      },
      response: {
        200: ResWrapper(LoginResDto),
        400: ErrorResDto,
        404: ErrorResDto,
      },
    },
  )
  .get(
    '/remaining',
    async ({ currentUser: { id } }) => {
      const result = await mfaBackupService.getBackupCodesRemaining(id);
      return castToRes(result);
    },
    {
      detail: {
        description: 'Get remaining backup codes count',
        summary: 'Get backup codes remaining',
        security: ACCESS_AUTH,
      },
      response: {
        200: ResWrapper(BackupCodesRemainingResponseDto),
        400: ErrorResDto,
        404: ErrorResDto,
      },
    },
  );
