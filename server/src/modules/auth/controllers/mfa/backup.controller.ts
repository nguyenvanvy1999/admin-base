import { Elysia, t } from 'elysia';
import { reqMeta } from 'src/config/request';
import {
  BackupCodesRemainingResponseDto,
  BackupCodesResponseDto,
  GenerateBackupCodesRequestDto,
  VerifyBackupCodeRequestDto,
} from 'src/modules/auth/dtos';
import { authCheck } from 'src/service/auth/auth.middleware';
import { mfaBackupService } from 'src/service/auth/mfa-backup.service';
import {
  ACCESS_AUTH,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  ResWrapper,
} from 'src/share';

export const backupController = new Elysia({
  prefix: 'auth/mfa/backup-codes',
  tags: [DOC_TAG.MFA],
})
  .use(reqMeta)
  .use(authCheck)
  .post(
    'generate',
    async ({
      body: { otp },
      currentUser: { id, sessionId },
      clientIp,
      userAgent,
    }) => {
      const result = await mfaBackupService.generateBackupCodes({
        userId: id,
        sessionId,
        otp,
        clientIp,
        userAgent,
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
    'verify',
    async ({
      body: { backupCode, mfaToken, loginToken },
      clientIp,
      userAgent,
    }) => {
      const userId = await mfaBackupService.verifyBackupCode({
        mfaToken,
        loginToken,
        backupCode,
        clientIp,
        userAgent,
      });

      return castToRes({ userId });
    },
    {
      body: VerifyBackupCodeRequestDto,
      detail: {
        description: 'Verify backup code for MFA login',
        summary: 'Verify backup code',
      },
      response: {
        200: ResWrapper(t.Object({ userId: t.String() })),
        400: ErrorResDto,
        404: ErrorResDto,
      },
    },
  )
  .get(
    'remaining',
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
