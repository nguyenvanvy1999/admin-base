import type { Elysia } from 'elysia';
import { type IPHeaders, type IReqMeta, idUtil } from 'src/share';

export const headersToCheck: IPHeaders[] = [
  'x-real-ip', // Nginx proxy/FastCGI
  'x-client-ip', // Apache https://httpd.apache.org/docs/2.4/mod/mod_remoteip.html#page-header
  'cf-connecting-ip', // Cloudflare
  'fastly-client-ip', // Fastly
  'x-cluster-client-ip', // GCP
  'x-forwarded', // General Forwarded
  'forwarded-for', // RFC 7239
  'forwarded', // RFC 7239
  'appengine-user-ip', // GCP
  'true-client-ip', // Akamai and Cloudflare
  'cf-pseudo-ipv4', // Cloudflare
  'fly-client-ip', // Fly.io
];

export const getIP = (
  headers: Headers,
  checkHeaders: IPHeaders[] = headersToCheck,
): string | null => {
  // check for x-forwaded-for only when the user did not provide headers
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

    const requestId = headers.get('x-request-id') ?? idUtil.token12();
    const timezone =
      headers.get('x-timezone') ??
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timestamp = Number.parseInt(
      headers.get('x-timestamp') ?? `${Date.now()}`,
      10,
    );

    if (!headers.has('x-request-id')) set.headers['x-request-id'] = requestId;
    if (!headers.has('x-timezone')) set.headers['x-timezone'] = timezone;
    if (!headers.has('x-timestamp'))
      set.headers['x-timestamp'] = timestamp.toString();

    const ip = getIP(headers);
    return {
      id: requestId,
      timezone,
      timestamp,
      userAgent: headers.get('user-agent') ?? 'Unknown',
      clientIp: ip ?? server?.requestIP(request)?.address ?? '',
    } satisfies IReqMeta;
  });
