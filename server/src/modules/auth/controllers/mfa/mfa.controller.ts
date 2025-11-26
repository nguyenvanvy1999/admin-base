import { Elysia, t } from 'elysia';
import { reqMeta } from 'src/config/request';
import { authCheck } from 'src/service/auth/auth.middleware';
import { mfaService } from 'src/service/auth/mfa.service';
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
      const result = await mfaService.setupMfaRequest({
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
      const result = await mfaService.setupMfa({
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
      const result = await mfaService.resetMfa({
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
  );
