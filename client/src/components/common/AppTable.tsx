import type { ProTableProps } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface AppTableProps<
  T extends Record<string, any>,
  U extends Record<string, any> = Record<string, any>,
> extends Omit<ProTableProps<T, U>, 'search' | 'pagination' | 'options'> {
  search?: ProTableProps<T, U>['search'] | false;
  pagination?: ProTableProps<T, U>['pagination'] | false;
  options?: ProTableProps<T, U>['options'] | false;
  loading?: boolean;
  emptyText?: ReactNode;
}

export function AppTable<
  T extends Record<string, any>,
  U extends Record<string, any> = Record<string, any>,
>(props: AppTableProps<T, U>) {
  const { t } = useTranslation();
  const {
    search: searchProp,
    pagination: paginationProp,
    options: optionsProp,
    loading,
    emptyText,
    ...restProps
  } = props;

  return (
    <ProTable<T, U>
      bordered
      rowKey={restProps.rowKey ?? 'id'}
      loading={loading}
      search={
        searchProp === false
          ? false
          : (searchProp ?? {
              collapsed: false,
              labelWidth: 'auto',
            })
      }
      pagination={
        paginationProp === false
          ? false
          : (paginationProp ?? {
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => t('common.pagination.total', { total }),
            })
      }
      options={
        optionsProp === false
          ? false
          : (optionsProp ?? {
              density: true,
              fullScreen: true,
              setting: true,
              reload: true,
            })
      }
      locale={{
        emptyText: emptyText ?? t('common.empty.noData'),
      }}
      {...restProps}
    />
  );
}
