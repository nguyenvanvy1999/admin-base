import { get } from '@client/libs/http';
import type { AccountListResponse } from '@server/dto/account.dto';
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
      return get<AccountListResponse>('/api/accounts', {
        query,
      });
    },
  });
};
