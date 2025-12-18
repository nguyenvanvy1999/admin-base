import { useQuery } from '@tanstack/react-query';
import { apiKeyUsageService } from 'src/services/api/api-key-usage.service';
import type {
  ApiKeyUsageStatsQueryDto,
  ApiKeyUsageStatsResponseDto,
} from 'src/types/api-key-usage';

const apiKeyUsageStatsKey = (params: ApiKeyUsageStatsQueryDto) =>
  ['api-key-usage-stats', params] as const;

export function useApiKeyUsageStats(
  params: ApiKeyUsageStatsQueryDto,
  enabled = true,
) {
  return useQuery<ApiKeyUsageStatsResponseDto>({
    queryKey: apiKeyUsageStatsKey(params),
    queryFn: () => apiKeyUsageService.getStats(params),
    enabled,
  });
}
