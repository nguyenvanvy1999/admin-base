import type { ProColumns } from '@ant-design/pro-components';
import type { TableRowSelection } from 'antd/es/table/interface';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppTable } from 'src/components/common/AppTable';
import type { ResourceContext } from 'src/types/resource';

export interface GenericResourceTableProps<
  TData,
  TListParams extends Record<string, any> = Record<string, any>,
> {
  resource: ResourceContext<TData, TListParams, any>;
  data: TData[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
  onPageChange?: (page: number, pageSize?: number) => void;
  columns?: ProColumns<TData>[];
  extendBaseColumns?: boolean;
  searchConfig?: {
    labelWidth?: 'auto' | number;
  };
  formInitialValues?: TListParams;
  onSubmit?: (values: TListParams) => void;
  onReset?: () => void;
  extraToolbarActions?: ReactNode[];
  rowSelection?: TableRowSelection<TData>;
}

export function GenericResourceTable<
  TData extends Record<string, any>,
  TListParams extends Record<string, any> = Record<string, any>,
>({
  resource,
  data,
  loading = false,
  pagination: paginationProp,
  onPageChange,
  columns: customColumns,
  extendBaseColumns = false,
  searchConfig,
  formInitialValues,
  onSubmit,
  onReset,
  extraToolbarActions = [],
  rowSelection,
}: GenericResourceTableProps<TData, TListParams>) {
  const { t } = useTranslation();

  const baseColumns = resource.uiConfig.columns;

  const columns = extendBaseColumns
    ? [...baseColumns, ...(customColumns ?? [])]
    : (customColumns ?? baseColumns);

  const usePagination = paginationProp && onPageChange;

  return (
    <AppTable<TData, TListParams>
      rowKey={resource.dataConfig.idField as keyof TData}
      columns={columns}
      loading={loading}
      dataSource={data}
      pagination={
        usePagination
          ? {
              current: paginationProp.current,
              pageSize: paginationProp.pageSize,
              total: paginationProp.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => t('common.pagination.total', { total }),
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (page, size) => {
                onPageChange(page, size);
              },
              onShowSizeChange: (current, size) => {
                onPageChange(1, size);
              },
            }
          : false
      }
      rowSelection={rowSelection}
      search={searchConfig ?? { labelWidth: 'auto' }}
      form={
        formInitialValues
          ? {
              initialValues: formInitialValues,
            }
          : undefined
      }
      onSubmit={onSubmit}
      onReset={onReset}
      toolBarRender={() => [...extraToolbarActions]}
    />
  );
}
