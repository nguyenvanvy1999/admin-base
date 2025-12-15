import type { ActionType } from '@ant-design/pro-components';
import { useRef } from 'react';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import {
  createSkipFromPagination,
  getSearchValue,
} from 'src/lib/utils/table.utils';
import type { TableParamsWithFilters } from 'src/types/table';

export interface UseAdminTableOptions<
  TData,
  TParams extends Record<string, any>,
> {
  service: {
    list: (params: TParams & { skip: number; take: number }) => Promise<{
      docs: TData[];
      count: number;
    }>;
  };
  permissions: {
    view?: string | string[];
    update?: string | string[];
    delete?: string | string[];
  };
  defaultPageSize?: number;
  normalizeParams?: (params: TableParamsWithFilters<TParams>) => TParams;
}

export function useAdminTable<TData, TParams extends Record<string, any>>(
  options: UseAdminTableOptions<TData, TParams>,
) {
  const {
    service,
    permissions,
    defaultPageSize = 20,
    normalizeParams,
  } = options;
  const actionRef = useRef<ActionType | null>(null);
  const { hasPermission } = usePermissions();

  const canView = permissions.view
    ? Array.isArray(permissions.view)
      ? hasPermission(permissions.view, 'any')
      : hasPermission(permissions.view)
    : true;
  const canUpdate = permissions.update
    ? Array.isArray(permissions.update)
      ? hasPermission(permissions.update, 'any')
      : hasPermission(permissions.update)
    : false;
  const canDelete = permissions.delete
    ? Array.isArray(permissions.delete)
      ? hasPermission(permissions.delete, 'any')
      : hasPermission(permissions.delete)
    : false;

  const request = async (params: TableParamsWithFilters<TParams>) => {
    const {
      current = 1,
      pageSize = defaultPageSize,
      search,
      ...filters
    } = params;
    const skip = createSkipFromPagination(current, pageSize);

    const normalizedParams = normalizeParams
      ? normalizeParams(params)
      : ({ ...filters, search: getSearchValue(search) } as unknown as TParams);

    const response = await service.list({
      ...normalizedParams,
      skip,
      take: pageSize,
    });

    return {
      data: response.docs,
      success: true,
      total: response.count,
    };
  };

  return {
    actionRef,
    canView,
    canUpdate,
    canDelete,
    request,
  };
}
