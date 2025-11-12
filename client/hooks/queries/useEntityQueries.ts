import type { FormComponentRef } from '@client/components/FormComponent';
import { entityService } from '@client/services';
import { DeferredPromise } from '@open-draft/deferred-promise';
import type { EntityListResponse } from '@server/dto/entity.dto';
import { EntityType } from '@server/generated/prisma/enums';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const filterSchema = z.object({
  search: z.string().optional(),
  type: z.array(z.nativeEnum(EntityType)).optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListEntitiesQuery = {
  type?: EntityType[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'type' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export const useEntitiesQuery = (
  queryParams: {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'type' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  },
  formRef: React.RefObject<FormComponentRef | null>,
  handleSubmit: (
    onValid: (data: FilterFormValue) => void,
    onInvalid?: (errors: any) => void,
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>,
) => {
  return useQuery({
    queryKey: ['entities', queryParams],
    queryFn: async () => {
      let query: ListEntitiesQuery = {
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
          type:
            criteria.type && criteria.type.length > 0
              ? criteria.type
              : undefined,
        };
      }

      return entityService.listEntities(query);
    },
  });
};

export const useEntitiesOptionsQuery = () => {
  return useQuery({
    queryKey: ['entities-options'],
    queryFn: () => {
      return entityService.listEntities({ limit: 1000 });
    },
  });
};
