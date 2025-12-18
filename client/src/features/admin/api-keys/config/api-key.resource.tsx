import type { ProColumns } from '@ant-design/pro-components';
import { Tag, Tooltip } from 'antd';
import {
  createDateColumn,
  createSearchColumn,
} from 'src/components/common/tableColumns';
import { adminApiKeyService } from 'src/services/api/admin/api-keys.service';
import type {
  AdminApiKeyListQuery,
  AdminApiKeyListResponse,
  AdminApiKeySummary,
  ApiKeyStatus,
} from 'src/types/admin-api-keys';
import type { ResourceContext } from 'src/types/resource';
import {
  formatKeyPrefix,
  getApiKeyStatusColor,
  getApiKeyStatusLabel,
} from '../utils';

function createApiKeyColumns(
  t: (key: string, options?: Record<string, any>) => string,
): ProColumns<AdminApiKeySummary>[] {
  const API_KEY_STATUSES: ApiKeyStatus[] = ['active', 'revoked', 'expired'];

  return [
    createSearchColumn<AdminApiKeySummary>({
      dataIndex: 'search',
      placeholder: t('common.filters.keyword'),
    }),
    {
      title: t('apiKeysPage.fields.name'),
      dataIndex: 'name',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: t('apiKeysPage.fields.keyPrefix'),
      dataIndex: 'keyPrefix',
      render: (_, record) => (
        <Tooltip title={t('common.placeholders.clickToCopy')}>
          <span style={{ cursor: 'pointer' }}>
            {formatKeyPrefix(record.keyPrefix)}
          </span>
        </Tooltip>
      ),
      hideInSearch: true,
    },
    {
      title: t('apiKeysPage.fields.status'),
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      fieldProps: {
        options: API_KEY_STATUSES.map((status) => ({
          label: getApiKeyStatusLabel(status),
          value: status,
        })),
      },
      render: (_, record) => (
        <Tag color={getApiKeyStatusColor(record.status)}>
          {getApiKeyStatusLabel(record.status)}
        </Tag>
      ),
    },
    createDateColumn<AdminApiKeySummary>({
      dataIndex: 'expiresAt',
      title: t('apiKeysPage.fields.expiresAt'),
    }),
    createDateColumn<AdminApiKeySummary>({
      dataIndex: 'lastUsedAt',
      title: t('apiKeysPage.fields.lastUsedAt'),
    }),
    createDateColumn<AdminApiKeySummary>({
      dataIndex: 'created',
      title: t('common.fields.created'),
    }),
  ];
}

export type AdminApiKeyListParamsForResource = AdminApiKeyListQuery & {
  take: number;
  cursor?: string;
};

export const apiKeyResource = (
  t: (key: string, options?: Record<string, any>) => string,
): ResourceContext<
  AdminApiKeySummary,
  AdminApiKeyListParamsForResource,
  { ids: string[] }
> => ({
  name: 'api-key',
  displayName: 'API Key',
  permissions: {
    view: ['API_KEY.VIEW', 'API_KEY.VIEW_ALL'],
    viewAll: 'API_KEY.VIEW_ALL',
    create: ['API_KEY.UPDATE'],
    update: ['API_KEY.UPDATE'],
    delete: ['API_KEY.DELETE'],
    action: {
      revoke: ['API_KEY.UPDATE'],
      regenerate: ['API_KEY.UPDATE'],
    },
  },
  endpoints: {
    list: '/api/api-keys',
    detail: '/api/api-keys/:id',
    create: '/api/api-keys',
    update: '/api/api-keys/:id',
    delete: '/api/api-keys/del',
    actions: {
      revoke: '/api/api-keys/:id/revoke',
      regenerate: '/api/api-keys/:id/regenerate',
    },
  },
  dataConfig: {
    idField: 'id',
    ownerField: 'userId',
  },
  uiConfig: {
    columns: createApiKeyColumns(t),
  },
  scope: 'both',
  listService: async (
    params: AdminApiKeyListParamsForResource,
  ): Promise<{
    docs: AdminApiKeySummary[];
    hasNext: boolean;
    nextCursor?: string;
  }> => {
    const { cursor, take, ...rest } = params;
    const skip = cursor ? Number(cursor) || 0 : 0;

    const response: AdminApiKeyListResponse = await adminApiKeyService.list({
      ...rest,
      skip,
      take,
    });

    const nextSkip = skip + take;
    const hasNext = nextSkip < response.count;

    return {
      docs: response.docs,
      hasNext,
      nextCursor: hasNext ? String(nextSkip) : undefined,
    };
  },
  actionService: async (action, params) => {
    if (action === 'revoke') {
      const ids = (params as { ids: string[] }).ids;
      await Promise.all(
        ids.map(async (id) => {
          await adminApiKeyService.revoke(id);
        }),
      );
    }
  },
});
