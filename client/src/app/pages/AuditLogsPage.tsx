import type { ProColumns } from '@ant-design/pro-components';
import { Badge, Space, Tag, Typography } from 'antd';
import type dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';
import { AppTable } from 'src/components/common/AppTable';
import {
  createActionColumn,
  createDateColumn,
} from 'src/components/common/tableColumns';
import { AuditLogDetailModal } from 'src/features/admin/audit-logs/components';
import {
  CATEGORY_COLORS,
  LEVEL_COLORS,
  SEVERITY_COLORS,
} from 'src/features/admin/audit-logs/utils/auditLogUtils';
import { useUserSearchSelect } from 'src/features/admin/users/hooks/useUserSearchSelect';
import { createUserSelectColumn } from 'src/features/admin/users/utils/userSelectColumn';
import { useAdminTable } from 'src/hooks/admin/useAdminTable';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { getSearchValue } from 'src/lib/utils/table.utils';
import { adminAuditLogsService } from 'src/services/api/admin/audit-logs.service';
import type {
  AdminAuditLog,
  AdminAuditLogListQuery,
  AuditLogCategory,
  LogType,
  SecurityEventSeverity,
  SecurityEventType,
} from 'src/types/admin-audit-logs';
import type { TableParamsWithFilters } from 'src/types/table';

