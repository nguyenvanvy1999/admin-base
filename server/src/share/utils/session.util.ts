import type { SessionType } from 'src/generated';

export function detectSessionType(
  userAgent: string | null | undefined,
): SessionType {
  if (!userAgent) {
    return 'web';
  }

  const ua = userAgent.toLowerCase();

  // Mobile detection
  if (
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
  ) {
    return 'mobile';
  }

  // API/CLI detection - common patterns
  if (
    /curl|wget|postman|insomnia|httpie|rest-client|axios|fetch|node/i.test(ua)
  ) {
    // Check if it's explicitly an API client
    if (/^[a-z-]+\/\d+\.\d+/.test(ua)) {
      return 'api';
    }
    // CLI tools
    if (/curl|wget|httpie/i.test(ua)) {
      return 'cli';
    }
    return 'api';
  }

  // Default to web
  return 'web';
}
