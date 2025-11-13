import type { FormComponentRef } from '@client/components/FormComponent';
import { accountService } from '@client/services';
import { DeferredPromise } from '@open-draft/deferred-promise';
import { AccountType } from '@server/generated/prisma/enums';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const filterSchema = z.object({
  search: z.string().optional(),
  type: z.array(z.enum(AccountType)).optional(),
  currencyId: z.array(z.string()).optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListAccountsQuery = {
  type?: AccountType[];
  currencyId?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'balance';
  sortOrder?: 'asc' | 'desc';
};

export const useAccountsQuery = (
  queryParams: {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'createdAt' | 'balance';
    sortOrder?: 'asc' | 'desc';
  },
  formRef: React.RefObject<FormComponentRef | null>,
  handleSubmit: (
    onValid: (data: FilterFormValue) => void,
    onInvalid?: (errors: any) => void,
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>,
) => {
  return useQuery({
    queryKey: ['accounts', queryParams],
    queryFn: async () => {
      let query: ListAccountsQuery = {
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
              ? (criteria.type as AccountType[])
              : undefined,
          currencyId:
            criteria.currencyId && criteria.currencyId.length > 0
              ? criteria.currencyId
              : undefined,
        };
      }

      return accountService.listAccounts(query);
    },
  });
};

export const useAccountsOptionsQuery = () => {
  return useQuery({
    queryKey: ['accounts-options'],
    queryFn: () => {
      return accountService.listAccounts({ limit: 1000 });
    },
  });
};
