import { ServiceBase } from '@client/libs/ServiceBase';
import type { AccountFormData } from '@client/types/account';
import type {
  AccountDeleteResponse,
  AccountListResponse,
  AccountResponse,
} from '@server/dto/account.dto';
import type { AccountType } from '@server/generated/prisma/enums';

export class AccountService extends ServiceBase {
  constructor() {
    super('/api/accounts');
  }

  listAccounts(query?: {
    type?: AccountType[];
    currencyId?: string[];
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'createdAt' | 'balance';
    sortOrder?: 'asc' | 'desc';
  }): Promise<AccountListResponse> {
    return this.get<AccountListResponse>({
      params: query,
    });
  }

  createAccount(data: Omit<AccountFormData, 'id'>): Promise<AccountResponse> {
    return this.post<AccountResponse>(data);
  }

  updateAccount(data: AccountFormData): Promise<AccountResponse> {
    return this.post<AccountResponse>(data);
  }

  deleteAccount(accountId: string): Promise<AccountDeleteResponse> {
    return this.delete<AccountDeleteResponse>({
      endpoint: accountId,
    });
  }
}

export const accountService = new AccountService();
