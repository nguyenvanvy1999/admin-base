import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  AccountListResponse,
  AccountResponse,
  ActionRes,
  IUpsertAccountDto,
} from '@server/dto/account.dto';
import type { AccountType } from '@server/generated';

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
    sortBy?: 'name' | 'created' | 'balance';
    sortOrder?: 'asc' | 'desc';
  }): Promise<AccountListResponse> {
    return this.get<AccountListResponse>({
      params: query,
    });
  }

  createAccount(data: Omit<IUpsertAccountDto, 'id'>): Promise<AccountResponse> {
    return this.post<AccountResponse>(data);
  }

  updateAccount(data: IUpsertAccountDto): Promise<AccountResponse> {
    return this.post<AccountResponse>(data);
  }

  deleteAccount(accountId: string): Promise<ActionRes> {
    return this.delete<ActionRes>({
      endpoint: accountId,
    });
  }
}

export const accountService = new AccountService();
