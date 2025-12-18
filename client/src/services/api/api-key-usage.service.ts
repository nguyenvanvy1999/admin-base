import { apiClient } from 'src/lib/api/client';
import type {
  ApiKeyUsageListParams,
  ApiKeyUsageListResponse,
  ApiKeyUsageStatsQueryDto,
  ApiKeyUsageStatsResponseDto,
} from 'src/types/api-key-usage';

// Unified controller prefix: /api-key-usage (mounted under /api)
const API_KEY_USAGE_BASE_PATH = '/api/api-key-usage';

export const apiKeyUsageService = {
  list(params: ApiKeyUsageListParams): Promise<ApiKeyUsageListResponse> {
    return apiClient.get<ApiKeyUsageListResponse>(API_KEY_USAGE_BASE_PATH, {
      params,
    });
  },

  getStats(
    params: ApiKeyUsageStatsQueryDto,
  ): Promise<ApiKeyUsageStatsResponseDto> {
    return apiClient.get<ApiKeyUsageStatsResponseDto>(
      `${API_KEY_USAGE_BASE_PATH}/stats`,
      {
        params,
      },
    );
  },
};
