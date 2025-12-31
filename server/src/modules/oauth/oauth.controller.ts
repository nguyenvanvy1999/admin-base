import { Elysia, t } from 'elysia';
import {
  AuthResponseDto,
  GoogleLoginRequestDto,
  LinkTelegramRequestDto,
} from 'src/dtos/auth.dto';
import { authCheck } from 'src/services/auth';
import { oauthService } from 'src/services/auth/oauth.service';
import {
  ACCESS_AUTH,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  ResWrapper,
} from 'src/share';

export const oauthController = new Elysia({
  prefix: '/auth/oauth',
  tags: [DOC_TAG.OAUTH],
})
  .post(
    '/google',
    async ({ body }) => {
      const result = await oauthService.googleLogin(body);
      return castToRes(result);
    },
    {
      body: GoogleLoginRequestDto,
      detail: {
        description: 'Login with Google OAuth',
        summary: 'Login with Google OAuth',
      },
      response: {
        200: ResWrapper(AuthResponseDto),
        400: ErrorResDto,
        404: ErrorResDto,
        500: ErrorResDto,
      },
    },
  )
  .use(authCheck)
  .post(
    '/link-telegram',
    async ({ body, currentUser: { id } }) => {
      const result = await oauthService.linkTelegram({
        userId: id,
        telegramData: body,
      });
      return castToRes(result);
    },
    {
      body: LinkTelegramRequestDto,
      detail: {
        description: 'Link account with Telegram',
        summary: 'Link account with Telegram',
        security: ACCESS_AUTH,
      },
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        404: ErrorResDto,
        500: ErrorResDto,
      },
    },
  );
