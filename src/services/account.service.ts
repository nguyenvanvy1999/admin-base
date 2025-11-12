import type { Prisma } from '@server/generated/prisma/client';
import type { AccountType } from '@server/generated/prisma/enums';
import type { AccountWhereInput } from '@server/generated/prisma/models/Account';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type {
  AccountDeleteResponse,
  AccountListResponse,
  AccountResponse,
  IListAccountsQueryDto,
  IUpsertAccountDto,
} from '../dto/account.dto';
import {
  dateToIsoString,
  decimalToNullableString,
  decimalToString,
} from '../utils/formatters';
import { CURRENCY_SELECT_BASIC } from './selects';

const ACCOUNT_SELECT_FULL = {
  id: true,
  type: true,
  name: true,
  currencyId: true,
  balance: true,
  creditLimit: true,
  notifyOnDueDate: true,
  paymentDay: true,
  notifyDaysBefore: true,
  meta: true,
  createdAt: true,
  updatedAt: true,
  currency: {
    select: CURRENCY_SELECT_BASIC,
  },
} as const;

const ACCOUNT_SELECT_MINIMAL = {
  id: true,
} as const;

type AccountRecord = Prisma.AccountGetPayload<{
  select: typeof ACCOUNT_SELECT_FULL;
}>;

const formatAccount = (account: AccountRecord): AccountResponse => {
  return {
    id: account.id,
    type: account.type,
    name: account.name,
    currencyId: account.currencyId,
    balance: decimalToString(account.balance),
    creditLimit: decimalToNullableString(account.creditLimit),
    notifyOnDueDate: account.notifyOnDueDate ?? null,
    paymentDay: account.paymentDay ?? null,
    notifyDaysBefore: account.notifyDaysBefore ?? null,
    meta: account.meta ?? null,
    createdAt: dateToIsoString(account.createdAt),
    updatedAt: dateToIsoString(account.updatedAt),
    currency: account.currency,
  };
};

export class AccountService {
  private async validateAccountOwnership(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        deletedAt: null,
      },
      select: ACCOUNT_SELECT_MINIMAL,
    });
    if (!account) {
      throw new Error('Account not found');
    }
    return account;
  }

  private async validateCurrency(currencyId: string) {
    const count = await prisma.currency.count({
      where: { id: currencyId },
    });
    if (count === 0) {
      throw new Error('Currency not found');
    }
  }

  async upsertAccount(
    userId: string,
    data: IUpsertAccountDto,
  ): Promise<AccountResponse> {
    await this.validateCurrency(data.currencyId);

    if (data.id) {
      await this.validateAccountOwnership(userId, data.id);
    }

    if (
      data.paymentDay !== undefined &&
      (data.paymentDay < 1 || data.paymentDay > 31)
    ) {
      throw new Error('Payment day must be between 1 and 31');
    }

    if (data.notifyDaysBefore !== undefined && data.notifyDaysBefore < 0) {
      throw new Error('Notify days before must be greater than or equal to 0');
    }

    if (data.id) {
      const account = await prisma.account.update({
        where: { id: data.id },
        data: {
          type: data.type as AccountType,
          name: data.name,
          currencyId: data.currencyId,
          creditLimit: data.creditLimit ?? null,
          notifyOnDueDate: data.notifyOnDueDate ?? null,
          paymentDay: data.paymentDay ?? null,
          notifyDaysBefore: data.notifyDaysBefore ?? null,
          meta: (data.meta ?? null) as any,
        },
        select: ACCOUNT_SELECT_FULL,
      });
      return formatAccount(account);
    } else {
      const account = await prisma.account.create({
        data: {
          type: data.type as AccountType,
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
        select: ACCOUNT_SELECT_FULL,
      });
      return formatAccount(account);
    }
  }

  async getAccount(
    userId: string,
    accountId: string,
  ): Promise<AccountResponse> {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        deletedAt: null,
      },
      select: ACCOUNT_SELECT_FULL,
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return formatAccount(account);
  }

  async listAccounts(
    userId: string,
    query: IListAccountsQueryDto = {},
  ): Promise<AccountListResponse> {
    const {
      type,
      currencyId,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: AccountWhereInput = {
      userId,
      deletedAt: null,
    };

    if (type && type.length > 0) {
      where.type = { in: type as AccountType[] };
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

    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'balance') {
      orderBy.balance = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [accounts, total, summaryGroups] = await Promise.all([
      prisma.account.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: ACCOUNT_SELECT_FULL,
      }),
      prisma.account.count({ where }),
      prisma.account.groupBy({
        by: ['currencyId'],
        where,
        _sum: {
          balance: true,
        },
      }),
    ]);

    const currencyIds = [...new Set(summaryGroups.map((g) => g.currencyId))];

    const currencies = await prisma.currency.findMany({
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

  async deleteAccount(
    userId: string,
    accountId: string,
  ): Promise<AccountDeleteResponse> {
    await this.validateAccountOwnership(userId, accountId);

    await prisma.account.update({
      where: { id: accountId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Account deleted successfully' };
  }
}

export default new Elysia().decorate('accountService', new AccountService());
