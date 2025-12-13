import type { Elysia } from 'elysia';
import { getIP } from 'src/config/request';
import { settingsService } from 'src/service/settings/settings.service';
import { userIpWhitelistService } from 'src/service/user-ip-whitelist';
import { ErrCode, UnAuthErr } from 'src/share';

type MaybeCurrentUserCtx = {
  currentUser?: { id: string };
};

type MaybeClientIpCtx = {
  clientIp?: string;
};

export const userIpWhitelistMiddleware = () => (app: Elysia) =>
  app.onBeforeHandle(async (ctx) => {
    const currentUser = (ctx as unknown as MaybeCurrentUserCtx).currentUser;
    if (!currentUser) {
      return;
    }

    const enabled = await settingsService.enbIpWhitelist();
    if (!enabled) {
      return;
    }

    const clientIp =
      (ctx as unknown as MaybeClientIpCtx).clientIp ??
      getIP(ctx.request.headers) ??
      ctx.server?.requestIP(ctx.request)?.address ??
      null;

    const allowed = await userIpWhitelistService.isIpAllowed(
      currentUser.id,
      clientIp,
    );

    if (!allowed) {
      throw new UnAuthErr(ErrCode.PermissionDenied, {
        errors: { ip: clientIp ?? 'unknown' },
      });
    }
  });
