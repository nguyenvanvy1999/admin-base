import { http } from '@client/lib/http';
import { useQuery } from '@tanstack/react-query';

type HealthcheckResponse = {
  status: string;
  version?: string;
  timestamp: string;
};

export const healthcheckKeys = {
  all: ['healthcheck'] as const,
};

export async function fetchHealthcheck() {
  const response = await http.get<HealthcheckResponse>('/api/health');
  return response.data;
}

export function useHealthcheckQuery() {
  return useQuery({
    queryKey: healthcheckKeys.all,
    queryFn: fetchHealthcheck,
  });
}
