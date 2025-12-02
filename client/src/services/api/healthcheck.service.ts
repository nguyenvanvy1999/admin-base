import { apiClient } from 'src/lib/api/client';
import { createQueryKeys } from 'src/services/api/base.service';

export type HealthcheckState = 'ok' | 'error';

export interface HealthcheckComponentStatus {
  status: HealthcheckState;
  error?: unknown;
  [key: string]: unknown;
}

export interface HealthcheckResponse {
  status: HealthcheckState;
  details?: {
    memory?: HealthcheckComponentStatus;
    redis?: HealthcheckComponentStatus;
    db?: HealthcheckComponentStatus;
    disk?: HealthcheckComponentStatus;
  } | null;
  error?: unknown;
}

export const healthcheckKeys = createQueryKeys('healthcheck');

export const healthcheckService = {
  get: (): Promise<HealthcheckResponse> => {
    return apiClient.get<HealthcheckResponse>('/api/misc/health');
  },
};
