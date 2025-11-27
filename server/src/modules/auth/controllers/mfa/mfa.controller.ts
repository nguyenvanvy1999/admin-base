import { Elysia, t } from 'elysia';
import { reqMeta } from 'src/config/request';
import {
  DisableMfaRequestDto,
  MfaStatusResponseDto,
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
  .use(authCheck)
  .post(
    'setup/request',
    async ({ currentUser: { id, sessionId } }) => {
      const result = await mfaSetupService.setupMfaRequest({
        userId: id,
        sessionId,
      });
      return castToRes(result);
    },
    {
      detail: {
        description: 'Request setup MFA',
        summary: 'Request setup MFA',
        security: ACCESS_AUTH,
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
    async ({ body: { mfaToken, otp }, clientIp, userAgent }) => {
      const result = await mfaSetupService.setupMfa({
        mfaToken,
        otp,
        clientIp,
        userAgent,
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
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        500: ErrorResDto,
      },
    },
  )
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
    async ({
      body: { otp, backupCode },
      currentUser: { id, sessionId },
      clientIp,
      userAgent,
    }) => {
      const result = await mfaSetupService.disableMfa({
        userId: id,
        sessionId,
        otp,
        backupCode,
        clientIp,
        userAgent,
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
