import type { Elysia } from 'elysia';
import { getIP } from 'src/config/request';
import { settingsService } from 'src/services/settings/settings.service';
import { ErrCode, UnAuthErr } from 'src/share';
import { ipWhitelistService } from './ip-whitelist.service';

type MaybeCurrentUserCtx = {
  currentUser?: { id: string };
};

type MaybeClientIpCtx = {
  clientIp?: string;
};

export const ipWhitelistMiddleware = () => (app: Elysia) =>
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

    const allowed = await ipWhitelistService.isIpAllowed(
      currentUser.id,
      clientIp,
    );

    if (!allowed) {
      throw new UnAuthErr(ErrCode.PermissionDenied, {
        errors: { ip: clientIp ?? 'unknown' },
      });
    }
  });
