export function createQueryKeys(baseKey: string) {
  return {
    all: [baseKey] as const,
    lists: () => [...createQueryKeys(baseKey).all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...createQueryKeys(baseKey).lists(), filters] as const,
    details: () => [...createQueryKeys(baseKey).all, 'detail'] as const,
    detail: (id: string | number) =>
      [...createQueryKeys(baseKey).details(), id] as const,
  };
}
