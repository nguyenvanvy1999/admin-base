import { handleApiError } from '@client/lib/api/errorHandler';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery as useReactQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useAppQuery<TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError>,
): UseQueryResult<TData, TError> {
  const query = useReactQuery<TData, TError>(options);

  useEffect(() => {
    if (query.error) {
      handleApiError(query.error);
    }
  }, [query.error]);

  return query;
}
