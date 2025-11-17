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
  ERROR_MESSAGES,
  ErrorCode,
  type IdUtil,
  idUtil,
  throwAppError,
  VALIDATION,
} from '@server/share';
import type { AccountMeta } from '@server/share/types/metadata';
import type {
  AccountListResponse,
  AccountResponse,
  IListAccountsQueryDto,
  IUpsertAccountDto,
} from '../dto/account.dto';
import {
  type AccountRepository,
  accountRepository,
} from '../repositories/account.repository';
import { type CacheService, cacheService } from './base/cache.service';
import {
  type OwnershipValidatorService,
  ownershipValidatorService,
} from './base/ownership-validator.service';
import type { IAccountService } from './interfaces/IAccountService';
import {
  type ACCOUNT_SELECT_FULL,
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

export class AccountService implements IAccountService {
  constructor(
    private readonly deps: {
      db: IDb;
      idUtil: IdUtil;
      ownershipValidator: OwnershipValidatorService;
      accountRepository: AccountRepository;
      cache: CacheService;
    } = {
      db: prisma,
      idUtil,
      ownershipValidator: ownershipValidatorService,
      accountRepository: accountRepository,
      cache: cacheService,
    },
  ) {}

  private async validateAccountOwnership(userId: string, accountId: string) {
    return this.deps.ownershipValidator.validateAccountOwnership(
      userId,
      accountId,
      ACCOUNT_SELECT_MINIMAL,
    );
  }

  private async validateCurrency(currencyId: string) {
    const cacheKey = `currency:${currencyId}`;
    const cached = this.deps.cache.get<boolean>(cacheKey);
    if (cached === true) {
      return;
    }

    const count = await this.deps.db.currency.count({
      where: { id: currencyId },
    });
    if (count === 0) {
      throwAppError(
        ErrorCode.CURRENCY_NOT_FOUND,
        ERROR_MESSAGES.CURRENCY_NOT_FOUND,
      );
    }

    this.deps.cache.set(cacheKey, true, 60 * 60 * 1000);
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
      (data.paymentDay < VALIDATION.PAYMENT_DAY.MIN ||
        data.paymentDay > VALIDATION.PAYMENT_DAY.MAX)
    ) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        ERROR_MESSAGES.PAYMENT_DAY_RANGE,
      );
    }

    if (
      data.notifyDaysBefore !== undefined &&
      data.notifyDaysBefore < VALIDATION.NOTIFY_DAYS_BEFORE.MIN
    ) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        ERROR_MESSAGES.NOTIFY_DAYS_BEFORE_MIN,
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
          meta: (data.meta ?? null) as AccountMeta,
        },
        select: ACCOUNT_SELECT_MINIMAL,
      });
      return { success: true, message: ERROR_MESSAGES.ACCOUNT_UPDATED };
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
          meta: (data.meta ?? null) as AccountMeta,
          userId,
          balance: data.initialBalance ?? 0,
        },
        select: ACCOUNT_SELECT_MINIMAL,
      });
      return { success: true, message: ERROR_MESSAGES.ACCOUNT_CREATED };
    }
  }

  async getAccount(
    userId: string,
    accountId: string,
  ): Promise<AccountResponse> {
    const account = await this.deps.accountRepository.findByIdAndUserId(
      accountId,
      userId,
    );

    if (!account) {
      throwAppError(
        ErrorCode.ACCOUNT_NOT_FOUND,
        ERROR_MESSAGES.ACCOUNT_NOT_FOUND,
      );
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
      this.deps.accountRepository.findManyByUserId(
        userId,
        where,
        orderBy,
        skip,
        limit,
      ),
      this.deps.accountRepository.countByUserId(userId, where),
      this.deps.accountRepository.groupByCurrency(userId, where),
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

    return { success: true, message: ERROR_MESSAGES.ACCOUNT_DELETED };
  }

  async deleteManyAccounts(userId: string, ids: string[]): Promise<ActionRes> {
    const accounts = await this.deps.accountRepository.findManyByIdsAndUserId(
      ids,
      userId,
    );

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
      message: ERROR_MESSAGES.ACCOUNTS_DELETED(ids.length),
    };
  }
}

export const accountService = new AccountService();
