import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { createDateColumn } from 'src/components/common/tableColumns';
import { adminSessionsService } from 'src/services/api/admin/sessions.service';
import type {
  AdminSession,
  AdminSessionListParams,
} from 'src/types/admin-sessions';
import type { ResourceContext } from 'src/types/resource';
import { SessionStatusTag } from '../components/SessionStatusTag';

function createSessionColumns(
  t: (key: string, options?: Record<string, any>) => string,
): ProColumns<AdminSession>[] {
  return [
    createDateColumn<AdminSession>({
      dataIndex: 'created',
      title: t('common.fields.createdAt'),
      format: 'YYYY-MM-DD HH:mm:ss',
      valueType: 'dateRange',
      sorter: true,
    }),
    createDateColumn<AdminSession>({
      dataIndex: 'expired',
      title: t('common.fields.expiresAt'),
      format: 'YYYY-MM-DD HH:mm:ss',
      hideInSearch: true,
    }),
    {
      title: t('common.fields.device'),
      dataIndex: 'device',
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) => record.device,
    },
    {
      title: t('common.fields.ip'),
      dataIndex: 'ip',
      render: (_, record) => record.ip ?? '-',
    },
    {
      title: t('common.fields.status'),
      dataIndex: 'status',
      hideInSearch: true,
      render: (_: unknown, record: AdminSession) => {
        const status: 'active' | 'revoked' | 'expired' = record.revoked
          ? 'revoked'
          : dayjs(record.expired).isBefore(dayjs())
            ? 'expired'
            : 'active';
        return <SessionStatusTag status={status} />;
      },
    },
  ];
}

export function createSessionResource(
  t: (key: string, options?: Record<string, any>) => string,
): ResourceContext<AdminSession, AdminSessionListParams, { ids: string[] }> {
  return {
    name: 'session',
    displayName: 'Session',
    permissions: {
      view: ['SESSION.VIEW', 'SESSION.VIEW_ALL'],
      viewAll: 'SESSION.VIEW_ALL',
      delete: ['SESSION.REVOKE', 'SESSION.REVOKE_ALL'],
    },
    endpoints: {
      // Unified controller prefix: /sessions (mounted under /api)
      list: '/api/sessions',
      delete: '/api/sessions/revoke',
    },
    dataConfig: {
      idField: 'id',
      ownerField: 'createdById',
      statusComputed: (session) => {
        if (session.revoked) return 'revoked';
        if (dayjs(session.expired).isBefore(dayjs())) return 'expired';
        return 'active';
      },
    },
    uiConfig: {
      columns: createSessionColumns(t),
      actions: [
        {
          key: 'revoke',
          label: t('common.actions.revoke'),
          danger: true,
          permission: ['SESSION.REVOKE', 'SESSION.REVOKE_ALL'],
          handler: async (record) => {
            await adminSessionsService.revoke([record.id]);
          },
          visible: (record) => {
            if (record.revoked) return false;
            if (dayjs(record.expired).isBefore(dayjs())) return false;
            return true;
          },
        },
      ],
      bulkActions: [
        {
          key: 'revoke-selected',
          label:
            t('common.actions.revokeSelected', { count: 0 }) ||
            'Revoke Selected',
          danger: true,
          permission: ['SESSION.REVOKE', 'SESSION.REVOKE_ALL'],
          handler: async (ids) => {
            await adminSessionsService.revoke(ids);
          },
        },
      ],
    },
    scope: 'both',
    listService: (params: AdminSessionListParams) => {
      const normalizedParams = {
        ...params,
        ...(params.userIds && params.userIds.length
          ? { userIds: params.userIds.join(',') }
          : {}),
      } as AdminSessionListParams & { userIds?: string };
      return adminSessionsService.list(normalizedParams as any);
    },
    actionService: async (action: string, params: { ids: string[] }) => {
      if (action === 'revoke') {
        await adminSessionsService.revoke(params.ids);
      }
    },
  };
}
