export function normalizeSearchTerm(search?: string): string | undefined {
  if (!search) return undefined;
  const trimmed = search.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildSearchOrCondition<T extends Record<string, any>>(
  fields: (keyof T)[],
  search: string,
) {
  return {
    OR: fields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' as const },
    })),
  };
}
