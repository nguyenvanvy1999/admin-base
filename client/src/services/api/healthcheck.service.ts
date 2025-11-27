import { apiClient } from 'src/lib/api/client';
import { createQueryKeys } from 'src/services/api/base.service';

export interface HealthcheckResponse {
  status: string;
  version?: string;
  timestamp: string;
}

export const healthcheckKeys = createQueryKeys('healthcheck');

export const healthcheckService = {
  get: (): Promise<HealthcheckResponse> => {
    return apiClient.get<HealthcheckResponse>('/api/health');
  },
};
