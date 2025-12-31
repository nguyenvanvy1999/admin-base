export const ServiceUtils = {
  normalizeReason(reason?: string): string | undefined {
    if (!reason) {
      return undefined;
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed.slice(0, 512);
  },

  normalizeStringArray(arr?: string[]): string[] {
    const result = new Set<string>();
    arr
      ?.map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => result.add(item));
    return Array.from(result);
  },

  trimOrNull(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
};
