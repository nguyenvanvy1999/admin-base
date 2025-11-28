import { Elysia, t } from 'elysia';
import { reqMeta } from 'src/config/request';
import {
  DisableMfaRequestDto,
  MfaStatusResponseDto,
  SetupMfaRequestDto,
} from 'src/modules/auth/dtos';
import { authCheck } from 'src/service/auth/auth.middleware';
import { mfaSetupService } from 'src/service/auth/mfa-setup.service';
import {
  ACCESS_AUTH,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  ResWrapper,
} from 'src/share';

export const mfaController = new Elysia({
  prefix: 'auth/mfa',
  tags: [DOC_TAG.MFA],
})
  .use(reqMeta)
  .post(
    'setup/request',
    async ({ body: { setupToken } }) => {
      const result = await mfaSetupService.setupMfaRequest({
        setupToken,
      });
      return castToRes(result);
    },
    {
      body: SetupMfaRequestDto,
      detail: {
        description:
          'Request setup MFA (supports both authenticated and unauthenticated users)',
        summary: 'Request setup MFA',
      },
      response: {
        200: ResWrapper(
          t.Object({ mfaToken: t.String(), totpSecret: t.String() }),
        ),
        400: ErrorResDto,
      },
    },
  )
  .post(
    'setup/confirm',
    async ({ body: { mfaToken, otp } }) => {
      const result = await mfaSetupService.setupMfa({
        mfaToken,
        otp,
      });
      return castToRes(result);
    },
    {
      body: t.Object({ mfaToken: t.String(), otp: t.String() }),
      detail: {
        description: 'Confirm setup MFA',
        summary: 'Confirm setup MFA',
      },
      response: {
        200: ResWrapper(
          t.Object({ mfaToken: t.String(), loginToken: t.String() }),
        ),
        400: ErrorResDto,
        500: ErrorResDto,
      },
    },
  )
  .use(authCheck)
  .post(
    'reset',
    async ({ body: { otpToken, otp } }) => {
      const result = await mfaSetupService.resetMfa({
        otpToken,
        otp,
      });
      return castToRes(result);
    },
    {
      body: t.Object({ otpToken: t.String(), otp: t.String() }),
      detail: {
        description: 'Reset MFA',
        summary: 'Reset MFA',
      },
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        500: ErrorResDto,
      },
    },
  )
  .post(
    'disable',
    async ({ body: { otp, backupCode }, currentUser: { id, sessionId } }) => {
      const result = await mfaSetupService.disableMfa({
        userId: id,
        otp,
        backupCode,
      });
      return castToRes(result);
    },
    {
      body: DisableMfaRequestDto,
      detail: {
        description: 'Disable MFA using OTP or backup code',
        summary: 'Disable MFA',
        security: ACCESS_AUTH,
      },
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        404: ErrorResDto,
      },
    },
  )
  .get(
    'status',
    async ({ currentUser: { id } }) => {
      const result = await mfaSetupService.getMfaStatus(id);
      return castToRes(result);
    },
    {
      detail: {
        description: 'Get MFA status for current user',
        summary: 'Get MFA status',
        security: ACCESS_AUTH,
      },
      response: {
        200: ResWrapper(MfaStatusResponseDto),
        400: ErrorResDto,
        404: ErrorResDto,
      },
    },
  );
