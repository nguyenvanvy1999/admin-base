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

export interface BaseServiceConfig {
  basePath: string;
  queryKey: string;
}

export function createBaseService(config: BaseServiceConfig) {
  const queryKeys = createQueryKeys(config.queryKey);

  return {
    queryKeys,
    basePath: config.basePath,
  };
}
