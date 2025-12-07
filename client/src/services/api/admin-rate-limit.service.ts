import { apiClient } from 'src/lib/api/client';
import type {
  AdminRateLimitListParams,
  AdminRateLimitListResponse,
  BlockRateLimitParams,
  UnblockRateLimitParams,
} from 'src/types/admin-rate-limit';

const ADMIN_RATE_LIMIT_BASE_PATH = '/api/admin/rate-limits';

export const adminRateLimitService = {
  list(params: AdminRateLimitListParams): Promise<AdminRateLimitListResponse> {
    return apiClient.get<AdminRateLimitListResponse>(
      ADMIN_RATE_LIMIT_BASE_PATH,
      {
        params,
      },
    );
  },

  block(params: BlockRateLimitParams): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `${ADMIN_RATE_LIMIT_BASE_PATH}/block`,
      params,
    );
  },

  unblock(params: UnblockRateLimitParams): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(
      `${ADMIN_RATE_LIMIT_BASE_PATH}/unblock`,
      params,
    );
  },

  cleanup(): Promise<{ count: number }> {
    return apiClient.post<{ count: number }>(
      `${ADMIN_RATE_LIMIT_BASE_PATH}/cleanup`,
    );
  },
};
