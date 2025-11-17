import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type {
  AccountOrderByWithRelationInput,
  AccountWhereInput,
} from '@server/generated';
import {
  ACCOUNT_SELECT_FULL,
  ACCOUNT_SELECT_MINIMAL,
} from '@server/services/selects';
import { BaseRepository } from './base/base.repository';

export class AccountRepository extends BaseRepository {
  constructor(db: IDb = prisma) {
    super(db);
  }

  async findByIdAndUserId(accountId: string, userId: string) {
    return this.db.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: ACCOUNT_SELECT_FULL,
    });
  }

  async findByIdAndUserIdMinimal(accountId: string, userId: string) {
    return this.db.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: ACCOUNT_SELECT_MINIMAL,
    });
  }

  async findManyByUserId(
    userId: string,
    where: AccountWhereInput,
    orderBy: AccountOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    return this.db.account.findMany({
      where: {
        ...where,
        userId,
      },
      orderBy,
      skip,
      take,
      select: ACCOUNT_SELECT_FULL,
    });
  }

  async countByUserId(userId: string, where: AccountWhereInput) {
    return this.db.account.count({
      where: {
        ...where,
        userId,
      },
    });
  }

  async groupByCurrency(userId: string, where: AccountWhereInput) {
    return this.db.account.groupBy({
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

  async findManyByIdsAndUserId(ids: string[], userId: string) {
    return this.db.account.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: ACCOUNT_SELECT_MINIMAL,
    });
  }
}

export const accountRepository = new AccountRepository();
