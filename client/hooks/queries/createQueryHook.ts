import type { FormComponentRef } from '@client/components/FormComponent';
import { DeferredPromise } from '@open-draft/deferred-promise';
import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import type { z } from 'zod';

type FilterTransformer<TFilterValue, TQuery> = (
  filterValue: TFilterValue,
  query: TQuery,
) => TQuery;

type CreateQueryHookOptions<
  TFilterValue,
  TQueryParams,
  TQuery extends TQueryParams,
  TResponse,
> = {
  queryKey: string | string[];
  serviceMethod: (query: TQuery) => Promise<TResponse>;
  filterTransformer: FilterTransformer<TFilterValue, TQueryParams>;
  defaultQuery?: Partial<TQueryParams>;
};

export function createQueryHook<
  TFilterSchema extends z.ZodType<any, any, any>,
  TFilterValue extends z.infer<TFilterSchema>,
  TQueryParams extends Record<string, any>,
  TQuery extends TQueryParams,
  TResponse,
>({
  queryKey,
  serviceMethod,
  filterTransformer,
  defaultQuery = {},
}: CreateQueryHookOptions<TFilterValue, TQueryParams, TQuery, TResponse>) {
  return (
    queryParams: TQueryParams,
    formRef: React.RefObject<FormComponentRef | null>,
    handleSubmit: (
      onValid: (data: TFilterValue) => void,
      onInvalid?: (errors: any) => void,
    ) => (e?: React.BaseSyntheticEvent) => Promise<void>,
    options?: Omit<UseQueryOptions<TResponse, Error>, 'queryKey' | 'queryFn'>,
  ) => {
    const queryKeys = Array.isArray(queryKey) ? queryKey : [queryKey];

    return useQuery({
      queryKey: [...queryKeys, queryParams],
      queryFn: async () => {
        let query: TQuery = {
          ...defaultQuery,
          ...queryParams,
        } as TQuery;

        if (formRef.current) {
          const valueDeferred = new DeferredPromise<TFilterValue>();
          formRef.current.submit(
            handleSubmit(valueDeferred.resolve, valueDeferred.reject),
          );

          try {
            const criteria = await valueDeferred;
            query = filterTransformer(criteria, query) as TQuery;
          } catch {
            /* validation failed */
          }
        }

        return serviceMethod(query);
      },
      ...options,
    });
  };
}
