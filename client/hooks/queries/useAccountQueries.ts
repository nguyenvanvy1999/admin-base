import { accountService } from '@client/services';
import type { AccountType } from '@server/generated/prisma/enums';
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
    queryFn: () => {
      return accountService.listAccounts(query);
    },
  });
};
