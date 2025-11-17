import { prisma } from '@server/configs/db';
import type { AccountWhereInput, Prisma } from '@server/generated';
import {
  ACCOUNT_SELECT_FULL,
  ACCOUNT_SELECT_MINIMAL,
} from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

// Define the full entity type based on the select object
type AccountRecord = Prisma.AccountGetPayload<{
  select: typeof ACCOUNT_SELECT_FULL;
}>;

// Define the minimal entity type for specific methods
type AccountMinimalRecord = Prisma.AccountGetPayload<{
  select: typeof ACCOUNT_SELECT_MINIMAL;
}>;

export class AccountRepository extends BaseRepository<
  typeof prisma.account,
  AccountRecord,
  typeof ACCOUNT_SELECT_FULL
> {
  constructor() {
    // Pass the prisma delegate and the default select object to the base class
    super(prisma.account, ACCOUNT_SELECT_FULL);
  }

  // This method is specific because it uses a different (minimal) select object
  findByIdAndUserIdMinimal(
    accountId: string,
    userId: string,
  ): Promise<AccountMinimalRecord | null> {
    return prisma.account.findFirst({
      where: { id: accountId, userId },
      select: ACCOUNT_SELECT_MINIMAL,
    });
  }

  // This method is specific because it uses groupBy, which is not in the base repository
  groupByCurrency(userId: string, where: AccountWhereInput) {
    return prisma.account.groupBy({
      by: ['currencyId'],
      where: {
        ...where,
        userId,
      },
      _sum: {
        balance: true,
      },
    });
  }

  // This method is specific because it uses a different (minimal) select object
  findManyByIdsAndUserIdMinimal(
    ids: string[],
    userId: string,
  ): Promise<AccountMinimalRecord[]> {
    return prisma.account.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: ACCOUNT_SELECT_MINIMAL,
    });
  }
}

export const accountRepository = new AccountRepository();
