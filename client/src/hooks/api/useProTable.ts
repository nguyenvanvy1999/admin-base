import type { ActionType, ProTableProps } from '@ant-design/pro-components';
import { useRef, useState } from 'react';
import type { TableSearchParams } from 'src/types/table';

export interface UseProTableOptions<_TData, TParams extends TableSearchParams> {
  defaultPageSize?: number;
  defaultParams?: Partial<TParams>;
}

export interface UseProTableResult<TData, TParams extends TableSearchParams> {
  actionRef: React.RefObject<ActionType | null>;
  pagination: ProTableProps<TData, TParams>['pagination'];
  searchParams: TParams;
  setSearchParams: (params: Partial<TParams>) => void;
  reload: () => void;
}

export function useProTable<
  TData,
  TParams extends TableSearchParams = TableSearchParams,
>(
  options: UseProTableOptions<TData, TParams> = {},
): UseProTableResult<TData, TParams> {
  const { defaultPageSize = 20, defaultParams = {} } = options;
  const actionRef = useRef<ActionType>(null);
  const [searchParams, setSearchParamsState] = useState<TParams>({
    current: 1,
    pageSize: defaultPageSize,
    ...defaultParams,
  } as TParams);

  const setSearchParams = (params: Partial<TParams>) => {
    setSearchParamsState((prev) => ({
      ...prev,
      ...params,
    }));
  };

  const reload = () => {
    actionRef.current?.reload();
  };

  const pagination: ProTableProps<TData, TParams>['pagination'] = {
    pageSize: searchParams.pageSize ?? defaultPageSize,
    current: searchParams.current ?? 1,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `Total ${total} items`,
    pageSizeOptions: ['10', '20', '50', '100'],
    onChange: (page, size) => {
      setSearchParams({
        current: page,
        pageSize: size ?? defaultPageSize,
      } as Partial<TParams>);
    },
    onShowSizeChange: (current, size) => {
      setSearchParams({
        current: 1,
        pageSize: size,
      } as Partial<TParams>);
    },
  };

  return {
    actionRef,
    pagination,
    searchParams,
    setSearchParams,
    reload,
  };
}
