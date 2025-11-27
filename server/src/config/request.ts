import type { Elysia } from 'elysia';
import {
  DEFAULT_LANGUAGE,
  IdUtil,
  type IPHeaders,
  type IReqMeta,
  LANG,
} from 'src/share';

export const headersToCheck: IPHeaders[] = [
  'x-real-ip',
  'x-client-ip',
  'cf-connecting-ip',
  'fastly-client-ip',
  'x-cluster-client-ip',
  'x-forwarded',
  'forwarded-for',
  'forwarded',
  'appengine-user-ip',
  'true-client-ip',
  'cf-pseudo-ipv4',
  'fly-client-ip',
];

export const getIP = (
  headers: Headers,
  checkHeaders: IPHeaders[] = headersToCheck,
): string | null => {
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor && checkHeaders === headersToCheck) {
    return xForwardedFor.split(',')[0]?.trim() ?? null;
  }

  for (const header of checkHeaders) {
    const clientIP = headers.get(header);
    if (clientIP) {
      return clientIP.trim();
    }
  }
  return null;
};

export const reqMeta = (app: Elysia) =>
  app.derive({ as: 'local' }, ({ request, set, server }) => {
    const headers = request.headers;

    const requestId = headers.get('x-request-id') ?? IdUtil.token12();
    const timezone =
      headers.get('x-timezone') ??
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timestamp = Number.parseInt(
      headers.get('x-timestamp') ?? `${Date.now()}`,
      10,
    );
    const requestLanguage = headers.get('accept-language') ?? '';
    const language = Object.values(LANG).includes(requestLanguage as LANG)
      ? requestLanguage
      : DEFAULT_LANGUAGE;

    if (!headers.has('x-request-id')) set.headers['x-request-id'] = requestId;
    if (!headers.has('x-timezone')) set.headers['x-timezone'] = timezone;
    if (!headers.has('x-timestamp'))
      set.headers['x-timestamp'] = timestamp.toString();
    if (!headers.has('accept-language'))
      set.headers['accept-language'] = language;
    const ip = getIP(headers);
    return {
      id: requestId,
      timezone,
      timestamp,
      language,
      userAgent: headers.get('user-agent') ?? 'Unknown',
      clientIp: ip ?? server?.requestIP(request)?.address ?? '',
    } satisfies IReqMeta;
  });

export const nocache = (app: Elysia) => {
  return app.onRequest(({ set }) => {
    set.headers['Surrogate-Control'] = 'no-store';
    set.headers['Cache-Control'] =
      'no-store, no-cache, must-revalidate, proxy-revalidate';
    set.headers['Pragma'] = 'no-cache';
    set.headers['Expires'] = '0';
  });
};
