import { Elysia, t } from 'elysia';
import {
  AuthChallengeRequestDto,
  AuthResponseDto,
  ChallengeMethodsResponseDto,
  LoginRequestDto,
} from 'src/dtos/auth.dto';
import { useCaseFactory } from 'src/services/auth/application/use-cases/use-case-factory';
import { rateLimit } from 'src/services/rate-limit/auth-rate-limit.config';
import { castToRes, DOC_TAG, ErrorResDto, ResWrapper } from 'src/share';

export const authFlowController = new Elysia({
  prefix: '/auth',
  tags: [DOC_TAG.AUTH],
})
  .use(rateLimit())
  .post(
    '/login',
    async ({ body }) => castToRes(await useCaseFactory.login.execute(body)),
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
        availableMethods:
          await useCaseFactory.getChallengeMethods.execute(authTxId),
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
      castToRes(await useCaseFactory.completeChallenge.execute(body)),
    {
      body: AuthChallengeRequestDto,
      response: { 200: ResWrapper(AuthResponseDto), 400: ErrorResDto },
      detail: { summary: 'Submit MFA / backup code' },
    },
  );
