import type { FormComponentRef } from '@client/components/FormComponent';
import { tagService } from '@client/services';
import { DeferredPromise } from '@open-draft/deferred-promise';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const filterSchema = z.object({
  search: z.string().optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListTagsQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export const useTagsQuery = (
  queryParams: {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  },
  formRef: React.RefObject<FormComponentRef | null>,
  handleSubmit: (
    onValid: (data: FilterFormValue) => void,
    onInvalid?: (errors: any) => void,
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>,
) => {
  return useQuery({
    queryKey: ['tags', queryParams],
    queryFn: async () => {
      let query: ListTagsQuery = {
        ...queryParams,
      };

      if (formRef.current) {
        const valueDeferred = new DeferredPromise<FilterFormValue>();
        formRef.current.submit(
          handleSubmit(valueDeferred.resolve, valueDeferred.reject),
        );

        const criteria = await valueDeferred;

        query = {
          ...query,
          search: criteria.search?.trim() || undefined,
        };
      }

      return tagService.listTags(query);
    },
  });
};
