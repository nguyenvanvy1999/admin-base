import { apiClient } from 'src/lib/api/client';
import type {
  UserApiKeyActionResponse,
  UserApiKeyCreatePayload,
  UserApiKeyCreateResponse,
  UserApiKeyDetail,
  UserApiKeyListQuery,
  UserApiKeyListResponse,
  UserApiKeyUpdatePayload,
} from 'src/types/admin-api-keys';
import { createQueryKeys } from './base.service';

const USER_API_KEY_BASE_PATH = '/api/api-keys';

const queryKeys = {
  ...createQueryKeys('api-keys'),
  list: (filters?: Partial<UserApiKeyListQuery>) =>
    [...createQueryKeys('api-keys').lists(), filters] as const,
  detail: (id: string) =>
    [...createQueryKeys('api-keys').details(), id] as const,
};

export const apiKeyKeys = queryKeys;

export const apiKeyService = {
  /**
   * Lấy danh sách API keys của user hiện tại
   * @param params Query parameters
   * @returns Danh sách API keys
   */
  list(params?: UserApiKeyListQuery): Promise<UserApiKeyListResponse> {
    let normalizedParams: Omit<UserApiKeyListQuery, 'statuses'> | undefined =
      params;

    if (params) {
      normalizedParams = {
        ...params,
        ...(params.statuses?.length
          ? { statuses: params.statuses.join(',') as unknown as never }
          : { statuses: undefined }),
      };
    }

    return apiClient.get<UserApiKeyListResponse>(USER_API_KEY_BASE_PATH, {
      params: normalizedParams,
    });
  },

  /**
   * Lấy chi tiết một API key
   * @param id ID của API key
   * @returns Chi tiết API key
   */
  detail(id: string): Promise<UserApiKeyDetail> {
    return apiClient.get<UserApiKeyDetail>(`${USER_API_KEY_BASE_PATH}/${id}`);
  },

  /**
   * Tạo API key mới
   * @param payload Dữ liệu tạo API key
   * @returns Response với full key (chỉ hiển thị một lần)
   */
  create(payload: UserApiKeyCreatePayload): Promise<UserApiKeyCreateResponse> {
    return apiClient.post<UserApiKeyCreateResponse>(
      USER_API_KEY_BASE_PATH,
      payload,
    );
  },

  /**
   * Cập nhật API key
   * @param id ID của API key
   * @param payload Dữ liệu cập nhật
   * @returns Response
   */
  update(
    id: string,
    payload: UserApiKeyUpdatePayload,
  ): Promise<UserApiKeyActionResponse> {
    return apiClient.post<UserApiKeyActionResponse>(
      `${USER_API_KEY_BASE_PATH}/${id}`,
      payload,
    );
  },

  /**
   * Xóa API key
   * @param ids Danh sách ID API keys cần xóa
   * @returns Response
   */
  delete(ids: string[]): Promise<UserApiKeyActionResponse> {
    return apiClient.post<UserApiKeyActionResponse>(
      `${USER_API_KEY_BASE_PATH}/del`,
      { ids },
    );
  },

  /**
   * Revoke API key
   * @param id ID của API key
   * @returns Response
   */
  revoke(id: string): Promise<UserApiKeyActionResponse> {
    return apiClient.post<UserApiKeyActionResponse>(
      `${USER_API_KEY_BASE_PATH}/${id}/revoke`,
    );
  },

  /**
   * Regenerate API key
   * @param id ID của API key
   * @returns Response với key mới
   */
  regenerate(id: string): Promise<UserApiKeyCreateResponse> {
    return apiClient.post<UserApiKeyCreateResponse>(
      `${USER_API_KEY_BASE_PATH}/${id}/regenerate`,
    );
  },
};
