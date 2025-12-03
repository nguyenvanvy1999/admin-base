import type { ProColumns } from '@ant-design/pro-components';
import { Button } from 'antd';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppTable } from 'src/components/common/AppTable';
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
  columns?: ProColumns<AdminSession>[];
  extendBaseColumns?: boolean;
  searchConfig?: {
    labelWidth?: 'auto' | number;
  };
  formInitialValues?: T;
  onSubmit?: (values: T) => void;
  onReset?: () => void;
  extraToolbarActions?: ReactNode[];
}

export function SessionsTable<
  T extends Record<string, any> = Record<string, any>,
>({
  sessions,
  statusById,
  loading = false,
  paging,
  onLoadMore,
  columns: customColumns,
  extendBaseColumns = false,
  searchConfig,
  formInitialValues,
  onSubmit,
  onReset,
  extraToolbarActions = [],
}: SessionsTableProps<T>) {
  const { t } = useTranslation();

  const baseColumns: ProColumns<AdminSession>[] = [
    {
      title: t('adminSessionsPage.table.created'),
      dataIndex: 'created',
      valueType: 'dateRange',
      sorter: (a, b) => dayjs(a.created).valueOf() - dayjs(b.created).valueOf(),
      render: (_, record) =>
        dayjs(record.created).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('adminSessionsPage.table.expired'),
      dataIndex: 'expired',
      hideInSearch: true,
      render: (_, record) =>
        dayjs(record.expired).format('YYYY-MM-DD HH:mm:ss'),
    },
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
    {
      title: t('adminSessionsPage.table.status'),
      dataIndex: 'status',
      hideInSearch: true,
      render: (_, record) => {
        const status = getSessionStatus(record, statusById);
        return <SessionStatusTag status={status} />;
      },
    },
  ];

  const columns = extendBaseColumns
    ? [...baseColumns, ...(customColumns ?? [])]
    : (customColumns ?? baseColumns);

  return (
    <AppTable<AdminSession, T>
      rowKey="id"
      columns={columns}
      loading={loading}
      dataSource={sessions}
      pagination={false}
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
        paging?.hasNext && onLoadMore && (
          <Button key="load-more" onClick={onLoadMore}>
            {t('adminSessionsPage.actions.loadMore')}
          </Button>
        ),
      ]}
    />
  );
}
