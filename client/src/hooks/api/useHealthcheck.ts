import {
  healthcheckKeys,
  healthcheckService,
} from '@client/services/api/healthcheck.service';
import { useQuery } from '@tanstack/react-query';

export function useHealthcheck() {
  return useQuery({
    queryKey: healthcheckKeys.all,
    queryFn: () => healthcheckService.get(),
  });
}
