import type { FormComponentRef } from '@client/components/FormComponent';
import { transactionService } from '@client/services';
import { DeferredPromise } from '@open-draft/deferred-promise';
import { TransactionType } from '@server/generated/prisma/enums';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const filterSchema = z.object({
  search: z.string().optional(),
  types: z.array(z.enum(TransactionType)).optional(),
  accountIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  entityIds: z.array(z.string()).optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

type ListTransactionsQuery = {
  types?: TransactionType[];
  accountIds?: string[];
  categoryIds?: string[];
  entityIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'type' | 'accountId';
  sortOrder?: 'asc' | 'desc';
};

export const useTransactionsQuery = (
  queryParams: {
    page?: number;
    limit?: number;
    sortBy?: 'date' | 'amount' | 'type' | 'accountId';
    sortOrder?: 'asc' | 'desc';
  },
  formRef: React.RefObject<FormComponentRef | null>,
  handleSubmit: (
    onValid: (data: FilterFormValue) => void,
    onInvalid?: (errors: any) => void,
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>,
) => {
  return useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: async () => {
      let query: ListTransactionsQuery = {
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
          types:
            criteria.types && criteria.types.length > 0
              ? (criteria.types as TransactionType[])
              : undefined,
          accountIds:
            criteria.accountIds && criteria.accountIds.length > 0
              ? criteria.accountIds
              : undefined,
          categoryIds:
            criteria.categoryIds && criteria.categoryIds.length > 0
              ? criteria.categoryIds
              : undefined,
          entityIds:
            criteria.entityIds && criteria.entityIds.length > 0
              ? criteria.entityIds
              : undefined,
        };
      }

      return transactionService.listTransactions(query);
    },
  });
};
