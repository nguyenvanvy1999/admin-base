import { Elysia, t } from 'elysia';
import {
  GoogleLoginRequestDto,
  LinkTelegramRequestDto,
  LoginResponseDto,
} from 'src/dtos/auth.dto';
import { authCheck } from 'src/service/auth/auth.middleware';
import { oauthService } from 'src/service/auth/oauth.service';
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
        200: ResWrapper(LoginResponseDto),
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
