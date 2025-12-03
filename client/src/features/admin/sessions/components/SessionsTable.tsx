import type { ProColumns } from '@ant-design/pro-components';
import { Button } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppTable } from 'src/components/common/AppTable';
import {
  createDateColumn,
  createStatusColumn,
} from 'src/components/common/tableColumns';
import type {
  AdminSession,
  AdminSessionStatus,
} from 'src/types/admin-sessions';
import { getSessionStatus } from '../utils/sessionStatus';
import { SessionStatusTag } from './SessionStatusTag';

export interface SessionsTableProps<
  T extends Record<string, any> = Record<string, any>,
> {
  sessions: AdminSession[];
  statusById: Record<string, AdminSessionStatus>;
  loading?: boolean;
  paging?: {
    hasNext: boolean;
  };
  onLoadMore?: () => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
  onPageChange?: (page: number, pageSize?: number) => void;
  columns?: ProColumns<AdminSession>[];
  extendBaseColumns?: boolean;
  searchConfig?: {
    labelWidth?: 'auto' | number;
  };
  formInitialValues?: T;
  onSubmit?: (values: T) => void;
  onReset?: () => void;
  extraToolbarActions?: ReactNode[];
  rowSelection?: TableRowSelection<AdminSession>;
}

export function SessionsTable<
  T extends Record<string, any> = Record<string, any>,
>({
  sessions,
  statusById,
  loading = false,
  paging,
  onLoadMore,
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
}: SessionsTableProps<T>) {
  const { t } = useTranslation();

  const baseColumns: ProColumns<AdminSession>[] = [
    createDateColumn<AdminSession>({
      dataIndex: 'created',
      title: t('common.table.created'),
      format: 'YYYY-MM-DD HH:mm:ss',
      valueType: 'dateRange',
      sorter: true,
    }),
    createDateColumn<AdminSession>({
      dataIndex: 'expired',
      title: t('adminSessionsPage.table.expired'),
      format: 'YYYY-MM-DD HH:mm:ss',
      hideInSearch: true,
    }),
    {
      title: t('adminSessionsPage.table.device'),
      dataIndex: 'device',
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) => record.device,
    },
    {
      title: t('adminSessionsPage.table.ip'),
      dataIndex: 'ip',
      render: (_, record) => record.ip ?? '-',
    },
    createStatusColumn<AdminSession>({
      dataIndex: 'status',
      title: t('common.table.status'),
      getStatus: (record) => getSessionStatus(record, statusById),
      hideInSearch: true,
      render: (status: string) => (
        <SessionStatusTag status={status as AdminSessionStatus} />
      ),
    }),
  ];

  const columns = extendBaseColumns
    ? [...baseColumns, ...(customColumns ?? [])]
    : (customColumns ?? baseColumns);

  const usePagination = paginationProp && onPageChange;

  return (
    <AppTable<AdminSession, T>
      rowKey="id"
      columns={columns}
      loading={loading}
      dataSource={sessions}
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
      toolBarRender={() => [
        ...extraToolbarActions,
        !usePagination && paging?.hasNext && onLoadMore && (
          <Button key="load-more" onClick={onLoadMore}>
            {t('adminSessionsPage.actions.loadMore')}
          </Button>
        ),
      ]}
    />
  );
}
