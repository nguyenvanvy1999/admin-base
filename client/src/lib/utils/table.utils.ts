import type { BaseTableParams } from 'src/types/table';

export function createSkipFromPagination(
  current: number,
  pageSize: number,
): number {
  return (current - 1) * pageSize;
}

export function createTableRequest<TData, TParams extends BaseTableParams>(
  serviceFn: (params: any) => Promise<{ docs: TData[]; count: number }>,
) {
  return async (params: TParams) => {
    const { current = 1, pageSize = 20, ...filters } = params;
    const skip = createSkipFromPagination(current, pageSize);

    const response = await serviceFn({ skip, take: pageSize, ...filters });

    return {
      data: response.docs || [],
      success: true,
      total: response.count || 0,
    };
  };
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
