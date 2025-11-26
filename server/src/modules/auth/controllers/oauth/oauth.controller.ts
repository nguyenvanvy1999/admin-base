import { Elysia, t } from 'elysia';
import { reqMeta } from 'src/config/request';
import { LoginResponseDto } from 'src/modules/auth/dtos';
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
  prefix: 'auth/oauth',
  tags: [DOC_TAG.OAUTH],
})
  .use(reqMeta)
  .post(
    'google',
    async ({ body: { idToken }, clientIp, userAgent }) => {
      const result = await oauthService.googleLogin({
        idToken,
        clientIp,
        userAgent,
      });
      return castToRes(result);
    },
    {
      body: t.Object({
        idToken: t.String({ minLength: 1 }),
      }),
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
    'link-telegram',
    async ({ body, currentUser: { id } }) => {
      const result = await oauthService.linkTelegram({
        userId: id,
        telegramData: {
          id: body.id,
          first_name: body.first_name,
          last_name: body.last_name,
          username: body.username,
          photo_url: body.photo_url,
          auth_date: body.auth_date,
          hash: body.hash,
        },
      });
      return castToRes(result);
    },
    {
      body: t.Object({
        id: t.String(),
        first_name: t.Optional(t.String()),
        last_name: t.Optional(t.String()),
        username: t.Optional(t.String()),
        photo_url: t.Optional(t.String()),
        auth_date: t.String(),
        hash: t.String(),
      }),
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
