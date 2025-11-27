import { handleApiError } from '@client/lib/api/errorHandler';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery as useReactQuery } from '@tanstack/react-query';

/**
 * Enhanced useQuery hook with standardized error handling
 */
export function useAppQuery<TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError>,
): UseQueryResult<TData, TError> {
  const query = useReactQuery<TData, TError>({
    ...options,
    onError: (error) => {
      // Handle error with notification
      handleApiError(error);
      // Call custom onError if provided
      options.onError?.(error);
    },
  });

  return query;
}
