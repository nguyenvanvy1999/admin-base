import type { AccountWhereInput } from '@server/generated/prisma/models/Account';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type {
  IListAccountsQueryDto,
  IUpsertAccountDto,
} from '../dto/account.dto';

export class AccountService {
  private async validateAccountOwnership(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        deletedAt: null,
      },
    });
    if (!account) {
      throw new Error('Account not found');
    }
    return account;
  }

  private async validateCurrency(currencyId: string) {
    const currency = await prisma.currency.findUnique({
      where: { id: currencyId },
    });
    if (!currency) {
      throw new Error('Currency not found');
    }
    return currency;
  }

  async upsertAccount(userId: string, data: IUpsertAccountDto) {
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
      return prisma.account.update({
        where: { id: data.id },
        data: {
          type: data.type,
          name: data.name,
          currencyId: data.currencyId,
          creditLimit: data.creditLimit ?? null,
          notifyOnDueDate: data.notifyOnDueDate ?? null,
          paymentDay: data.paymentDay ?? null,
          notifyDaysBefore: data.notifyDaysBefore ?? null,
          meta: data.meta ?? null,
        },
        include: {
          currency: true,
        },
      });
    } else {
      return prisma.account.create({
        data: {
          type: data.type,
          name: data.name,
          currencyId: data.currencyId,
          creditLimit: data.creditLimit ?? null,
          notifyOnDueDate: data.notifyOnDueDate ?? null,
          paymentDay: data.paymentDay ?? null,
          notifyDaysBefore: data.notifyDaysBefore ?? null,
          meta: data.meta ?? null,
          userId,
          balance: 0,
        },
        include: {
          currency: true,
        },
      });
    }
  }

  async getAccount(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        deletedAt: null,
      },
      include: {
        currency: true,
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  async listAccounts(userId: string, query: IListAccountsQueryDto = {}) {
    const {
      type,
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
      where.type = { in: type };
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
    }

    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          currency: true,
        },
      }),
      prisma.account.count({ where }),
    ]);

    return {
      accounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteAccount(userId: string, accountId: string) {
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
