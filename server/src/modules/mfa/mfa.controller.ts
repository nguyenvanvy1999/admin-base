import { Elysia, t } from 'elysia';
import {
  DisableMfaRequestDto,
  MfaStatusResponseDto,
  ResetMfaRequestDto,
  SetupMfaConfirmDto,
  SetupMfaRequestDto,
} from 'src/dtos/auth.dto';
import { authCheck } from 'src/service/auth';
import { mfaService } from 'src/service/auth/mfa.service';
import {
  ACCESS_AUTH,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  ResWrapper,
} from 'src/share';

export const mfaController = new Elysia({
  prefix: '/auth/mfa',
  tags: [DOC_TAG.MFA],
})
  .post(
    '/setup/request',
    async ({ body }) => castToRes(await mfaService.setupMfaRequest(body)),
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
    '/setup/confirm',
    async ({ body }) => castToRes(await mfaService.setupMfa(body)),
    {
      body: SetupMfaConfirmDto,
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
    '/reset',
    async ({ body }) => castToRes(await mfaService.resetMfa(body)),
    {
      body: ResetMfaRequestDto,
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
    '/disable',
    async ({ body, currentUser: { id } }) =>
      castToRes(await mfaService.disableMfa({ userId: id, ...body })),
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
    '/status',
    async ({ currentUser: { id } }) => {
      const result = await mfaService.getMfaStatus(id);
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
