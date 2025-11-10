import { get } from '@client/libs/http';
import type { AccountFull } from '@client/types/account';
import type { AccountType } from '@server/generated/prisma/enums';
import type { AccountListResponse } from '@server/src/dto/account.dto';
import { useQuery } from '@tanstack/react-query';

type ListAccountsQuery = {
  type?: AccountType[];
  currencyId?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'balance';
  sortOrder?: 'asc' | 'desc';
};

export const useAccountsQuery = (query: ListAccountsQuery = {}) => {
  return useQuery({
    queryKey: ['accounts', query],
    queryFn: async () => {
      const data = await get<AccountListResponse>('/api/accounts', {
        query,
      });

      return {
        accounts: data.accounts.map((account) => ({
          ...account,
          balance:
            typeof account.balance === 'string'
              ? account.balance
              : (account.balance?.toString() ?? '0'),
          creditLimit:
            typeof account.creditLimit === 'string' ||
            account.creditLimit === null
              ? account.creditLimit
              : (account.creditLimit?.toString() ?? null),
        })) satisfies AccountFull[],
        pagination: data.pagination,
        summary: data.summary || [],
      };
    },
  });
};
