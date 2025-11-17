import type { Decimal } from '@prisma/client/runtime/library';
import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { ActionRes } from '@server/dto/common.dto';
import type {
  AccountOrderByWithRelationInput,
  AccountWhereInput,
  Prisma,
} from '@server/generated';
import {
  type AccountRepository,
  accountRepository,
} from '@server/repositories/account.repository';
import {
  DB_PREFIX,
  decimalToNullableString,
  decimalToString,
  ErrorCode,
  type IdUtil,
  idUtil,
  SUCCESS_MESSAGES,
  throwAppError,
  VALIDATION,
} from '@server/share';
import {
  dateFormatter,
  decimalFormatter,
} from '@server/share/utils/service.util';
import type {
  AccountListResponse,
  AccountResponse,
  IListAccountsQueryDto,
  IUpsertAccountDto,
} from '../dto/account.dto';
import { BaseService } from './base/base.service';
import type { CacheService } from './base/cache.service';
import { cacheService } from './base/cache.service';
import type {
  ICacheService,
  IDb,
  IIdUtil,
  IOwnershipValidatorService,
} from './base/interfaces';
import { ownershipValidatorService } from './base/ownership-validator.service';
import { type ACCOUNT_SELECT_FULL, CURRENCY_SELECT_BASIC } from './selects';

type AccountRecord = Prisma.AccountGetPayload<{
  select: typeof ACCOUNT_SELECT_FULL;
}>;

export class AccountService extends BaseService<
  AccountRecord,
  IUpsertAccountDto,
  ActionRes, // Upsert returns ActionRes, not the entity
  AccountListResponse,
  AccountRepository
> {
  constructor(
    deps: {
      db: IDb;
      repository: AccountRepository;
      ownershipValidator: IOwnershipValidatorService;
      idUtil: IIdUtil;
      cache: ICacheService;
    } = {
      db: prisma,
      repository: accountRepository,
      ownershipValidator: ownershipValidatorService,
      idUtil,
      cache: cacheService,
    },
  ) {
    super(deps, {
      entityName: 'Account',
      dbPrefix: DB_PREFIX.ACCOUNT,
    });
  }

  protected formatEntity(account: AccountRecord): AccountResponse {
    return {
      ...account,
      balance: decimalToString(account.balance),
      creditLimit: decimalToNullableString(account.creditLimit),
      notifyOnDueDate: account.notifyOnDueDate ?? null,
      paymentDay: account.paymentDay ?? null,
      notifyDaysBefore: account.notifyDaysBefore ?? null,
      meta: account.meta ?? null,
      created: dateFormatter.toIsoStringRequired(account.created),
      modified: dateFormatter.toIsoStringRequired(account.modified),
    };
  }

  private async validateCurrency(currencyId: string) {
    const cacheKey = `currency:${currencyId}`;
    if (this.deps.cache?.get<boolean>(cacheKey)) {
      return;
    }

    const count = await this.deps.db.currency.count({
      where: { id: currencyId },
    });
    if (count === 0) {
      throwAppError(ErrorCode.CURRENCY_NOT_FOUND, 'Currency not found');
    }

    this.deps.cache?.set(cacheKey, true, 60 * 60 * 1000);
  }

  async upsert(userId: string, data: IUpsertAccountDto): Promise<ActionRes> {
    await this.validateCurrency(data.currencyId);

    if (data.id) {
      await this.validateOwnership(userId, data.id);
    }

    if (
      data.paymentDay !== undefined &&
      (data.paymentDay < VALIDATION.PAYMENT_DAY.MIN ||
        data.paymentDay > VALIDATION.PAYMENT_DAY.MAX)
    ) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Payment day must be between 1 and 31',
      );
    }

    if (
      data.notifyDaysBefore !== undefined &&
      data.notifyDaysBefore < VALIDATION.NOTIFY_DAYS_BEFORE.MIN
    ) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Notify days before must be positive',
      );
    }

    if (data.id) {
      await this.deps.repository.update(data.id, {
        type: data.type,
        name: data.name,
        currencyId: data.currencyId,
        creditLimit: data.creditLimit ?? null,
        notifyOnDueDate: data.notifyOnDueDate ?? null,
        paymentDay: data.paymentDay ?? null,
        notifyDaysBefore: data.notifyDaysBefore ?? null,
        meta: data.meta as any,
      });
      return { success: true, message: SUCCESS_MESSAGES.ACCOUNT_UPDATED };
    } else {
      await this.deps.repository.create({
        id: this.deps.idUtil.dbId(this.config.dbPrefix),
        type: data.type,
        name: data.name,
        currencyId: data.currencyId,
        creditLimit: data.creditLimit ?? null,
        notifyOnDueDate: data.notifyOnDueDate ?? null,
        paymentDay: data.paymentDay ?? null,
        notifyDaysBefore: data.notifyDaysBefore ?? null,
        meta: data.meta as any,
        userId,
        balance: data.initialBalance ?? 0,
      });
      return { success: true, message: SUCCESS_MESSAGES.ACCOUNT_CREATED };
    }
  }

  async list(
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

    const where: AccountWhereInput = { userId };
    if (type?.length) where.type = { in: type };
    if (currencyId?.length) where.currencyId = { in: currencyId };
    if (search?.trim())
      where.name = { contains: search.trim(), mode: 'insensitive' };

    const orderBy: AccountOrderByWithRelationInput = { [sortBy]: sortOrder };
    const skip = this.calculateSkip(page, limit);

    type AccountGroupByResult = {
      currencyId: string;
      _sum: { balance: Decimal | null };
    }[];

    const [accounts, total, summaryGroups] = await Promise.all([
      this.deps.repository.findManyByUserId(
        userId,
        where,
        orderBy,
        skip,
        limit,
      ),
      this.deps.repository.countByUserId(userId, where),
      this.deps.repository.groupByCurrency(
        userId,
        where,
      ) as Promise<AccountGroupByResult>,
    ]);

    const currencyIds = [...new Set(summaryGroups.map((g) => g.currencyId))];
    const currencies = await this.deps.db.currency.findMany({
      where: { id: { in: currencyIds } },
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
        (item): item is { currency: any; totalBalance: number } =>
          item !== null,
      );

    return {
      accounts: accounts.map((a) => this.formatEntity(a)),
      pagination: this.buildPaginationResponse(page, limit, total),
      summary,
    };
  }

  // #region Legacy Methods for Backward Compatibility
  async upsertAccount(
    userId: string,
    data: IUpsertAccountDto,
  ): Promise<ActionRes> {
    return this.upsert(userId, data);
  }

  async listAccounts(
    userId: string,
    query: IListAccountsQueryDto,
  ): Promise<AccountListResponse> {
    return this.list(userId, query);
  }

  async deleteManyAccounts(userId: string, ids: string[]): Promise<ActionRes> {
    return this.deleteMany(userId, ids);
  }
  // #endregion
}

export const accountService = new AccountService();
