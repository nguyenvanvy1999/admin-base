import { Elysia, t } from 'elysia';
import {
  AuthChallengeRequestDto,
  AuthResponseDto,
  ChallengeMethodsResponseDto,
  LoginRequestDto,
} from 'src/dtos/auth.dto';
import { authFlowService } from 'src/services/auth/core/auth-flow.service';
import { rateLimit } from 'src/services/rate-limit/auth-rate-limit.config';
import { castToRes, DOC_TAG, ErrorResDto, ResWrapper } from 'src/share';

export const authFlowController = new Elysia({
  prefix: '/auth',
  tags: [DOC_TAG.AUTH],
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
  );
