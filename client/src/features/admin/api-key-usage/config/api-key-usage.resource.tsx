import type { ProColumns } from '@ant-design/pro-components';
import { createDateColumn } from 'src/components/common/tableColumns';
import { apiKeyUsageService } from 'src/services/api/api-key-usage.service';
import type {
  ApiKeyUsageListParams,
  ApiKeyUsageListResponse,
  ApiKeyUsageRecord as ApiKeyUsageRecordType,
} from 'src/types/api-key-usage';
import type { ResourceContext } from 'src/types/resource';

export type ApiKeyUsageRecord = ApiKeyUsageRecordType;

export type ApiKeyUsageListParamsForResource = ApiKeyUsageListParams & {
  cursor?: string;
};

function createApiKeyUsageColumns(
  t: (key: string, options?: Record<string, any>) => string,
): ProColumns<ApiKeyUsageRecordType>[] {
  return [
    createDateColumn<ApiKeyUsageRecord>({
      dataIndex: 'timestamp',
      title: t('apiKeyUsagePage.fields.timestamp'),
      format: 'YYYY-MM-DD HH:mm:ss',
      valueType: 'dateTimeRange',
      sorter: true,
    }),
    {
      title: t('apiKeyUsagePage.fields.method'),
      dataIndex: 'method',
      valueType: 'select',
      valueEnum: {
        GET: { text: 'GET' },
        POST: { text: 'POST' },
        PUT: { text: 'PUT' },
        PATCH: { text: 'PATCH' },
        DELETE: { text: 'DELETE' },
      },
    },
    {
      title: t('apiKeyUsagePage.fields.endpoint'),
      dataIndex: 'endpoint',
      ellipsis: true,
    },
    {
      title: t('apiKeyUsagePage.fields.statusCode'),
      dataIndex: 'statusCode',
      valueType: 'digit',
    },
    {
      title: t('common.fields.ip'),
      dataIndex: 'ip',
    },
  ];
}

export function createApiKeyUsageResource(
  t: (key: string, options?: Record<string, any>) => string,
): ResourceContext<ApiKeyUsageRecord, ApiKeyUsageListParamsForResource, any> {
  return {
    name: 'api-key-usage',
    displayName: 'API Key Usage',
    permissions: {
      view: ['API_KEY.VIEW', 'API_KEY.VIEW_ALL'],
      viewAll: 'API_KEY.VIEW_ALL',
    },
    endpoints: {
      // Unified controller prefix: /api-key-usage (mounted under /api)
      list: '/api/api-key-usage',
    },
    dataConfig: {
      idField: 'id',
    },
    uiConfig: {
      columns: createApiKeyUsageColumns(t),
    },
    scope: 'both',
    listService: async (
      params: ApiKeyUsageListParamsForResource,
    ): Promise<{
      docs: ApiKeyUsageRecord[];
      hasNext: boolean;
      nextCursor?: string;
    }> => {
      const { cursor, take, skip, ...rest } = params;
      const currentSkip =
        typeof cursor === 'string' ? Number(cursor) || 0 : skip || 0;

      const response: ApiKeyUsageListResponse = await apiKeyUsageService.list({
        ...rest,
        take,
        skip: currentSkip,
      });

      const nextSkip = currentSkip + take;
      const hasNext = nextSkip < response.count;

      return {
        docs: response.docs,
        hasNext,
        nextCursor: hasNext ? String(nextSkip) : undefined,
      };
    },
  };
}
