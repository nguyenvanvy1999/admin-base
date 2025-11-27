import { useQuery } from '@tanstack/react-query';
import {
  healthcheckKeys,
  healthcheckService,
} from 'src/services/api/healthcheck.service';

export function useHealthcheck() {
  return useQuery({
    queryKey: healthcheckKeys.all,
    queryFn: () => healthcheckService.get(),
  });
}
