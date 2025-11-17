import { accountService } from '@client/services';
import { AccountType } from '@server/generated';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { createQueryHook } from './createQueryHook';

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
  sortBy?: 'name' | 'created' | 'balance';
  sortOrder?: 'asc' | 'desc';
};

export const useAccountsQuery = createQueryHook<
  typeof filterSchema,
  FilterFormValue,
  {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'created' | 'balance';
    sortOrder?: 'asc' | 'desc';
  },
  ListAccountsQuery,
  any
>({
  queryKey: 'accounts',
  serviceMethod: (query) => accountService.listAccounts(query),
  filterTransformer: (criteria, query) => ({
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
  }),
});

export const useAccountsOptionsQuery = () => {
  return useQuery({
    queryKey: ['accounts-options'],
    queryFn: () => {
      return accountService.listAccounts({ limit: 1000 });
    },
  });
};
