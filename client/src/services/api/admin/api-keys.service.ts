import { apiClient } from 'src/lib/api/client';
import type {
  AdminApiKeyActionResponse,
  AdminApiKeyCreatePayload,
  AdminApiKeyCreateResponse,
  AdminApiKeyDetail,
  AdminApiKeyListQuery,
  AdminApiKeyListResponse,
  AdminApiKeyUpdatePayload,
  AdminApiKeyUsageListQuery,
  AdminApiKeyUsageListResponse,
  AdminApiKeyUsageStatsResponse,
} from 'src/types/admin-api-keys';
import { createAdminService } from './createAdminService';

const ADMIN_API_KEY_BASE_PATH = '/api/admin/api-keys';
const ADMIN_API_KEY_USAGE_BASE_PATH = '/api/admin/api-key-usage';

const { queryKeys: adminApiKeyQueryKeys, service: baseService } =
  createAdminService<
    AdminApiKeyListQuery,
    AdminApiKeyDetail,
    AdminApiKeyListResponse,
    AdminApiKeyCreatePayload,
    AdminApiKeyUpdatePayload
  >({
    basePath: ADMIN_API_KEY_BASE_PATH,
    queryKey: 'admin-api-keys',
    list: (params?: AdminApiKeyListQuery): Promise<AdminApiKeyListResponse> => {
      let normalizedParams: Omit<AdminApiKeyListQuery, 'statuses'> | undefined =
        params;

      if (params) {
        normalizedParams = {
          ...params,
          ...(params.statuses?.length
            ? { statuses: params.statuses.join(',') as unknown as never }
            : { statuses: undefined }),
        };
      }

      return apiClient.get<AdminApiKeyListResponse>(ADMIN_API_KEY_BASE_PATH, {
        params: normalizedParams,
      });
    },
    create: (payload: AdminApiKeyCreatePayload): Promise<void> => {
      return apiClient.post<AdminApiKeyActionResponse>(
        ADMIN_API_KEY_BASE_PATH,
        payload,
      ) as unknown as Promise<void>;
    },
    update: (id: string, payload: AdminApiKeyUpdatePayload): Promise<void> => {
      return apiClient.post<AdminApiKeyActionResponse>(
        `${ADMIN_API_KEY_BASE_PATH}/${id}`,
        payload,
      ) as unknown as Promise<void>;
    },
    delete: (ids: string[]): Promise<void> => {
      return apiClient.post<AdminApiKeyActionResponse>(
        `${ADMIN_API_KEY_BASE_PATH}/del`,
        { ids },
      ) as unknown as Promise<void>;
    },
  });

export const adminApiKeyKeys = {
  ...adminApiKeyQueryKeys,
  usage: {
    lists: () => ['admin-api-key-usage', 'list'] as const,
    list: (filters?: Partial<AdminApiKeyUsageListQuery>) =>
      [['admin-api-key-usage', 'list'], filters] as const,
    stats: (apiKeyId: string) =>
      ['admin-api-key-usage', 'stats', apiKeyId] as const,
  },
};

export const adminApiKeyService = {
  ...baseService,

  /**
   * Tạo API key mới
   * @param payload Dữ liệu tạo API key
   * @returns Response với full key (chỉ hiển thị một lần)
   */
  createWithKey(
    payload: AdminApiKeyCreatePayload,
  ): Promise<AdminApiKeyCreateResponse> {
    return apiClient.post<AdminApiKeyCreateResponse>(
      ADMIN_API_KEY_BASE_PATH,
      payload,
    );
  },

  /**
   * Lấy danh sách API key usage
   * @param params Query parameters
   * @returns Danh sách usage records
   */
  listUsage(
    params: AdminApiKeyUsageListQuery,
  ): Promise<AdminApiKeyUsageListResponse> {
    return apiClient.get<AdminApiKeyUsageListResponse>(
      ADMIN_API_KEY_USAGE_BASE_PATH,
      {
        params,
      },
    );
  },

  /**
   * Lấy thống kê sử dụng API key
   * @param apiKeyId ID của API key
   * @returns Thống kê sử dụng
   */
  getUsageStats(apiKeyId: string): Promise<AdminApiKeyUsageStatsResponse> {
    return apiClient.get<AdminApiKeyUsageStatsResponse>(
      `${ADMIN_API_KEY_USAGE_BASE_PATH}/stats`,
      {
        params: { apiKeyId },
      },
    );
  },

  /**
   * Revoke API key
   * @param id ID của API key
   * @returns Response
   */
  revoke(id: string): Promise<AdminApiKeyActionResponse> {
    return apiClient.post<AdminApiKeyActionResponse>(
      `${ADMIN_API_KEY_BASE_PATH}/${id}/revoke`,
    );
  },

  /**
   * Regenerate API key
   * @param id ID của API key
   * @returns Response với key mới
   */
  regenerate(id: string): Promise<AdminApiKeyCreateResponse> {
    return apiClient.post<AdminApiKeyCreateResponse>(
      `${ADMIN_API_KEY_BASE_PATH}/${id}/regenerate`,
    );
  },
};