type AuditLogTableParams = TableParamsWithFilters<{
  userId?: string;
  sessionId?: string;
  entityType?: string;
  entityId?: string;
  level?: string;
  logType?: LogType;
  category?: AuditLogCategory;
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  resolved?: boolean;
  subjectUserId?: string;
  ip?: string;
  traceId?: string;
  correlationId?: string;
  occurredAt?: [dayjs.Dayjs, dayjs.Dayjs];
}>;

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canViewAll = hasPermission('AUDIT_LOG.VIEW_ALL');
  const canView = hasPermission(
    ['AUDIT_LOG.VIEW_ALL', 'AUDIT_LOG.VIEW'],
    'any',
  );
  const [selectedRecord, setSelectedRecord] = useState<AdminAuditLog | null>(
    null,
  );
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const userSearchSelect = useUserSearchSelect({
    enabled: canViewAll,
    take: 20,
  });

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
        logType: getSearchValue(params.logType as LogType | undefined) as
          | LogType
          | undefined,
        level: params.level as string | undefined,
        category: params.category as AuditLogCategory | undefined,
        eventType: params.eventType as SecurityEventType | undefined,
        severity: params.severity as SecurityEventSeverity | undefined,
        resolved:
          params.resolved !== undefined
            ? (params.resolved as boolean)
            : undefined,
        userId: canViewAll ? (params.userId as string | undefined) : undefined,
        subjectUserId: canViewAll
          ? (params.subjectUserId as string | undefined)
          : undefined,
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

  const handleViewDetail = (record: AdminAuditLog) => {
    setSelectedRecord(record);
    setDetailModalOpen(true);
  };

  const handleViewDiff = (record: AdminAuditLog) => {
    setSelectedRecord(record);
    setDetailModalOpen(true);
  };

  const handleResolve = async (id: string): Promise<void> => {
    await adminAuditLogsService.resolve(id);
    await actionRef.current?.reload();
  };

  const handleCloseModal = () => {
    setDetailModalOpen(false);
    setSelectedRecord(null);
  };

  const columns: ProColumns<AdminAuditLog>[] = useMemo(() => {
    const baseColumns: ProColumns<AdminAuditLog>[] = [
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
        width: 120,
        valueType: 'select',
        valueEnum: {
          audit: { text: 'Audit' },
          security: { text: 'Security' },
          system: { text: 'System' },
          api: { text: 'API' },
          rate_limit: { text: 'Rate Limit' },
        },
        render: (_: unknown, record) => <Tag>{record.logType}</Tag>,
      },
      {
        title: t('auditLogsPage.fields.category'),
        dataIndex: 'category',
        width: 120,
        valueType: 'select',
        valueEnum: {
          cud: { text: 'CUD' },
          security: { text: 'Security' },
          internal: { text: 'Internal' },
          system: { text: 'System' },
        },
        render: (_: unknown, record) => {
          if (!record.category) return '-';
          return (
            <Tag color={CATEGORY_COLORS[record.category]}>
              {record.category.toUpperCase()}
            </Tag>
          );
        },
      },
      {
        title: t('common.fields.description'),
        dataIndex: 'description',
        ellipsis: true,
        hideInSearch: true,
        width: 300,
        render: (_: unknown, record) => record.description || '-',
      },
      {
        title: t('auditLogsPage.fields.entity'),
        dataIndex: 'entityType',
        width: 150,
        hideInTable: false,
        hideInSearch: false,
        render: (_: unknown, record) => {
          if (record.category !== 'cud') return null;
          return (
            <Space>
              {record.entityType && <Tag>{record.entityType}</Tag>}
              {record.entityId && (
                <Typography.Text code copyable>
                  {record.entityId}
                </Typography.Text>
              )}
            </Space>
          );
        },
      },
      {
        title: t('auditLogsPage.fields.event'),
        dataIndex: 'eventType',
        width: 200,
        hideInTable: false,
        hideInSearch: false,
        valueType: 'select',
        valueEnum: {
          login_failed: { text: 'Login Failed' },
          login_success: { text: 'Login Success' },
          logout: { text: 'Logout' },
          logout_all_sessions: { text: 'Logout All Sessions' },
          refresh_token_success: { text: 'Refresh Token Success' },
          refresh_token_failed: { text: 'Refresh Token Failed' },
          password_changed: { text: 'Password Changed' },
          password_reset_requested: { text: 'Password Reset Requested' },
          password_reset_completed: { text: 'Password Reset Completed' },
          password_reset_failed: { text: 'Password Reset Failed' },
          register_started: { text: 'Register Started' },
          register_completed: { text: 'Register Completed' },
          register_failed: { text: 'Register Failed' },
          mfa_enabled: { text: 'MFA Enabled' },
          mfa_disabled: { text: 'MFA Disabled' },
          mfa_verified: { text: 'MFA Verified' },
          mfa_failed: { text: 'MFA Failed' },
          mfa_setup_started: { text: 'MFA Setup Started' },
          mfa_setup_completed: { text: 'MFA Setup Completed' },
          mfa_setup_failed: { text: 'MFA Setup Failed' },
          mfa_challenge_started: { text: 'MFA Challenge Started' },
          account_locked: { text: 'Account Locked' },
          account_unlocked: { text: 'Account Unlocked' },
          suspicious_activity: { text: 'Suspicious Activity' },
          ip_changed: { text: 'IP Changed' },
          device_changed: { text: 'Device Changed' },
          permission_escalation: { text: 'Permission Escalation' },
          api_key_created: { text: 'API Key Created' },
          api_key_revoked: { text: 'API Key Revoked' },
          api_key_usage_blocked: { text: 'API Key Usage Blocked' },
          data_exported: { text: 'Data Exported' },
          bulk_operation: { text: 'Bulk Operation' },
          rate_limit_exceeded: { text: 'Rate Limit Exceeded' },
          otp_sent: { text: 'OTP Sent' },
          otp_send_failed: { text: 'OTP Send Failed' },
          otp_invalid: { text: 'OTP Invalid' },
          otp_rate_limited: { text: 'OTP Rate Limited' },
        },
        render: (_: unknown, record) => {
          if (record.category !== 'security') return null;
          return (
            <Space>
              {record.eventType && (
                <Tag
                  color={
                    record.severity
                      ? SEVERITY_COLORS[record.severity]
                      : 'default'
                  }
                >
                  {record.eventType}
                </Tag>
              )}
              {!record.resolved && (
                <Badge
                  status="error"
                  text={t('auditLogsPage.status.unresolved')}
                />
              )}
            </Space>
          );
        },
      },
      {
        title: t('auditLogsPage.fields.severity'),
        dataIndex: 'severity',
        width: 100,
        hideInTable: false,
        hideInSearch: false,
        valueType: 'select',
        valueEnum: {
          low: { text: 'Low' },
          medium: { text: 'Medium' },
          high: { text: 'High' },
          critical: { text: 'Critical' },
        },
        render: (_: unknown, record) => {
          if (record.category !== 'security' || !record.severity) return null;
          return (
            <Tag color={SEVERITY_COLORS[record.severity]}>
              {record.severity.toUpperCase()}
            </Tag>
          );
        },
      },
      createDateColumn<AdminAuditLog>({
        dataIndex: 'occurredAt',
        title: t('auditLogsPage.fields.occurredAt'),
        format: 'YYYY-MM-DD HH:mm:ss',
        valueType: 'dateTimeRange',
        hideInSearch: false,
        sorter: true,
      }),
    ];

    if (canViewAll) {
      baseColumns.push(
        createUserSelectColumn<AdminAuditLog>(userSearchSelect, t, {
          title: t('common.fields.userId'),
          dataIndex: 'userId',
          mode: undefined,
        }),
      );
    }

    baseColumns.push(
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
        title: t('auditLogsPage.fields.subjectUserId'),
        dataIndex: 'subjectUserId',
        hideInTable: true,
        hideInSearch: !canViewAll,
        copyable: true,
        ellipsis: true,
      },
      {
        title: t('auditLogsPage.fields.resolved'),
        dataIndex: 'resolved',
        hideInTable: true,
        hideInSearch: false,
        valueType: 'select',
        valueEnum: {
          true: { text: t('common.yes') },
          false: { text: t('common.no') },
        },
        render: (_: unknown, record) => {
          if (record.category !== 'security') return null;
          return record.resolved
            ? t('auditLogsPage.status.resolved')
            : t('auditLogsPage.status.unresolved');
        },
      },
      createDateColumn<AdminAuditLog>({
        dataIndex: 'created',
        title: t('common.fields.createdAt'),
        format: 'YYYY-MM-DD HH:mm:ss',
        hideInSearch: true,
      }),
      createActionColumn<AdminAuditLog>({
        onView: handleViewDetail,
        onEdit: (record) => {
          if (
            record.category === 'cud' &&
            record.payload?.action === 'update' &&
            record.payload?.changes
          ) {
            handleViewDiff(record);
          }
        },
        onDelete: (record) => {
          if (record.category === 'security' && !record.resolved) {
            void handleResolve(record.id);
          }
        },
        canView: () => true,
        canEdit: (record) =>
          record.category === 'cud' &&
          record.payload?.action === 'update' &&
          !!record.payload?.changes,
        canDelete: (record) =>
          record.category === 'security' && !record.resolved,
        viewTooltip: t('common.actions.view'),
        editTooltip: t('auditLogsPage.actions.viewDiff'),
        deleteTooltip: t('auditLogsPage.actions.resolve'),
        title: t('common.fields.actions'),
        width: 120,
      }),
    );

    return baseColumns;
  }, [
    t,
    canViewAll,
    userSearchSelect,
    handleViewDetail,
    handleViewDiff,
    handleResolve,
  ]);

  if (!canView) {
    return null;
  }

  return (
    <AppPage>
      <AppTable<AdminAuditLog, AuditLogTableParams>
        rowKey="id"
        columns={columns}
        actionRef={actionRef}
        search={{
          labelWidth: 'auto',
          span: 6,
          defaultCollapsed: false,
        }}
        manualRequest={false}
        request={request}
      />
      <AuditLogDetailModal
        open={detailModalOpen}
        record={selectedRecord}
        onClose={handleCloseModal}
        onResolve={handleResolve}
      />
    </AppPage>
  );
}
