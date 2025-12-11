export function createSkipFromPagination(
  current: number,
  pageSize: number,
): number {
  return (current - 1) * pageSize;
}
export function getSearchValue(search?: string): string | undefined {
  const trimmed = search?.trim();
  return trimmed || undefined;
}

export function normalizeIds(ids?: string[]): string[] | undefined {
  if (!ids || ids.length === 0) return undefined;
  const normalized = ids.map((id) => id.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}
