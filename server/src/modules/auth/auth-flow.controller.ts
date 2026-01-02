import { Elysia, t } from 'elysia';
import {
  AuthChallengeRequestDto,
  AuthEnrollConfirmRequestDto,
  AuthEnrollStartRequestDto,
  AuthEnrollStartResponseDto,
  AuthResponseDto,
  ChallengeMethodsResponseDto,
  LoginRequestDto,
} from 'src/dtos/auth.dto';
import { authFlowService } from 'src/services/auth/core/auth-flow.service';
import { rateLimit } from 'src/services/rate-limit/auth-rate-limit.config';
import { castToRes, ErrorResDto, ResWrapper } from 'src/share';

export const authFlowController = new Elysia({
  prefix: '/auth',
  tags: ['auth'],
})
  .use(rateLimit())
  .post(
    '/login',
    async ({ body }) => castToRes(await authFlowService.startLogin(body)),
    {
      body: LoginRequestDto,
      response: { 200: ResWrapper(AuthResponseDto), 400: ErrorResDto },
      detail: { summary: 'Login (new flow)' },
    },
  )
  .get(
    '/challenge/:authTxId/methods',
    async ({ params }) => {
      const { authTxId } = params;
      return castToRes({
        availableMethods: await authFlowService.getChallengeMethods(authTxId),
      });
    },
    {
      params: t.Object({
        authTxId: t.String({ minLength: 1 }),
      }),
      response: {
        200: ResWrapper(ChallengeMethodsResponseDto),
        400: ErrorResDto,
      },
      detail: { summary: 'Get available methods for challenge' },
    },
  )
  .post(
    '/login/challenge',
    async ({ body }) =>
      castToRes(await authFlowService.completeChallenge(body)),
    {
      body: AuthChallengeRequestDto,
      response: { 200: ResWrapper(AuthResponseDto), 400: ErrorResDto },
      detail: { summary: 'Submit MFA / backup code' },
    },
  )
  .post(
    '/mfa/enroll/start',
    async ({ body }) => castToRes(await authFlowService.enrollStart(body)),
    {
      body: AuthEnrollStartRequestDto,
      response: {
        200: ResWrapper(AuthEnrollStartResponseDto),
        400: ErrorResDto,
      },
      detail: { summary: 'Start MFA enroll' },
    },
  )
  .post(
    '/mfa/enroll/confirm',
    async ({ body }) => castToRes(await authFlowService.enrollConfirm(body)),
    {
      body: AuthEnrollConfirmRequestDto,
      response: { 200: ResWrapper(AuthResponseDto), 400: ErrorResDto },
      detail: { summary: 'Confirm MFA enroll' },
    },
  );
