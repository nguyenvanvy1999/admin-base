import type { ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import {
  useAdminRateLimits,
  useBlockRateLimit,
  useCleanupRateLimits,
  useUnblockRateLimit,
} from 'src/hooks/api/useAdminRateLimit';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import type {
  AdminRateLimit,
  AdminRateLimitListParams,
} from 'src/types/admin-rate-limit';
import type { TableParamsWithFilters } from 'src/types/table';

type AdminRateLimitTableParams = TableParamsWithFilters<{
  identifier?: string;
  type?: string;
  blocked?: boolean;
  created0?: string;
  created1?: string;
}>;

const RATE_LIMIT_TYPE_COLORS: Record<string, string> = {
  api: 'blue',
  login: 'orange',
  password_reset: 'red',
  email_verification: 'green',
  file_upload: 'purple',
};

export default function AdminRateLimitsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('RATE_LIMIT.VIEW');
  const canManage = hasPermission('RATE_LIMIT.MANAGE');

  const [params, setParams] = useState<AdminRateLimitListParams>({
    take: 20,
    skip: 0,
  });

  const { data, isLoading, refetch } = useAdminRateLimits(params);
  const blockMutation = useBlockRateLimit({
    onSuccess: () => {
      void refetch();
    },
  });
  const unblockMutation = useUnblockRateLimit({
    onSuccess: () => {
      void refetch();
    },
  });
  const cleanupMutation = useCleanupRateLimits({
    onSuccess: () => {
      void refetch();
    },
  });

  const columns: ProColumns<AdminRateLimit>[] = useMemo(
    () => [
      {
        title: t('common.fields.identifier'),
        dataIndex: 'identifier',
        copyable: true,
        ellipsis: true,
        width: 200,
      },
      {
        title: t('common.fields.type'),
        dataIndex: 'type',
        width: 150,
        valueType: 'select',
        valueEnum: {
          api: { text: 'API' },
          login: { text: 'Login' },
          password_reset: { text: 'Password Reset' },
          email_verification: { text: 'Email Verification' },
          file_upload: { text: 'File Upload' },
        },
        render: (_, record) => (
          <Tag color={RATE_LIMIT_TYPE_COLORS[record.type] || 'default'}>
            {record.type}
          </Tag>
        ),
      },
      {
        title: t('common.fields.count'),
        dataIndex: 'count',
        hideInSearch: true,
        width: 100,
        render: (_, record) => (
          <Tag color={record.count >= record.limit ? 'red' : 'default'}>
            {record.count} / {record.limit}
          </Tag>
        ),
      },
      {
        title: t('common.fields.limit'),
        dataIndex: 'limit',
        hideInSearch: true,
        width: 100,
      },
      {
        title: t('common.fields.windowStart'),
        dataIndex: 'windowStart',
        hideInSearch: true,
        width: 180,
        render: (_, record) =>
          dayjs(record.windowStart).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: t('common.fields.windowEnd'),
        dataIndex: 'windowEnd',
        hideInSearch: true,
        width: 180,
        render: (_, record) =>
          dayjs(record.windowEnd).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: t('common.fields.blocked'),
        dataIndex: 'blocked',
        width: 100,
        valueType: 'select',
        valueEnum: {
          true: { text: t('common.yes') },
          false: { text: t('common.no') },
        },
        render: (_, record) =>
          record.blocked ? (
            <Tag color="red">{t('common.yes')}</Tag>
          ) : (
            <Tag color="green">{t('common.no')}</Tag>
          ),
      },
      {
        title: t('common.fields.blockedUntil'),
        dataIndex: 'blockedUntil',
        hideInSearch: true,
        width: 180,
        render: (_, record) =>
          record.blockedUntil
            ? dayjs(record.blockedUntil).format('YYYY-MM-DD HH:mm:ss')
            : '-',
      },
      {
        title: t('common.fields.created'),
        dataIndex: 'created',
        hideInSearch: true,
        width: 180,
        render: (_, record) =>
          dayjs(record.created).format('YYYY-MM-DD HH:mm:ss'),
      },
      ...(canManage
        ? [
            {
              title: t('common.fields.actions'),
              dataIndex: 'actions',
              hideInSearch: true,
              width: 200,
              fixed: 'right' as const,
              render: (_: unknown, record: AdminRateLimit) => (
                <Space>
                  {record.blocked ? (
                    <Popconfirm
                      title={t('adminRateLimitsPage.confirmUnblock')}
                      onConfirm={() => {
                        unblockMutation.mutate({
                          identifier: record.identifier,
                          type: record.type,
                        });
                      }}
                    >
                      <Button size="small" type="link">
                        {t('common.actions.unblock')}
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Popconfirm
                      title={t('adminRateLimitsPage.confirmBlock')}
                      onConfirm={() => {
                        blockMutation.mutate({
                          identifier: record.identifier,
                          type: record.type,
                        });
                      }}
                    >
                      <Button size="small" type="link" danger>
                        {t('common.actions.block')}
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]
        : []),
    ],
    [t, canManage, blockMutation, unblockMutation],
  );

  if (!canView) {
    return null;
  }

  return (
    <AppPage>
      <AppTable<AdminRateLimit, AdminRateLimitTableParams>
        rowKey="id"
        columns={columns}
        loading={isLoading}
        dataSource={data?.docs ?? []}
        pagination={{
          current: Math.floor((params.skip ?? 0) / (params.take ?? 20)) + 1,
          pageSize: params.take ?? 20,
          total: data?.count ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => t('common.pagination.total', { total }),
          onChange: (page, pageSize) => {
            setParams({
              ...params,
              skip: (page - 1) * pageSize,
              take: pageSize,
            });
          },
        }}
        toolBarRender={() => [
          ...(canManage
            ? [
                <Popconfirm
                  key="cleanup"
                  title={t('adminRateLimitsPage.confirmCleanup')}
                  onConfirm={() => {
                    cleanupMutation.mutate(undefined);
                  }}
                >
                  <Button type="default" loading={cleanupMutation.isPending}>
                    {t('adminRateLimitsPage.actions.cleanup')}
                  </Button>
                </Popconfirm>,
              ]
            : []),
        ]}
        search={{
          labelWidth: 'auto',
          optionRender: (searchConfig, formProps, dom) => [...dom.reverse()],
        }}
        onSubmit={(values) => {
          setParams({
            take: 20,
            skip: 0,
            identifier: values.identifier,
            type: values.type as any,
            blocked:
              values.blocked === true
                ? true
                : values.blocked === false
                  ? false
                  : undefined,
            created0: values.created0,
            created1: values.created1,
          });
        }}
        onReset={() => {
          setParams({
            take: 20,
            skip: 0,
          });
        }}
      />
    </AppPage>
  );
}
