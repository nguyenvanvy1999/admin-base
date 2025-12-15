import type { ProColumns } from '@ant-design/pro-components';
import { Tag, Tooltip } from 'antd';
import type dayjs from 'dayjs';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import {
  createDateColumn,
  createSearchColumn,
} from 'src/components/common/tableColumns';
import { useAdminTable } from 'src/hooks/admin/useAdminTable';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { getSearchValue } from 'src/lib/utils/table.utils';
import { adminAuditLogsService } from 'src/services/api/admin/audit-logs.service';
import type {
  AdminAuditLog,
  AdminAuditLogListQuery,
} from 'src/types/admin-audit-logs';
import type { TableParamsWithFilters } from 'src/types/table';

type AdminAuditLogTableParams = TableParamsWithFilters<{
  userId?: string;
  sessionId?: string;
  entityType?: string;
  entityId?: string;
  level?: string;
  logType?: string;
  ip?: string;
  traceId?: string;
  correlationId?: string;
  occurredAt?: [dayjs.Dayjs, dayjs.Dayjs];
}>;

const LEVEL_COLORS: Record<string, string> = {
  error: 'red',
  warn: 'orange',
  info: 'blue',
  debug: 'default',
};

export default function AdminAuditLogPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canViewAll = hasPermission('AUDIT_LOG.VIEW_ALL');
  const canView = hasPermission(
    ['AUDIT_LOG.VIEW_ALL', 'AUDIT_LOG.VIEW'],
    'any',
  );

  const { actionRef, request } = useAdminTable<
    AdminAuditLog,
    Omit<AdminAuditLogListQuery, 'skip' | 'take'>
  >({
    service: adminAuditLogsService,
    permissions: {
      view: ['AUDIT_LOG.VIEW_ALL', 'AUDIT_LOG.VIEW'],
    },
    normalizeParams: (params) => {
      const occurredAtRange = (params as any).occurredAt as
        | [dayjs.Dayjs, dayjs.Dayjs]
        | undefined;

      return {
        logType: getSearchValue(params.logType as string | undefined),
        level: params.level as string | undefined,
        userId: canViewAll ? (params.userId as string | undefined) : undefined,
        sessionId: canViewAll
          ? (params.sessionId as string | undefined)
          : undefined,
        entityType: params.entityType as string | undefined,
        entityId: params.entityId as string | undefined,
        ip: params.ip as string | undefined,
        traceId: params.traceId as string | undefined,
        correlationId: params.correlationId as string | undefined,
        ...(occurredAtRange && occurredAtRange.length === 2
          ? {
              occurredAt0: occurredAtRange[0]!.toISOString(),
              occurredAt1: occurredAtRange[1]!.toISOString(),
            }
          : {}),
      };
    },
  });

  const columns: ProColumns<AdminAuditLog>[] = useMemo(
    () => [
      createSearchColumn<AdminAuditLog>({
        dataIndex: 'logType',
        placeholder: t('common.filters.keyword'),
      }),
      {
        title: t('common.fields.level'),
        dataIndex: 'level',
        width: 100,
        valueType: 'select',
        valueEnum: {
          error: { text: 'ERROR' },
          warn: { text: 'WARN' },
          info: { text: 'INFO' },
          debug: { text: 'DEBUG' },
        },
        render: (_: unknown, record) => (
          <Tag color={LEVEL_COLORS[record.level] || 'default'}>
            {record.level.toUpperCase()}
          </Tag>
        ),
      },
      {
        title: t('common.fields.logType'),
        dataIndex: 'logType',
        ellipsis: true,
        hideInSearch: true,
      },
      {
        title: t('common.fields.description'),
        dataIndex: 'description',
        ellipsis: true,
        hideInSearch: true,
        width: 300,
      },
      {
        title: t('common.fields.entityType'),
        dataIndex: 'entityType',
        ellipsis: true,
        hideInTable: true,
        copyable: true,
      },
      {
        title: t('common.fields.entityId'),
        dataIndex: 'entityId',
        ellipsis: true,
        hideInTable: true,
        copyable: true,
      },
      {
        title: t('common.fields.userId'),
        dataIndex: 'userId',
        hideInTable: !canViewAll,
        hideInSearch: !canViewAll,
        copyable: true,
        ellipsis: true,
      },
      {
        title: t('common.fields.sessionId'),
        dataIndex: 'sessionId',
        hideInTable: true,
        hideInSearch: !canViewAll,
        copyable: true,
        ellipsis: true,
      },
      {
        title: t('common.fields.ip'),
        dataIndex: 'ip',
        hideInTable: true,
        copyable: true,
        ellipsis: true,
      },
      {
        title: t('common.fields.traceId'),
        dataIndex: 'traceId',
        hideInTable: true,
        copyable: true,
        ellipsis: true,
      },
      {
        title: t('common.fields.correlationId'),
        dataIndex: 'correlationId',
        hideInTable: true,
        copyable: true,
        ellipsis: true,
      },
      {
        title: t('common.fields.payload'),
        dataIndex: 'payload',
        hideInSearch: true,
        width: 200,
        ellipsis: true,
        hideInTable: true,
        render: (_: unknown, record) => (
          <Tooltip title={JSON.stringify(record.payload, null, 2)}>
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(record.payload)}
            </pre>
          </Tooltip>
        ),
      },
      createDateColumn<AdminAuditLog>({
        dataIndex: 'occurredAt',
        title: t('common.fields.occurredAt'),
        format: 'YYYY-MM-DD HH:mm:ss',
        valueType: 'dateTimeRange',
        hideInSearch: false,
      }),
      createDateColumn<AdminAuditLog>({
        dataIndex: 'created',
        title: t('common.fields.createdAt'),
        format: 'YYYY-MM-DD HH:mm:ss',
        hideInSearch: true,
      }),
    ],
    [t, canViewAll],
  );

  if (!canView) {
    return null;
  }

  return (
    <AppPage>
      <AppTable<AdminAuditLog, AdminAuditLogTableParams>
        rowKey="id"
        columns={columns}
        actionRef={actionRef}
        search={{
          labelWidth: 'auto',
        }}
        manualRequest={false}
        request={request}
      />
    </AppPage>
  );
}
