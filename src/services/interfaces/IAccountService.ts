import type {
  AccountListResponse,
  AccountResponse,
  IListAccountsQueryDto,
  IUpsertAccountDto,
} from '@server/dto/account.dto';
import type { ActionRes } from '@server/dto/common.dto';

export interface IAccountService {
  upsertAccount(userId: string, data: IUpsertAccountDto): Promise<ActionRes>;
  getAccount(userId: string, accountId: string): Promise<AccountResponse>;
  listAccounts(
    userId: string,
    query: IListAccountsQueryDto,
  ): Promise<AccountListResponse>;
  deleteAccount(userId: string, accountId: string): Promise<ActionRes>;
  deleteManyAccounts(userId: string, ids: string[]): Promise<ActionRes>;
}
