import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { ActionRes } from '@server/dto/common.dto';
import type {
  AccountOrderByWithRelationInput,
  AccountWhereInput,
  Prisma,
} from '@server/generated';
import {
  DB_PREFIX,
  dateToIsoString,
  decimalToNullableString,
  decimalToString,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
} from '@server/share';
import type {
  AccountListResponse,
  AccountResponse,
  IListAccountsQueryDto,
  IUpsertAccountDto,
} from '../dto/account.dto';
import {
  ACCOUNT_SELECT_FULL,
  ACCOUNT_SELECT_MINIMAL,
  CURRENCY_SELECT_BASIC,
} from './selects';

type AccountRecord = Prisma.AccountGetPayload<{
  select: typeof ACCOUNT_SELECT_FULL;
}>;

const formatAccount = (account: AccountRecord): AccountResponse => ({
  ...account,
  balance: decimalToString(account.balance),
  creditLimit: decimalToNullableString(account.creditLimit),
  notifyOnDueDate: account.notifyOnDueDate ?? null,
  paymentDay: account.paymentDay ?? null,
  notifyDaysBefore: account.notifyDaysBefore ?? null,
  meta: account.meta ?? null,
  created: dateToIsoString(account.created),
  modified: dateToIsoString(account.modified),
});

export class AccountService {
  constructor(
    private readonly deps: { db: IDb; idUtil: IdUtil } = { db: prisma, idUtil },
  ) {}

  private async validateAccountOwnership(userId: string, accountId: string) {
    const account = await this.deps.db.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: ACCOUNT_SELECT_MINIMAL,
    });
    if (!account) {
      throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
    }
    return account;
  }

  private async validateCurrency(currencyId: string) {
    const count = await this.deps.db.currency.count({
      where: { id: currencyId },
    });
    if (count === 0) {
      throwAppError(ErrorCode.CURRENCY_NOT_FOUND, 'Currency not found');
    }
  }

  async upsertAccount(
    userId: string,
    data: IUpsertAccountDto,
  ): Promise<ActionRes> {
    await this.validateCurrency(data.currencyId);

    if (data.id) {
      await this.validateAccountOwnership(userId, data.id);
    }

    if (
      data.paymentDay !== undefined &&
      (data.paymentDay < 1 || data.paymentDay > 31)
    ) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Payment day must be between 1 and 31',
      );
    }

    if (data.notifyDaysBefore !== undefined && data.notifyDaysBefore < 0) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Notify days before must be greater than or equal to 0',
      );
    }

    if (data.id) {
      await this.deps.db.account.update({
        where: { id: data.id },
        data: {
          type: data.type,
          name: data.name,
          currencyId: data.currencyId,
          creditLimit: data.creditLimit ?? null,
          notifyOnDueDate: data.notifyOnDueDate ?? null,
          paymentDay: data.paymentDay ?? null,
          notifyDaysBefore: data.notifyDaysBefore ?? null,
          meta: (data.meta ?? null) as any,
        },
        select: ACCOUNT_SELECT_MINIMAL,
      });
      return { success: true, message: 'Account updated successfully' };
    } else {
      await this.deps.db.account.create({
        data: {
          id: this.deps.idUtil.dbId(DB_PREFIX.ACCOUNT),
          type: data.type,
          name: data.name,
          currencyId: data.currencyId,
          creditLimit: data.creditLimit ?? null,
          notifyOnDueDate: data.notifyOnDueDate ?? null,
          paymentDay: data.paymentDay ?? null,
          notifyDaysBefore: data.notifyDaysBefore ?? null,
          meta: (data.meta ?? null) as any,
          userId,
          balance: data.initialBalance ?? 0,
        },
        select: ACCOUNT_SELECT_MINIMAL,
      });
      return { success: true, message: 'Account created successfully' };
    }
  }

  async getAccount(
    userId: string,
    accountId: string,
  ): Promise<AccountResponse> {
    const account = await this.deps.db.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: ACCOUNT_SELECT_FULL,
    });

    if (!account) {
      throwAppError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
    }

    return formatAccount(account);
  }

  async listAccounts(
    userId: string,
    query: IListAccountsQueryDto,
  ): Promise<AccountListResponse> {
    const {
      type,
      currencyId,
      search,
      page,
      limit,
      sortBy = 'created',
      sortOrder = 'desc',
    } = query;

    const where: AccountWhereInput = {
      userId,
    };

    if (type && type.length > 0) {
      where.type = { in: type };
    }

    if (currencyId && currencyId.length > 0) {
      where.currencyId = { in: currencyId };
    }

    if (search && search.trim()) {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const orderBy: AccountOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'created') {
      orderBy.created = sortOrder;
    } else if (sortBy === 'balance') {
      orderBy.balance = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [accounts, total, summaryGroups] = await Promise.all([
      this.deps.db.account.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: ACCOUNT_SELECT_FULL,
      }),
      this.deps.db.account.count({ where }),
      this.deps.db.account.groupBy({
        by: ['currencyId'],
        where,
        _sum: {
          balance: true,
        },
      }),
    ]);

    const currencyIds = [...new Set(summaryGroups.map((g) => g.currencyId))];

    const currencies = await this.deps.db.currency.findMany({
      where: {
        id: { in: currencyIds },
      },
      select: CURRENCY_SELECT_BASIC,
    });

    const currencyMap = new Map(currencies.map((c) => [c.id, c]));

    const summary = summaryGroups
      .map((group) => {
        const currency = currencyMap.get(group.currencyId);
        if (!currency) return null;

        return {
          currency,
          totalBalance: group._sum.balance?.toNumber() ?? 0,
        };
      })
      .filter(
        (
          item,
        ): item is { currency: (typeof currencies)[0]; totalBalance: number } =>
          item !== null,
      );

    return {
      accounts: accounts.map(formatAccount),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  async deleteAccount(userId: string, accountId: string): Promise<ActionRes> {
    await this.validateAccountOwnership(userId, accountId);

    await this.deps.db.account.delete({
      where: { id: accountId },
    });

    return { success: true, message: 'Account deleted successfully' };
  }

  async deleteManyAccounts(userId: string, ids: string[]): Promise<ActionRes> {
    const accounts = await this.deps.db.account.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: ACCOUNT_SELECT_MINIMAL,
    });

    if (accounts.length !== ids.length) {
      throwAppError(
        ErrorCode.ACCOUNT_NOT_FOUND,
        'Some accounts were not found or do not belong to you',
      );
    }

    await this.deps.db.account.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    return {
      success: true,
      message: `${ids.length} account(s) deleted successfully`,
    };
  }
}

export const accountService = new AccountService();
