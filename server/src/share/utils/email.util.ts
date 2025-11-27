export function normalizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/^\.+|\.+$/g, '');
}

export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function extractEmailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  return parts.length === 2 ? parts[1] : null;
}
